#!/usr/bin/env bash
# Baut die installierbare Web-App für GitHub Pages nach site/.
# Quelle ist web/app.html, dieselbe Datei wie im Claude-Artefakt und in der Android-App.
set -euo pipefail
cd "$(dirname "$0")/.."
version="${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
rm -rf site && mkdir -p site
cp web/pwa/manifest.webmanifest web/pwa/*.png site/
sed "s/__VERSION__/${version}/" web/pwa/sw.js > site/sw.js
{
  printf '%s' '<!doctype html><html lang="de"><head><meta charset="utf-8">'
  printf '%s' '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '%s' '<meta name="theme-color" content="#F4F5FA">'
  printf '%s' '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
  printf '%s' '<meta name="apple-mobile-web-app-title" content="Kana Dōjō">'
  printf '%s' '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
  printf '%s' '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
  printf '%s' '<script>if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}</script>'
  printf '%s' '</head><body>'
  cat web/app.html
  printf '%s\n' '</body></html>'
} > site/index.html
echo "ok: site/ (Version ${version})"
ls -1 site
