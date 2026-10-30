# CLAUDE.md – buildspace

Persönliche Sammlung von Marc Stroh (Lehrer an einer IGS in Hessen, Mathematik & Arbeitslehre, Jg. 5–10; Handball bei der HSG Wettenberg). Live unter https://buildspaceos.de (GitHub Pages, Branch `main`).

Reines HTML/CSS/JS, **kein Framework, kein Build-Schritt**. Was im Repo liegt, ist sofort die Website.

## Aufbau

- `index.html` – Startseite, lädt `posts-data.js` und danach `app.js`
- `posts-data.js` – **die** Liste aller Beiträge (`const posts = [ … ]`). Jede Karte auf der Seite kommt von hier.
- `app.js` – Routing, Seitenleiste (Menü, Suche, Einstellungen), Ordner-Navigation, Übersetzungen (`I18N`)
- `protect.js` – Login/Schutz für Classroom Management (Firebase)
- `style.css` – Liquid-Glass-Design: gemeinsame Glas-Oberfläche für alle Bausteine (Selektorliste „Glas-Oberfläche“ ganz oben), Seitenleiste; `space.js` malt den Weltraum-Hintergrund, `stars.js` die Sternschnuppen
- **Aussehen & Rand-Leiste** (`app.js`: `applyLook`, `renderRail`; `style.css` ganz unten): Einstellungen › Aussehen speichert Glas-Unschärfe, Deckkraft, Abdunklung, Akzentfarbe, Sternschnuppen, Bewegung und „Leiste am Rand“ unter `myhome_look`. Das kleine Skript im `<head>` von `index.html` wendet dieselben Werte vor dem ersten Bild an – bei Änderungen beide Stellen anpassen. Die Rail (links, iPhone unten) klappt per oberstem Knopf die volle Seitenleiste auf.
- `tools/check-site.js` – Link-Prüfer (siehe „Vor dem Abschluss prüfen“); `sw.js` cacht alle Tool-Seiten aus `posts-data.js` automatisch für offline
- Tool-/Spielseiten liegen als einzelne `.html`-Dateien **im Root** (z. B. `hallenplan.html`, `minigolf-winkel.html`). `protect.js` baut auf jeder Tool-Seite automatisch Zurück-Link, „QR-Aushang“ und „Für Lernende freigeben“ ein.

## Standardaufgabe: neues Tool / neuen Beitrag einstellen

Wenn Marc „stell das auf buildspace“, „neues Tool“ o. Ä. schreibt, immer alles erledigen:

1. **HTML-Datei anlegen** im Root, Dateiname = kurzer Slug, Kleinbuchstaben, Bindestriche, keine Umlaute (`bruch-memory.html`).
2. **Freigabe-Schutz einbauen**: vor `</body>` der neuen Seite `<script defer data-category="schule" src="protect.js"></script>` einfügen (`data-category` = `category` des Eintrags). Nur so gilt die zeitlich begrenzte Freigabe für Lernende („Für Lernende freigeben“, Kursmappe) auch auf der Tool-Seite und läuft automatisch ab. Externe Links sind davon ausgenommen. Trägt der Eintrag das Tag `vertretung`, den Dateinamen zusätzlich in `VERTRETUNG_FILES` in `protect.js` eintragen. Ist es ein Mehrspieler-Spiel (PeerJS), den Dateinamen zusätzlich in `MULTIPLAYER_FILES` eintragen – dort erscheint statt Login der Ein-Klick „Mitspielen“ (gilt nur für diese Seite und diesen Tab).
3. **Anleitung einbauen** (Schul-Tools): vor dem `protect.js`-Tag eine kurze Einführung mit 4–7 Schritten ergänzen, die die wichtigsten Bereiche markiert:
   ```html
   <script>window.TOUR = { steps: [
     { title: "Willkommen", text: "<p>Was das Tool macht.</p>" },
     { sel: "#startBtn", title: "Starten", text: "<p>…</p>" },
     { sel: "button.mode", has: "Allein", title: "Allein spielen", text: "<p>…</p>" }
   ]};</script>
   <script defer src="tour.js"></script>
   ```
   `tour.js` startet beim ersten Besuch automatisch (einmal pro Gerät), lässt sich überspringen und hängt oben rechts einen „?“-Knopf an. Felder und Optionen (`has`, `click`, `pos`, `btnStyle`, `button`) stehen oben in `tour.js`. Selektoren müssen auf dem Startbildschirm sichtbar sein, sonst erscheint der Schritt mittig.
4. **Eintrag in `posts-data.js` ergänzen** – ans **Ende** des Arrays anhängen, im selben Format wie die bestehenden Einträge (3 Leerzeichen Einrückung, doppelte Anführungszeichen, Komma nach jedem Objekt).

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
- `tags` (optional, werden als Filter-Chips über der Liste jedes Fachs/Ordners angeboten – ab 5 Beiträgen; Gruppen ODER, zwischen Gruppen UND). Nur diese Werte (Reihenfolge: Art, Thema, Sozialform, Einsatz, Jahrgang):
  - Art: `spiel` | `tool`
  - Thema: Mathematik `zahlen` `bruchrechnung` `prozent` `gleichungen` `funktionen` (inkl. Koordinaten) `geometrie` `kopfrechnen` `wahrscheinlichkeit`; Arbeitslehre `berufsorientierung` `wirtschaft` `werkstatt` `ernaehrung` `ki` `projektarbeit`; Fächerübergreifend `organisation` `raetsel` (+ `ki`, `projektarbeit`); Weitere Fächer `geschichte` `naturwissenschaften` `sprachen`
  - Sozialform: `einzelarbeit` | `partnerarbeit` | `gruppenarbeit`
  - Einsatz: `mehrgeraete` (Seite steht in `MULTIPLAYER_FILES`), `klassenquiz` (Host zeigt Aufgaben am Beamer), `vertretung` = ohne Lehrkraft selbsterklärend nutzbar
  - Jahrgang: `jg5`–`jg10`, jedes Schul-Tool bekommt sie. Ein Tool darf **mehrere** Jahrgänge tragen und erscheint dann bei jedem davon; im Zweifel lieber einen Jahrgang mehr. Reine Lehrkraft-Werkzeuge (z. B. KI-Guide, Kurse & Projekte) und Freizeit/Handball bleiben ohne Jahrgang.
  - Neue Tags: Label in `I18N.<sprache>.tagLabels` und Gruppe in `TAG_GROUPS` (app.js) sowie `KNOWN_TAGS` in `tools/check-site.js` ergänzen.
- `folder` (optional): legt den Beitrag in einen Ordner **innerhalb** des Unterordners, z. B. `folder: "unterrichtsmaterialien"` unter Schule → Mathematik (dritte Ebene, siehe `renderSubfolderContent` in `app.js`; neue Ordner-Namen in `I18N.subfolders` eintragen). Beiträge mit `folder` erscheinen nicht in der Hauptliste des Unterordners, sondern nur im Ordner. Der Ordner „Unterrichtsmaterialien“ ist passwortgeschützt (nur voller Zugang): Beiträge darin tragen `gate: "material"` und `data-category="material"` im `protect.js`-Tag (siehe `GATED_FOLDERS` in `app.js`, `LABELS` in `protect.js`).
- `titleEn` / `excerptEn` immer mitliefern.
- `featured: true` hat seit dem Liquid-Glass-Umbau keine sichtbare Wirkung mehr (Bereich „Empfohlen“ und Tag-Filter wurden entfernt); nicht setzen.
- Externe Links: `url` ist die volle https-Adresse, im `excerpt` am Ende „(Externe Seite, …)“ vermerken.

Ist Kategorie oder Jahrgang unklar, kurz nachfragen statt raten.

## Programme zum Herunterladen (`#/programme`)

Eigener Menüpunkt „Programme“ für Programme, die auf dem Computer laufen (nicht im Browser), z. B. Heft2PDF für den Mac. Diese stehen **nicht** in `posts-data.js`, sondern in der Liste `PROGRAMS` in `app.js` (Felder siehe Heft2PDF-Eintrag, jeweils mit `…En`-Übersetzung). Dateien: ZIP und Anleitung (PDF) in `downloads/` (Kleinbuchstaben, z. B. `heft2pdf-mac.zip`), Symbol und Vorschaubild in `assets/programme/`. Bei einer neuen Programmversion ZIP/PDF ersetzen und `version` sowie die Dateigrößen in `PROGRAMS` anpassen. Zum Teilen hat jedes Programm eine eigene Seite `programme/<id>.html` mit Vorschau-Tags (og:image `assets/og/<id>.jpg`, 1200×630), die Besucher per JS nach `#/programme/<id>` weiterleitet; der „Teilen“-Knopf der Karte nutzt sie (`share` in `PROGRAMS`).

## Newsletter (`newsletter.html`)

Wöchentlicher Newsletter (So 18 Uhr) mit allen Tools, die neu in `posts-data.js` stehen – automatisch, nichts zu tun beim Einstellen neuer Tools. Backend: Google Apps Script in Marcs Google-Konto (`tools/newsletter/Code.gs`, Einrichtung `tools/newsletter/ANLEITUNG.md`), Double-Opt-in, Abmeldelink in jeder Mail. Die Web-App-URL steht in `NEWSLETTER_API` in `newsletter.html`. Beiträge mit `gate` werden nicht verschickt. Nach Änderungen an `Code.gs`: `node tools/newsletter/test.js` und Marc an „Neue Version bereitstellen“ erinnern.

## Regeln für Tool-Seiten

- **Eine eigenständige Datei**: CSS und JS inline, keine lokalen Abhängigkeiten. Externe Bibliotheken nur per CDN (bevorzugt cdnjs), mit fester Version.
- Sprache Deutsch, `<html lang="de">`, `<meta charset="UTF-8">`, `<title>` = Titel aus `posts-data.js`.
- **Muss auf iPad und iPhone gut funktionieren** (Marcs Hauptgeräte, Schüler-iPads): Touch-Bedienung, keine Hover-Abhängigkeit, ausreichend große Bedienelemente, responsives Layout, `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- Speichern nur per `localStorage` (mit try/catch). Keine `window.storage`- oder Claude-API-Aufrufe – die gibt es auf GitHub Pages nicht. Einzige Ausnahme: `kompo7-formulierungshilfe.html` (optionale KI-Prüfung mit eigenem API-Schlüssel der Nutzenden, steht in `API_KEY_OPT_IN` in `tools/check-site.js` und in der Datenschutzerklärung).
- Unterricht: Differenzierung nach A/B/C-Kurs mitdenken, wenn es sich anbietet. Schülerdaten nur als Pseudonyme, keine echten Namen.
- Keine API-Keys, Passwörter oder Tokens in Dateien schreiben.

## Nicht ohne ausdrücklichen Auftrag ändern

- `app.js`, `index.html`, `protect.js`, `cursor.js`, Firebase-Konfiguration
- Bestehende Einträge in `posts-data.js` (außer Marc bittet darum)
- Umbenennen oder Löschen bestehender HTML-Dateien (sonst brechen geteilte Links und QR-Codes)

Neue Tags, Kategorien oder Übersetzungen brauchen ggf. Änderungen in `app.js` (`I18N.tagLabels`, `subfolders`) – dann vorher kurz Bescheid geben.

## Vorübergehend deaktiviert

- **Kolleg:innen-Bereich** (`#/kollegen`, enthält die Auswertung von Feedback und Bestenlisten): ausgeblendet über `KOLLEGEN_AKTIV = false` in `app.js` und `protect.js`. Zum Wieder-Einschalten beide auf `true` setzen.

## Vor dem Abschluss prüfen

- `node tools/check-site.js` meldet keine Fehler (prüft Einträge, Dateien, `protect.js`, `VERTRETUNG_FILES`, Service Worker; läuft auch automatisch bei jedem Push als GitHub Action)
- Commit-Nachricht auf Deutsch, kurz: `Neues Tool: Bruch-Memory`
