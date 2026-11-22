# Firestore-Regeln einspielen (ca. 5 Minuten)

## Automatisch einspielen (seit 22.11.2026)
Ändert sich `firebase/firestore.rules` auf `main`, spielt die GitHub Action **„Firestore-Regeln einspielen“** (`.github/workflows/firestore-regeln.yml`, Skript `tools/firestore-regeln.mjs`) die Datei selbst ein. Vorher sichert sie die Live-Regeln (unter „Artifacts“ des Laufs, 90 Tage) und bricht ab, wenn live ein Bereich geregelt ist, der in der Datei fehlt – dann erst die Datei ergänzen oder die Aktion von Hand mit „trotzdem“ starten. Zurück geht es jederzeit in der Konsole unter Firestore › Regeln › Verlauf.

**Ab jetzt gilt nur noch die Datei.** Regeln, die nur in der Konsole geändert werden, überschreibt der nächste Lauf.

### Einmalige Einrichtung (geht auch am iPhone)
1. **Dienstkonto anlegen:** https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=kanban-board-281da → Name `regeln-einspielen` → „Erstellen und fortfahren“ → Rolle **Firebase Rules Admin** (Firebase-Regeladministrator) → „Fertig“. Diese Rolle darf nur Regeln ändern, keine Daten lesen.
2. **Schlüssel erzeugen:** das neue Konto antippen → Reiter „Schlüssel“ → „Schlüssel hinzufügen“ → „Neuen Schlüssel erstellen“ → JSON. Die Datei landet in „Downloads“.
3. **In GitHub hinterlegen:** https://github.com/cr4M0710/buildspace/settings/secrets/actions/new → Name `FIREBASE_SERVICE_ACCOUNT`, Wert = kompletter Inhalt der JSON-Datei (in der Dateien-App öffnen, alles markieren, kopieren) → „Add secret“.
4. **JSON-Datei löschen** (auch aus „Zuletzt gelöscht“).
5. **Ersten Lauf starten:** https://github.com/cr4M0710/buildspace/actions/workflows/firestore-regeln.yml → „Run workflow“. Grüner Haken = Regeln sind live.

> **Stand 31.10.2026:** In der Konsole laufen Marcs bisherige Regeln. Nur die Blöcke `boards`, `tool_feedback`, `highscores` und (11:35 Uhr) `taskProgress` wurden durch die abgesicherten Fassungen aus `firestore.rules` ersetzt. Der Sicherheits-Check meldet danach alles geschützt. Die Vorversion vom 29.10. steht im Regelverlauf der Konsole und lässt sich mit einem Klick wiederherstellen. `firestore.rules` ist die vollständige Referenzfassung, falls die Regeln einmal komplett neu geschrieben werden.

Die Datenbank (Firebase-Projekt `kanban-board-281da`) speichert u. a. Lehrkräfte-Adressen, Schüler-Pseudonyme, Abgaben, Kanban-Boards, Cockpit-Daten und die Strafenkasse. Wer die Daten lesen darf, entscheiden **allein die Firestore-Regeln** – der Programmcode auf der Website kann das nicht absichern, weil er öffentlich ist.

`firestore.rules` in diesem Ordner enthält die vollständigen, abgesicherten Regeln für alle Funktionen von buildspace.

## 1. Vorher: aktuellen Stand prüfen
1. **https://buildspaceos.de/tools/sicherheits-check.html** öffnen → „Check starten“.
2. Steht überall „geschützt ✓“, sind deine Regeln schon dicht. Steht irgendwo „OFFEN ✗“, weiter mit Schritt 2.

## 2. Sicherung der alten Regeln
Firebase-Konsole → Projekt **kanban-board-281da** → **Firestore Database** → Reiter **Regeln** → den kompletten Text kopieren und irgendwo sichern (z. B. Notiz). So kannst du jederzeit zurück.

## 3. Neue Regeln einspielen
1. Im selben Fenster den kompletten Text löschen.
2. Inhalt von `firebase/firestore.rules` einfügen → **Veröffentlichen**.
3. Meldet die Konsole einen Fehler, den Text der Meldung an Claude schicken.

## 4. Nachher testen
- Sicherheits-Check erneut → alles „geschützt ✓“ (Bestenliste und Aufrufzähler sind absichtlich öffentlich).
- Kurz durchklicken: Classroom Management anmelden, Lernbereich mit einem Schüler-Code, ein Kanban-Board, Strafenkasse, Hallendienst, Cockpit-Sync. Klappt etwas nicht mehr („Missing or insufficient permissions“), Claude Bescheid geben – oder die gesicherten alten Regeln wieder einspielen.

## Was die Regeln absichern
| Bereich | Wer darf lesen | Wer darf schreiben |
|---|---|---|
| Lehrkräfte (`teachers`) | jede Lehrkraft nur sich selbst, Marc alle | Anlegen nur als „wartend“; freischalten nur Marc |
| Klassen, Projekte (unveröffentlicht) | nur die eigene Lehrkraft | nur die eigene, freigeschaltete Lehrkraft |
| Lernende, Boards, Fortschritt | einzeln mit Code; Listen nur die eigene Lehrkraft | Lehrkraft; Lernende nur ihr eigenes Board/ihren Fortschritt |
| Feedback | nur Marc | jede:r einmal 👍/👎 + kurzer Kommentar |
| Bestenlisten | alle | Eintrag mit Namen bis 16 Zeichen; löschen nur Marc |
| Cockpit, LernWerk, Blockwerk (eigene Daten) | nur das eigene Konto | nur das eigene Konto |
| Strafenkasse | nur eingetragene Kassenwart:innen | dito |
| Hallendienst | alle mit dem Plan-Link (Admin-Adressen nur Admins) | eigene Einträge mit Link (Platzlimit, Frist, Sperre); Dienste & Plan nur eingetragene Admins |

## Empfohlen (einmalig, optional)
- **Firebase › Authentication › Einstellungen › Autorisierte Domains:** prüfen, dass dort nur eigene Adressen stehen (`buildspaceos.de`, `cr4m0710.github.io`, `localhost`, die `…firebaseapp.com`/`…web.app`-Adressen des Projekts) und keine fremden.
- **Google Cloud › Abrechnung › Budgets:** Budget-Warnung (z. B. 1 €) anlegen, damit ein Missbrauch der Datenbank sofort auffällt.
