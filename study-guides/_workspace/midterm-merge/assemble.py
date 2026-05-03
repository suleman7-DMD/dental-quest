#!/usr/bin/env python3
"""Slot-fill assembly: shell + 5 fragments + L1 backfill CSS -> final merged HTML."""
import re
import sys
from pathlib import Path

WORKSPACE = Path('/Users/suleman/dental-quest/study-guides/_workspace/midterm-fragments')
SHELL = WORKSPACE / '00-frame.html'
OUT = Path('/Users/suleman/dental-quest/study-guides/od531-midterm-complete-study-guide.html')
L1_SOURCE = Path('/Users/suleman/dental-quest/study-guides/od531-midterm-infectious-diseases.html')

FRAGMENTS = [
    ('lec-1-infectious', WORKSPACE / '02-fragment-infectious.html'),
    ('lec-2-allergies',  WORKSPACE / '03-fragment-allergies.html'),
    ('lec-3-epithelial', WORKSPACE / '04-fragment-epithelial.html'),
    ('lec-4-salivary',   WORKSPACE / '05-fragment-salivary.html'),
    ('lec-5-notecard',   WORKSPACE / '06-fragment-notecard-v2.html'),
]

def extract_first_style(html: str) -> str:
    """Return inner contents of the first <style>...</style> block."""
    m = re.search(r'<style[^>]*>(.*?)</style>', html, re.DOTALL)
    return m.group(1) if m else ''

def main():
    shell = SHELL.read_text(encoding='utf-8')
    print(f'shell loaded: {len(shell):,} bytes, {shell.count(chr(10)):,} lines')

    # 1. Backfill CSS from L1 source (it uses the same CSS vars as master)
    l1_html = L1_SOURCE.read_text(encoding='utf-8')
    l1_styles = extract_first_style(l1_html).strip()
    backfill = (
        '\n  <!-- ===== L1 INFECTIOUS BACKFILL CSS '
        '(divergent classes: cmp, col-red, cols-*, hemo-col, ph-*, phase-item, '
        'strip, tbar, etc.) ===== -->\n'
        '  <style id="l1-backfill">\n'
        + l1_styles +
        '\n  </style>\n'
    )
    # Inject just before </head>
    if '</head>' not in shell:
        sys.exit('FATAL: no </head> in shell')
    shell = shell.replace('</head>', backfill + '</head>', 1)
    print(f'  injected {len(l1_styles):,} bytes of L1 backfill CSS')

    # 2. Slot-fill replacement
    for key, frag_path in FRAGMENTS:
        marker = f'<!-- SLOT: {key} -->'
        if marker not in shell:
            sys.exit(f'FATAL: marker {marker!r} not found in shell')
        frag = frag_path.read_text(encoding='utf-8').rstrip()
        shell = shell.replace(marker, frag, 1)
        print(f'  filled {marker} <- {frag_path.name} ({len(frag):,} bytes, '
              f'{frag.count(chr(10)):,} lines)')

    # 3. Sanity: any remaining SLOT markers?
    leftover = re.findall(r'<!--\s*SLOT:\s*[^>]+-->', shell)
    if leftover:
        sys.exit(f'FATAL: leftover SLOT markers: {leftover}')

    # 4. Write
    OUT.write_text(shell, encoding='utf-8')
    print(f'wrote {OUT}: {len(shell):,} bytes, {shell.count(chr(10)):,} lines')

if __name__ == '__main__':
    main()
