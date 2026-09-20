/* ---------------------------------------------------------
   posts-data.js
   Hier trägst du jeden neuen Beitrag ein. Ein Eintrag =
   ein Objekt in der Liste unten.

   Felder:
   - title:       Titel des Beitrags
   - excerpt:     kurze Zusammenfassung (1 Satz), erscheint in der Liste
   - date:        Datum im Format 'JJJJ-MM-TT' (wichtig für "Neueste"
                  und den "NEU"-Hinweis — der geht automatisch an den/die
                  Beiträge mit dem jeweils aktuellsten Datum)
   - category:    'schule' | 'handball' | 'freizeit'
   - subcategory: bei 'schule' → 'mathematik' | 'arbeitslehre' | 'faecheruebergreifend'
                  | 'weiterefaecher' | 'sonstiges'
                  bei 'handball' → 'jugend' | 'maenner1' | 'maenner2' | 'hallendienst' | 'training'
                  bei 'freizeit' → leer lassen (null)
   - url:         Pfad zur Beitragsseite, relativ zur index.html
   - emoji:       (optional) ein einzelnes Emoji, das groß auf der Karte
                  erscheint — am besten dasselbe, das auch im Beitrag
                  selbst als Titel-Icon steht. Ohne Angabe zeigt die Karte
                  nur das kleine Kategorie-Symbol.
   - featured:    (optional) true = erscheint oben auf der Startseite im
                  Bereich "Empfohlen", unabhängig vom Datum. Sparsam
                  einsetzen (2-4 Beiträge), sonst verliert es seinen Sinn.
   - titleEn/excerptEn: (optional) englische Übersetzung von title/excerpt
                  für den Sprachumschalter oben rechts. Ohne Angabe zeigt
                  die Karte auch im Englischen den deutschen Text (die
                  Spiel-/Tool-Seite selbst bleibt in jedem Fall deutsch).
   - tags:        (optional) Liste von Schlagwörtern, quer zur Ordner-
                  struktur — erscheinen auf der Startseite als anklickbare
                  Filter-Chips über alle Kategorien hinweg. Bekannte Werte
                  (übersetztes Label siehe I18N.tagLabels in app.js):
                  'einzelarbeit' | 'partnerarbeit' | 'gruppenarbeit'
                    → passende Gruppengröße lt. Beschreibung des Beitrags
                  'spiel' | 'tool'
                    → Lernspiel/Kartenspiel vs. Planungs-/Rechen-Werkzeug
                  'jg5' | 'jg6' | 'jg7' | 'jg8' | 'jg9' | 'jg10'
                    → nur setzen, wenn der Beitrag wirklich für eine feste
                      Jahrgangsstufe gedacht ist (nicht raten!)
                  Eigene, hier nicht gelistete Tags funktionieren auch —
                  sie tauchen als Filter-Chip auf, nur ohne übersetztes
                  Label (dann erscheint die Tag-ID selbst als Beschriftung,
                  am besten also sprechend wählen).
--------------------------------------------------------- */

const posts = [
   {
    title: "Minigolf - Winkel - Jg. 6",
    excerpt: "Spielerisch Winkel lernen",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "minigolf-winkel.html",
    emoji: "⛳",
    tags: ["spiel", "jg6"],
    titleEn: "Minigolf – Angles – Grade 6",
    excerptEn: "Learn angle types through play"
   },
   {
    title: "Mathe Warm-up Generator",
    excerpt: "Erzeugt Aufwärm-Aufgaben zu 18 Themenbereichen mit A/B/C-Differenzierung, direkt als PDF exportierbar.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "mathe-warmup-generator.html",
    emoji: "🔥",
    tags: ["tool"],
    titleEn: "Math Warm-Up Generator",
    excerptEn: "Generates warm-up exercises across 18 topic areas with A/B/C differentiation, exportable straight to PDF."
   },
   {
    title: "Hallenplan – Handballtraining",
    excerpt: "Trainingsplaner mit 2D/3D-Ansicht: Spieler, Geräte und Übungsformen per Drag-and-drop auf dem Hallenboden anordnen.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "training",
    url: "hallenplan.html",
    emoji: "📐",
    tags: ["tool"],
    titleEn: "Court Planner – Handball Training",
    excerptEn: "Training planner with a 2D/3D view: arrange players, equipment and drill shapes on the court floor via drag-and-drop."
   },
   {
    title: "Handball-Anzeigetafel",
    excerpt: "Digitale Anzeigetafel fürs Training: Spielstand, Zeit und Strafzeiten im Blick.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "training",
    url: "handball-anzeigetafel.html",
    emoji: "⏱️",
    tags: ["tool"],
    titleEn: "Handball Scoreboard",
    excerptEn: "Digital scoreboard for training sessions: score, time and penalty timers at a glance."
   },
   {
    title: "Strafenkasse – Männer 1",
    excerpt: "Strafen erfassen, Einzahlungen buchen und den Kassenstand teilen – als installierbare App, auch offline.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "maenner1",
    url: "strafenkasse/index.html",
    emoji: "💰",
    tags: ["tool"],
    titleEn: "Penalty Fund – Men's 1",
    excerptEn: "Log fines, record payments and share the running balance — as an installable app, works offline too."
   },
   {
    title: "Strafenkasse – Männer 2",
    excerpt: "Strafen erfassen, Einzahlungen buchen und den Kassenstand teilen – als installierbare App, auch offline.",
    date: "2026-09-18",
    category: "handball",
    subcategory: "maenner2",
    url: "strafenkasse/index.html",
    emoji: "💰",
    tags: ["tool"],
    titleEn: "Penalty Fund – Men's 2",
    excerptEn: "Log fines, record payments and share the running balance — as an installable app, works offline too."
   },
   {
    title: "Wizard – Das Kartenspiel",
    excerpt: "Wizard digital spielen: Mehrspieler per PeerJS oder gegen eine KI in drei Schwierigkeitsstufen.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "wizard-kartenspiel.html",
    emoji: "🧙",
    tags: ["spiel", "einzelarbeit", "gruppenarbeit"],
    titleEn: "Wizard – The Card Game",
    excerptEn: "Play Wizard digitally: multiplayer via PeerJS or against an AI on three difficulty levels."
   },
   {
    title: "Wizard Scoreboard",
    excerpt: "Punkte-Rechner fürs Wizard-Kartenspiel am Tisch: Ansagen und Stiche eintragen, Punkte und Statistik automatisch berechnet.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "wizard-scoreboard.html",
    emoji: "🧙",
    tags: ["tool"],
    titleEn: "Wizard Scoreboard",
    excerptEn: "Score calculator for tabletop Wizard: enter bids and tricks won, points and stats are calculated automatically."
   },
   {
    title: "AoS Prüfungstrainer",
    excerpt: "Multiple-Choice-Training zur Trainingslehre: Energiebereitstellung, Muskelfasertypen, Aufwärmen und Herz-Kreislauf-System.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "aos-pruefungstrainer.html",
    emoji: "🎓",
    tags: ["tool", "einzelarbeit"],
    titleEn: "AoS Exam Trainer",
    excerptEn: "Multiple-choice practice on exercise science: energy systems, muscle fibre types, warm-up and the cardiovascular system."
   },
   {
    title: "Nachtwache",
    excerpt: "Koop-Survival-Spiel mit Kampagnen- und Koop-Modus, Waffen, Bossgegnern und Tarnung.",
    date: "2026-09-18",
    category: "freizeit",
    subcategory: null,
    url: "nachtwache.html",
    emoji: "🌙",
    tags: ["spiel", "einzelarbeit", "gruppenarbeit"],
    titleEn: "Night Watch",
    excerptEn: "Co-op survival game with campaign and co-op modes, weapons, boss fights and stealth."
   },
   {
    title: "Zahlen-Werkstatt",
    excerpt: "Lernspiel zu natürlichen Zahlen (Jg. 5): Lesen & Schreiben, Stellenwerte, Runden, Zahlenstrahl und mehr — für bis zu 4 Lernende gleichzeitig, mit automatischer Niveau-Anpassung.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "zahlen-werkstatt.html",
    emoji: "🔧",
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "jg5"],
    titleEn: "Number Workshop",
    excerptEn: "Learning game on natural numbers (grade 5): reading & writing, place value, rounding, the number line and more — for up to 4 learners at once, with automatic level adjustment."
   },
   {
    title: "SIKORE – Kopfrechentrainer",
    excerpt: "Kostenloses Online-Tool und Arbeitsblatt-Generator mit 39 Schwierigkeitsstufen, von einfachen Additions- und Subtraktionsaufgaben bis zu komplexen Multiplikationen. (Externe Seite)",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "https://sikore.schiffner-tischer.de/",
    emoji: "🧠",
    tags: ["tool"],
    titleEn: "SIKORE – Mental Maths Trainer",
    excerptEn: "Free online tool and worksheet generator with 39 difficulty levels, from simple addition and subtraction to complex multiplication. (External site)"
   },
   {
    title: "Bruch-Quiz (Fußball)",
    excerpt: "Mathe-Kick für 2 Spieler: Bruchrechnen im Elfmeterschießen-Format — wer richtig rechnet, schießt aufs Tor.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "bruch-quiz-fussball.html",
    emoji: "⚽",
    tags: ["spiel", "partnerarbeit"],
    titleEn: "Fraction Quiz (Football)",
    excerptEn: "A maths penalty shoot-out for 2 players: solve fraction problems — get it right and you take the shot."
   },
   {
    title: "Prozent-Rennen",
    excerpt: "Lernspiel zur Prozentrechnung (Grundwert, Prozentsatz, Prozentwert) im Wettrennen — für 1 bis 4 Lernende am selben Gerät, drei Schwierigkeitsstufen.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "prozent-rennen.html",
    emoji: "📊",
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit"],
    titleEn: "Percentage Race",
    excerptEn: "Learning game on percentages (base value, rate, percentage value) in race format — for 1 to 4 learners on the same device, three difficulty levels."
   },
   {
    title: "Gleichungs-Duell",
    excerpt: "Lineare Gleichungen nach x auflösen, vom einfachen Rechenschritt bis zu x auf beiden Seiten — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "gleichungs-duell.html",
    emoji: "⚔️",
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit"],
    titleEn: "Equation Duel",
    excerptEn: "Solve linear equations for x, from a single step to x on both sides — for 1 to 4 learners on the same device."
   },
   {
    title: "Flächen-Fuchs",
    excerpt: "Umfang und Fläche von Rechteck, Quadrat, Dreieck und Kreis berechnen, mit beschrifteten Figuren — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "flaechen-fuchs.html",
    emoji: "🦊",
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit"],
    titleEn: "Area Fox",
    excerptEn: "Calculate the perimeter and area of rectangles, squares, triangles and circles, with labelled shapes — for 1 to 4 learners on the same device."
   },
   {
    title: "Zahlen-Detektiv",
    excerpt: "Zahlenrätsel mit natürlichen Zahlen lösen: Aus mehreren Hinweisen (gerade/ungerade, Teilbarkeit, Quersumme, Ziffernanzahl) die gesuchte Zahl knacken — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "zahlen-detektiv.html",
    emoji: "🕵️",
    featured: true,
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit"],
    titleEn: "Number Detective",
    excerptEn: "Solve number puzzles with natural numbers: crack the hidden number from several clues (odd/even, divisibility, digit sum, number of digits) — for 1 to 4 learners on the same device."
   },
   {
    title: "Kopfrechen-Quiz",
    excerpt: "Blitzschnelles Kopfrechnen mit Plus, Minus, Mal und Geteilt gegen die Uhr, mit Countdown pro Frage — für 1 bis 4 Lernende am selben Gerät.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "kopfrechen-quiz.html",
    emoji: "⚡",
    featured: true,
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit"],
    titleEn: "Mental Maths Quiz",
    excerptEn: "Lightning-fast mental maths with addition, subtraction, multiplication and division against the clock, with a countdown per question — for 1 to 4 learners on the same device."
   },
   {
    title: "Das Praktikumsspiel",
    excerpt: "Brettspiel zur Praktikumsnachbereitung: Würfeln, auf Reflexionsfelder ziehen und im Gespräch über die eigenen Praktikumserfahrungen austauschen — für 2 bis 6 Spieler.",
    date: "2026-09-19",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "praktikumsspiel.html",
    emoji: "🎲",
    featured: true,
    tags: ["spiel", "partnerarbeit", "gruppenarbeit"],
    titleEn: "The Internship Game",
    excerptEn: "A board game for reflecting on work experience: roll the dice, land on reflection spaces and talk about your own internship experiences — for 2 to 6 players."
   },
   {
    title: "Morgenkreis-Tafel",
    excerpt: "Digitale Morgenkreis-Tafel fürs Klassenzimmer: Datum, Wetter, Wort des Tages, Tagesplan und Anwesenheit auf einen Blick. (Externe Seite, Medienzentrum Gießen-Vogelsberg)",
    date: "2026-09-20",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "https://morgenkreis.mzgivb.de/",
    emoji: "☀️",
    tags: ["tool"],
    titleEn: "Morning Circle Board",
    excerptEn: "Digital morning-circle board for the classroom: date, weather, word of the day, daily schedule and attendance at a glance. (External site, Medienzentrum Gießen-Vogelsberg)"
   },
   {
    title: "Digiscreen",
    excerpt: "Interaktive Tafel-Oberfläche mit Bausteinen für jedes Fach: Zufallsgenerator, Gruppeneinteilung, Timer, Quiz, Ampel, Taschenrechner und mehr. (Externe Seite, Medienzentrum Gießen-Vogelsberg)",
    date: "2026-09-20",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "https://digiscreen.mzgivb.de/",
    emoji: "🖥️",
    tags: ["tool"],
    titleEn: "Digiscreen",
    excerptEn: "Interactive whiteboard surface with building blocks for any subject: randomiser, group generator, timer, quiz, traffic light, calculator and more. (External site, Medienzentrum Gießen-Vogelsberg)"
   },
   {
    title: "Akte Wahrheit – 1938",
    excerpt: "Pixel-Adventure zur Propaganda-Analyse: Als verdeckter Bote untersuchst du 1938 eine fiktive NS-Propagandastelle. Geschichte, Jg. 10, 45–60 Minuten. (Externe Seite, von Sebastian Holle)",
    date: "2026-09-20",
    category: "schule",
    subcategory: "weiterefaecher",
    url: "https://akte-wahrheit-1938-holle.netlify.app/lehrkraft",
    emoji: "🗂️",
    tags: ["spiel", "jg10"],
    titleEn: "Case File Truth – 1938",
    excerptEn: "A pixel adventure on analysing propaganda: play a covert messenger investigating a fictional Nazi propaganda office in 1938. History, grade 10, 45–60 minutes. (External site, by Sebastian Holle)"
   },
   {
    title: "Mission Erde – Klasse 7",
    excerpt: "Forschungsexpedition zur Erde im Sonnensystem: sechs Missionen zu Tag/Nacht, Jahreszeiten und mehr, mit drei Schwierigkeitsstufen. Jg. 7. (Externe Seite, von Sebastian Holle)",
    date: "2026-09-20",
    category: "schule",
    subcategory: "weiterefaecher",
    url: "https://mission-erde-klasse7-september.sebastianholle.chatgpt.site/",
    emoji: "🌍",
    tags: ["tool", "jg7"],
    titleEn: "Mission Earth – Grade 7",
    excerptEn: "A research expedition on Earth's place in the solar system: six missions on day/night, the seasons and more, with three difficulty levels. Grade 7. (External site, by Sebastian Holle)"
   },
];
