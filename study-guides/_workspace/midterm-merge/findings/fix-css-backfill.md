# FIX-1: CSS Backfill Cascade Bomb — Fix Report
**Agent:** @fix-css-backfill  
**Date:** 2026-05-02

## Line Range
- **Before:** `<style id="l1-backfill">` at line 1440, `</style>` at line 1607 (167 lines of inner content)
- **After:** Same tags at same positions; inner content reduced to **47 lines** (only nc-embed rules)

## Byte Size
- **Before:** 721,496 bytes
- **After:** 703,819 bytes
- **Reduction:** 17,677 bytes

## What Was Removed
The entire 167-line inner content was the L1 source file's CSS wholesale-pasted in. It contained:
- `:root{...}` — 27 CSS vars (duplicate of master)
- `*{margin:0;padding:0;box-sizing:border-box}` — global reset
- `html{...}`, `body{...}` — global element styles
- `::-webkit-scrollbar`, `::selection` — global pseudo-element resets
- 15+ master class redefinitions: `.guide-section`, `.card`, `.progress-tab`, `.progress-shell`, `.hero`, `.hemo-col`, `.phase-item`, `.clinical-img`, `.callout`, `.high-yield`, `.explain`, `.callout-danger`, `.data-table`, `.triage-grid`, `.severity-meter`, `.quiz-box`, `.foundations-box`, `.tier-badge`, plus full `@media` blocks

## What Was Kept (47 rules, all scoped under `.nc-embed`)
The entire notecard embed system — every rule prefixed with `.nc-embed`:
- `.nc-embed *` (scoped reset, safe)
- `.nc-embed .side`, `.tbar`, `.tbar b`, `.tbar .k`
- `.nc-embed .cols`, `.cols-main`, `.cols-top`, `.cols-ph`, `.cols-b`
- `.nc-embed .col`, `.col-red`, `.col-blue`, `.col-green`, `.col-purple`, `.col *`, `.col b`
- `.nc-embed h2`, `h3`, `.hl`, `table`, `th/td`, `ul`, `li`, `b`, `.s`, `.p`, `.tight`, `.small`
- `.nc-embed .strip`, `.strip .sc`, `.strip .sc:last-child`, `.strip h4`
- `.nc-embed .cmp`, `.ph`, `.ph h3`, `.ph p`
- `.nc-embed .ph-blue`, `.ph-blue h3`, `.ph-green`, `.ph-green h3`, `.ph-purple`, `.ph-purple h3`
- `.nc-embed .redb`, `.dangerline`
- `@media print{.nc-embed .side{...}}`

Classes excluded (already in master CSS):
- `.hemo-col` and variants — master CSS lines ~900–960
- `.phase-item` and variants — master CSS
- `.callout.key-concept` — master CSS
- `.clinical-img .img-icon/text/label/desc` — master CSS (scoped, safe)

## Verification Output
```
l1-backfill count:       1  ✓
Total <style count:      3  ✓
Line count:          11620  ✓ (was 11761, reduced by 141)
Global reset (*{}) in backfill: 0  ✓
:root declarations:      1  ✓ (only master)
body/html globals in backfill: 0  ✓
Lines in backfill block: 47  ✓
```
