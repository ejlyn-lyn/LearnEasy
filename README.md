# LearnEasy

LearnEasy ist eine Next.js-Lernplattform mit Supabase-Authentifizierung, Datenbank, Profil, XP, Freunden und Clans.

## Lokal starten

```powershell
npm.cmd install
npm.cmd run dev
```

Die App läuft lokal unter `http://localhost:3000`.

## Supabase-Projekt einrichten

> Die Texte dieses Abschnitts und alle Zeilen mit `#`, Überschriften oder Erläuterungen gehören **nicht** in den SQL Editor.
>
> Öffne den SQL Editor nur für SQL-Dateien aus `supabase/migrations/`. Jede Datei beginnt mit SQL-Anweisungen wie `create table`, `alter table`, `drop function` oder `insert`.

1. Unter https://supabase.com ein Projekt erstellen.
2. Unter **SQL Editor** jede Datei aus `supabase/migrations/` einzeln und in Dateinamen-Reihenfolge ausführen.
3. Öffne dazu jede SQL-Datei mit einem Editor oder [GitHub](https://github.com), kopiere den vollständigen Inhalt in den Supabase-SQL-Editor und klicke auf **Run**.
3. Unter **Authentication > URL Configuration** diese Redirect-URLs eintragen:

```text
http://localhost:3000/auth/callback
https://DEINE-DOMAIN.vercel.app/auth/callback
```

Bei einer eigenen Domain zusätzlich die entsprechende Callback-URL eintragen.

## Einladungscodes

Die Registrierung wird durch einmalige Einladungscodes geschützt. Einen Code legst du direkt in Supabase an:

```sql
insert into public.invite_codes(code)
values ('LEARN-2026-A');
```

Mehrere Codes können gemeinsam angelegt werden:

```sql
insert into public.invite_codes(code) values
  ('FREUND-001'),
  ('FREUND-002'),
  ('FREUND-003');
```

So prüfst du verwendete Codes:

```sql
select code, reserved_email, used_at, used_by
from public.invite_codes
order by created_at desc;
```

Nur Code-Inhaber, denen du den Code direkt mitgeteilt hast, können sich registrieren. Reservierte Codes werden nach 30 Minuten wieder frei, falls die Registrierung abgebrochen wurde.

## Supabase-Umgebung

Unter **Project Settings > API** findest du:

- `Project URL`
- `Publishable key` oder kompatibler `Anon key`

Lege im Projektstamm eine `.env.local` an:

```env
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=DEIN_PUBLISHABLE_KEY
```

Der Publishable/Anon-Key ist für den Browser bestimmt. Er muss zusammen mit Supabase-Row-Level-Security verwendet werden.

Der Supabase-Secret-/Service-Role-Key darf niemals in `NEXT_PUBLIC_*`, React-Code oder Git gelangen.

## Auf Vercel hosten

1. Das Projekt bei GitHub veröffentlichen.
2. Unter https://vercel.com **Add New Project** wählen.
3. Das GitHub-Repository importieren.
4. Unter **Environment Variables** diese Variablen eintragen:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

5. Das Projekt deployen.

Vercel erstellt eine öffentliche Adresse wie `https://learneasy.vercel.app`. Danach wird diese Adresse in Supabase als Redirect-URL eingetragen.

Bei späteren Änderungen reicht ein Git-Push:

```powershell
git add .
git commit -m "Update LearnEasy"
git push
```

## API-Schlüssel und Kosten

- Supabase-Publishable-/Anon-Key: für Browserzugriffe vorgesehen, zusammen mit RLS.
- Supabase-Service-Role-/Secret-Key: nur serverseitig in Vercel; niemals öffentlich verfügbar machen.
- AI-API-Key: ausschließlich in einer Next.js-Server-Route oder als private Vercel-Variable speichern.
- Die KI-Funktionen sollten angemeldeten Nutzern vorbehalten sein.
- Für kostenlose Nutzung sollten pro Nutzer Limits, Dateigrößen und KI-Anfragelimits eingerichtet werden.
