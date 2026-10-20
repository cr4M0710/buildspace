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
    tags: ["spiel", "geometrie", "mehrgeraete", "vertretung", "jg6"],
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
    tags: ["tool", "kopfrechnen", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
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
    url: "strafenkasse/index.html?team=m1",
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
    tags: ["spiel", "einzelarbeit", "gruppenarbeit", "mehrgeraete"],
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
    tags: ["spiel", "einzelarbeit", "gruppenarbeit", "mehrgeraete"],
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
    tags: ["spiel", "zahlen", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "vertretung", "jg5"],
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
    tags: ["tool", "kopfrechnen", "jg5", "jg6", "jg7"],
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
    tags: ["spiel", "bruchrechnung", "partnerarbeit", "vertretung", "jg6", "jg7"],
    titleEn: "Fraction Quiz (Football)",
    excerptEn: "A maths penalty shoot-out for 2 players: solve fraction problems — get it right and you take the shot."
   },
   {
    title: "Prozent-Rennen",
    excerpt: "Wettrennen zur Prozentrechnung: Prozentwert, Prozentsatz, Grundwert, Rabatt, Mehrwertsteuer und Zinsen. Wähle Themen und Niveau – allein, zu mehreren an einem Gerät, über mehrere Geräte oder als Klassenquiz mit Host (wie Kahoot).",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "prozent-rennen.html",
    emoji: "📊",
    tags: ["spiel", "prozent", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "vertretung", "jg6", "jg7", "jg8", "jg9"],
    titleEn: "Percentage Race",
    excerptEn: "Race through percentages: percentage value, rate, base value, discounts, VAT and interest. Pick topics and level – solo, several players on one device, several devices, or as a class quiz with a host (like Kahoot)."
   },
   {
    title: "Gleichungs-Duell",
    excerpt: "Lineare Gleichungen nach x auflösen – von einem Rechenschritt bis x auf beiden Seiten, Klammern, Brüche und Textaufgaben. Wähle Themen und Niveau – allein, zu mehreren an einem Gerät, über mehrere Geräte oder als Klassenquiz mit Host (wie Kahoot).",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "gleichungs-duell.html",
    emoji: "⚔️",
    tags: ["spiel", "gleichungen", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "vertretung", "jg7", "jg8", "jg9"],
    titleEn: "Equation Duel",
    excerptEn: "Solve linear equations for x – from one step to x on both sides, brackets, fractions and word problems. Pick topics and level – solo, several players on one device, several devices, or as a class quiz with a host (like Kahoot)."
   },
   {
    title: "Flächen-Fuchs",
    excerpt: "Umfang und Fläche von Rechteck, Dreieck, Parallelogramm, Trapez, Kreis und zusammengesetzten Figuren mit beschrifteten Zeichnungen. Wähle Themen und Niveau – allein, zu mehreren an einem Gerät, über mehrere Geräte oder als Klassenquiz mit Host (wie Kahoot).",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "flaechen-fuchs.html",
    emoji: "🦊",
    tags: ["spiel", "geometrie", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "vertretung", "jg5", "jg6", "jg7", "jg8"],
    titleEn: "Area Fox",
    excerptEn: "Perimeter and area of rectangles, triangles, parallelograms, trapezoids, circles and composite shapes with labelled drawings. Pick topics and level – solo, several players on one device, several devices, or as a class quiz with a host (like Kahoot)."
   },
   {
    title: "Zahlen-Detektiv",
    excerpt: "Zahlenrätsel lösen: Aus Hinweisen zu gerade/ungerade, Teilbarkeit, Quersumme und Primzahlen die gesuchte Zahl finden. Wähle Themen und Niveau – allein, zu mehreren an einem Gerät, über mehrere Geräte oder als Klassenquiz mit Host (wie Kahoot).",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "zahlen-detektiv.html",
    emoji: "🕵️",
    featured: true,
    tags: ["spiel", "zahlen", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "vertretung", "jg5", "jg6", "jg7"],
    titleEn: "Number Detective",
    excerptEn: "Solve number puzzles: find the hidden number from clues about odd/even, divisibility, digit sum and primes. Pick topics and level – solo, several players on one device, several devices, or as a class quiz with a host (like Kahoot)."
   },
   {
    title: "Kopfrechen-Quiz",
    excerpt: "Blitzschnelles Kopfrechnen mit Plus, Minus, Mal, Geteilt, Potenzen und Schätzen. Wähle Themen und Niveau – allein, zu mehreren an einem Gerät, über mehrere Geräte oder als Klassenquiz mit Host (wie Kahoot).",
    date: "2026-09-18",
    category: "schule",
    subcategory: "mathematik",
    url: "kopfrechen-quiz.html",
    emoji: "⚡",
    featured: true,
    tags: ["spiel", "kopfrechnen", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "vertretung", "jg5", "jg6", "jg7", "jg8"],
    titleEn: "Mental Maths Quiz",
    excerptEn: "Lightning-fast mental maths: addition, subtraction, multiplication, division, powers and estimating. Pick topics and level – solo, several players on one device, several devices, or as a class quiz with a host (like Kahoot)."
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
    tags: ["spiel", "berufsorientierung", "partnerarbeit", "gruppenarbeit", "jg8", "jg9"],
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
    tags: ["tool", "organisation", "jg5", "jg6"],
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
    tags: ["tool", "organisation", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
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
    tags: ["spiel", "geschichte", "jg10"],
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
    tags: ["tool", "naturwissenschaften", "jg7"],
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
    tags: ["tool", "funktionen", "einzelarbeit", "jg9", "jg10"],
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
    tags: ["spiel", "kopfrechnen", "partnerarbeit", "vertretung", "jg5", "jg6", "jg7"],
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
    tags: ["tool", "projektarbeit", "gruppenarbeit", "jg7", "jg8", "jg9", "jg10"],
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
    tags: ["tool", "projektarbeit", "gruppenarbeit", "jg7", "jg8", "jg9", "jg10"],
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
    tags: ["tool", "organisation"],
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
    tags: ["tool", "wirtschaft", "jg9"],
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
    tags: ["ki"],
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
    tags: ["spiel", "funktionen", "mehrgeraete", "klassenquiz", "jg8", "jg9", "jg10"],
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
    tags: ["spiel", "prozent", "gruppenarbeit", "mehrgeraete", "jg6", "jg7", "jg8"],
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
    tags: ["tool", "naturwissenschaften", "jg7"],
    titleEn: "Light Lab Grade 7",
    excerptEn: "Interactive light lab for grade 7 to experiment and explore. (External site)"
   },
   {
    title: "Prozentinsel",
    excerpt: "3D-Lernspiel zur Prozentrechnung – komplett: Die Insel mit Marktplatz, Supermarkt, Schatzhöhle, Fabrik und Burg erkunden, Aufgaben lösen und Bereiche freischalten. Spielstand wird gespeichert.",
    date: "2026-10-01",
    category: "schule",
    subcategory: "mathematik",
    url: "prozentinsel.html",
    emoji: "🏝️",
    tags: ["spiel", "prozent", "einzelarbeit", "jg6", "jg7", "jg8"],
    titleEn: "Percent Island",
    excerptEn: "Complete 3D learning game on percentages: explore the island with market square, supermarket, treasure cave, factory and castle, solve tasks and unlock areas. Progress is saved."
   },
   {
    title: "Du und die Schokoladenfabrik",
    excerpt: "3D-Betriebserkundung für Arbeitslehre und Berufsorientierung: Eine Schokoladenfabrik erkunden und Aufgaben lösen (ca. 45–60 Minuten).",
    date: "2026-10-02",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "schokoladenfabrik.html",
    emoji: "🍫",
    tags: ["spiel", "berufsorientierung", "einzelarbeit", "jg8", "jg9"],
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
    tags: ["spiel", "bruchrechnung", "einzelarbeit", "partnerarbeit", "gruppenarbeit", "jg5", "jg6", "jg7"],
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
    tags: ["spiel", "gleichungen", "einzelarbeit", "partnerarbeit", "mehrgeraete", "jg7", "jg8"],
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
    tags: ["spiel", "funktionen", "einzelarbeit", "partnerarbeit", "mehrgeraete", "jg5", "jg6", "jg7"],
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
    tags: ["spiel", "wirtschaft", "einzelarbeit", "jg8", "jg9", "jg10"],
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
    tags: ["tool", "wahrscheinlichkeit", "jg7", "jg8", "jg9"],
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
    tags: ["tool", "raetsel", "einzelarbeit", "vertretung", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
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
    tags: ["spiel", "werkstatt", "einzelarbeit", "jg7", "jg8"],
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
    tags: ["spiel", "gruppenarbeit", "mehrgeraete", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
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
    tags: ["spiel", "gruppenarbeit", "mehrgeraete", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
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
    tags: ["spiel", "berufsorientierung", "einzelarbeit", "jg8", "jg9", "jg10"],
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
    tags: ["spiel", "berufsorientierung", "einzelarbeit", "jg9", "jg10"],
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
    tags: ["spiel", "wirtschaft", "einzelarbeit", "jg9", "jg10"],
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
    tags: ["spiel", "ki", "einzelarbeit", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "AI Driving Licence – The Data Centre",
    excerptEn: "How does AI work? Visit stations on training, data, language models and fact-checking in a 3D data centre and earn the AI licence in two classes (Basic and Pro)."
   },
   {
    title: "Pummelparty 3D",
    excerpt: "3D-Brettspiel-Chaos für 2–8 Spieler auf 4 Inseln: Alle spielen mit dem eigenen Gerät, per Code oder Link beitreten, Bots können mitspielen.",
    date: "2026-10-04",
    category: "freizeit",
    subcategory: null,
    url: "pummelparty.html",
    emoji: "🎉",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete"],
    titleEn: "Pummelparty 3D",
    excerptEn: "3D board game chaos for 2–8 players on 4 islands: everyone plays on their own device, join by code or link, bots can join in."
   },
   {
    title: "Kerncurriculum Mathematik 5–10",
    excerpt: "Das schulinterne Mathematik-Curriculum interaktiv: nach Jahrgang, Themenfeld und Kursniveau (A/B/C) filtern, durchsuchen und sortieren – mit Kompetenzen, Buchseiten und digitalen Kompetenzen.",
    date: "2026-10-05",
    category: "schule",
    subcategory: "mathematik",
    folder: "unterrichtsmaterialien",
    gate: "material",
    url: "kerncurriculum-mathematik.html",
    emoji: "📚",
    tags: ["tool", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Mathematics Core Curriculum 5–10",
    excerptEn: "The school's internal maths curriculum, interactive: filter, search and sort by grade, topic area and course level (A/B/C) – with competencies, textbook pages and digital skills."
   },
   {
    title: "Türen-Challenge: Around Town",
    excerpt: "Interaktive Lern-Challenge „Around Town“ als eigenständige Webseite. (Externe Seite, kein buildspace-Inhalt)",
    date: "2026-10-05",
    category: "schule",
    subcategory: "weiterefaecher",
    url: "https://tueren-challenge-around-town-holle.sebastianholle.chatgpt.site/",
    emoji: "🚪",
    tags: ["sprachen", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Doors Challenge: Around Town",
    excerptEn: "Interactive learning challenge \"Around Town\" as a standalone website. (External site, not buildspace content)"
   },
   {
    title: "Kart Krawall",
    excerpt: "3D-Kartrennen mit Grand Prix, Einzelrennen, Zeitfahren und Mehrspieler per Code: Fahrer und Kart wählen, driften, Boosts sammeln und gegen Bots antreten.",
    date: "2026-10-07",
    category: "freizeit",
    subcategory: null,
    url: "kart-krawall.html",
    emoji: "🏎️",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete"],
    titleEn: "Kart Krawall",
    excerptEn: "3D kart racing with Grand Prix, single races, time trial and multiplayer by code: pick a driver and kart, drift, collect boosts and race against bots."
   },
   {
    title: "Lückenlos",
    excerpt: "Einparken ohne Kratzer: 30 Lücken in vier Stufen, vom Kompaktwagen bis zum Gespann mit Anhänger. Wer etwas berührt, fängt von vorn an.",
    date: "2026-10-07",
    category: "freizeit",
    subcategory: null,
    url: "lueckenlos.html",
    emoji: "🚗",
    tags: ["spiel", "einzelarbeit"],
    titleEn: "Gapless",
    excerptEn: "Parking without a scratch: 30 spaces in four stages, from a compact car to a rig with a trailer. Touch anything and you start over."
   },
   {
    title: "Kochfaul",
    excerpt: "Kochen für Faule: Supermarkt, Wochenbudget und Faulheitsgrad wählen – daraus entstehen ein Wochenplan mit einfachen Rezepten und eine nach Laufweg sortierte Einkaufsliste.",
    date: "2026-10-07",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "kochfaul.html",
    emoji: "🍝",
    tags: ["tool", "ernaehrung", "einzelarbeit", "jg7", "jg8", "jg9"],
    titleEn: "Kochfaul – Cooking for the Lazy",
    excerptEn: "Cooking for the lazy: pick a supermarket, weekly budget and laziness level to get a weekly plan with easy recipes and a shopping list sorted by store route."
   },
   {
    title: "KomPo7 – Formulierungshilfe",
    excerpt: "Beobachtungen den neun Schlüsselkompetenzen zuordnen und als Satzbausteine in einen Bericht übernehmen – in der dritten Person, im Präteritum, Mitschüler anonymisiert.",
    date: "2026-10-07",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "kompo7-formulierungshilfe.html",
    emoji: "📝",
    tags: ["tool", "berufsorientierung", "einzelarbeit", "jg7", "jg8"],
    titleEn: "KomPo7 – Writing Aid",
    excerptEn: "Assign observations to the nine key competencies and turn them into sentence building blocks for a report – third person, past tense, classmates anonymised."
   },
   {
    title: "Blockwerk",
    excerpt: "Eine Welt aus Blöcken, die du Stück für Stück umbaust: bauen, abbauen und erkunden im Einzelspieler oder gemeinsam im Mehrspieler-Modus, mit Maus und Tastatur oder per Touch.",
    date: "2026-10-07",
    category: "freizeit",
    subcategory: null,
    url: "blockwerk.html",
    emoji: "🧱",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete"],
    titleEn: "Blockwerk",
    excerptEn: "A world of blocks that you rebuild piece by piece: build, mine and explore alone or together in multiplayer, with mouse and keyboard or touch."
   },
   {
    title: "Vokabel-Arena",
    excerpt: "Vokabeln lernen in 9 Sprachen (DE, EN, ES, FR, Latein, RU, UK, TR, ZH) mit adaptivem Karteikasten, A1–B1-Grundwortschatz, eigenen Listen samt Import/Export, Tests digital oder zum Drucken mit Note, Spielen für 1–4 Spieler und einem Live-Klassenquiz per QR-Code.",
    date: "2026-10-09",
    category: "schule",
    subcategory: "weiterefaecher",
    url: "vokabel-arena.html",
    emoji: "🗣️",
    tags: ["spiel", "tool", "sprachen", "einzelarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Vocab Arena",
    excerptEn: "Learn vocabulary in 9 languages with an adaptive flashcard box, A1–B1 core vocabulary, custom lists with import/export, digital or printable tests with grades, games for 1–4 players and a live class quiz via QR code."
   },
   {
    title: "KI-Guide für Lehrkräfte",
    excerpt: "Beispielkatalog mit 56 kopierbaren Prompts für Unterricht, E-Mails, Lernspiele, Visualisierungen und Differenzierung, mit Datenschutz-Ampel, Filtern, Favoriten, Prompt-Baukasten und Druckansicht.",
    date: "2026-10-09",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "ki-guide-lehrkraefte.html",
    emoji: "🧭",
    tags: ["tool", "ki", "einzelarbeit"],
    titleEn: "AI Guide for Teachers",
    excerptEn: "Catalogue of 56 copyable prompts for lessons, emails, learning games, visualisations and differentiation, with a privacy traffic light, filters, favourites, a prompt builder and print view."
   },
   {
    title: "Kompetenz-Parcours",
    excerpt: "Kompetenzen für Berufsorientierung und Praktikum spielerisch erleben: 20 Stationen (KomPo7-Schlüsselkompetenzen und berufliche Kompetenzen, 2D und 3D), Selbst- und Fremdeinschätzung per Code, Kompetenztest und Auswertung mit Berufsfeld- und Praktikumsempfehlungen.",
    date: "2026-10-09",
    category: "schule",
    subcategory: "arbeitslehre",
    url: "kompetenz-parcours.html",
    emoji: "🎯",
    tags: ["spiel", "tool", "berufsorientierung", "einzelarbeit", "partnerarbeit", "jg7", "jg8", "jg9"],
    titleEn: "Skills Course",
    excerptEn: "Experience career-related skills through play: 20 stations (KomPo7 key skills and vocational skills, 2D and 3D), self- and peer assessment via code, a skills test and a results page with career field and internship suggestions."
   },
   {
    title: "Jelly Rush",
    excerpt: "Wackeliges Party-Knockout in 3D mit 9 Karten von leicht bis schwer: drei Hindernisläufe, Wabenfall, Wirbelwind, Farbkampf, Schweifjagd und zwei Finals. Allein gegen Bots, mit Freunden per QR-Code oder im Trainingsmodus; Festhalten, Hechtsprung und eigene Bohnen-Figur.",
    date: "2026-10-11",
    category: "freizeit",
    subcategory: null,
    url: "jelly-rush.html",
    emoji: "🫘",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete"],
    titleEn: "Jelly Rush",
    excerptEn: "Wobbly 3D party knockout with 9 maps from easy to hard: three obstacle races, falling hex tiles, a spinning-bar survival, a team ball round, tail tag and two finals. Play solo against bots, with friends via QR code or in training mode; grab, dive and customise your bean."
   },
   {
    title: "Millionenquiz",
    excerpt: "Quiz im Stil der bekannten Fernsehshow: 15 Fragen mit Gewinnleiter, Sicherheitsstufen und drei Jokern, als Übungsmodus (weiter nach Fehlern, mit Auswertung) oder als Klassenspiel (Lehrkraft hostet, Lernende treten per QR-Code bei, wer falsch liegt, scheidet aus). 690 Fragen aus 12 Themenbereichen oder ein eigenes Quiz per Datei, Text oder Formular importieren.",
    date: "2026-10-12",
    category: "schule",
    subcategory: "sonstiges",
    url: "millionenquiz.html",
    emoji: "💰",
    tags: ["spiel", "einzelarbeit", "gruppenarbeit", "mehrgeraete", "klassenquiz", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Millionaire-Style Quiz",
    excerptEn: "Quiz in the style of the well-known TV show: 15 questions with a prize ladder, safe levels and three lifelines, as a practice mode (keep playing after mistakes, with a review) or a class game (teacher hosts, students join via QR code, a wrong answer knocks you out). 690 questions across 12 topics, or import your own quiz via file, pasted text or form."
   },
   {
    title: "Turnier-Arena",
    excerpt: "K.-o.-Turnier mit 9 Minispielen, Quiz-Runden und Duellen (Vier gewinnt, Tauziehen, Schere-Stein-Papier, Nim): per QR-Code beitreten oder gegen Bots in 3 Stufen spielen. Nur wer gewinnt, kommt weiter – wer ausscheidet, schaut live zu.",
    date: "2026-10-12",
    category: "freizeit",
    subcategory: null,
    url: "turnier-arena.html",
    emoji: "🏆",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete"],
    titleEn: "Tournament Arena",
    excerptEn: "Knockout tournament with 9 mini games, quiz rounds and duels (Connect Four, tug of war, rock-paper-scissors, Nim): join via QR code or play against bots on 3 levels. Only winners advance – eliminated players spectate live."
   },
   {
    title: "Spielesalon",
    excerpt: "Zehn klassische Gesellschaftsspiele – Schach, Dame, Mühle, Mensch ärgere dich nicht, Mau-Mau, Vier gewinnt und mehr. Allein gegen Bots in drei Stufen oder mit Freunden per Code und QR-Code, jeweils mit Spielanleitung.",
    date: "2026-10-12",
    category: "freizeit",
    subcategory: null,
    url: "spielesalon.html",
    emoji: "🎲",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete"],
    titleEn: "Game Salon",
    excerptEn: "Ten classic board and card games – chess, checkers, nine men's morris, Ludo, Mau-Mau, Connect Four and more. Play alone against bots on three levels or with friends via code and QR code, each with a rules guide."
   },
   {
    title: "Morgenkreis-Tafel",
    excerpt: "Digitale Morgenkreis-Tafel fürs Klassenzimmer: Datum, Wetter, Wort des Tages, Tagesplan und Anwesenheit auf einen Blick. (Externe Seite, Medienzentrum Gießen-Vogelsberg)",
    date: "2026-09-20",
    category: "schule",
    subcategory: "sonstiges",
    url: "https://morgenkreis.mzgivb.de/",
    emoji: "☀️",
    tags: ["tool", "organisation", "jg5", "jg6"],
    titleEn: "Morning Circle Board",
    excerptEn: "Digital morning-circle board for the classroom: date, weather, word of the day, daily schedule and attendance at a glance. (External site, Medienzentrum Gießen-Vogelsberg)"
   },
   {
    title: "Digiscreen",
    excerpt: "Interaktive Tafel-Oberfläche mit Bausteinen für jedes Fach: Zufallsgenerator, Gruppeneinteilung, Timer, Quiz, Ampel, Taschenrechner und mehr. (Externe Seite, Medienzentrum Gießen-Vogelsberg)",
    date: "2026-09-20",
    category: "schule",
    subcategory: "sonstiges",
    url: "https://digiscreen.mzgivb.de/",
    emoji: "🖥️",
    tags: ["tool", "organisation", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Digiscreen",
    excerptEn: "Interactive whiteboard surface with building blocks for any subject: randomiser, group generator, timer, quiz, traffic light, calculator and more. (External site, Medienzentrum Gießen-Vogelsberg)"
   },
   {
    title: "Rätsel des Tages",
    excerpt: "Jeden Tag ein neues Rätsel zum Knobeln, mit Hinweisen, Sternen und Serie. Für verschiedene Klassenstufen.",
    date: "2026-10-03",
    category: "schule",
    subcategory: "sonstiges",
    url: "raetsel-des-tages.html",
    emoji: "🧩",
    tags: ["tool", "raetsel", "einzelarbeit", "vertretung", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Puzzle of the Day",
    excerptEn: "A new brain teaser every day, with hints, stars and streaks. For different grade levels."
   },
   {
    title: "KI-Guide für Lehrkräfte",
    excerpt: "Beispielkatalog mit 56 kopierbaren Prompts für Unterricht, E-Mails, Lernspiele, Visualisierungen und Differenzierung, mit Datenschutz-Ampel, Filtern, Favoriten, Prompt-Baukasten und Druckansicht.",
    date: "2026-10-09",
    category: "schule",
    subcategory: "sonstiges",
    url: "ki-guide-lehrkraefte.html",
    emoji: "🧭",
    tags: ["tool", "ki", "einzelarbeit"],
    titleEn: "AI Guide for Teachers",
    excerptEn: "Catalogue of 56 copyable prompts for lessons, emails, learning games, visualisations and differentiation, with a privacy traffic light, filters, favourites, a prompt builder and print view."
   },
   {
    title: "Wizard – Das Kartenspiel",
    excerpt: "Wizard digital spielen: Mehrspieler per PeerJS oder gegen eine KI in drei Schwierigkeitsstufen.",
    date: "2026-09-18",
    category: "schule",
    subcategory: "sonstiges",
    url: "wizard-kartenspiel.html",
    emoji: "🧙",
    tags: ["spiel", "einzelarbeit", "gruppenarbeit", "mehrgeraete", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Wizard – The Card Game",
    excerptEn: "Play Wizard digitally: multiplayer via PeerJS or against an AI on three difficulty levels."
   },
   {
    title: "Blockwerk",
    excerpt: "Eine Welt aus Blöcken, die du Stück für Stück umbaust: bauen, abbauen und erkunden im Einzelspieler oder gemeinsam im Mehrspieler-Modus, mit Maus und Tastatur oder per Touch.",
    date: "2026-10-07",
    category: "schule",
    subcategory: "sonstiges",
    url: "blockwerk.html",
    emoji: "🧱",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Blockwerk",
    excerptEn: "A world of blocks that you rebuild piece by piece: build, mine and explore alone or together in multiplayer, with mouse and keyboard or touch."
   },
   {
    title: "Spielesalon",
    excerpt: "Zehn klassische Gesellschaftsspiele – Schach, Dame, Mühle, Mensch ärgere dich nicht, Mau-Mau, Vier gewinnt und mehr. Allein gegen Bots in drei Stufen oder mit Freunden per Code und QR-Code, jeweils mit Spielanleitung.",
    date: "2026-10-12",
    category: "schule",
    subcategory: "sonstiges",
    url: "spielesalon.html",
    emoji: "🎲",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Game Salon",
    excerptEn: "Ten classic board and card games – chess, checkers, nine men's morris, Ludo, Mau-Mau, Connect Four and more. Play alone against bots on three levels or with friends via code and QR code, each with a rules guide."
   },
   {
    title: "Turnier-Arena",
    excerpt: "K.-o.-Turnier mit 9 Minispielen, Quiz-Runden und Duellen (Vier gewinnt, Tauziehen, Schere-Stein-Papier, Nim): per QR-Code beitreten oder gegen Bots in 3 Stufen spielen. Nur wer gewinnt, kommt weiter – wer ausscheidet, schaut live zu.",
    date: "2026-10-12",
    category: "schule",
    subcategory: "sonstiges",
    url: "turnier-arena.html",
    emoji: "🏆",
    tags: ["spiel", "gruppenarbeit", "mehrgeraete", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "Tournament Arena",
    excerptEn: "Knockout tournament with 9 mini games, quiz rounds and duels (Connect Four, tug of war, rock-paper-scissors, Nim): join via QR code or play against bots on 3 levels. Only winners advance – eliminated players spectate live."
   },
   {
    title: "Zahlenstrahl-Werkstatt",
    excerpt: "Zahlenstrahl für natürliche, ganze, Bruch- und rationale Zahlen: Knackpunkte entdecken, Vorgehen Schritt für Schritt, Übungen auf drei Niveaus mit Tipps (Ablesen, Markieren, Einteilen, Schrittweite, Vergleichen, Abstand), Rätsel-Rallye mit Lösungswort und Zahlenstrahl-Generator.",
    date: "2026-10-18",
    category: "schule",
    subcategory: "mathematik",
    url: "zahlenstrahl-werkstatt.html",
    emoji: "📏",
    tags: ["tool", "zahlen", "bruchrechnung", "einzelarbeit", "vertretung", "jg5", "jg6", "jg7"],
    titleEn: "Number Line Workshop",
    excerptEn: "Number lines for natural numbers, integers, fractions and rationals: discover common pitfalls, step-by-step methods, practice on three levels with hints (reading, marking, dividing, step size, comparing, distance), a puzzle rally with a secret word and a number line generator."
   },
   {
    title: "Vertretungsmappe",
    excerpt: "Vertretungsmaterial für einen Unterrichtstag planen: Stunden, Thema, Ablaufplan und Hinweise eintragen und als A4-Zettel drucken, als PDF oder Word-Datei speichern oder als Text verschicken.",
    date: "2026-10-19",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "vertretungsmappe.html",
    emoji: "📋",
    tags: ["tool", "organisation"],
    titleEn: "Cover Lesson Folder",
    excerptEn: "Plan cover material for a school day: enter lessons, topics, lesson plans and notes, then print it as an A4 sheet, save it as PDF or Word, or send it as text."
   },
   {
    title: "LernWerk – Lernspiele-Baukasten",
    excerpt: "Wordwall-Prinzip zum Selberbauen: Inhalte einmal eingeben und in 34 Vorlagen spielen – Quiz, Kreuzworträtsel, Mathe-Generator, Flugzeug, Gruppen bilden u. v. m. Mit Live-Klassenmodus für alle iPads, Vorlesefunktion, Kursen/Klassen, Google-Anmeldung, Schüler- und Kolleg:innen-Links per QR-Code und Arbeitsblatt-Druck.",
    date: "2026-10-19",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "lernwerk.html",
    emoji: "🧩",
    tags: ["tool", "spiel", "einzelarbeit", "mehrgeraete", "klassenquiz", "jg5", "jg6", "jg7", "jg8", "jg9", "jg10"],
    titleEn: "LernWerk – Learning Game Builder",
    excerptEn: "Build-your-own Wordwall: enter content once and play it in 34 templates – quiz, crossword, maths generator, airplane, group maker and more. With a live class mode for all iPads, read-aloud, courses/classes, Google sign-in, student and colleague links via QR code and printable worksheets."
   },
   {
    title: "Sitzplan-Studio",
    excerpt: "Digitale Sitzpläne: Klassenraum mit Tischen, Tafel & Co. einrichten (Vorlagen, Einrasten), Lernende per Drag & Drop setzen, Niveau, Smileys, Punkte und Bemerkungen eintragen, Zufallsauswahl, Gruppen einteilen und als Bild, PDF oder Ausdruck sichern.",
    date: "2026-10-20",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "sitzplan-studio.html",
    emoji: "🪑",
    tags: ["tool", "organisation"],
    titleEn: "Seating Plan Studio",
    excerptEn: "Digital seating plans: set up the classroom with desks, board and more (templates, snap to grid), place students by drag and drop, add levels, smileys, points and notes, pick students at random, build groups and save as image, PDF or printout."
   },
   {
    title: "Förderplan-Bausteine",
    excerpt: "Positiv formulierte Bausteine für Förderpläne: Verhaltensmuster überfachlich sowie für Mathematik und Arbeitslehre wählen, passende Ausgangslage, Ziele und Maßnahmen mit Namen und Pronomen anpassen, kopieren oder in einer Mappe sammeln.",
    date: "2026-10-20",
    category: "schule",
    subcategory: "faecheruebergreifend",
    url: "foerderplan-bausteine.html",
    emoji: "🌱",
    tags: ["tool", "organisation"],
    titleEn: "Support Plan Phrase Bank",
    excerptEn: "Positively worded building blocks for individual support plans: pick a behaviour pattern (cross-curricular, maths, work studies), adapt starting point, goals and measures with name and pronouns, then copy them or collect them in a folder."
   },
   {
    title: "Trigonometrie-Lernpfad",
    excerpt: "Selbstlernpfad Trigonometrie für Jg. 10: sechs Module von sin, cos, tan bis zu Sinusfunktionen, je mit Einführungsbeispiel, Aufgaben auf drei Niveaus (adaptiv), ausführlicher Fehlerrückmeldung, Selbsteinschätzung, PDF-Arbeitsblättern und einem 3D-Abschlussspiel mit Ampel-Auswertung. Mit Lehrkraftversion (Lösungen, Einstellungen, Klassenübersicht).",
    date: "2026-10-20",
    category: "schule",
    subcategory: "mathematik",
    url: "trigonometrie-lernpfad.html",
    emoji: "📐",
    tags: ["tool", "spiel", "geometrie", "funktionen", "einzelarbeit", "vertretung", "jg10"],
    titleEn: "Trigonometry Learning Path",
    excerptEn: "Self-study path on trigonometry for year 10: six modules from sin, cos, tan to sine functions, each with an everyday intro example, adaptive tasks on three levels, detailed error feedback, self-assessment, PDF worksheets and a 3D final game with traffic-light evaluation. Includes a teacher view (solutions, settings, class overview)."
   },
   {
    title: "Formelsammlung interaktiv",
    excerpt: "Die hessische Formelsammlung Realschule zum Durchsuchen und Aufklappen: zu jeder Formel ein Schritt-für-Schritt-Beispiel und ein Mini-Rechner, dazu Einheiten-Umrechner, Statistik- und p-q-Rechner, Merkliste, Lernkarten und Prüfungsmodus.",
    date: "2026-10-20",
    category: "schule",
    subcategory: "mathematik",
    url: "formelsammlung.html",
    emoji: "📘",
    tags: ["tool", "geometrie", "funktionen", "prozent", "wahrscheinlichkeit", "einzelarbeit", "jg8", "jg9", "jg10"],
    titleEn: "Interactive Formula Collection",
    excerptEn: "The Hessian secondary-school formula sheet to search and expand: a step-by-step example and mini calculator for every formula, plus unit converter, statistics and quadratic-formula calculators, bookmarks, flashcards and an exam mode."
   },
];
