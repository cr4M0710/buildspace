# CLAUDE.md – buildspace

Persönliche Sammlung von Marc Stroh (Lehrer an einer IGS in Hessen, Mathematik & Arbeitslehre, Jg. 5–10; Handball bei der HSG Wettenberg). Live unter https://buildspaceos.de (GitHub Pages, Branch `main`).

Reines HTML/CSS/JS, **kein Framework, kein Build-Schritt**. Was im Repo liegt, ist sofort die Website.

## Aufbau

- `index.html` – Startseite, lädt `posts-data.js` und danach `app.js`
- `posts-data.js` – **die** Liste aller Beiträge (`const posts = [ … ]`). Jede Karte auf der Seite kommt von hier.
- `app.js` – Routing, Seitenleiste (Menü, Suche, Einstellungen), Ordner-Navigation, Übersetzungen (`I18N`)
- `protect.js` – Login/Schutz für Classroom Management (Firebase)
- `style.css` – Liquid-Glass-Design: gemeinsame Glas-Oberfläche für alle Bausteine (Selektorliste „Glas-Oberfläche“ ganz oben), Seitenleiste; `space.js` malt den Weltraum-Hintergrund, `stars.js` die Sternschnuppen
- `tools/check-site.js` – Link-Prüfer (siehe „Vor dem Abschluss prüfen“); `sw.js` cacht alle Tool-Seiten aus `posts-data.js` automatisch für offline
- Tool-/Spielseiten liegen als einzelne `.html`-Dateien **im Root** (z. B. `hallenplan.html`, `minigolf-winkel.html`). `protect.js` baut auf jeder Tool-Seite automatisch Zurück-Link, „QR-Aushang“ und „Für Lernende freigeben“ ein.

## Standardaufgabe: neues Tool / neuen Beitrag einstellen

Wenn Marc „stell das auf buildspace“, „neues Tool“ o. Ä. schreibt, immer alles erledigen:

1. **HTML-Datei anlegen** im Root, Dateiname = kurzer Slug, Kleinbuchstaben, Bindestriche, keine Umlaute (`bruch-memory.html`).
2. **Freigabe-Schutz einbauen**: vor `</body>` der neuen Seite `<script defer data-category="schule" src="protect.js"></script>` einfügen (`data-category` = `category` des Eintrags). Nur so gilt die zeitlich begrenzte Freigabe für Lernende („Für Lernende freigeben“, Kursmappe) auch auf der Tool-Seite und läuft automatisch ab. Externe Links sind davon ausgenommen. Trägt der Eintrag das Tag `vertretung`, den Dateinamen zusätzlich in `VERTRETUNG_FILES` in `protect.js` eintragen.
3. **Eintrag in `posts-data.js` ergänzen** – ans **Ende** des Arrays anhängen, im selben Format wie die bestehenden Einträge (3 Leerzeichen Einrückung, doppelte Anführungszeichen, Komma nach jedem Objekt).

### Felder eines Eintrags

```js
   {
    title: "Bruch-Memory",
    excerpt: "Ein Satz, was das Tool macht.",
    date: "JJJJ-MM-TT",          // heutiges Datum
    category: "schule",
    subcategory: "mathematik",
    url: "bruch-memory.html",
    emoji: "🧩",
    tags: ["spiel", "partnerarbeit"],
    titleEn: "Fraction Memory",
    excerptEn: "One sentence in English."
   },
```

- `category` / `subcategory` – nur diese Werte:
  - `schule` → `mathematik` | `arbeitslehre` | `faecheruebergreifend` (= „Classroom Management“) | `weiterefaecher` | `sonstiges`
  - `handball` → `jugend` | `maenner1` | `maenner2` | `hallendienst` | `training`
  - `freizeit` → `subcategory: null`
- `tags` (optional): `spiel` oder `tool`; Gruppengröße `einzelarbeit` | `partnerarbeit` | `gruppenarbeit`; `vertretung` = ohne Lehrkraft selbsterklärend nutzbar; `jg5`–`jg10` **nur**, wenn das Tool eindeutig für einen Jahrgang gedacht ist – nicht raten.
- `titleEn` / `excerptEn` immer mitliefern.
- `featured: true` hat seit dem Liquid-Glass-Umbau keine sichtbare Wirkung mehr (Bereich „Empfohlen“ und Tag-Filter wurden entfernt); nicht setzen.
- Externe Links: `url` ist die volle https-Adresse, im `excerpt` am Ende „(Externe Seite, …)“ vermerken.

Ist Kategorie oder Jahrgang unklar, kurz nachfragen statt raten.

## Regeln für Tool-Seiten

- **Eine eigenständige Datei**: CSS und JS inline, keine lokalen Abhängigkeiten. Externe Bibliotheken nur per CDN (bevorzugt cdnjs), mit fester Version.
- Sprache Deutsch, `<html lang="de">`, `<meta charset="UTF-8">`, `<title>` = Titel aus `posts-data.js`.
- **Muss auf iPad und iPhone gut funktionieren** (Marcs Hauptgeräte, Schüler-iPads): Touch-Bedienung, keine Hover-Abhängigkeit, ausreichend große Bedienelemente, responsives Layout, `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- Speichern nur per `localStorage` (mit try/catch). Keine `window.storage`- oder Claude-API-Aufrufe – die gibt es auf GitHub Pages nicht.
- Unterricht: Differenzierung nach A/B/C-Kurs mitdenken, wenn es sich anbietet. Schülerdaten nur als Pseudonyme, keine echten Namen.
- Keine API-Keys, Passwörter oder Tokens in Dateien schreiben.

## Nicht ohne ausdrücklichen Auftrag ändern

- `app.js`, `index.html`, `protect.js`, `cursor.js`, Firebase-Konfiguration
- Bestehende Einträge in `posts-data.js` (außer Marc bittet darum)
- Umbenennen oder Löschen bestehender HTML-Dateien (sonst brechen geteilte Links und QR-Codes)

Neue Tags, Kategorien oder Übersetzungen brauchen ggf. Änderungen in `app.js` (`I18N.tagLabels`, `subfolders`) – dann vorher kurz Bescheid geben.

## Vor dem Abschluss prüfen

- `node tools/check-site.js` meldet keine Fehler (prüft Einträge, Dateien, `protect.js`, `VERTRETUNG_FILES`, Service Worker; läuft auch automatisch bei jedem Push als GitHub Action)
- Commit-Nachricht auf Deutsch, kurz: `Neues Tool: Bruch-Memory`
