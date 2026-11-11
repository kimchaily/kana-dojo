#!/usr/bin/env bash
# Baut aus web/app.html (dieselbe Datei wie das Claude-Artefakt) die Seite für die Android-App.
set -euo pipefail
cd "$(dirname "$0")/.."
out=app/src/main/assets/index.html
mkdir -p "$(dirname "$out")"
{
  printf '%s' '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
  cat web/app.html
  printf '%s\n' '</body></html>'
} > "$out"
echo "ok: $out ($(wc -c < "$out") Bytes)"
