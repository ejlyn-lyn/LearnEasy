"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Material = {
  id: string;
  name: string;
  file_type: string | null;
  size_bytes: number;
  ai_status: string;
};
type Props = { moduleId: string; moduleName: string; initialMaterials: Material[] };

export default function ModuleClient({ moduleId, moduleName, initialMaterials }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState("");
  const [working, setWorking] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) return;
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${moduleId}/${Date.now()}-${safeName}`;
      const upload = await supabase.storage.from("learnai-materials").upload(path, file, { upsert: false });
      if (upload.error) {
        setMessage(upload.error.message);
        continue;
      }
      const insert = await supabase.from("materials").insert({
        owner_id: user.id,
        module_id: moduleId,
        name: file.name,
        file_path: path,
        file_type: file.type || "Unbekannt",
        size_bytes: file.size,
        ai_status: "bereit",
      });
      if (insert.error) setMessage(insert.error.message);
    }
    setFiles([]);
    setLoading(false);
    router.refresh();
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function generate(action = "zusammenfassung") {
    if (selected.length === 0) {
      setMessage("Wähle mindestens eine Unterlage aus.");
      return;
    }
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/ai/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialIds: selected, action }),
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error ?? "Die KI konnte nicht gestartet werden.");
    else {
      setGenerated(`# ${moduleName}\n\n${data.output}`);
    }
    setWorking(false);
  }

  return (
    <section className="workspace-grid">
      <div className="panel workspace-panel">
        <div className="panel-heading"><div><h2>Unterlagen hochladen</h2><p>PDF, Word, PowerPoint, Bilder oder Text</p></div></div>
        <form onSubmit={upload} className="learn-form">
          <label>Dateien<input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
          {files.length > 0 && <p className="info-note">{files.length} Datei(en) ausgewählt</p>}
          {message && <p className="form-message" role="alert">{message}</p>}
          <button className="primary-button full-button" disabled={loading || files.length === 0} type="submit">{loading ? "Wird hochgeladen…" : "Unterlagen hochladen"}</button>
        </form>
      </div>

      <div className="panel workspace-panel">
        <div className="panel-heading"><div><h2>KI-Arbeitsbereich</h2><p>Unterlagen auswählen und Lerninhalt vorbereiten</p></div></div>
        {initialMaterials.length === 0 ? (
          <p className="empty-state">Lade zuerst eine Unterlage hoch.</p>
        ) : (
          <>
            <div className="material-select-list">
              <button
                className="text-button all-materials-button"
                type="button"
                onClick={() => setSelected(selected.length === initialMaterials.length ? [] : initialMaterials.map((material) => material.id))}
              >
                {selected.length === initialMaterials.length ? "Auswahl aufheben" : "Alle Unterlagen auswählen"}
              </button>
              {initialMaterials.map((material) => (
                <label className="material-select" key={material.id}>
                  <input type="checkbox" checked={selected.includes(material.id)} onChange={() => toggle(material.id)} />
                  <span><strong>{material.name}</strong><small>{Math.max(1, Math.round(material.size_bytes / 1024))} KB · {material.ai_status}</small></span>
                </label>
              ))}
            </div>
            <div className="ai-action-grid">
              <button className="primary-button" disabled={working} type="button" onClick={() => generate("zusammenfassung")}>Zusammenfassung</button>
              <button className="secondary-button" disabled={working} type="button" onClick={() => generate("quiz")}>Quiz</button>
              <button className="secondary-button" disabled={working} type="button" onClick={() => generate("lernplan")}>7-Tage-Plan</button>
            </div>
          </>
        )}
        {generated ? (
          <pre className="ai-output">{generated}</pre>
        ) : null}
      </div>
    </section>
  );
}
