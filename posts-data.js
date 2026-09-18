/* ---------------------------------------------------------
   posts-data.js
   Hier trägst du jeden neuen Beitrag ein. Ein Eintrag =
   ein Objekt in der Liste unten.

   Felder:
   - title:       Titel des Beitrags
   - excerpt:     kurze Zusammenfassung (1 Satz), erscheint in der Liste
   - date:        Datum im Format 'JJJJ-MM-TT' (wichtig für "Neueste")
   - category:    'schule' | 'handball' | 'freizeit'
   - subcategory: bei 'schule' → 'mathematik' | 'arbeitslehre' | 'sonstiges'
                  bei 'handball' → 'jugend' | 'maenner1' | 'maenner2' | 'hallendienst'
                  bei 'freizeit' → leer lassen (null)
   - url:         Pfad zur Beitragsseite, relativ zur index.html
--------------------------------------------------------- */

const posts = [
  {
    title: "So starte ich diesen Blog",
    excerpt: "Ein kurzer erster Eintrag als Platzhalter — ersetze ihn durch deinen eigenen Text.",
    date: "2026-09-10",
    category: "schule",
    subcategory: "mathematik",
    url: "posts/beispiel-post.html"
  },
  {
    title: "Saisonstart Jugend",
    excerpt: "Ein Beispielbeitrag aus dem Bereich Handball, Kategorie Jugend.",
    date: "2026-09-05",
    category: "handball",
    subcategory: "jugend",
    url: "posts/beispiel-handball.html"
  },
  {
    title: "Ein Wochenende in der Werkstatt",
    excerpt: "Ein Beispielbeitrag aus dem Bereich Freizeit — dieser ist älter als 30 Tage und taucht deshalb nicht unter 'Neueste' auf.",
    date: "2026-08-01",
    category: "freizeit",
    subcategory: null,
    url: "posts/beispiel-freizeit.html"
  },
   {
    title: "Minigolf - Winkel - Jg. 6",
    excerpt: "Spielerisch Winkel lernen",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "minigolf-winkel.html"
   },
];
