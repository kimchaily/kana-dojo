# Kana Dōjō

Aufbau, Build und Deployment stehen im `README.md`.

## Backlog

- Der Backlog sind die GitHub-Issues von `kimchaily/kana-dojo`. Vor einer Weiterentwicklung die offenen Issues lesen (Labels: `roadmap`, `enhancement`, `bug`, `content`, `aus-app`).
- Neue Wünsche aus dem Gespräch als Issue anlegen, nicht in einer Datei im Repo sammeln.
- Erledigtes im Commit oder PR mit `Closes #Nr` schliessen.

## Nach Änderungen an `web/app.html`

`bash tools/build-web.sh` ausführen und `app/src/main/assets/index.html` mit committen.
