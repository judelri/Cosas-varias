#!/usr/bin/env python3
"""Genera dist/crisol-de-eter.html: una sola página con el CSS y los JS incrustados.

Uso:  python3 tools/build.py
Sirve para publicar el juego como un único archivo (por ejemplo, como artifact de Claude).
Solo usa la biblioteca estándar de Python.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")


def inline_css(m):
    css = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return f"<style>\n{css}</style>"


def inline_js(m):
    js = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return f"<script>\n{js}</script>"


html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)

out = ROOT / "dist" / "crisol-de-eter.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"OK → {out.relative_to(ROOT)} ({len(html) // 1024} KB)")
