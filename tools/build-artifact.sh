#!/usr/bin/env bash
# Baut die Fassung für das Claude-Artefakt «Kana Dōjō» nach artifact/kana-dojo.html.
# Quelle ist web/app.html; dazu kommt nur die Versionskennung (Commit) für die Anzeige unter «Mehr».
# Veröffentlichen geschieht aus einer Claude-Sitzung (Artifact-Tool, siehe CLAUDE.md).
set -euo pipefail
cd "$(dirname "$0")/.."
version="${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
mkdir -p artifact
{
  printf '%s\n' "<script>window.__KD_VERSION=\"${version} · Artefakt\"</script>"
  cat web/app.html
} > artifact/kana-dojo.html
echo "ok: artifact/kana-dojo.html (Version ${version})"
