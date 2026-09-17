# Werkbank — dein Blog

Eine selbstgebaute Blog-Vorlage aus HTML, CSS und etwas JavaScript.
Kein Framework, keine Build-Schritte — alles läuft direkt im Browser.

## Struktur

```
blog/
├── index.html          ← Startseite (Ordner-Ansicht, per JavaScript gesteuert)
├── style.css            ← Gesamtes Design
├── app.js                ← Ordner-Struktur & Navigations-Logik
├── posts-data.js       ← HIER trägst du jeden Beitrag ein
└── posts/
    ├── beispiel-post.html       (Schule → Mathematik)
    ├── beispiel-handball.html   (Handball → Jugend)
    └── beispiel-freizeit.html   (Freizeit)
```

## Wie die Ordner funktionieren

Auf der Startseite siehst du vier Kacheln: **Neueste**, **Schule**,
**Handball**, **Freizeit**.

- **Schule** → Mathematik, Arbeitslehre, Sonstiges
- **Handball** → Jugend, Männer 1, Männer 2, Hallendienst
- **Freizeit** → zeigt Beiträge direkt, ohne weitere Unterordner
- **Neueste** → kein echter Ordner, sondern wird bei jedem Aufruf neu
  berechnet: alle Beiträge der letzten 30 Tage, über alle Kategorien
  hinweg, automatisch aktuellste zuerst. Du musst dafür nichts pflegen.

Die Ordnerstruktur selbst (Namen, Farben, Unterordner) steht in `app.js`
im Objekt `folderStructure` — falls du später z. B. einen weiteren
Handball-Unterordner brauchst, trägst du ihn dort ein.

## Kostenlos online stellen mit GitHub Pages

1. Kostenlosen Account auf github.com erstellen (falls noch nicht
   vorhanden) und ein neues Repository anlegen, z. B. `werkbank-blog`.
2. Den gesamten Ordnerinhalt (`index.html`, `style.css`, `app.js`,
   `posts-data.js`, `posts/`) hochladen — per Drag & Drop im Browser
   ("Add file" → "Upload files") oder per Git.
3. Unter *Settings → Pages* die Quelle auf den `main`-Branch und den
   Root-Ordner (`/`) stellen und speichern.
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://<dein-github-name>.github.io/werkbank-blog/`.
5. Optional: eigene Domain unter *Settings → Pages → Custom domain*
   hinterlegen (DNS-Eintrag beim Domain-Anbieter nötig, meist ~10 €/Jahr
   für die Domain selbst — GitHub Pages bleibt kostenlos).

## Neuen Beitrag hinzufügen

1. Kopiere eine der Dateien in `posts/` (z. B. `beispiel-post.html`) und
   benenne die Kopie um.
2. Passe in der neuen Datei an: Titel, den Text im `<article>`-Bereich,
   die Breadcrumb-Zeile oben und den `post-tag` (Kategorie-Punkt und
   Beschriftung, z. B. `dot-handball` für Handball).
3. Öffne `posts-data.js` und füge oben in der Liste ein neues Objekt
   ein — Titel, kurze Zusammenfassung, Datum (`JJJJ-MM-TT`), Kategorie,
   Unterkategorie und den Pfad zur neuen Datei. Die genauen möglichen
   Werte stehen im Kommentar am Dateianfang.
4. Änderungen zu GitHub hochladen. Startseite, passender Ordner und bei
   aktuellem Datum auch "Neueste" aktualisieren sich automatisch — ohne
   dass du an der `index.html` etwas ändern musst.

## Design anpassen

Alle Farben stehen gesammelt oben in `style.css` unter `:root { ... }`.
Jede Kategorie hat eine eigene Akzentfarbe (`--c-schule`, `--c-handball`,
`--c-freizeit`, `--c-neueste`) — die wird sowohl für die Ordner-Kacheln
als auch für die farbigen Punkte in den Beitragslisten verwendet, du
musst sie also nur an einer Stelle ändern.
