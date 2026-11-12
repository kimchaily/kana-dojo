#!/usr/bin/env bash
# Baut die installierbare Web-App für GitHub Pages nach site/.
# Quelle ist web/app.html, dieselbe Datei wie im Claude-Artefakt und in der Android-App.
#
#   bash tools/build-pages.sh [version]                          Produktion
#   PREVIEW_SLUG=mein-branch bash tools/build-pages.sh [version] Vorschau
#
# Eine Vorschau läuft ohne Service Worker und ohne Installations-Manifest, speichert
# ihren Lernstand getrennt von der Produktion und zeigt oben eine Vorschau-Marke.
set -euo pipefail
cd "$(dirname "$0")/.."
version="${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
slug="${PREVIEW_SLUG:-}"
if [ -n "$slug" ] && ! printf '%s' "$slug" | grep -Eq '^[a-z0-9-]+$'; then
  echo "PREVIEW_SLUG darf nur a-z, 0-9 und - enthalten: $slug" >&2; exit 1
fi
rm -rf site && mkdir -p site
cp web/pwa/*.png site/
if [ -z "$slug" ]; then
  cp web/pwa/manifest.webmanifest site/
  sed "s/__VERSION__/${version}/" web/pwa/sw.js > site/sw.js
fi
{
  printf '%s' '<!doctype html><html lang="de"><head><meta charset="utf-8">'
  printf '%s' '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '%s' '<meta name="theme-color" content="#F4F5FA">'
  if [ -z "$slug" ]; then
    printf '%s' '<title>Kana Dōjō</title>'
    printf '%s' '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
    printf '%s' '<meta name="apple-mobile-web-app-title" content="Kana Dōjō">'
    printf '%s' '<link rel="manifest" href="manifest.webmanifest">'
  else
    printf '%s' "<title>Vorschau ${slug} – Kana Dōjō</title><meta name=\"robots\" content=\"noindex\">"
    printf '%s' "<script>window.__KD_PREVIEW=\"${slug}\"</script>"
    printf '%s' '<style>.kd-pv{position:fixed;top:calc(6px + env(safe-area-inset-top,0px));right:8px;z-index:60;background:#b3261e;color:#fff;font:700 11px/1 system-ui,sans-serif;padding:6px 10px;border-radius:999px;text-decoration:none;opacity:.92;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}body.staged .kd-pv{opacity:.45}</style>'
  fi
  printf '%s' "<script>window.__KD_VERSION=\"${version}\"</script>"
  printf '%s' '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
  printf '%s' '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
  if [ -z "$slug" ]; then
    printf '%s' '<script>if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}</script>'
  fi
  printf '%s' '</head><body>'
  if [ -n "$slug" ]; then
    printf '%s' "<a class=\"kd-pv\" href=\"../\" title=\"Vorschau ${slug}: zur Übersicht aller Vorschauen\">Vorschau · ${version}</a>"
  fi
  cat web/app.html
  printf '%s\n' '</body></html>'
} > site/index.html
echo "ok: site/ (Version ${version}${slug:+, Vorschau ${slug}})"
ls -1 site
