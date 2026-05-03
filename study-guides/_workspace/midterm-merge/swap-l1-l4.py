#!/usr/bin/env python3
"""Surgical replacement of sec-infectious + sec-salivary with v2 fragments.

Identifies section boundaries by anchor IDs (no line-number guessing) so the
script self-corrects if line counts shift between runs.
"""
import re
import sys
import shutil
from pathlib import Path
from datetime import datetime

ROOT = Path('/Users/suleman/dental-quest/study-guides')
TARGET = ROOT / 'od531-midterm-complete-study-guide.html'
FRAGMENTS_DIR = ROOT / '_workspace/midterm-fragments'
BACKUP_DIR = ROOT / '_workspace/midterm-merge/backups'
PROOF = ROOT / '_workspace/midterm-merge/findings/swap-l1-l4.md'

SWAPS = [
    {
        'name': 'sec-infectious',
        'fragment': FRAGMENTS_DIR / '02-fragment-infectious-v2.html',
        # Boundaries: from <div class="guide-section" id="sec-infectious" ...>
        # through the matching </div><!-- end ... --> just before sec-allergies.
        'start_re': r'<div class="guide-section" id="sec-infectious"[^>]*>',
        'next_re':  r'<div class="guide-section" id="sec-allergies"[^>]*>',
    },
    {
        'name': 'sec-salivary',
        'fragment': FRAGMENTS_DIR / '05-fragment-salivary-v2.html',
        'start_re': r'<div class="guide-section" id="sec-salivary"[^>]*>',
        'next_re':  r'<div class="guide-section" id="sec-notecard-v2"[^>]*>',
    },
]


def find_section_end(text: str, start_idx: int) -> int:
    """Walk forward from start_idx, balance <div>...</div> until depth returns to 0.

    start_idx must point AT the opening '<div class="guide-section"' tag.
    Returns the index just past the matching </div>.
    """
    depth = 0
    i = start_idx
    div_re = re.compile(r'<div\b|</div>')
    while i < len(text):
        m = div_re.search(text, i)
        if not m:
            raise RuntimeError('unbalanced divs — never closed')
        if m.group() == '<div':
            # only count if it's actually <div followed by space, > or other attr char
            after = text[m.end():m.end()+1]
            if after in (' ', '>', '\t', '\n'):
                depth += 1
        else:
            depth -= 1
            if depth == 0:
                return m.end()
        i = m.end()
    raise RuntimeError('unbalanced divs')


def main():
    if not TARGET.exists():
        sys.exit(f'FATAL: target not found: {TARGET}')

    # 1. Backup
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_path = BACKUP_DIR / f'od531-midterm-complete-study-guide.{stamp}.html'
    shutil.copy2(TARGET, backup_path)
    print(f'backup: {backup_path}')

    text = TARGET.read_text(encoding='utf-8')
    original_size = len(text)
    original_lines = text.count('\n')

    swap_log = []
    for swap in SWAPS:
        if not swap['fragment'].exists():
            sys.exit(f"FATAL: fragment missing: {swap['fragment']}")
        fragment_text = swap['fragment'].read_text(encoding='utf-8').rstrip()

        # Locate start tag
        m = re.search(swap['start_re'], text)
        if not m:
            sys.exit(f"FATAL: start tag not found for {swap['name']}")
        start_idx = m.start()

        # Walk div balance to find end
        end_idx = find_section_end(text, start_idx)

        # Sanity: confirm next section's opening tag is somewhere after end_idx
        next_m = re.search(swap['next_re'], text[end_idx:])
        if not next_m:
            sys.exit(f"FATAL: next-section anchor not found after {swap['name']}")

        # Capture the bytes we are about to replace, for proof
        old_block = text[start_idx:end_idx]
        old_lines = old_block.count('\n') + 1
        new_lines = fragment_text.count('\n') + 1

        # Replace
        text = text[:start_idx] + fragment_text + text[end_idx:]

        swap_log.append({
            'name': swap['name'],
            'old_chars': len(old_block),
            'old_lines': old_lines,
            'new_chars': len(fragment_text),
            'new_lines': new_lines,
        })
        print(f"  swapped {swap['name']}: "
              f"{len(old_block):,}→{len(fragment_text):,} bytes, "
              f"{old_lines}→{new_lines} lines")

    # Atomic write
    tmp = TARGET.with_suffix('.html.tmp')
    tmp.write_text(text, encoding='utf-8')
    tmp.replace(TARGET)
    new_size = len(text)
    new_lines = text.count('\n')
    print(f'wrote {TARGET}: {original_size:,}→{new_size:,} bytes, '
          f'{original_lines:,}→{new_lines:,} lines')

    # Proof file
    PROOF.parent.mkdir(parents=True, exist_ok=True)
    proof_lines = [
        f'# L1 + L4 Swap Proof',
        f'',
        f'Generated: {datetime.now().isoformat()}',
        f'',
        f'## Backup',
        f'- {backup_path}',
        f'',
        f'## File totals',
        f'- before: {original_size:,} bytes / {original_lines:,} lines',
        f'- after:  {new_size:,} bytes / {new_lines:,} lines',
        f'- delta:  {new_size - original_size:+,} bytes / {new_lines - original_lines:+,} lines',
        f'',
        f'## Section swaps',
    ]
    for s in swap_log:
        proof_lines.append(f"- **{s['name']}**: {s['old_chars']:,}→{s['new_chars']:,} bytes, {s['old_lines']}→{s['new_lines']} lines")
    PROOF.write_text('\n'.join(proof_lines) + '\n', encoding='utf-8')
    print(f'proof: {PROOF}')


if __name__ == '__main__':
    main()
