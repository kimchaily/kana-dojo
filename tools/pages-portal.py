#!/usr/bin/env python3
"""Hilfen für den Pages-Deploy (läuft im Checkout des Branches gh-pages).

  pages-portal.py meta   --dir preview/<slug> --slug <slug> [--branch ..] [--pr ..] [--sha ..]
      schreibt preview-meta.json zu einer Vorschau.
  pages-portal.py portal --repo owner/name [--root .]
      erzeugt preview/index.html mit Links zur Produktion und zu allen Vorschauen.
"""

import argparse
import html
import json
import os
from datetime import datetime, timezone


def write_meta(args):
    os.makedirs(args.dir, exist_ok=True)
    meta = {
        "slug": args.slug,
        "branch": args.branch or args.slug,
        "pr": int(args.pr) if args.pr.isdigit() else None,
        "sha": args.sha or None,
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    with open(os.path.join(args.dir, "preview-meta.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    print(f"Metadaten geschrieben: {args.dir}/preview-meta.json")


def load_previews(preview_dir):
    items = []
    for slug in sorted(os.listdir(preview_dir)):
        path = os.path.join(preview_dir, slug)
        if not os.path.isdir(path):
            continue
        meta = {"slug": slug, "branch": slug, "pr": None, "updated": None, "sha": None}
        try:
            with open(os.path.join(path, "preview-meta.json"), encoding="utf-8") as fh:
                meta.update({k: v for k, v in json.load(fh).items() if v is not None})
        except (OSError, ValueError):
            pass
        items.append(meta)
    items.sort(key=lambda m: m.get("updated") or "", reverse=True)
    return items


def fmt_date(iso):
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%d.%m.%Y %H:%M UTC")
    except (AttributeError, ValueError):
        return ""


def render(previews, repo):
    esc = html.escape
    cards = []
    for p in previews:
        slug = esc(p["slug"])
        bits = []
        if p.get("pr"):
            bits.append(
                f'<a href="https://github.com/{esc(repo)}/pull/{p["pr"]}" target="_blank" rel="noopener">PR #{p["pr"]}</a>'
            )
        if fmt_date(p.get("updated")):
            bits.append(f"<span>aktualisiert {fmt_date(p['updated'])}</span>")
        if p.get("sha"):
            bits.append(f"<code>{esc(str(p['sha']))}</code>")
        cards.append(
            f'<div class="card pv"><a class="t" href="./{slug}/">{esc(str(p["branch"]))}</a>'
            f'<span class="m">{" · ".join(bits)}</span><a class="go" href="./{slug}/">Vorschau öffnen →</a></div>'
        )
    body = "\n".join(cards) or (
        '<p class="empty">Keine offenen Vorschauen. Jeder offene Pull Request bekommt hier automatisch eine.</p>'
    )
    now = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")
    return f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Kana Dōjō – Vorschauen</title>
<style>
:root{{--accent:#3d4fb8;--bg:#f4f5fa;--card:#fff;--text:#1d2030;--muted:#6b7086;--line:#0000001a}}
@media (prefers-color-scheme:dark){{:root{{--accent:#9aa8ff;--bg:#15161d;--card:#20222c;--text:#ececf2;--muted:#9a9db0;--line:#ffffff22}}}}
*{{box-sizing:border-box}}
body{{margin:0;padding:28px 16px 48px;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}}
.wrap{{max-width:560px;margin:0 auto}}
h1{{font-size:1.4rem;margin:0 0 4px}}
h2{{font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:26px 0 10px}}
.sub{{color:var(--muted);margin:0}}
.card{{display:flex;flex-direction:column;gap:4px;background:var(--card);border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:14px;padding:14px 16px;margin-bottom:10px}}
.card.pv{{border-left-color:#b3261e}}
.t{{font-weight:700;font-size:1.02rem;word-break:break-word;color:inherit;text-decoration:none}}
.m{{color:var(--muted);font-size:.82rem;display:flex;flex-wrap:wrap;gap:6px}}
.m a,.go{{color:var(--accent);font-weight:600;text-decoration:none}}
.go{{font-size:.88rem;padding:6px 0}}
code{{font-size:.78rem;background:var(--line);padding:1px 6px;border-radius:6px}}
.empty,.note{{color:var(--muted);font-size:.88rem}}
.empty{{background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:18px;text-align:center}}
footer{{color:var(--muted);font-size:.78rem;margin-top:30px;text-align:center}}
</style></head><body><div class="wrap">
<h1>Kana Dōjō – Vorschauen</h1>
<p class="sub">Die veröffentlichte App und alle offenen Pull Requests zum Testen.</p>
<h2>Veröffentlicht</h2>
<div class="card"><a class="t" href="../">Kana Dōjō (main)</a><span class="m">Der Stand, den die installierte App lädt</span><a class="go" href="../">App öffnen →</a></div>
<h2>Vorschauen</h2>
{body}
<p class="note">Jede Vorschau startet mit einer Kopie deines Lernstands von diesem Gerät und speichert danach getrennt. Der echte Lernstand bleibt unverändert.</p>
<footer>Automatisch erzeugt am {now}</footer>
</div></body></html>
"""


def write_portal(args):
    preview_dir = os.path.join(args.root, "preview")
    os.makedirs(preview_dir, exist_ok=True)
    previews = load_previews(preview_dir)
    with open(os.path.join(preview_dir, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(render(previews, args.repo))
    print(f"Portal geschrieben: {len(previews)} Vorschau(en)")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("meta")
    m.add_argument("--dir", required=True)
    m.add_argument("--slug", required=True)
    m.add_argument("--branch", default="")
    m.add_argument("--pr", default="")
    m.add_argument("--sha", default="")
    m.set_defaults(fn=write_meta)
    p = sub.add_parser("portal")
    p.add_argument("--repo", required=True)
    p.add_argument("--root", default=".")
    p.set_defaults(fn=write_portal)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
