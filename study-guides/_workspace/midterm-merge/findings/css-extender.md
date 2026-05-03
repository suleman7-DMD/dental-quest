# @css-extender Findings — midterm-emphasis-tiers Block

## Insertion Point
- File: `study-guides/od531-midterm-complete-study-guide.html`
- Inserted immediately after closing `</style>` of `#l1-backfill` (was line 1488)
- New block: **lines 1489–1569** (81 lines)

## Style-Tag Count
| State | `<style` count |
|-------|---------------|
| Before | 3 |
| After  | 4 |

Verified with `grep -c '<style' file` = 4.

## Diff Stats
- Lines inserted: 81 (insert-only)
- Lines deleted: 0
- Lines modified: 0 (no existing CSS touched)

## Block Structure
```
line 1489  <style id="midterm-emphasis-tiers">
line 1490  /* Scoped to L1 + L4 — no global cascade */
...
line 1491  T1/T2/T3 tier flags (8 rules, both sections)
line 1497  slide-highlight, prof-mnemonic, q-stem, de-emphasized, slide-only-flag
line 1499  knowledge-check, pearl-callout, lingered
line 1502  figure.clinical-img (block, img, figcaption)
line 1513  figure.hero-img-full (full-width override, #sec-salivary only)
line 1516  details.tier-3-collapse + summary + [open]
line 1523  ol.notecard-candidates + li + ::before (counter #N)
line 1532  table.ddx-table (thead, th/td, even rows)
line 1558  @media (max-width: 480px) mobile overrides
line 1569  </style>
```

## Full Inserted CSS Block
```css
/* Scoped to L1 (infectious) + L4 (salivary) sections only — no global cascade */
#sec-infectious .prof-flag-tier-1, #sec-salivary .prof-flag-tier-1 { background: #fee2e2; border-left: 4px solid #dc2626; padding: 8px 12px; margin: 6px 0; border-radius: 6px; }
#sec-infectious .prof-flag-tier-2, #sec-salivary .prof-flag-tier-2 { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px 12px; margin: 6px 0; border-radius: 6px; }
#sec-infectious .prof-flag-tier-3, #sec-salivary .prof-flag-tier-3 { background: #ddd6fe; border-left: 4px solid #7c3aed; padding: 8px 12px; margin: 6px 0; border-radius: 6px; }
#sec-infectious .slide-highlight, #sec-salivary .slide-highlight { background: #fef08a; padding: 0 3px; border-radius: 2px; }
#sec-infectious .prof-mnemonic, #sec-salivary .prof-mnemonic { background: #d1fae5; border-left: 3px solid #10b981; padding: 6px 10px; font-style: italic; border-radius: 6px; }
#sec-infectious .q-stem, #sec-salivary .q-stem { background: #e0e7ff; border: 1px dashed #6366f1; padding: 6px 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.95em; border-radius: 6px; }
#sec-infectious .de-emphasized, #sec-salivary .de-emphasized { opacity: 0.6; font-size: 0.9em; }
#sec-infectious .slide-only-flag, #sec-salivary .slide-only-flag { background: #fde68a; border-left: 4px solid #d97706; padding: 8px 12px; margin: 6px 0; font-style: italic; border-radius: 6px; }

/* Knowledge-check (L4 ❓ ASKED CLASS) and pearl (🩺) variants */
#sec-infectious .knowledge-check, #sec-salivary .knowledge-check { background: #dbeafe; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 12px 0; border-radius: 8px; }
#sec-infectious .pearl-callout, #sec-salivary .pearl-callout { background: #d1fae5; border-left: 4px solid #059669; padding: 12px 16px; margin: 12px 0; border-radius: 8px; }
#sec-infectious .lingered, #sec-salivary .lingered { background: #fef9c3; padding: 8px 12px; border-radius: 6px; margin: 6px 0; }

/* Image figures — scientific style with full caption */
#sec-infectious figure.clinical-img, #sec-salivary figure.clinical-img {
  background: #FAFAF8; border: 1px solid var(--border, #E5E1D8); border-radius: 12px;
  padding: 16px; margin: 20px 0; display: block;
}
#sec-infectious figure.clinical-img img, #sec-salivary figure.clinical-img img {
  width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto;
  border-radius: 8px; border: 1px solid #E5E1D8;
}
#sec-infectious figure.clinical-img figcaption, #sec-salivary figure.clinical-img figcaption {
  font-size: 14px; color: #5C5448; line-height: 1.6; font-style: italic;
  margin-top: 12px; padding: 0 4px;
}

/* HERO images — full-width, no max-width cap */
#sec-salivary figure.hero-img-full img { max-width: 100% !important; width: 100%; }
#sec-salivary figure.hero-img-full { padding: 12px; }

/* T3 collapsible (L4 background context) */
#sec-salivary details.tier-3-collapse {
  background: #F4F1EA; border: 1px solid #E5E1D8; border-radius: 8px;
  padding: 10px 14px; margin: 8px 0;
}
#sec-salivary details.tier-3-collapse summary {
  cursor: pointer; font-weight: 600; color: #2C2920; padding: 4px 0;
}
#sec-salivary details.tier-3-collapse[open] summary { margin-bottom: 8px; }

/* Notecard candidates — ranked monospace list */
#sec-salivary ol.notecard-candidates {
  list-style: none; counter-reset: nc; padding: 0;
}
#sec-salivary ol.notecard-candidates li {
  counter-increment: nc; position: relative; padding: 12px 16px 12px 56px;
  background: #FAFAF8; border: 1px solid #E5E1D8; border-radius: 8px;
  margin-bottom: 10px; font-family: 'JetBrains Mono', monospace; font-size: 13.5px; line-height: 1.55;
}
#sec-salivary ol.notecard-candidates li::before {
  content: "#" counter(nc); position: absolute; left: 12px; top: 12px;
  background: #6B4C9A; color: white; padding: 2px 8px; border-radius: 4px;
  font-weight: 700; font-size: 12px;
}

/* DDx tables (L4) — semantic */
#sec-salivary table.ddx-table {
  width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;
  border: 1px solid #E5E1D8; border-radius: 8px; overflow: hidden;
}
#sec-salivary table.ddx-table thead { background: #6B4C9A; color: white; }
#sec-salivary table.ddx-table th, #sec-salivary table.ddx-table td {
  padding: 8px 12px; text-align: left; border-bottom: 1px solid #E5E1D8;
}
#sec-salivary table.ddx-table tbody tr:nth-child(even) { background: #FAFAF8; }

/* Mobile @ 375px — both sections */
@media (max-width: 480px) {
  #sec-infectious figure.clinical-img img, #sec-salivary figure.clinical-img img { max-width: 100%; }
  #sec-salivary table.ddx-table { font-size: 12.5px; }
  #sec-salivary ol.notecard-candidates li { padding-left: 48px; font-size: 12.5px; }
  #sec-infectious .prof-flag-tier-1, #sec-infectious .prof-flag-tier-2, #sec-infectious .prof-flag-tier-3,
  #sec-salivary .prof-flag-tier-1, #sec-salivary .prof-flag-tier-2, #sec-salivary .prof-flag-tier-3 {
    padding: 6px 10px; font-size: 14px;
  }
}
```

## Verification Checks
- [x] `<style id="midterm-emphasis-tiers">` present at line 1489
- [x] Closing `</style>` at line 1569, followed by `</head>` at line 1570
- [x] `l1-backfill` block unchanged (lines 1440-1488)
- [x] Master CSS at top (lines 9-1437) unchanged
- [x] No orphaned style tags (4 open, 4 close — including the NOTE comment at 11272 which is not a real tag)
- [x] All 17 CSS class groups present and scoped to `#sec-infectious` / `#sec-salivary`
- [x] `.hero-img-full` scoped to `#sec-salivary` only
