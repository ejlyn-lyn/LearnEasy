import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

async function extractText(fileName: string, mimeType: string, bytes: Uint8Array) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".txt") || mimeType.startsWith("text/")) {
    return new TextDecoder().decode(bytes);
  }

  if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value;
  }

  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    const result = await pdfParse(Buffer.from(bytes));
    return result.text;
  }

  if (lowerName.endsWith(".pptx")) {
    const zip = await JSZip.loadAsync(bytes);
    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const slides = await Promise.all(
      slideNames.map(async (name) => {
        const xml = await zip.file(name)?.async("text");
        if (!xml) return "";
        return xml.replace(/<a:t>([\s\S]*?)<\/a:t>/g, "$1 ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }),
    );
    return slides.map((slide, index) => `Folie ${index + 1}: ${slide}`).join("\n");
  }

  if (mimeType.startsWith("image/")) {
    return `Bilddatei „${fileName}“. Für Bilder braucht die Verarbeitung eine externe Bilderkennungs-KI.`;
  }

  return `Datei „${fileName}“ konnte für die Textanalyse in dieser Version nicht automatisch gelesen werden.`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json();
  const materialIds = Array.isArray(body.materialIds) ? body.materialIds as string[] : [];
  const action = typeof body.action === "string" ? body.action : "zusammenfassung";
  const requestedCardCount = Number(body.cardCount);
  const cardCount = Math.max(5, Math.min(30, Number.isFinite(requestedCardCount) ? Math.round(requestedCardCount) : 10));
  if (materialIds.length === 0) {
    return NextResponse.json({ error: "Wähle mindestens eine Unterlage aus." }, { status: 400 });
  }

  const { data: materials, error: materialError } = await supabase
    .from("materials")
    .select("id, name, file_path, file_type")
    .eq("owner_id", user.id)
    .in("id", materialIds);
  if (materialError) return NextResponse.json({ error: materialError.message }, { status: 400 });
  if (!materials || materials.length === 0) {
    return NextResponse.json({ error: "Keine zugänglichen Unterlagen gefunden." }, { status: 404 });
  }

  const extracted: string[] = [];
  const extractionIssues: string[] = [];
  for (const material of materials) {
    if (!material.file_path) {
      extracted.push(`## ${material.name}\nDie Datei wurde nicht gespeichert.`);
      extractionIssues.push(`${material.name}: Datei wurde nicht gespeichert.`);
      continue;
    }
    const { data: signed, error: signedError } = await supabase.storage
      .from("learnai-materials")
      .createSignedUrl(material.file_path, 300);
    if (signedError || !signed?.signedUrl) {
      extracted.push(`## ${material.name}\nDie Datei konnte nicht geöffnet werden.`);
      extractionIssues.push(`${material.name}: ${signedError?.message ?? "Kein gültiger Download-Link."}`);
      continue;
    }
    try {
      const response = await fetch(signed.signedUrl);
      if (!response.ok) throw new Error("Download fehlgeschlagen");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = await extractText(material.name, material.file_type ?? "", bytes);
      extracted.push(`## ${material.name}\n${text.slice(0, 18000)}`);
    } catch (error) {
      console.error("Material konnte nicht extrahiert werden:", material.name, error);
      extracted.push(`## ${material.name}\nDie Datei konnte nicht analysiert werden.`);
      extractionIssues.push(`${material.name}: ${error instanceof Error ? error.message : "Unbekannter Analysefehler."}`);
    }
  }

  const instructions: Record<string, string> = {
    zusammenfassung: "Erstelle eine verständliche Zusammenfassung mit Kernaussagen, wichtigen Begriffen und einer kurzen Lernempfehlung.",
    karteikarten: `Erstelle genau ${cardCount} Karteikarten ausschließlich aus den Unterlagen. Antworte ausschließlich als JSON-Array. Jedes Element hat genau die Felder "front" und "back". Keine Einleitung und keine Markdown-Codeblöcke.`,
    quiz: "Erstelle ein Quiz mit 10 Fragen. Jede Frage bekommt vier Antworten, eine davon richtig. Markiere die richtige Antwort am Ende jeder Frage.",
    lernplan: "Erstelle einen realistischen 7-Tage-Lernplan mit Aufgaben, Wiederholungen und Abschlussziel.",
  };
  const instruction = instructions[action] ?? "Erstelle eine verständliche Zusammenfassung.";

  const sourceText = extracted.join("\n\n").slice(0, 60000);
  const apiKey = process.env.GEMINI_API_KEY;
  let aiError = "";
  if (apiKey) {
    try {
      const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
      let aiResponse: Response | undefined;
      for (let attempt = 0; attempt < 2 && !aiResponse?.ok; attempt++) {
        aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: "Du bist ein genauer Lernassistent. Verwende ausschließlich die bereitgestellten Unterlagen. Kennzeichne fehlende Informationen." }],
              },
              contents: [{
                role: "user",
                parts: [{ text: `${instruction}\n\nUnterlagen:\n${sourceText}` }],
              }],
              generationConfig: { temperature: 0.3 },
            }),
          },
        );
        if (!aiResponse.ok && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      if (aiResponse?.ok) {
        const aiData = await aiResponse.json();
        const output = aiData.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? "")
          .join("")
          .trim();
        if (output) return NextResponse.json({ output, mode: "ai", sourceCount: materials.length });
      }
      if (aiResponse && !aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => null);
        aiError = errorData?.error?.message ?? `Gemini antwortete mit HTTP ${aiResponse.status}.`;
      }
    } catch (error) {
      console.error("Gemini-Anfrage fehlgeschlagen:", error);
      aiError = error instanceof Error ? error.message : "Unbekannter KI-Fehler.";
    }
  }

  const names = materials.map((material) => `• ${material.name}`).join("\n");
  const reason = apiKey
    ? `Gemini konnte die Anfrage nicht verarbeiten: ${aiError || "Keine verwertbare Antwort erhalten."}`
    : "Kein GEMINI_API_KEY ist auf dem Server konfiguriert.";
  const extractionNote = extractionIssues.length > 0
    ? `\n\nDatei-Hinweise:\n${extractionIssues.map((issue) => `- ${issue}`).join("\n")}`
    : "";
  const fallback = `${instruction}\n\nAusgewählte Unterlagen:\n${names}\n\nExtrahierter Inhalt:\n${sourceText.slice(0, 12000)}\n\nHinweis: ${reason}${extractionNote}`;
  return NextResponse.json({ output: fallback, mode: "local", sourceCount: materials.length });
}
