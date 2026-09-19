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
    title: "Minigolf - Winkel - Jg. 6",
    excerpt: "Spielerisch Winkel lernen",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "minigolf-winkel.html"
   },
   {
    title: "Mathe Warm-up Generator",
    excerpt: "Erzeugt Aufwärm-Aufgaben zu 18 Themenbereichen mit A/B/C-Differenzierung, direkt als PDF exportierbar.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "mathe-warmup-generator.html"
   },
   {
    title: "Hallenplan – Handballtraining",
    excerpt: "Trainingsplaner mit 2D/3D-Ansicht: Spieler, Geräte und Übungsformen per Drag-and-drop auf dem Hallenboden anordnen.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "training",
    url: "hallenplan.html"
   },
   {
    title: "Handball-Anzeigetafel",
    excerpt: "Digitale Anzeigetafel fürs Training: Spielstand, Zeit und Strafzeiten im Blick.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "training",
    url: "handball-anzeigetafel.html"
   },
   {
    title: "Strafenkasse – Männer 1",
    excerpt: "Strafen erfassen, Einzahlungen buchen und den Kassenstand teilen – als installierbare App, auch offline.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "maenner1",
    url: "strafenkasse/index.html"
   },
   {
    title: "Strafenkasse – Männer 2",
    excerpt: "Strafen erfassen, Einzahlungen buchen und den Kassenstand teilen – als installierbare App, auch offline.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "maenner2",
    url: "strafenkasse/index.html"
   },
   {
    title: "Wizard – Das Kartenspiel",
    excerpt: "Wizard digital spielen: Mehrspieler per PeerJS oder gegen eine KI in drei Schwierigkeitsstufen.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "wizard-kartenspiel.html"
   },
   {
    title: "Wizard Scoreboard",
    excerpt: "Punkte-Rechner fürs Wizard-Kartenspiel am Tisch: Ansagen und Stiche eintragen, Punkte und Statistik automatisch berechnet.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "wizard-scoreboard.html"
   },
   {
    title: "AoS Prüfungstrainer",
    excerpt: "Multiple-Choice-Training zur Trainingslehre: Energiebereitstellung, Muskelfasertypen, Aufwärmen und Herz-Kreislauf-System.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "aos-pruefungstrainer.html"
   },
   {
    title: "Nachtwache",
    excerpt: "Koop-Survival-Spiel mit Kampagnen- und Koop-Modus, Waffen, Bossgegnern und Tarnung.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "nachtwache.html"
   },
   {
    title: "Zahlen-Werkstatt",
    excerpt: "Lernspiel zu natürlichen Zahlen (Jg. 5): Lesen & Schreiben, Stellenwerte, Runden, Zahlenstrahl und mehr — für bis zu 4 Lernende gleichzeitig, mit automatischer Niveau-Anpassung.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "zahlen-werkstatt.html"
   },
   {
    title: "SIKORE – Kopfrechentrainer",
    excerpt: "Kostenloses Online-Tool und Arbeitsblatt-Generator mit 39 Schwierigkeitsstufen, von einfachen Additions- und Subtraktionsaufgaben bis zu komplexen Multiplikationen. (Externe Seite)",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "https://sikore.schiffner-tischer.de/"
   },
   {
    title: "Bruch-Quiz (Fußball)",
    excerpt: "Mathe-Kick für 2 Spieler: Bruchrechnen im Elfmeterschießen-Format — wer richtig rechnet, schießt aufs Tor.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "bruch-quiz-fussball.html"
   },
   {
    title: "Prozent-Rennen",
    excerpt: "Lernspiel zur Prozentrechnung (Grundwert, Prozentsatz, Prozentwert) im Wettrennen — für 1 bis 4 Lernende am selben Gerät, drei Schwierigkeitsstufen.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "prozent-rennen.html"
   },
   {
    title: "Gleichungs-Duell",
    excerpt: "Lineare Gleichungen nach x auflösen, vom einfachen Rechenschritt bis zu x auf beiden Seiten — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "gleichungs-duell.html"
   },
   {
    title: "Flächen-Fuchs",
    excerpt: "Umfang und Fläche von Rechteck, Quadrat, Dreieck und Kreis berechnen, mit beschrifteten Figuren — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "flaechen-fuchs.html"
   },
   {
    title: "Zahlen-Detektiv",
    excerpt: "Zahlenrätsel mit natürlichen Zahlen lösen: Aus mehreren Hinweisen (gerade/ungerade, Teilbarkeit, Quersumme, Ziffernanzahl) die gesuchte Zahl knacken — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "zahlen-detektiv.html"
   },
   {
    title: "Kopfrechen-Quiz",
    excerpt: "Blitzschnelles Kopfrechnen mit Plus, Minus, Mal und Geteilt gegen die Uhr, mit Countdown pro Frage — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "kopfrechen-quiz.html"
   },
   {
    title: "Das Praktikumsspiel",
    excerpt: "Brettspiel zur Praktikumsnachbereitung: Würfeln, auf Reflexionsfelder ziehen und im Gespräch über die eigenen Praktikumserfahrungen austauschen — für 2 bis 6 Spieler.",
    date: "2026-09-19",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "praktikumsspiel.html"
   },
];
