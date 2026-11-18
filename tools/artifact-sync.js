#!/usr/bin/env node
// Vergleicht das veröffentlichte Claude-Artefakt mit dem Repo und sagt, was zu tun ist.
//   node tools/artifact-sync.js <gespeicherte-artefakt.html> [--ref origin/main]
// Eingabe: die Datei, die das Artifact-Tool beim Lesen («read») des Artefakts speichert.
// Ausgabe (JSON auf stdout), Feld «status»:
//   in-sync          Artefakt entspricht dem Stand von <ref>. Nichts tun.
//   main-ahead       <ref> ist neuer: bash tools/build-artifact.sh und Artefakt neu veröffentlichen.
//   dev-ahead        Artefakt zeigt einen Entwicklungsstand, der noch nicht in <ref> ist. Nichts tun.
//   artifact-changed Das Artefakt wurde ausserhalb des Repos geändert. Die App-Fassung steht in
//                    «appFile»: als web/app.html auf einen Branch übernehmen, PR öffnen, nicht überschreiben.
//   unknown          Versionskennung fehlt oder Commit unbekannt: Artefakt-Fassung wie artifact-changed behandeln.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = process.argv[2];
const refIdx = process.argv.indexOf('--ref');
const ref = refIdx > 0 ? process.argv[refIdx + 1] : 'origin/main';
if (!file) { console.error('Aufruf: node tools/artifact-sync.js <artefakt.html> [--ref origin/main]'); process.exit(2); }
const root = path.resolve(__dirname, '..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const tryGit = (...a) => { try { return git(...a); } catch (e) { return null; } };
const norm = t => String(t).replace(/\r\n/g, '\n').trim();

// Seitenkörper ohne die Hülle, die das Artefakt-System beim Veröffentlichen ergänzt.
let html = fs.readFileSync(file, 'utf8');
const b = html.indexOf('<body>'), e = html.lastIndexOf('</body>');
if (b >= 0 && e > b) html = html.slice(b + 6, e);
const TAG = /^\s*<script>window\.__KD_VERSION="([0-9a-f]{7,40}) · Artefakt"<\/script>\n?/;
const m = html.match(TAG);
const app = norm(m ? html.slice(m[0].length) : html);
const sha = m ? m[1] : null;

tryGit('fetch', '-q', 'origin', ref.replace(/^origin\//, ''));
const refSha = (tryGit('rev-parse', '--short', ref) || '').trim();
const refApp = norm(git('show', ref + ':web/app.html'));
const shaApp = sha ? tryGit('show', sha + ':web/app.html') : null;

const out = { artifactSha: sha, ref, refSha };
const writeApp = () => { const p = path.join(root, 'artifact', 'from-artifact.html'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, app + '\n'); return p; };
if (!sha || shaApp == null) { out.status = 'unknown'; out.appFile = writeApp(); }
else if (norm(shaApp) !== app) { out.status = 'artifact-changed'; out.appFile = writeApp(); }
else if (app === refApp) out.status = 'in-sync';
else if (tryGit('merge-base', '--is-ancestor', sha, ref) !== null) out.status = 'main-ahead';
else out.status = 'dev-ahead';
console.log(JSON.stringify(out, null, 2));
