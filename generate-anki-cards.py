#!/usr/bin/env python3
"""
Generate Anki image occlusion flashcards with MULTI-ZONE support.
Each master card shows a LARGE tree section; multiple zones per card.
Each zone generates its own Q/A pair — so you always see the full tree context.

Usage:  /tmp/anki-venv/bin/python3 generate-anki-cards.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

# ═══════════════════════════════════════════════════════
#                    CONFIGURATION
# ═══════════════════════════════════════════════════════
SCALE = 2
FONT_SIZE = 14 * SCALE
TITLE_FONT_SIZE = 15 * SCALE
PROMPT_FONT_SIZE = 13 * SCALE
LINE_HEIGHT = 21 * SCALE
PADDING_X = 28 * SCALE
PADDING_Y = 16 * SCALE
TITLE_BAR_H = 38 * SCALE
PROMPT_BAR_H = 30 * SCALE
CARD_MIN_WIDTH = 750 * SCALE

BG = (252, 252, 254)
TEXT = (35, 35, 40)
TITLE_BG = (25, 74, 148)
TITLE_FG = (255, 255, 255)
PROMPT_BG = (240, 242, 248)
PROMPT_FG = (80, 80, 100)
OCCLUDE_BG = (200, 45, 55)
OCCLUDE_FG = (255, 255, 255)
REVEAL_BG = (218, 242, 222)
BORDER_COLOR = (200, 202, 210)

FONT_PATH = "/System/Library/Fonts/Menlo.ttc"
OUTPUT_DIR = "/Users/suleman/dental-quest/anki-cards/peds-operative"


# ═══════════════════════════════════════════════════════
#                   HELPER
# ═══════════════════════════════════════════════════════
def L(text, zone=None):
    """Line tuple: (text, zone_id_or_None)."""
    return (text, zone)


# ═══════════════════════════════════════════════════════
#               MASTER CARD DEFINITIONS
# ═══════════════════════════════════════════════════════

MASTER_CARDS = [

    # ══════════════════════════════════════════════
    #  MASTER 1: INTRO — Assessment Criteria
    # ══════════════════════════════════════════════
    {
        "id": "intro",
        "title": "START: Carious Primary Tooth",
        "lines": [
            L("START: You've diagnosed caries on a primary tooth"),
            L("\u2502"),
            L("\u251c\u2500 STEP 0: PREVENTION FIRST"),
            L("\u2502   Before restoring ANYTHING \u2192 individualized preventive plan:"),
            L("\u2502   dietary counseling, OHI, fluoride management, CRA"),
            L("\u2502"),
            L("\u251c\u2500 Is the tooth RESTORABLE?"),
            L("\u2502"),
            L("\u251c\u2500 NO \u2192 EXTRACT \u2192 Space Maintenance"),
            L("\u2502   (Unrestorable = no coronal structure for retention,"),
            L("\u2502    or signs of non-vitality without treatment option)"),
            L("\u2502"),
            L("\u2514\u2500 YES \u2192 Assess THREE things simultaneously:"),
            L("         1) Lesion extent (clinical + radiographic)", "assess"),
            L("         2) Patient factors (behavior, caries risk, isolation)", "assess"),
            L("         3) Tooth-specific anatomy rules", "assess"),
            L(""),
            L("         Then split: ANTERIOR vs POSTERIOR pathway", "assess"),
        ],
        "zones": [
            {"id": "assess", "prompt": "What 3 things must you assess before choosing a pathway?"},
        ],
    },

    # ══════════════════════════════════════════════
    #  MASTER 2: FULL ANTERIOR PATHWAY (4 zones)
    # ══════════════════════════════════════════════
    {
        "id": "anterior",
        "title": "ANTERIOR PATHWAY \u2014 Full Decision Tree",
        "lines": [
            L("ANTERIOR TOOTH \u2014 How extensive?"),
            L("\u2502"),
            L("\u251c\u2500 INCIPIENT (enamel only, non-cavitated)"),
            L("\u2502   \u251c\u2500 Facial white spot \u2192 Resin Infiltration (ICON)", "z1"),
            L("\u2502   \u2502   (works well for post-ortho white spots, fluorosis)", "z1"),
            L("\u2502   \u251c\u2500 Interproximal contact caries (lower incisors)", "z1"),
            L("\u2502   \u2502   \u2192 Interproximal Stripping + Fluoride Varnish or SDF", "z1"),
            L("\u2502   \u2502     (open contact \u2192 self-cleansing \u2192 arrest with F\u207b/SDF)", "z1"),
            L("\u2502   \u2514\u2500 Monitor with fluoride if very early", "z1"),
            L("\u2502"),
            L("\u251c\u2500 SMALL CAVITATED (Class III)"),
            L("\u2502   \u2514\u2500 Composite with MECHANICAL RETENTION", "z2"),
            L("\u2502       \u251c\u2500 Must include T-shape or L-shape lock", "z2"),
            L("\u2502       \u2502   (extend onto facial or lingual, no more than halfway)", "z2"),
            L("\u2502       \u251c\u2500 Optional facial bevel for esthetics", "z2"),
            L("\u2502       \u251c\u2500 Keep prep shallow \u2014 pulp is LARGE in primary incisors", "z2"),
            L("\u2502       \u2514\u2500 Requires good isolation + cooperation", "z2"),
            L("\u2502"),
            L("\u251c\u2500 MODERATE-EXTENSIVE (Class IV or multi-surface)"),
            L("\u2502   \u2514\u2500 STRIP CROWN (Resin Crown)"),
            L("\u2502       \u251c\u2500 Select crown form FIRST (match mesiodistal width)", "z3"),
            L("\u2502       \u251c\u2500 Reduce: incisal 1.0-1.5mm, proximal 0.5-1.0mm,", "z3"),
            L("\u2502       \u2502          facial \u22651.0mm, lingual 0.5mm", "z3"),
            L("\u2502       \u251c\u2500 Place undercut in gingival 1/3 of facial (330 or 35 bur)", "z3"),
            L("\u2502       \u2502   \u2192 CRITICAL for retention (high failure rate otherwise)", "z3"),
            L("\u2502       \u251c\u2500 Poke vent hole in incisal corner of form", "z3"),
            L("\u2502       \u251c\u2500 Etch \u2192 bond \u2192 cure \u2192 fill form \u2192 seat \u2192 cure all angles", "z3"),
            L("\u2502       \u2514\u2500 Peel form \u2192 finish/polish", "z3"),
            L("\u2502"),
            L("\u2514\u2500 SEVERE / UNCOOPERATIVE / HIGH CARIES RISK"),
            L("    \u251c\u2500 SMART (SDF + GI) \u2014 no excavation needed", "z4"),
            L("    \u251c\u2500 ART/ITR (hand excavation + GI) \u2014 stabilize", "z4"),
            L("    \u251c\u2500 Zirconia Crown (best esthetics, most aggressive prep,", "z4"),
            L("    \u2502   passive fit required, no undercuts, expensive,", "z4"),
            L("    \u2502   insurance rarely covers)", "z4"),
            L("    \u2514\u2500 Polycarbonate Crown (plastic shell + resin lining)", "z4"),
        ],
        "zones": [
            {"id": "z1", "prompt": "What are the management options for each incipient presentation?"},
            {"id": "z2", "prompt": "What restoration type and key prep considerations for Class III?"},
            {"id": "z3", "prompt": "What is the full strip crown procedure?"},
            {"id": "z4", "prompt": "What are the 4 treatment options for severe/uncooperative cases?"},
        ],
    },

    # ══════════════════════════════════════════════
    #  MASTER 3: POSTERIOR PART 1
    #  Incipient + Small Cavitated (5 zones)
    # ══════════════════════════════════════════════
    {
        "id": "post1",
        "title": "POSTERIOR (1/2) \u2014 Incipient + Small Cavitated",
        "lines": [
            L("POSTERIOR PRIMARY MOLAR \u2014 How extensive?"),
            L("\u2502"),
            L("\u251c\u2500\u2500\u2500 INCIPIENT (enamel only, non-cavitated)"),
            L("\u2502    \u2502"),
            L("\u2502    \u251c\u2500 Occlusal pit/fissure (stained, suspect)", "prr"),
            L("\u2502    \u2502   \u2514\u2500 PRR Type 1: fissurotomy to confirm \u2192 sealant", "prr"),
            L("\u2502    \u2502      (no anesthesia usually needed)", "prr"),
            L("\u2502    \u2502", "prr"),
            L("\u2502    \u251c\u2500 Occlusal lesion just into dentin", "prr"),
            L("\u2502    \u2502   \u251c\u2500 PRR Type 2: remove caries \u2192 bond \u2192 flowable composite", "prr"),
            L("\u2502    \u2502   \u2514\u2500 PRR Type 3: same as Type 2 PLUS sealant over entire", "prr"),
            L("\u2502    \u2502      occlusal surface (MOST COMMON \u2014 treat + prevent)", "prr"),
            L("\u2502    \u2502", "prr"),
            L("\u2502    \u2514\u2500 Interproximal enamel-only (on radiograph)", "prr"),
            L("\u2502        \u2514\u2500 Resin Infiltration (ICON) or monitor", "prr"),
            L("\u2502           (Professor: \"haven't seen much success\" proximally)", "prr"),
            L("\u2502"),
            L("\u251c\u2500\u2500\u2500 SMALL CAVITATED LESION"),
            L("\u2502    \u2502"),
            L("\u2502    \u251c\u2500 [!] RULE CHECK FIRST: Is this the MESIAL surface"),
            L("\u2502    \u2502   of a PRIMARY FIRST MOLAR (A, B, I, J)?"),
            L("\u2502    \u2502   \u2502", "mesial"),
            L("\u2502    \u2502   \u251c\u2500 YES \u2192 SSC. ALWAYS. NO EXCEPTIONS.", "mesial"),
            L("\u2502    \u2502   \u2502   (Mesial pulp horn is too prominent and close to", "mesial"),
            L("\u2502    \u2502   \u2502    surface \u2192 Class II MO prep = guaranteed pulp exposure)", "mesial"),
            L("\u2502    \u2502   \u2502", "mesial"),
            L("\u2502    \u2502   \u2514\u2500 NO \u2192 Continue \u25bc", "mesial"),
            L("\u2502    \u2502"),
            L("\u2502    \u251c\u2500 Class I (occlusal only)"),
            L("\u2502    \u2502   \u251c\u2500 Amalgam or Composite", "cls1"),
            L("\u2502    \u2502   \u2502   Prep: 1.5-2.0mm depth, 330 bur, rounded line angles,", "cls1"),
            L("\u2502    \u2502   \u2502   90\u00b0 cavosurface (NO bevel), isthmus = 1/3 intercuspal", "cls1"),
            L("\u2502    \u2502   \u2514\u2500 If shallow/small \u2192 PRR Type 2 or 3", "cls1"),
            L("\u2502    \u2502"),
            L("\u2502    \u251c\u2500 Class II \u2014 does NOT extend beyond facial/lingual line angles"),
            L("\u2502    \u2502   \u2502"),
            L("\u2502    \u2502   \u251c\u2500 Can you achieve ISOLATION + is patient COOPERATIVE?"),
            L("\u2502    \u2502   \u2502   \u2502", "cls2"),
            L("\u2502    \u2502   \u2502   \u251c\u2500 YES + Low/Mod Caries Risk", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502   \u251c\u2500 AMALGAM: 90\u00b0 margins, convex axial wall,", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502   \u2502   box walls converge occlusally, T-band + wedge", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502   \u2514\u2500 COMPOSITE: Use AMALGAM-STYLE PREP", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502       (\"do NOT do box-only preps in primary teeth\")", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502       \u2192 Sandwich Technique ideal (GI base + composite)", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502       \u2192 No gingival bevel (rods go occlusally in primary)", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502", "cls2"),
            L("\u2502    \u2502   \u2502   \u251c\u2500 YES + High Caries Risk", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502   \u2514\u2500 SSC preferred OR Sandwich Technique (GI + composite)", "cls2"),
            L("\u2502    \u2502   \u2502   \u2502", "cls2"),
            L("\u2502    \u2502   \u2502   \u2514\u2500 NO (poor isolation or uncooperative)", "cls2"),
            L("\u2502    \u2502   \u2502       \u2514\u2500 SSC, GI restoration, or ART/ITR to stabilize", "cls2"),
            L("\u2502    \u2502   \u2502", "cls2"),
            L("\u2502    \u2502   \u2514\u2500 [!] WATCH FOR: \"Lost gingival floor\" error", "cls2"),
            L("\u2502    \u2502       (extending box too far apical past cervical constriction", "cls2"),
            L("\u2502    \u2502        \u2192 floor disappears \u2192 clinician cuts deeper \u2192 PULP EXPOSURE", "cls2"),
            L("\u2502    \u2502        \u2192 If this happens: abandon Class II \u2192 SSC or extract)", "cls2"),
            L("\u2502    \u2502"),
            L("\u2502    \u2514\u2500 Class V"),
            L("\u2502        \u2514\u2500 Amalgam, Composite, or GI (GI ideal \u2014 fluoride release,", "cls5"),
            L("\u2502           chemical bond, moisture tolerant)", "cls5"),
        ],
        "zones": [
            {"id": "prr", "prompt": "What are the PRR types and management for each incipient presentation?"},
            {"id": "mesial", "prompt": "What is the mesial first molar rule and the reasoning?"},
            {"id": "cls1", "prompt": "What are the Class I material options and prep specs?"},
            {"id": "cls2", "prompt": "What are the Class II treatment choices based on isolation + caries risk?"},
            {"id": "cls5", "prompt": "What are the Class V material options and which is ideal?"},
        ],
    },

    # ══════════════════════════════════════════════
    #  MASTER 4: POSTERIOR PART 2
    #  Moderate-Extensive SSC + Severe (3 zones)
    # ══════════════════════════════════════════════
    {
        "id": "post2",
        "title": "POSTERIOR (2/2) \u2014 SSC + Severe Management",
        "lines": [
            L("POSTERIOR PRIMARY MOLAR \u2014 How extensive?"),
            L("\u2502"),
            L("\u251c\u2500\u2500\u2500 MODERATE TO EXTENSIVE LESION \u2192 SSC"),
            L("\u2502"),
            L("\u2502    ALL of these scenarios = Stainless Steel Crown:"),
            L("\u2502    \u251c\u2500 Class II extending BEYOND buccal/lingual line angles", "ssc"),
            L("\u2502    \u251c\u2500 Multi-surface involvement (3+ surfaces)", "ssc"),
            L("\u2502    \u251c\u2500 Post-pulp therapy (pulpotomy/pulpectomy) \u2014 GOLD STANDARD", "ssc"),
            L("\u2502    \u251c\u2500 Developmental defects (hypoplasia, hypocalcification)", "ssc"),
            L("\u2502    \u251c\u2500 Fractured primary molar", "ssc"),
            L("\u2502    \u251c\u2500 High caries risk child with interproximal caries", "ssc"),
            L("\u2502    \u251c\u2500 GA cases with multi-surface decay", "ssc"),
            L("\u2502    \u2514\u2500 Mesial of ANY primary first molar (A, B, I, J)", "ssc"),
            L("\u2502", "ssc"),
            L("\u2502    SSC Procedure Reminders:", "ssc"),
            L("\u2502    \u2022 Remove ALL caries FIRST (before any crown prep)", "ssc"),
            L("\u2502    \u2022 Occlusal reduction: 1.0-1.5mm (football diamond)", "ssc"),
            L("\u2502    \u2022 Slice proximal contacts (169L or thin tapered diamond)", "ssc"),
            L("\u2502    \u2022 Feather-edge margin, rounded line angles", "ssc"),
            L("\u2502    \u2022 Do NOT reduce buccal/lingual (need cervical bulge)", "ssc"),
            L("\u2502    \u2022 Smallest crown that fits = best crown", "ssc"),
            L("\u2502    \u2022 Seat LINGUAL \u2192 BUCCAL (snap over buccal bulge)", "ssc"),
            L("\u2502    \u2022 Cement in SAME ORDER you tried on", "ssc"),
            L("\u2502    \u2022 Adjacent crowns: reduce occlusal one at a time", "ssc"),
            L("\u2502    \u2022 Floss-knot technique for cement cleanup", "ssc"),
            L("\u2502", "ssc"),
            L("\u2502    Space Loss? \u2192", "ssc"),
            L("\u2502    \u2022 Squeeze crown M-D with pliers (malleable Ni-Cr alloy)", "ssc"),
            L("\u2502    \u2022 Cross-arch trick: try crown from opposite side/arch", "ssc"),
            L("\u2502      (e.g., tooth I \u2192 try crown for tooth B)", "ssc"),
            L("\u2502"),
            L("\u2514\u2500\u2500\u2500 SEVERE CARIES / BEHAVIORAL / ACCESS LIMITATION"),
            L("     \u2502"),
            L("     \u251c\u2500 [!] FIRST: Is there PULP INVOLVEMENT?"),
            L("     \u2502   (spontaneous/nocturnal pain, fistula, abscess,"),
            L("     \u2502    pathologic mobility, furcal/periapical radiolucency)"),
            L("     \u2502   \u2502"),
            L("     \u2502   \u251c\u2500 YES \u2192 Pulp therapy FIRST, then SSC after."),
            L("     \u2502   \u2502         Hall Technique CONTRAINDICATED."),
            L("     \u2502   \u2514\u2500 NO \u2192 Choose based on situation \u25bc"),
            L("     \u2502"),
            L("     \u251c\u2500 HALL TECHNIQUE (no prep, no anesthesia, no caries removal)"),
            L("     \u2502   \u251c\u2500 Indications: fearful child, deep caries WITHOUT", "hall"),
            L("     \u2502   \u2502   pulp involvement, avoids sedation/GA", "hall"),
            L("     \u2502   \u251c\u2500 Select crown \u2192 try-in PARTIALLY ONLY", "hall"),
            L("     \u2502   \u2502   (do NOT fully seat during try-in \u2014 impossible to remove!)", "hall"),
            L("     \u2502   \u251c\u2500 Fill with GI cement \u2192 gauze throat screen \u2192 seat", "hall"),
            L("     \u2502   \u2502   (have patient bite on cotton roll)", "hall"),
            L("     \u2502   \u251c\u2500 Warn parent: temporary open bite (resolves ~4 weeks)", "hall"),
            L("     \u2502   \u251c\u2500 Contraindicated: pulp involvement, non-restorable,", "hall"),
            L("     \u2502   \u2502   adjacent to existing broad restoration", "hall"),
            L("     \u2502   \u2514\u2500 If contacts too tight \u2192 ortho separators 30 min first", "hall"),
            L("     \u2502"),
            L("     \u251c\u2500 ART/ITR (Atraumatic/Interim Therapeutic Restoration)", "art"),
            L("     \u2502   \u251c\u2500 Hand excavation (spoon excavator) + GI", "art"),
            L("     \u2502   \u251c\u2500 ART = definitive (mission trip, won't see pt again)", "art"),
            L("     \u2502   \u251c\u2500 ITR = temporary (stabilize until OR or definitive tx)", "art"),
            L("     \u2502   \u2514\u2500 Apply fluoride varnish after", "art"),
            L("     \u2502", "art"),
            L("     \u2514\u2500 SMART (Silver Modified Atraumatic Restorative Technique)", "art"),
            L("         \u251c\u2500 SDF + GI (NO excavation needed)", "art"),
            L("         \u251c\u2500 1-visit: SDF \u2192 GI immediately (no follow-up possible)", "art"),
            L("         \u251c\u2500 2-visit (ideal): SDF \u2192 confirm arrest (hard, black) \u2192 GI", "art"),
            L("         \u251c\u2500 SDF does NOT interfere with GI bonding", "art"),
            L("         \u2514\u2500 Warn: dark gray/black color will show through", "art"),
        ],
        "zones": [
            {"id": "ssc", "prompt": "What are ALL the SSC indications, procedure steps, and space loss tips?"},
            {"id": "hall", "prompt": "What is the Hall Technique procedure, indications, and contraindications?"},
            {"id": "art", "prompt": "What are ART/ITR and SMART — techniques, indications, and steps?"},
        ],
    },

    # ══════════════════════════════════════════════
    #  MASTER 5: QUICK REFERENCE (2 zones)
    # ══════════════════════════════════════════════
    {
        "id": "ref",
        "title": "EXAM QUICK REFERENCE",
        "lines": [
            L("AUTOMATIC SSC TRIGGERS:"),
            L("  \u25a1 Mesial caries on primary 1st molar (A, B, I, J)", "rules"),
            L("  \u25a1 Class II extending beyond line angles", "rules"),
            L("  \u25a1 3+ surface involvement", "rules"),
            L("  \u25a1 Post-pulp therapy", "rules"),
            L("  \u25a1 High caries risk + interproximal caries", "rules"),
            L("  \u25a1 Developmental defects", "rules"),
            L("  \u25a1 GA treatment planning", "rules"),
            L(""),
            L("CRITICAL \"DON'T\" RULES:"),
            L("  \u2717 Don't do IAN blocks with Articaine (paresthesia risk)", "rules"),
            L("  \u2717 Don't use Articaine in patients < 4 years old", "rules"),
            L("  \u2717 Don't use Benzocaine in patients < 2 years old", "rules"),
            L("  \u2717 Don't use OraVerse in pts < 3 yrs or < 15 kg", "rules"),
            L("  \u2717 Don't do Nasopalatine injection in kids (too painful)", "rules"),
            L("  \u2717 Don't do box-only composite preps in primary teeth", "rules"),
            L("  \u2717 Don't bevel gingival floor in primary tooth Class II", "rules"),
            L("  \u2717 Don't place Hall crown with signs of pulp involvement", "rules"),
            L("  \u2717 Don't fully seat Hall crown during try-in", "rules"),
            L("  \u2717 Don't use PDL injection if periapical infection/abscess", "rules"),
            L("  \u2717 Don't rubber dam with severe URI (can't nasal breathe)", "rules"),
            L(""),
            L("EXAM NUMBERS TO KNOW:"),
            L("  \u2022 Max dose ALL peds local anesthetics: 4.4 mg/kg", "facts"),
            L("  \u2022 Class I/II amalgam depth: 1.5-2.0 mm", "facts"),
            L("  \u2022 Isthmus width: 1/3 intercuspal distance", "facts"),
            L("  \u2022 Cavosurface angle: 90\u00b0 butt joint (NO bevel for amalgam)", "facts"),
            L("  \u2022 Topical anesthetic wait: 1-2 minutes minimum", "facts"),
            L("  \u2022 SSC occlusal reduction: 1.0-1.5 mm", "facts"),
            L("  \u2022 Strip crown: incisal 1.0-1.5mm, prox 0.5-1.0mm,", "facts"),
            L("    facial \u22651.0mm, lingual 0.5mm", "facts"),
            L("  \u2022 OraVerse (15-30 kg): max \u00bd cartridge (0.2 mg)", "facts"),
            L("  \u2022 Hall open bite resolves: ~4 weeks", "facts"),
            L("  \u2022 Mandibular foramen in child: AT or BELOW occlusal plane", "facts"),
            L("  \u2022 Primary enamel: ~1mm thick (permanent: 2.5-3mm)", "facts"),
            L("  \u2022 Composite avg lifespan in primary molars: ~2 years", "facts"),
            L(""),
            L("ANESTHESIA QUICK REFERENCE:"),
            L("  \u2022 Infiltration for 99.5% of primary dentition", "facts"),
            L("  \u2022 Lidocaine for IAN blocks (never Articaine for blocks)", "facts"),
            L("  \u2022 Child IAN: syringe parallel to occlusal plane,", "facts"),
            L("    needle directed slightly downward, short needle", "facts"),
            L("  \u2022 Topical: dry \u2192 apply benzocaine \u2192 wait 1-2 min \u2192 gauze", "facts"),
            L("  \u2022 Post-op: warn parents \"at least a couple hours\" numbness,", "facts"),
            L("    soft/liquid diet, describe potential ulcer if child bites lip", "facts"),
        ],
        "zones": [
            {"id": "rules", "prompt": "List all SSC triggers and DON'T rules."},
            {"id": "facts", "prompt": "What are the key exam numbers and anesthesia guidelines?"},
        ],
    },
]


# ═══════════════════════════════════════════════════════
#                   RENDERING ENGINE
# ═══════════════════════════════════════════════════════

def get_zone_regions(lines, zone_id):
    """Find contiguous regions of lines belonging to a zone.
    Returns list of (start_idx, end_idx) tuples. Handles non-contiguous zones."""
    regions = []
    start = None
    for i, (_, z) in enumerate(lines):
        if z == zone_id:
            if start is None:
                start = i
        else:
            if start is not None:
                regions.append((start, i - 1))
                start = None
    if start is not None:
        regions.append((start, len(lines) - 1))
    return regions


def render_card(master, zone_info, is_answer):
    """Render a Q or A card for one zone of a master card."""
    # Fonts
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE, index=0)
    font_bold = ImageFont.truetype(FONT_PATH, FONT_SIZE, index=1)
    font_title = ImageFont.truetype(FONT_PATH, TITLE_FONT_SIZE, index=1)
    font_prompt = ImageFont.truetype(FONT_PATH, PROMPT_FONT_SIZE, index=2)
    font_q = ImageFont.truetype(FONT_PATH, int(FONT_SIZE * 1.8), index=1)

    lines = master["lines"]
    active_id = zone_info["id"]

    # ─── Canvas dimensions ───
    max_w = CARD_MIN_WIDTH
    for text, _ in lines:
        if text:
            w = font.getlength(text) + PADDING_X * 2
            if w > max_w:
                max_w = w
    title_w = font_title.getlength(master["title"]) + 250 * SCALE
    max_w = max(max_w, title_w)
    if not is_answer:
        prompt_w = font_prompt.getlength(zone_info["prompt"]) + PADDING_X * 2
        max_w = max(max_w, prompt_w)
    canvas_w = int(max_w)

    prompt_h = PROMPT_BAR_H if not is_answer else 0
    content_h = len(lines) * LINE_HEIGHT + PADDING_Y * 2
    canvas_h = int(TITLE_BAR_H + prompt_h + content_h)

    img = Image.new("RGB", (canvas_w, canvas_h), BG)
    draw = ImageDraw.Draw(img)

    # ─── Title bar ───
    draw.rectangle([(0, 0), (canvas_w, TITLE_BAR_H)], fill=TITLE_BG)
    ty = (TITLE_BAR_H - TITLE_FONT_SIZE) // 2 - 2 * SCALE
    draw.text((PADDING_X, ty), master["title"], fill=TITLE_FG, font=font_title)

    # Q/A pill
    ind = "  ANSWER  " if is_answer else "  QUESTION  "
    ind_c = (34, 139, 34) if is_answer else (200, 45, 55)
    iw = int(font_bold.getlength(ind))
    ix = canvas_w - PADDING_X - iw - 8 * SCALE
    draw.rounded_rectangle(
        [(ix, 6 * SCALE), (ix + iw + 8 * SCALE, TITLE_BAR_H - 6 * SCALE)],
        radius=6 * SCALE, fill=ind_c
    )
    draw.text(
        (ix + 4 * SCALE, (TITLE_BAR_H - FONT_SIZE) // 2 - 2 * SCALE),
        ind, fill=(255, 255, 255), font=font_bold
    )

    y = TITLE_BAR_H

    # ─── Prompt bar (Q only) ───
    if not is_answer:
        draw.rectangle([(0, y), (canvas_w, y + PROMPT_BAR_H)], fill=PROMPT_BG)
        draw.line([(0, y), (canvas_w, y)], fill=BORDER_COLOR, width=SCALE)
        py = y + (PROMPT_BAR_H - PROMPT_FONT_SIZE) // 2
        draw.text((PADDING_X, py), zone_info["prompt"], fill=PROMPT_FG, font=font_prompt)
        y += PROMPT_BAR_H

    draw.line([(0, y), (canvas_w, y)], fill=BORDER_COLOR, width=SCALE)
    y += PADDING_Y

    # ─── Get zone regions ───
    regions = get_zone_regions(lines, active_id)
    px_regions = []
    for rs, re in regions:
        py_s = y + rs * LINE_HEIGHT - 4 * SCALE
        py_e = y + (re + 1) * LINE_HEIGHT + 4 * SCALE
        px_regions.append((py_s, py_e))

    # ─── Draw green highlights (A card, BEFORE text) ───
    if is_answer:
        for py_s, py_e in px_regions:
            draw.rounded_rectangle(
                [(PADDING_X - 10 * SCALE, py_s),
                 (canvas_w - PADDING_X + 10 * SCALE, py_e)],
                radius=6 * SCALE, fill=REVEAL_BG
            )

    # ─── Draw text lines ───
    for i, (text, zone) in enumerate(lines):
        ly = y + i * LINE_HEIGHT
        if zone == active_id and not is_answer:
            pass  # Will be covered by red box
        elif text:
            draw.text((PADDING_X, ly), text, fill=TEXT, font=font)

    # ─── Draw red occlusion boxes (Q card) ───
    if not is_answer:
        for py_s, py_e in px_regions:
            draw.rounded_rectangle(
                [(PADDING_X - 10 * SCALE, py_s),
                 (canvas_w - PADDING_X + 10 * SCALE, py_e)],
                radius=8 * SCALE, fill=OCCLUDE_BG
            )
            # "?" centered in box
            q = "?"
            qw = font_q.getlength(q)
            qx = canvas_w // 2 - int(qw) // 2
            qy = (py_s + py_e) // 2 - int(FONT_SIZE)
            draw.text((qx, qy), q, fill=OCCLUDE_FG, font=font_q)

    # ─── Card border ───
    draw.rectangle(
        [(0, 0), (canvas_w - 1, canvas_h - 1)],
        outline=BORDER_COLOR, width=SCALE
    )

    return img


# ═══════════════════════════════════════════════════════
#                       MAIN
# ═══════════════════════════════════════════════════════

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Clean old files
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".png") or f.endswith(".tsv"):
            os.remove(os.path.join(OUTPUT_DIR, f))

    total_zones = sum(len(m["zones"]) for m in MASTER_CARDS)
    print(f"Generating {total_zones} Q/A pairs from {len(MASTER_CARDS)} master sections...")
    print(f"Output: {OUTPUT_DIR}\n")

    tsv_rows = []
    card_num = 0

    for master in MASTER_CARDS:
        print(f"  [{master['id']}] {master['title']}")
        for zone in master["zones"]:
            card_num += 1

            q_img = render_card(master, zone, is_answer=False)
            a_img = render_card(master, zone, is_answer=True)

            q_name = f"Q_{card_num:02d}_{master['id']}_{zone['id']}.png"
            a_name = f"A_{card_num:02d}_{master['id']}_{zone['id']}.png"

            q_img.save(os.path.join(OUTPUT_DIR, q_name), "PNG", optimize=True)
            a_img.save(os.path.join(OUTPUT_DIR, a_name), "PNG", optimize=True)

            front = f'<img src="{q_name}">'
            back = f'<img src="{a_name}">'
            tags = "Peds::Operative::DecisionTree"
            tsv_rows.append(f"{front}\t{back}\t{tags}")

            print(f"    [{card_num:2d}] zone: {zone['id']}")

    # Write TSV
    tsv_path = os.path.join(OUTPUT_DIR, "anki-import.tsv")
    with open(tsv_path, "w") as f:
        f.write("#separator:tab\n#html:true\n#tags column:3\n")
        f.write("\n".join(tsv_rows) + "\n")

    print(f"\n{'='*55}")
    print(f"DONE! {card_num} Q/A pairs from {len(MASTER_CARDS)} master sections.")
    print(f"  Images: {OUTPUT_DIR}/")
    print(f"  Import: {tsv_path}")
    print(f"\nTo import into Anki:")
    print(f"  1. Copy all PNG files to Anki media folder:")
    print(f"     ~/Library/Application Support/Anki2/User 1/collection.media/")
    print(f"  2. File > Import > select anki-import.tsv")
    print(f"  3. Note type: Basic, fields: Front, Back")
    print(f"  4. Choose target deck")
    print(f"{'='*55}")


if __name__ == "__main__":
    main()
