# Schriften (lokal gehostet)

Alle Schriften liegen hier, damit beim Aufruf keine Verbindung zu Google Fonts entsteht (DSGVO).
Quelle: [Fontsource](https://fontsource.org) – Lizenz: SIL Open Font License 1.1 (Copyright-Hinweise und Volltext in `LICENSE-OFL.txt`).

Einbinden in einer Tool-Seite (im Root):

```html
<link rel="stylesheet" href="assets/fonts/inter.css">
```

Neue Schrift oder Schriftstärke: `npm pack @fontsource/<name>`, die `latin`/`latin-ext`-woff2-Dateien hierher kopieren und die CSS-Datei ergänzen (Claude erledigt das).
**Nie** `fonts.googleapis.com` einbinden.
