# Quote-Paraphraser Findings
Run: 2026-05-02 | Agent: @quote-paraphraser

## Summary
| Section | Prof-quote blocks paraphrased | Blockquotes remaining |
|---------|-------------------------------|-----------------------|
| sec-infectious (L1 — Britney) | 43 | 0 |
| sec-epithelial (L3) | 0 | 0 |
| sec-salivary (L4 — Stoopler) | 14 | 0 |
| **TOTAL** | **57** | **0** |

sec-allergies and sec-notecard-v2: untouched — verified by grep (0 prof-emphasis blocks added).

---

## File-Size Delta
| Metric | Before | After |
|--------|--------|-------|
| Bytes | 684,582 | 691,484 |
| Lines | 10,916 | 10,930 |
| Delta | +6,902 bytes (+1.0%) | +14 lines |

---

## Quote-by-Quote Table (selected — truncated to 100/120 chars)

| Section | Wrapper | Before (≤100 chars) | After (≤120 chars) |
|---------|---------|---------------------|---------------------|
| sec-infectious | prof-flag-tier-2 | "Each of you are gonna be in the hot seat at some point in time..." | Prof walked the class through the 5-step case framework used for every patient scenario — signaling it as the exam case format. |
| sec-infectious | prof-flag-tier-3 | "They love to ask about honey colored crusts, OK, or the cornflakes glued to the surface..." | Prof drilled impetigo lesion appearance — board exams consistently test "honey-colored crusts" and "cornflakes glued to the surface." |
| sec-infectious | prof-flag-tier-1 | "Please, please, please, when you practice with each other, memorize the list of reportable diseases..." | Prof used her strongest verbal urgency (triple "please") for the reportable disease list — highest-urgency memorization target. |
| sec-infectious | prof-flag-tier-3 | "I will say this again I will probably ask it on an exam this is not the appropriate medicine for diabetics..." | Prof triple-drilled clotrimazole-diabetes contraindication — the single highest-repetition T1 in candidiasis. |
| sec-salivary | blockquote.lingered | "Bilateral submandibular gland, or parotid gland swelling is reassuring. If it's unilateral, that's your like I gotta..." | Prof underscored that bilateral swelling is reassuring but unilateral = red flag for MALT lymphoma — urgent rheum/heme referral. |

---

## 5 Full-Length Sample Transformations

### 1 — sec-infectious, impetigo, prof-flag-tier-3
**BEFORE:**
```html
<div class="prof-flag-tier-3">
  <strong>T3 — Audio T1 + Slide 13 Yellow (TOP EXAM ITEM):</strong> "They love to ask about honey colored crusts, OK, or the cornflakes glued to the surface. If you remember the appearance, it looked flaky, think about little cornflakes on the face, OK?"
</div>
```
**AFTER:**
```html
<div class="prof-flag-tier-3">
  <strong>T3 — Audio T1 + Slide 13 Yellow (TOP EXAM ITEM):</strong>
  <div class="prof-emphasis">🎙️ Prof drilled the appearance of impetigo lesions — board exams consistently test the "honey-colored crusts" and "cornflakes glued to the surface" descriptors. She used both visual metaphors in the same breath. Memorize both phrasings for exam recognition questions.</div>
</div>
```

### 2 — sec-infectious, tertiary syphilis, prof-flag-tier-3
**BEFORE:**
```html
<div class="prof-flag-tier-3">
  <strong>T3 — "love to ask about" + Slide 20 Yellow on both terms:</strong> "Tertiary syphilis or neurosyphilis... The central nervous system sequelae includes tapesdalis. This is one of those sexy terms that they love to ask about."
  <br>"The term for granulomatous inflammation in tertiary syphilis is gamma, OK?..."
</div>
```
**AFTER:**
```html
<div class="prof-flag-tier-3">
  <strong>T3 — "love to ask about" + Slide 20 Yellow on both terms:</strong>
  <div class="prof-emphasis">🎙️ Prof flagged two terminology targets for tertiary syphilis: tabes dorsalis (CNS sequela — "sexy" board term) and gumma (granulomatous inflammation). She also tied palatal perforation directly to tertiary syphilis — mandatory differential when a hole appears in the palate.</div>
</div>
```

### 3 — sec-infectious, TB mandatory reporting, prof-flag-tier-1
**BEFORE:**
```html
<div class="prof-flag-tier-1">
  <strong>Prof explicit (mandatory reporting — "please please please"):</strong> "this is reportable as well. Please, please, please, when you practice with each other, memorize the list of reportable, um, diseases, the ones you need to know, OK?"
</div>
```
**AFTER:**
```html
<div class="prof-flag-tier-1">
  <div class="prof-emphasis">🎙️ Prof used her strongest verbal urgency — triple "please" — to emphasize that TB is also mandatorily reportable to MA DPH. Both TB and syphilis trigger mandatory DPH notification — this pairing is a signature testable fact.</div>
</div>
```

### 4 — sec-salivary, MALT lymphoma blockquote
**BEFORE:**
```html
<blockquote class="lingered">
  "Bilateral submandibular gland, or parotid gland swelling is reassuring. If it's unilateral, that's your like I gotta change my pants. Like this is not a good thing." — Prof
</blockquote>
```
**AFTER:**
```html
<div class="prof-emphasis">🎙️ Prof underscored that bilateral salivary-gland swelling in Sjögren's is generally reassuring, but unilateral swelling is a red flag — it suggests possible MALT lymphoma transformation and warrants urgent rheumatology/hematology referral.</div>
```

### 5 — sec-salivary, sialolith blockquote
**BEFORE:**
```html
<blockquote class="lingered" style="margin-top:8px;">
  "Not all stones are radio opaque. They start as these little sludge pellets, these little mucin plugs, and they slowly aggregate their minerals." — Prof
</blockquote>
```
**AFTER:**
```html
<div class="prof-emphasis" style="margin-top:8px;">🎙️ Prof explained the pathophysiology of sialolith formation: stones start as mucin plugs (sludge pellets) and slowly accumulate minerals — which is why early stones are not yet radiopaque. This is the exam-gold reason for ordering ultrasound or CT when a stone is suspected but not seen on plain film.</div>
```

---

## CSS Added
Injected inside `<style id="midterm-emphasis-tiers">`:
- `.prof-emphasis` background `#FFF7ED`, border-left `4px solid #C2410C`, radius 8px
- `::before` pseudo-element: "PROF EMPHASIZED" in JetBrains Mono, 11px, `#9A3412`
- Scoped to `#sec-infectious`, `#sec-epithelial`, `#sec-salivary` only

## Untouched sections
- `sec-allergies`: 0 prof-emphasis blocks added (verified)
- `sec-notecard-v2`: 0 prof-emphasis blocks added (verified)
