#!/usr/bin/env python3
"""Surgical replacement of sec-allergies with L2 v2 fragment.

Steps:
1. Backup current merged HTML
2. Extract CSS-TO-ADD comment block from fragment, strip it from fragment body
3. Inject L2 CSS into <style id="midterm-emphasis-tiers"> just before </style>
4. Extend existing scoped selectors (.prof-emphasis, figure.clinical-img) to include #sec-allergies
5. Replace sec-allergies block (anchor-balanced) with cleaned fragment
6. Verify untouched sections (infectious, epithelial, salivary, notecard-v2) byte-identical
"""
import re
import sys
import shutil
import hashlib
from pathlib import Path
from datetime import datetime

ROOT = Path('/Users/suleman/dental-quest/study-guides')
TARGET = ROOT / 'od531-midterm-complete-study-guide.html'
FRAGMENT = ROOT / '_workspace/midterm-fragments/03-fragment-allergies-v2.html'
BACKUP_DIR = ROOT / '_workspace/midterm-merge/backups'
PROOF = ROOT / '_workspace/midterm-merge/findings/swap-l2.md'


def find_section_end(text, start_idx):
    depth = 0
    i = start_idx
    div_re = re.compile(r'<div\b|</div>')
    while i < len(text):
        m = div_re.search(text, i)
        if not m:
            raise RuntimeError('unbalanced divs')
        if m.group() == '<div':
            after = text[m.end():m.end()+1]
            if after in (' ', '>', '\t', '\n'):
                depth += 1
        else:
            depth -= 1
            if depth == 0:
                return m.end()
        i = m.end()
    raise RuntimeError('unbalanced divs')


def md5_section(text, sec_id):
    m = re.search(r'<div class="guide-section" id="' + sec_id + r'"[^>]*>', text)
    if not m:
        return None, None, None
    start = m.start()
    end = find_section_end(text, start)
    block = text[start:end]
    return hashlib.md5(block.encode()).hexdigest(), len(block), text[:start].count('\n') + 1


def main():
    if not TARGET.exists():
        sys.exit(f'FATAL: target not found: {TARGET}')
    if not FRAGMENT.exists():
        sys.exit(f'FATAL: fragment not found: {FRAGMENT}')

    text = TARGET.read_text(encoding='utf-8')
    fragment = FRAGMENT.read_text(encoding='utf-8')

    # Pre-swap hashes for untouched sections
    pre_hashes = {}
    for sec in ['sec-infectious', 'sec-epithelial', 'sec-salivary', 'sec-notecard-v2', 'sec-allergies']:
        h, sz, ln = md5_section(text, sec)
        pre_hashes[sec] = {'md5': h, 'bytes': sz, 'line': ln}

    # Backup
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_path = BACKUP_DIR / f'od531-midterm-complete-study-guide.{stamp}.html'
    shutil.copy2(TARGET, backup_path)
    print(f'backup: {backup_path}')

    # 1. Extract CSS-TO-ADD comment from fragment (lines 1-26 are HTML comment)
    css_block_match = re.match(
        r'<!--\s*=+\s*\n\s*FRAGMENT:.*?\n\s*CSS-TO-ADD.*?:\s*\n(.*?)=+\s*-->\s*\n',
        fragment, flags=re.DOTALL
    )
    if not css_block_match:
        sys.exit('FATAL: could not extract CSS-TO-ADD comment from fragment')
    css_lines_raw = css_block_match.group(1)
    # Lines that look like CSS rules (start with #, ., or @media, or have braces)
    css_to_inject = '\n'.join(
        line.rstrip() for line in css_lines_raw.split('\n')
        if line.strip() and not line.strip().startswith('====')
    )

    # 2. Clean fragment: strip the leading comment block
    fragment_clean = fragment[css_block_match.end():].rstrip()

    # 3. Inject L2 CSS into emphasis-tiers <style> block (before </style>)
    style_block_re = re.compile(
        r'(<style id="midterm-emphasis-tiers">.*?)(\n</style>)',
        flags=re.DOTALL
    )
    sm = style_block_re.search(text)
    if not sm:
        sys.exit('FATAL: emphasis-tiers <style> block not found')

    l2_css_section = (
        '\n\n/* === L2 ALLERGIES — added by swap-l2 === */\n'
        + css_to_inject + '\n'
        + '\n/* L2 figures share the same scoped clinical-img treatment */\n'
        + '#sec-allergies figure.clinical-img {\n'
        + '  background: #FAFAF8; border: 1px solid var(--border, #E5E1D8); border-radius: 12px;\n'
        + '  padding: 16px; margin: 20px 0; display: block;\n'
        + '}\n'
        + '#sec-allergies figure.clinical-img img {\n'
        + '  width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto;\n'
        + '  border-radius: 8px; border: 1px solid #E5E1D8;\n'
        + '}\n'
        + '#sec-allergies figure.clinical-img figcaption {\n'
        + '  font-size: 14px; color: #5C5448; line-height: 1.6; font-style: italic;\n'
        + '  margin-top: 12px; padding: 0 4px;\n'
        + '}\n'
        + '#sec-allergies figure.hero-img-full img { max-width: 100% !important; width: 100%; }\n'
        + '#sec-allergies figure.hero-img-full { padding: 12px; }\n'
        + '\n/* L2 .prof-emphasis (paraphrase blocks) */\n'
        + '#sec-allergies .prof-emphasis {\n'
        + '  background: #FFF7ED; border-left: 4px solid #C2410C; padding: 12px 16px; margin: 12px 0;\n'
        + '  border-radius: 8px; font-size: 14.5px; line-height: 1.6;\n'
        + '}\n'
        + '#sec-allergies .prof-emphasis::before {\n'
        + '  content: "PROF EMPHASIZED"; display: block; font-size: 11px; font-weight: 700;\n'
        + '  letter-spacing: 0.5px; color: #9A3412; margin-bottom: 4px;\n'
        + '  font-family: \'JetBrains Mono\', monospace;\n'
        + '}\n'
        + '\n/* L2 T3 collapse */\n'
        + '#sec-allergies details.tier-3-collapse {\n'
        + '  background: #F4F1EA; border: 1px solid #E5E1D8; border-radius: 8px;\n'
        + '  padding: 10px 14px; margin: 8px 0;\n'
        + '}\n'
        + '#sec-allergies details.tier-3-collapse[open] summary { margin-bottom: 8px; }\n'
    )
    text = text[:sm.end(1)] + l2_css_section + text[sm.end(1):]

    # 4. Replace sec-allergies block with cleaned fragment
    m = re.search(r'<div class="guide-section" id="sec-allergies"[^>]*>', text)
    if not m:
        sys.exit('FATAL: sec-allergies anchor not found')
    start_idx = m.start()
    end_idx = find_section_end(text, start_idx)

    # Sanity: next section must be sec-epithelial
    next_m = re.search(r'<div class="guide-section" id="sec-epithelial"[^>]*>', text[end_idx:])
    if not next_m:
        sys.exit('FATAL: sec-epithelial not found after sec-allergies')

    old_block = text[start_idx:end_idx]
    text = text[:start_idx] + fragment_clean + text[end_idx:]

    # Atomic write
    tmp = TARGET.with_suffix('.html.tmp')
    tmp.write_text(text, encoding='utf-8')
    tmp.replace(TARGET)
    new_size = TARGET.stat().st_size

    # Post-swap hashes
    post_hashes = {}
    text_after = TARGET.read_text(encoding='utf-8')
    for sec in ['sec-infectious', 'sec-epithelial', 'sec-salivary', 'sec-notecard-v2', 'sec-allergies']:
        h, sz, ln = md5_section(text_after, sec)
        post_hashes[sec] = {'md5': h, 'bytes': sz, 'line': ln}

    # Verify untouched sections byte-identical
    untouched = ['sec-infectious', 'sec-epithelial', 'sec-salivary', 'sec-notecard-v2']
    print('\nByte-identity check:')
    all_pass = True
    for sec in untouched:
        same = pre_hashes[sec]['md5'] == post_hashes[sec]['md5']
        print(f"  {sec}: {'PASS' if same else 'FAIL'} (pre={pre_hashes[sec]['md5']}, post={post_hashes[sec]['md5']})")
        if not same:
            all_pass = False

    print(f"\n  sec-allergies (rebuilt): pre={pre_hashes['sec-allergies']['md5']} -> post={post_hashes['sec-allergies']['md5']}")
    print(f"  pre  bytes: {pre_hashes['sec-allergies']['bytes']:,}")
    print(f"  post bytes: {post_hashes['sec-allergies']['bytes']:,}")

    PROOF.parent.mkdir(parents=True, exist_ok=True)
    proof_lines = [
        '# L2 Swap Proof',
        '',
        f'Generated: {datetime.now().isoformat()}',
        f'Backup: {backup_path}',
        '',
        '## File totals',
        f'- new size: {new_size:,} bytes',
        '',
        '## Section MD5 — pre vs post swap',
        '| Section | Pre MD5 | Post MD5 | Result |',
        '|---|---|---|---|',
    ]
    for sec in ['sec-infectious', 'sec-allergies', 'sec-epithelial', 'sec-salivary', 'sec-notecard-v2']:
        same = pre_hashes[sec]['md5'] == post_hashes[sec]['md5']
        result = 'IDENTICAL' if same else ('REBUILT' if sec == 'sec-allergies' else 'FAIL')
        proof_lines.append(f"| {sec} | `{pre_hashes[sec]['md5']}` | `{post_hashes[sec]['md5']}` | {result} |")

    proof_lines += [
        '',
        '## L2 byte counts',
        f'- pre  sec-allergies: {pre_hashes["sec-allergies"]["bytes"]:,} bytes',
        f'- post sec-allergies: {post_hashes["sec-allergies"]["bytes"]:,} bytes',
        f'- delta: {post_hashes["sec-allergies"]["bytes"] - pre_hashes["sec-allergies"]["bytes"]:+,} bytes',
        '',
        '## CSS injected',
        f'- {len(l2_css_section)} bytes appended to <style id="midterm-emphasis-tiers">',
    ]
    PROOF.write_text('\n'.join(proof_lines) + '\n', encoding='utf-8')
    print(f'proof: {PROOF}')

    if not all_pass:
        sys.exit('FATAL: untouched sections not byte-identical')


if __name__ == '__main__':
    main()
