# Shared Agent Brief — OD 531 Midterm Complete Study Guide Merge

**Read this end-to-end before producing any output.** All 6 build agents work from this single source of truth. Findings, concerns, or deviations from this brief MUST be logged to `findings/<your-handle>.md` so the QA agent and other agents can see them.

---

## MISSION

Merge 4 finalized lecture HTMLs + a freshly-built Notecard V2 into ONE master midterm study guide that mirrors the design, depth, and rigor of the final-exam guide (`od531-complete-study-guide.html`) — with the visual condensation cues of `od531-condensed-study-guide.html`.

**Final output (single file):**
`/Users/suleman/dental-quest/study-guides/od531-midterm-complete-study-guide.html`

**Sources of truth (DO NOT MODIFY):**
- `/Users/suleman/dental-quest/study-guides/od531-midterm-infectious-diseases.html` (1851 lines) — L1
- `/Users/suleman/dental-quest/study-guides/od531-midterm-allergies-immunologic.html` (6158 lines) — L2
- `/Users/suleman/dental-quest/study-guides/od530-midterm-epithelial-pathoses-MASTER.html` (2037 lines) — L3
- `/Users/suleman/dental-quest/study-guides/salivary-gland-disorders-study-guide.html` (1791 lines) — L4

**Reference (the magic to replicate):**
- `/Users/suleman/dental-quest/study-guides/od531-complete-study-guide.html` — full shell, CSS, JS, Notecard V2 pattern (lines 7227–7675)
- `/Users/suleman/dental-quest/study-guides/od531-condensed-study-guide.html` — visual condensation reference

---

## LECTURE ORDER + THEMING

| Slot | Lecture | Tab Label | Tab Short | Color (--tab-color) | ID Prefix |
|------|---------|-----------|-----------|---------------------|-----------|
| Part 1 of 5 | Infectious Diseases | "Infectious Diseases" | "Infx" | `#B5483B` (red) | `inf-` |
| Part 2 of 5 | Allergies & Immunologic | "Allergies & Immunologic" | "Allergy" | `#2B5E8C` (blue) | `alg-` |
| Part 3 of 5 | Epithelial Pathoses & SCC | "Epithelial & SCC" | "Epi" | `#2E7D5B` (green) | `epi-` |
| Part 4 of 5 | Salivary Gland Disorders | "Salivary Gland" | "Saliva" | `#6B4C9A` (purple) | `sal-` |
| Part 5 of 5 | Exam Notecard v2 | "Notecard v2" | "Card" | `#C8923E` (gold) | `nc-` |

This mirrors the final-exam r/b/g/p color scheme used in Notecard V2.

---

## ARCHITECTURE

```
od531-midterm-complete-study-guide.html  (final output)
│
├── <head>: Google Fonts (Crimson Pro, Karla, JetBrains Mono)
├── <style>: master CSS copied wholesale from od531-complete-study-guide.html lines 9-1437
├── <body>:
│   ├── <div class="progress-shell">: 5-tab progress bar
│   │
│   ├── <!-- SLOT: lec-1-infectious -->
│   ├── <div class="guide-section" id="sec-infectious">  ← FROM scribe-infectious
│   │     <div class="guide-section-divider">Part 1 of 5...</div>
│   │     <div class="guide-section-content">[lecture content]</div>
│   │   </div>
│   │
│   ├── <!-- SLOT: lec-2-allergies -->
│   ├── ... same pattern, FROM scribe-allergies
│   │
│   ├── <!-- SLOT: lec-3-epithelial -->
│   ├── ... FROM scribe-epithelial
│   │
│   ├── <!-- SLOT: lec-4-salivary -->
│   ├── ... FROM scribe-salivary
│   │
│   ├── <!-- SLOT: lec-5-notecard-v2 -->
│   ├── <div class="guide-section" id="sec-notecard-v2">  ← FROM notecard-v2-builder
│   │
│   ├── <footer class="guide-footer">
│   ├── <button class="back-top">
│   └── <script>: scrollToGuide, handleQuiz, toggleCard, progress-bar tracker
│
```

Each fragment file is a SELF-CONTAINED block — it includes its `<div class="guide-section">…</div>` wrapper. The architect's shell has SLOT comment markers; the orchestrator (Claude main) does the slot-fill assembly.

---

## FILE NAMING (workspace `_workspace/midterm-merge/`)

| Owner | Output |
|-------|--------|
| @architect-shell | `01-shell.html` (full HTML with `<!-- SLOT: lec-N-... -->` markers where fragments will be injected) |
| @scribe-infectious | `02-fragment-infectious.html` |
| @scribe-allergies | `03-fragment-allergies.html` |
| @scribe-epithelial | `04-fragment-epithelial.html` |
| @scribe-salivary | `05-fragment-salivary.html` |
| @notecard-v2-builder | `06-fragment-notecard-v2.html` |
| All agents | `findings/<your-handle>.md` (proof + flags for QA) |
| @qa-verifier | `07-qa-report.md` (after assembly) |

Fragment files contain ONLY the `<div class="guide-section" id="sec-...">…</div>` block. No `<html>`, `<head>`, `<body>`, no `<style>` tag. CSS lives in shell.

---

## ARCHITECT-SHELL SPEC (@architect-shell)

Build `01-shell.html` containing:

1. **`<head>`** — viewport meta, title "OD 531 Oral Medicine Midterm — Complete Study Guide", Google Fonts link (Crimson Pro 400-700 + italics, Karla 400-700, JetBrains Mono 400-500).

2. **`<style>`** — copy verbatim from `/Users/suleman/dental-quest/study-guides/od531-complete-study-guide.html` lines 9-1437. This is the MASTER CSS — includes `.guide-section`, `.progress-shell`, `.progress-tab`, `.guide-section-divider`, `.divider-inner`, `.section-header`, `.card`, `.high-yield`, `.callout-danger`, `.explain`, `.foundations-box`, `.hemo-compare`, `.triage-grid`, `.tier-badge`, `.quick-facts`, `.phase-list`, `.clinical-img`, `.quiz-box`, `.severity-meter`, `.lab-val`, `.dose`, `.data-table`, `.callout`, `.teal-note`, `.section-line`, `.section-desc`, `.guide-footer`, `.back-top`, AND all `.nc-*` notecard classes (`.nc-card`, `.nc-card-title`, `.nc-cols`, `.nc-col`, `.nc-col-left`, `.nc-col-right`, `.nc-label`, plus `.h`, `.s`, `.hl`, `.pg` notecard typography). Verify by grep that `.nc-card` and `.nc-cols` are present in your output.

3. **`<body>`** — start with `<div class="progress-shell" id="progressShell">` containing 5 progress tabs in this exact order with these exact attributes:
   ```
   #sec-infectious  --tab-color: #B5483B  label "Infectious Diseases"  short "Infx"
   #sec-allergies   --tab-color: #2B5E8C  label "Allergies & Immunologic"  short "Allergy"
   #sec-epithelial  --tab-color: #2E7D5B  label "Epithelial & SCC"  short "Epi"
   #sec-salivary    --tab-color: #6B4C9A  label "Salivary Gland"  short "Saliva"
   #sec-notecard-v2 --tab-color: #C8923E  label "Notecard v2"  short "Card"
   ```
   Each tab needs `<span class="tab-dot"></span>`, `<span class="tab-label">`, `<span class="tab-short">`, `<span class="progress-pct" id="pct-X">0%</span>`. First tab gets `class="progress-tab active"`.

4. **5 SLOT markers** in body — one per lecture, in order:
   ```html
   <!-- SLOT: lec-1-infectious -->
   <!-- SLOT: lec-2-allergies -->
   <!-- SLOT: lec-3-epithelial -->
   <!-- SLOT: lec-4-salivary -->
   <!-- SLOT: lec-5-notecard-v2 -->
   ```
   The orchestrator will replace each marker with the corresponding fragment file's full content.

5. **`<footer class="guide-footer">`** — text: "OD 531 Oral Medicine — Midterm Complete Study Guide — Dr. Laurel Henderson, DDS, MS — BU Goldman — Spring 2026" plus second line "All content sourced directly from lecture materials. Zero fabrication."

6. **`<button class="back-top" id="backTop" onclick="window.scrollTo({top:0, behavior:'smooth'})">↑</button>`**

7. **`<script>`** — copy verbatim from `/Users/suleman/dental-quest/study-guides/od531-complete-study-guide.html` lines 7684-7773 BUT change the `keys` array to `['infectious', 'allergies', 'epithelial', 'salivary', 'notecard-v2']` so progress-tab IDs match.

**Proof to log in `findings/architect-shell.md`:**
- Line count of `01-shell.html`
- `grep -c "<!-- SLOT:"` should be 5
- `grep -c "guide-section\b"` (not just CSS class def) — confirm 0 actual `<div class="guide-section">` in the shell, since fragments inject those
- `grep -c ".nc-card\|.nc-cols"` in the `<style>` block — confirm notecard CSS present
- Confirm script's `keys` array matches the 5 lecture IDs

---

## SCRIBE SPEC (@scribe-infectious, @scribe-allergies, @scribe-epithelial, @scribe-salivary)

Each scribe owns ONE input file. Output one fragment file.

### Steps:

1. **Read your assigned input HTML** (full file).
2. **Extract just the body content** — drop `<!DOCTYPE>`, `<html>`, `<head>`, `<style>`, `<body>` tags, any sticky header/nav, hero gradient banner, footer, back-top button, and any `<script>` blocks.
3. **Wrap your content** in:
   ```html
   <div class="guide-section" id="sec-INFECTIOUS">  <!-- replace INFECTIOUS with allergies/epithelial/salivary -->
       <div class="guide-section-divider">
           <div class="divider-inner">
               <div class="section-number">Part N of 5</div>
               <h2>LECTURE TITLE</h2>
               <p>SHORT DESCRIPTION</p>
           </div>
       </div>
       <div class="guide-section-content">
           [extracted lecture body here]
       </div>
   </div>
   ```

4. **Prefix every `id="..."` attribute** in your content with your prefix (`inf-`, `alg-`, `epi-`, `sal-`). The OUTER `id="sec-INFECTIOUS"` does NOT get prefixed — it's the section anchor.

5. **Update every `href="#..."` anchor** that points to one of YOUR own internal IDs to use the prefix (e.g., `href="#leukoplakia"` → `href="#epi-leukoplakia"`).

6. **Class normalization** — your input file may use class names that don't exist in the master CSS. Check your fragment's classes against the master CSS in `od531-complete-study-guide.html` lines 9-1437. If you find divergent classes (e.g., your input uses `.gradient-hero` but master CSS doesn't have it), do ONE of:
   - **Preferred**: rewrite to use existing master classes (e.g., `.section-header`, `.foundations-box`)
   - **Fallback**: log the divergent class to your `findings/<your-handle>.md` so QA flags the architect to backfill

7. **Strip per-lecture `<style>` blocks completely.** Master CSS is canonical. Any required additions get logged for architect.

8. **Preserve every `<!-- SOURCE: Slide N -->` comment.** Do not drop, modify, or rewrite source citations.

9. **Preserve every `.clinical-img` placeholder** AS-IS. Do not insert real `<img>` tags — user is providing images later.

10. **CONDENSATION TASK** — this is a hybrid of complete (depth) and condensed (visual density). For each card:
    - KEEP all `.high-yield`, `.callout-danger`, prof-emphasized facts verbatim
    - KEEP every drug dose, percentage, time window, named pathognomonic finding
    - KEEP the explanatory `.explain` blocks (this is the "complete" depth)
    - TRIM redundant prose paragraphs (>4 sentences) into bulleted lists where safe
    - KEEP `.foundations-box` blocks intact
    - DO NOT delete content. If unsure whether to trim, KEEP IT and log the decision.

11. **Quizzes** — preserve all `.quiz-box` interactivity. Update onclick handlers if present (`handleQuiz` is already global).

### Proof to log in `findings/scribe-<lecture>.md`:
- Input line count vs fragment line count
- `grep -c "<!-- SOURCE:"` count (preserved citations)
- `grep -c ".clinical-img"` count (image placeholders)
- `grep -c "id=\"YOUR-PREFIX-"` count (prefixed IDs)
- `grep -c ".high-yield\|.callout-danger\|.explain"` count (callout boxes)
- List of any divergent classes found and how you handled them
- `awk` div balance check (open `<div` count == `</div>` count)

---

## NOTECARD V2 SPEC (@notecard-v2-builder)

Replicate the **exact** Notecard V2 structure from `od531-complete-study-guide.html` lines 7227-7675, populated with midterm content.

### Structure (mirror exactly):

```
<div class="guide-section" id="sec-notecard-v2">
  <div class="guide-section-divider">
    <div class="divider-inner">
      <div class="section-number">Bonus</div>
      <h2>Exam Notecard v2</h2>
      <p>All prof-highlighted facts across 4 midterm lectures, with bottom master strip</p>
    </div>
  </div>
  <div class="guide-section-content nc">

    <!-- SIDE A — L1 INFECTIOUS (red) + L2 ALLERGIES (blue) -->
    <div class="nc-label">Side A</div>
    <div class="nc-card">
      <div class="nc-card-title">SIDE A — L1 INFECTIOUS DISEASES (red) + L2 ALLERGIES & IMMUNOLOGIC (blue) | [abbreviation glossary]</div>
      <div class="nc-cols">
        <div class="nc-col nc-col-left r">
          <div class="h r">L1 · INFECTIOUS DISEASES</div>
          [topic blocks: <div class="s">Topic Title</div> followed by content]
        </div>
        <div class="nc-col nc-col-right b">
          <div class="h b">L2 · ALLERGIES & IMMUNOLOGIC</div>
          [topic blocks]
        </div>
      </div>
    </div>

    <!-- SIDE B — L3 EPITHELIAL (green) + L4 SALIVARY (purple) -->
    <div class="nc-label">Side B</div>
    <div class="nc-card">
      <div class="nc-card-title">SIDE B — L3 EPITHELIAL PATHOSES & SCC (green) + L4 SALIVARY GLAND (purple) | [abbreviation glossary] | QUIZ ANSWERS: [if applicable]</div>
      <div class="nc-cols">
        <div class="nc-col nc-col-left g">
          <div class="h g">L3 · EPITHELIAL PATHOSES & SCC</div>
          [topic blocks]
        </div>
        <div class="nc-col nc-col-right p">
          <div class="h p">L4 · SALIVARY GLAND DISORDERS</div>
          [topic blocks]
        </div>
      </div>
    </div>

    <!-- BOTTOM MASTER STRIP — cross-lecture rapid-recall -->
    <div class="nc-card">
      <div class="nc-card-title">BOTTOM STRIP — cross-lecture master lists</div>
      <div class="nc-cols">
        <div class="nc-col nc-col-left k">
          <div class="h k">PATHOGNOMONIC MASTER</div>
          [list of pathognomonic findings across 4 lectures]
        </div>
        <div class="nc-col nc-col-right k">
          <div class="h k">ORAL = FIRST SIGN</div>
          [list of conditions where oral is presenting feature]
        </div>
      </div>
      <div class="nc-cols" style="margin-top:14px;">
        <div class="nc-col nc-col-left k">
          <div class="h k">DRUG / DOSE QUICK-REF</div>
          [drug + dose list]
        </div>
        <div class="nc-col nc-col-right k">
          <div class="h k">EXAM-DAY DON'T-FORGETS</div>
          [last-minute pitfalls, red-letter exam traps]
        </div>
      </div>
    </div>

  </div>
</div>
```

### Content sourcing:

**Primary source (fast path):** Mine the 4 finalized lecture HTMLs directly. Extract all:
- `<div class="high-yield">…</div>` content
- `<div class="callout-danger">…</div>` content (pathognomonic findings)
- "Board Favorite" labels
- Red-text mnemonics (often inside `<strong>` or `<span style="color:#B5483B">`)
- Drug doses with `class="dose"` or in `<span>` inside callouts
- All `<!-- SOURCE: Slide N -->` adjacent content

**Verification:** Spot-check 5-10 facts against the corresponding PDFs in `/Users/suleman/Downloads/Oral med midterm/` if anything looks off. Prefer the lecture HTMLs (already audited).

### Topic blocks per lecture:

Each `<div class="s">Topic Name</div>` heading is followed by densely-packed content. Use `<span class="hl">…</span>` (yellow highlight) to mark prof-emphasized phrases. Use `<span class="pg r"><span class="hl">…</span></span>` for pathognomonic anchors (or `pg b/g/p/k` matching the column color).

Aim for **8-12 topic blocks per L1/L2/L3/L4 column** (matching the V2 final-exam density). Cover the high-yield content fully.

### Proof to log in `findings/notecard-v2-builder.md`:
- Line count of `06-fragment-notecard-v2.html`
- Topic block count per column (`grep -c '<div class="s">'`)
- `<span class="hl">` highlight count (target: 80+ across all sides)
- Pathognomonic finding count
- Lecture-coverage check: at least 5 topic blocks per lecture column drawn from the source HTML highlights
- Spot-check 5 facts: quote + source HTML line number where the fact came from

---

## QA AGENT SPEC (@qa-verifier) — runs AFTER assembly

This agent runs LAST, on `/Users/suleman/dental-quest/study-guides/od531-midterm-complete-study-guide.html`.

### Required checks (each must produce PROOF, not just "PASS"):

1. **Slot resolution** — `grep -c "<!-- SLOT:"` MUST be 0 (all 5 markers replaced).
2. **Div balance** — `awk` count of `<div` opens vs `</div>` closes. Must be equal. Report counts.
3. **Section anchor integrity** — confirm 5 `<div class="guide-section" id="sec-...">` blocks exist with the correct IDs (`sec-infectious`, `sec-allergies`, `sec-epithelial`, `sec-salivary`, `sec-notecard-v2`).
4. **Progress tab href integrity** — confirm 5 `<a class="progress-tab"` href targets each match an existing section ID.
5. **No duplicate IDs** — extract all `id="..."` values, confirm no duplicates after prefixing.
6. **Source citation count** — sum of `<!-- SOURCE:` comments. Should be > 700 (allergies alone has 670).
7. **Image placeholder count** — sum of `.clinical-img` divs. Report count for the user.
8. **CSS classes used vs available** — for any `class="..."` value, confirm at least one of the classes exists in the `<style>` block. Report any orphaned classes.
9. **JS function reachability** — confirm `scrollToGuide`, `handleQuiz`, `toggleCard`, the IIFE progress tracker are all present.
10. **Browser screenshot via Playwright** — open the file in browser, screenshot at viewport 1440×900 desktop AND 390×844 iPhone-13. Click each progress tab, confirm scroll behavior. Click one quiz answer, confirm quiz feedback works. Save 8+ screenshots to `_workspace/midterm-merge/qa-screenshots/`.
11. **Notecard V2 visual rendering** — screenshot the notecard section specifically. Confirm 4 colored columns visible, bottom strip present.
12. **Per-lecture rendering check** — scroll to each section, screenshot, confirm content rendered (not blank, not broken layout).

### Output `_workspace/midterm-merge/07-qa-report.md`:

For EACH check above, include:
- Exact command/tool used
- Raw output excerpt
- Verdict: PASS / FAIL
- If FAIL: specific fix recommendation with file location

End with overall verdict: PASS / CONDITIONAL PASS / FAIL.

---

## COLLABORATION RULES

- All agents read this brief FIRST (`00-shared-brief.md`).
- All agents write findings to `findings/<your-handle>.md` BEFORE finishing.
- Scribes who find divergent CSS classes log them so the architect can backfill.
- The notecard agent reads the 4 lecture HTMLs directly (not the scribe fragments — those may be running in parallel).
- The QA agent reads the assembled output AFTER the orchestrator runs assembly. QA does NOT run in parallel with the build agents.
- If anything in this brief seems wrong or self-contradictory, log to `findings/<your-handle>.md` and proceed with your best judgment.

---

## ANTI-PATTERNS

- ❌ Inventing new CSS classes (use master CSS)
- ❌ Inserting `<img>` tags (use `.clinical-img` placeholders)
- ❌ Dropping `<!-- SOURCE: -->` comments
- ❌ Modifying input lecture HTMLs
- ❌ Writing to the final output file directly (only orchestrator does that, and only via slot-fill)
- ❌ Editing other agents' fragments
- ❌ Claiming PASS without proof artifacts
- ❌ Adding `<style>` or `<script>` to fragments — both live in shell

---

## END OF BRIEF
