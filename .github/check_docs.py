"""Check local Markdown and HTML link targets without network access."""
import re
import subprocess
import sys
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
INLINE = re.compile(r'!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)')
HTML = re.compile(r'\b(?:src|href|poster)\s*=\s*["\']([^"\']+)["\']', re.I)
REFERENCE = re.compile(r'^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)', re.M)


def check():
    files = subprocess.check_output(
        ["git", "ls-files", "-z", "--", "*.md"], cwd=ROOT
    ).decode().split("\0")
    errors = []
    checked = 0
    for name in filter(None, files):
        path = ROOT / name
        # A staged removal may still exist in the working tree.
        if not path.is_file() or "node_modules" in path.parts:
            continue
        body = path.read_text(encoding="utf-8")
        body = re.sub(r"^```[^\n]*\n.*?^```[^\n]*$", "", body, flags=re.M | re.S)
        for raw in INLINE.findall(body) + HTML.findall(body) + REFERENCE.findall(body):
            target = unescape(raw.strip("<>"))
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path:
                continue
            relative = unquote(url.path)
            resolved = ROOT / relative.lstrip("/") if relative.startswith("/") else path.parent / relative
            checked += 1
            if not resolved.exists():
                errors.append(f"{name}: missing local target {target}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Checked {checked} local documentation targets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(check())
