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
    tags: ["spiel", "jg6", "vertretung"],
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
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "jg5", "vertretung"],
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
    tags: ["spiel", "partnerarbeit", "vertretung"],
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
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "vertretung"],
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
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "vertretung"],
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
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "vertretung"],
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
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "vertretung"],
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
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "vertretung"],
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
   {
    title: "Parabel-Werkstatt",
    excerpt: "Quadratische Funktionen in Normal-, Scheitelpunkt- oder Nullstellenform eingeben und Graph sowie Wertetabelle direkt nebeneinander vergleichen.",
    date: "2026-09-20",
    category: "schule",
    subcategory: "mathematik",
    url: "parabel-werkstatt.html",
    emoji: "📈",
    tags: ["tool", "einzelarbeit"],
    titleEn: "Parabola Workshop",
    excerptEn: "Enter quadratic functions in standard, vertex or intercept form and compare the graph and value table side by side."
   },
   {
    title: "Mathe-Fußball",
    excerpt: "Zwei Teams treten in einem animierten Fußballspiel gegeneinander an und erobern das Feld, indem sie Kopfrechen-, Text- und Knobelaufgaben lösen. Schwierigkeit, Rechenart und Spielende frei einstellbar.",
    date: "2026-09-20",
    category: "schule",
    subcategory: "mathematik",
    url: "mathe-fussball.html",
    emoji: "⚽",
    tags: ["spiel", "partnerarbeit", "vertretung"],
    titleEn: "Math Football",
    excerptEn: "Two teams face off in an animated football match, advancing the ball by solving mental-math, word and puzzle problems. Difficulty, operation and end condition are all adjustable."
   },
   {
    title: "Team-Kanban",
    excerpt: "Gemeinsames Kanban-Board mit Team-Kennwort statt Einzel-Login: mehrere Boards anlegen, Spalten frei benennen und Karten per Drag & Drop verschieben — ideal, um Projekt- oder Praktikumsarbeit gemeinsam zu organisieren.",
    date: "2026-09-20",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "kanban-board.html",
    emoji: "🗂️",
    tags: ["tool", "gruppenarbeit"],
    titleEn: "Team Kanban",
    excerptEn: "A shared Kanban board unlocked with a team passcode instead of individual logins: create multiple boards, name your own columns and move cards by drag and drop — ideal for organising project or internship work together."
   },
   {
    title: "Team-Kanban",
    excerpt: "Gemeinsames Kanban-Board mit Team-Kennwort statt Einzel-Login: mehrere Boards anlegen, Spalten frei benennen und Karten per Drag & Drop verschieben — für Projektarbeit in jedem Fach nutzbar.",
    date: "2026-09-20",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "kanban-board.html",
    emoji: "🗂️",
    tags: ["tool", "gruppenarbeit"],
    titleEn: "Team Kanban",
    excerptEn: "A shared Kanban board unlocked with a team passcode instead of individual logins: create multiple boards, name your own columns and move cards by drag and drop — usable for project work in any subject."
   },
   {
    title: "Kurse & Projekte",
    excerpt: "Eigene Klassen/Kurse anlegen, Lernende per Kürzel/Pseudonym und individuellem Zugangscode verwalten (keine Klarnamen), Projekte mit Aufgaben zusammenstellen und veröffentlichen, und den Fortschritt aller Lernenden in einer Übersicht verfolgen.",
    date: "2026-09-26",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "kurse-projekte.html",
    emoji: "📚",
    tags: ["tool", "unterrichtsorganisation"],
    titleEn: "Courses & Projects",
    excerptEn: "Create your own classes/courses, manage learners by pseudonym and individual access code (no real names), put together and publish projects with tasks, and track every learner's progress in one overview."
   },
   {
    title: "Märkte & Preise – Lernwerkstatt WAT 9",
    excerpt: "Drei Lernwege zum Thema Märkte und Preise für den WAT-Unterricht in Jg. 9, mit fertigen Arbeitsblättern für 8 Doppelstunden. Unterrichtsfälle und Preise sind fiktiv. (Externe Seite, von Sebastian Holle)",
    date: "2026-09-26",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "https://maerkte-preise-lernwerkstatt.sebastianholle.chatgpt.site/#lernen",
    emoji: "🛒",
    tags: ["tool", "jg9"],
    titleEn: "Markets & Prices – WAT 9 Learning Studio",
    excerptEn: "Three learning pathways on markets and prices for Grade 9 Economics/Work/Technology classes, with ready-made worksheets for 8 double lessons. Teaching cases and prices are fictional. (External site, by Sebastian Holle)"
   },
   {
    title: "Lern-RPG aus dem Lehrplan – Anleitung",
    excerpt: "Anleitung für Lehrkräfte: mit Claude oder ChatGPT aus dem eigenen Lehrplan ein kleines Pixel-Rollenspiel plus Arbeitsblatt erstellen lassen – inklusive Prompt-Vorlage und Tipps zur Fehlerbehebung. (Externe Seite, KILehrkraft.de)",
    date: "2026-09-26",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "https://kilehrkraft.de/anleitungen/lern-rpg-aus-dem-lehrplan.html",
    emoji: "🎮",
    titleEn: "Curriculum Learning RPG – Guide",
    excerptEn: "A guide for teachers: use Claude or ChatGPT to turn your own curriculum into a small pixel role-playing game plus worksheet – including a prompt template and troubleshooting tips. (External site, KILehrkraft.de)"
   },
   {
    title: "Funktionsleiter",
    excerpt: "Quiz zu linearen und quadratischen Funktionen zum Hochklettern – allein oder live mit der Klasse.",
    date: "2026-09-29",
    category: "schule",
    subcategory: "mathematik",
    url: "funktionsleiter.html",
    emoji: "🪜",
    tags: ["spiel"],
    titleEn: "Function Ladder",
    excerptEn: "A quiz on linear and quadratic functions where you climb a ladder – solo or live with the class."
   },
   {
    title: "Minispiele",
    excerpt: "Fünf Klassiker für zwischendurch: Mühle, Dame, MiniGolf, Billard und Sudoku.",
    date: "2026-09-29",
    category: "freizeit",
    subcategory: null,
    url: "minispiele.html",
    emoji: "🎯",
    tags: ["spiel"],
    titleEn: "Mini Games",
    excerptEn: "Five classics for a quick break: Nine Men's Morris, Checkers, Mini Golf, Billiards and Sudoku."
   },
   {
    title: "Pfotenglück",
    excerpt: "Such dir einen von vier Welpen aus dem Tierheim aus, gib ihm einen Namen und kümmere dich um ihn.",
    date: "2026-09-30",
    category: "freizeit",
    subcategory: null,
    url: "pfotengluck.html",
    emoji: "🐶",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Paw Happiness",
    excerptEn: "Pick one of four shelter puppies, give it a name and take care of it."
   },
   {
    title: "Klecks-Wache",
    excerpt: "Prozentrechnung-Lernspiel: Die Klasse verteidigt gemeinsam den Schulranzen gegen die Kleckse oder zwei Lernende treten im Duell an.",
    date: "2026-09-30",
    category: "schule",
    subcategory: "mathematik",
    url: "klecks-wache.html",
    emoji: "🎒",
    tags: ["spiel", "gruppenarbeit", "jg7"],
    titleEn: "Blob Guard",
    excerptEn: "Percentage learning game: the class defends the school bag against the blobs together, or two students face off in a duel."
   },
   {
    title: "Lichtlabor Klasse 7",
    excerpt: "Interaktives Lichtlabor für Klasse 7 zum Ausprobieren und Entdecken. (Externe Seite)",
    date: "2026-09-30",
    category: "schule",
    subcategory: "weiterefaecher",
    url: "https://lichtlabor-klasse-7.sebastianholle.chatgpt.site/",
    emoji: "💡",
    tags: ["tool", "jg7"],
    titleEn: "Light Lab Grade 7",
    excerptEn: "Interactive light lab for grade 7 to experiment and explore. (External site)"
   },
   {
    title: "Prozentinsel",
    excerpt: "3D-Lernspiel zur Prozentrechnung: Die Insel erkunden, Rätsel lösen und am Ende die Burg erobern.",
    date: "2026-10-01",
    category: "schule",
    subcategory: "mathematik",
    url: "prozentinsel.html",
    emoji: "🏝️",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Percent Island",
    excerptEn: "3D learning game on percentages: explore the island, solve puzzles and conquer the castle at the end."
   },
   {
    title: "Du und die Schokoladenfabrik",
    excerpt: "3D-Betriebserkundung für Arbeitslehre und Berufsorientierung: Eine Schokoladenfabrik erkunden und Aufgaben lösen (ca. 45–60 Minuten).",
    date: "2026-10-02",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "schokoladenfabrik.html",
    emoji: "🍫",
    tags: ["spiel", "einzelarbeit", "jg8"],
    titleEn: "You and the Chocolate Factory",
    excerptEn: "3D company tour for work studies and career orientation: explore a chocolate factory and solve tasks (about 45–60 minutes)."
   },
   {
    title: "Bruch-Domino & Bruch-Memory",
    excerpt: "Brüche, Dezimalzahlen, Prozentangaben und Bilder einander zuordnen: als Domino oder Memory, allein oder mit bis zu 4 Spielenden, in drei Stufen.",
    date: "2026-10-02",
    category: "schule",
    subcategory: "mathematik",
    url: "bruch-domino-memory.html",
    emoji: "🎲",
    tags: ["spiel", "einzelarbeit", "partnerarbeit", "gruppenarbeit"],
    titleEn: "Fraction Domino & Fraction Memory",
    excerptEn: "Match fractions, decimals, percentages and pictures as domino or memory, solo or with up to 4 players, in three levels."
   },
   {
    title: "Gleichungs-Waage",
    excerpt: "Gleichungen als Waage lösen: Auf beiden Seiten dieselbe Umformung anwenden, bis x allein steht. Allein, zu zweit an einem Gerät oder online im Raum.",
    date: "2026-10-02",
    category: "schule",
    subcategory: "mathematik",
    url: "gleichungs-waage.html",
    emoji: "⚖️",
    tags: ["spiel", "einzelarbeit", "partnerarbeit"],
    titleEn: "Equation Balance",
    excerptEn: "Solve equations like a balance scale: apply the same step to both sides until x stands alone. Solo, two players on one device or online in a room."
   },
   {
    title: "Koordinaten-Schiffe",
    excerpt: "Schiffe versenken mit Koordinaten: Punkte im Koordinatensystem richtig ablesen, allein gegen den Computer oder online gegen eine Mitschülerin bzw. einen Mitschüler.",
    date: "2026-10-02",
    category: "schule",
    subcategory: "mathematik",
    url: "koordinaten-schiffe.html",
    emoji: "🚢",
    tags: ["spiel", "einzelarbeit", "partnerarbeit"],
    titleEn: "Coordinate Battleships",
    excerptEn: "Battleships with coordinates: read points in the coordinate system correctly, solo against the computer or online against a classmate."
   },
   {
    title: "Mein Budget-Leben",
    excerpt: "Verbraucherbildung zum Ausprobieren: Mit einem Einkommen Miete, Handyvertrag und Versicherungen bezahlen und mit Überraschungen klarkommen. Das Spiel passt sich an.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "budget-lebensspiel.html",
    emoji: "💶",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "My Budget Life",
    excerptEn: "Consumer education hands-on: pay rent, phone contract and insurance from an income and cope with surprises. The game adapts to you."
   },
   {
    title: "Zufalls-Labor",
    excerpt: "Drehen, würfeln, ziehen: Zufallsexperimente durchführen und beobachten, wie aus Zufall Verlässlichkeit wird – mit Häufigkeiten und Baumdiagrammen.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "mathematik",
    url: "zufalls-labor.html",
    emoji: "🎲",
    tags: ["tool"],
    titleEn: "Chance Lab",
    excerptEn: "Spin, roll, draw: run random experiments and watch how chance turns into reliability – with relative frequencies and tree diagrams."
   },
   {
    title: "Rätsel des Tages",
    excerpt: "Jeden Tag ein neues Rätsel zum Knobeln, mit Hinweisen, Sternen und Serie. Für verschiedene Klassenstufen.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "raetsel-des-tages.html",
    emoji: "🧩",
    tags: ["tool", "einzelarbeit", "vertretung"],
    titleEn: "Puzzle of the Day",
    excerptEn: "A new brain teaser every day, with hints, stars and streaks. For different grade levels."
   },
   {
    title: "Werkstatt-Check: Sicherheit und Werkzeuge",
    excerpt: "Gefahren in der Werkstatt finden, Werkzeuge ihrem Einsatz zuordnen und Sicherheitszeichen testen. Drei Spiele in einem.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "werkstatt-check.html",
    emoji: "🛠️",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Workshop Check: Safety and Tools",
    excerptEn: "Find hazards in the workshop, match tools to their use and test safety signs. Three games in one."
   },
   {
    title: "Escape-Room-Baukasten 3D",
    excerpt: "Gemeinsam den Code knacken: Rätsel lösen, Code-Teile sammeln und die Tür öffnen, jetzt in 3D. Mit eigenen Räumen zum Erstellen, Speichern und Exportieren.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "escape-room-baukasten-3d.html",
    emoji: "🔐",
    tags: ["spiel", "gruppenarbeit"],
    titleEn: "Escape Room Kit 3D",
    excerptEn: "Crack the code together: solve puzzles, collect code parts and open the door, now in 3D. With your own rooms to create, save and export."
   },
   {
    title: "Escape-Room-Baukasten 3D",
    excerpt: "Gemeinsam den Code knacken: Rätsel lösen, Code-Teile sammeln und die Tür öffnen, jetzt in 3D. Mit eigenen Räumen zum Erstellen, Speichern und Exportieren.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "mathematik",
    url: "escape-room-baukasten-3d.html",
    emoji: "🔐",
    tags: ["spiel", "gruppenarbeit"],
    titleEn: "Escape Room Kit 3D",
    excerptEn: "Crack the code together: solve puzzles, collect code parts and open the door, now in 3D. With your own rooms to create, save and export."
   },
   {
    title: "Berufe-Kompass",
    excerpt: "Finde heraus, was zu dir passt, und teste, wie gut du Berufe kennst. Mehrere Stufen zur Berufsorientierung.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "berufe-kompass.html",
    emoji: "🧭",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Careers Compass",
    excerptEn: "Find out what suits you and test how well you know different jobs. Several levels for career orientation."
   },
   {
    title: "Vorstellungsgespräch-Simulator",
    excerpt: "Das Vorstellungsgespräch in 3D üben: Auf Fragen antworten, Reaktionen erleben und typische Situationen vor dem echten Gespräch ausprobieren.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "vorstellungsgespraech.html",
    emoji: "🤝",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Job Interview Simulator",
    excerptEn: "Practise the job interview in 3D: answer questions, see reactions and try typical situations before the real thing."
   },
   {
    title: "Gehaltszettel-Detektiv",
    excerpt: "Wo bleibt das Geld zwischen Brutto und Netto? Fünf Fälle lösen: Abzüge auf echten Gehaltszetteln aufspüren, ordnen, rechnen, vergleichen und Fehler finden.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "gehaltszettel-detektiv.html",
    emoji: "🕵️",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Payslip Detective",
    excerptEn: "Where does the money go between gross and net? Solve five cases: track down deductions on real payslips, sort, calculate, compare and find mistakes."
   },
   {
    title: "KI-Führerschein – Das Rechenzentrum",
    excerpt: "Wie funktioniert KI? Im 3D-Rechenzentrum Stationen zu Training, Daten, Sprachmodellen und Fakten-Check durchlaufen und den KI-Führerschein in zwei Klassen (Basis und Profi) machen.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "ki-fuehrerschein.html",
    emoji: "🪪",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "AI Driving Licence – The Data Centre",
    excerptEn: "How does AI work? Visit stations on training, data, language models and fact-checking in a 3D data centre and earn the AI licence in two classes (Basic and Pro)."
   },
];
