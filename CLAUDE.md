# Kana Dōjō

Aufbau, Build und Deployment stehen im `README.md`.

## Entwicklungsablauf

- Jede Änderung auf einem eigenen Branch mit Pull Request gegen `main`, nie direkt auf `main`.
- Der Pages-Workflow veröffentlicht jeden offenen PR als Vorschau unter `https://kimchaily.github.io/kana-dojo/preview/<branch>/` (Übersicht: `…/preview/`). Nach dem Push den Vorschau-Link nennen, damit die Änderung vor dem Merge auf dem Telefon getestet werden kann.
- Nach Änderungen an `web/app.html`: `bash tools/build-web.sh` ausführen und `app/src/main/assets/index.html` mit committen.
- Vor dem Push: `bash tools/build-pages.sh && node tools/smoke-test.js`. Der Test läuft auch in jedem Pull Request. Neue Abläufe dort ergänzen.
- Zweisprachig: Neue Oberflächentexte auf Deutsch schreiben und die englische Fassung in `UI_EN` (oder als Muster in `UI_RX`) ergänzen. Neue Inhalte zusätzlich in `EN_DATA`.
- Lernprinzip der App: Nichts wird abgefragt, was nicht vorher vorgestellt wurde. Neue Übungen an gelernte Reihen oder Karten binden.

## Backlog

- Der Backlog sind die GitHub-Issues von `kimchaily/kana-dojo` (Labels: `roadmap`, `enhancement`, `bug`, `content`, `aus-app`). Vor einer Weiterentwicklung die offenen Issues lesen.
- Erledigtes im Commit oder PR mit `Closes #Nr` schliessen.

### Nach jeder Umsetzung

1. **Nächste Schritte vorschlagen:** Am Ende die zwei bis drei relevantesten offenen Issues nennen, jeweils mit Link und einem Satz, warum gerade jetzt (Abhängigkeiten, Aufwand, Nutzen). Einträge mit `aus-app` und `bug` zuerst prüfen.
2. **Neue Ideen sichern, aber erst nach Rückfrage:** Ideen, die im Gespräch oder in den Abschnitten «Was man hinterfragen könnte» / «Verwandte Themen» auftauchen, nicht stillschweigend anlegen. Zuerst fragen (mit Auswahlknöpfen, wenn verfügbar), ob sie
   - als neues Issue angelegt,
   - einem bestehenden Issue als Punkt hinzugefügt (welchem, mit Nummer) oder
   - verworfen werden sollen.
   Erst nach der Antwort schreiben.
