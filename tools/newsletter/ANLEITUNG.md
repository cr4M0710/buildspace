# Newsletter einrichten (einmalig, ca. 10 Minuten)

Die Seite `newsletter.html` ist fertig. Damit Anmelden und Versand live funktionieren, braucht es einmal das kleine Backend in deinem Google-Konto. Danach läuft alles von selbst.

> **Tipp:** Die Mails kommen von der Adresse des Google-Kontos, in dem das Skript läuft. Wer seine private Gmail-Adresse nicht zeigen möchte, legt dafür ein eigenes Konto an (z. B. `buildspace.newsletter@gmail.com`).

## 1. Skript anlegen
1. Auf **script.google.com** → **Neues Projekt**, Namen setzen: `buildspace Newsletter`.
2. Inhalt von `Code.gs` (dieser Ordner) komplett in die Datei `Code.gs` im Editor einfügen und speichern.
3. Links **Projekteinstellungen (Zahnrad)** → Haken bei **„Manifestdatei appsscript.json im Editor anzeigen“**. Dann im Editor `appsscript.json` öffnen und den Inhalt von `appsscript.json` (dieser Ordner) einfügen, speichern.

## 2. Einrichten
1. Oben in der Funktionsauswahl **`setup`** wählen → **Ausführen**.
2. Google fragt nach Berechtigungen → Konto wählen → „Erweitert“ → „Zu buildspace Newsletter wechseln“ → **Zulassen**.
3. `setup` legt die private Tabelle an, merkt sich alle bestehenden Tools (die werden also nicht verschickt) und stellt den Versand auf **sonntags 18 Uhr**. Im Protokoll steht der Link zur Tabelle.

## 3. Als Web-App veröffentlichen
1. **Bereitstellen → Neue Bereitstellung** → Typ **Web-App**.
2. *Ausführen als:* **Ich** · *Zugriff:* **Jeder** → **Bereitstellen**.
3. Die **Web-App-URL** (endet auf `/exec`) kopieren.

## 4. Adresse auf buildspace eintragen
In `newsletter.html` die Zeile
```js
var NEWSLETTER_API = window.NEWSLETTER_API_OVERRIDE || "";
```
→ die URL zwischen die Anführungszeichen setzen. (Oder Claude die URL schicken – Claude trägt sie ein und pusht.)

## 5. Testen
- `sendTestDigest` ausführen → Vorschau des Newsletters kommt an dich.
- Auf buildspaceos.de/newsletter.html mit einer eigenen Adresse anmelden, Mail bestätigen, Abmeldelink testen.

## Später ändern
- **Code geändert?** Code.gs einfügen → **Bereitstellen → Bereitstellungen verwalten → Bearbeiten (Stift) → Version: Neue Version → Bereitstellen.** Die URL bleibt gleich.
- **Versandtag/-uhrzeit:** oben in `CONFIG` (`SEND_DAY`, `SEND_HOUR`) ändern, dann `setup` erneut ausführen.
- **Überblick:** `status` ausführen (Anzahl Abos, Mail-Kontingent).
- **Sofort verschicken:** `sendWeeklyDigest` ausführen.
- **Grenze:** Ein normales Google-Konto darf ca. 100 Mails pro Tag über Apps Script senden. Reicht das nicht mehr, meldet das Skript den Rest beim nächsten Lauf erneut.

## Lokal testen
`node tools/newsletter/test.js` – prüft das Backend mit nachgebauten Google-Diensten (läuft auch automatisch bei jedem Push).
