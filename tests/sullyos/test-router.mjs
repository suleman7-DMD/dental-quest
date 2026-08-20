// Sully OS router harness — classification, routing, destructive detection
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = require('../../js/sullyos/router.js');

let pass = 0, fail = 0;
function eq(actual, expected, label) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) { pass++; }
    else { fail++; console.error(`FAIL ${label}\n  expected ${e}\n  got      ${a}`); }
}

// --- classification ---
eq(R.sullyClassifyBlock('MEAL|Chicken Bowl|650|45|60|18|12:30'), 'bodyComp', 'meal line');
eq(R.sullyClassifyBlock('WORKOUT|Lift|45|280|17:00'), 'bodyComp', 'workout pipe = bodycomp');
eq(R.sullyClassifyBlock('FOOD|Halal Plate|800|50|70|30'), 'bodyComp', 'food');
eq(R.sullyClassifyBlock('MEAL_DELETE|Chicken Bowl|2026-08-19'), 'bodyComp', 'meal delete');
eq(R.sullyClassifyBlock('STIM_DAY\nDATE: 2026-08-20\nWORKOUT: 18:30 | intense'), 'stimCalc', 'stim day with WORKOUT: colon line');
eq(R.sullyClassifyBlock('stim_day\nDATE: 2026-08-20'), 'stimCalc', 'case-insensitive header');
eq(R.sullyClassifyBlock('PATIENT_UPDATE\nCHART: 12345'), 'roadmap', 'patient update');
eq(R.sullyClassifyBlock('APPOINTMENT_MOVE\nCHART: 12345\nFROM: 2026-08-21 09:00\nTO: 2026-08-22 13:00'), 'roadmap', 'appointment move');
eq(R.sullyClassifyBlock('@STIMCALC\nsomething freeform'), 'stimCalc', 'banner fallback');
eq(R.sullyClassifyBlock('random text here'), 'unknown', 'unknown block');
eq(R.sullyClassifyBlock('   \n  '), 'empty', 'empty block');

// --- routing envelope ---
const paste = [
    'SYNTAX: SULLYOS-1',
    'STIM_DAY',
    'DATE: 2026-08-20',
    'DOSE: 30 @ 07:15',
    '---',
    'MEAL|Chicken Bowl|650|45|60|18|12:30',
    'WORKOUT|Lift|45|280|17:00',
    '---',
    'APPOINTMENTS',
    'PATIENT: Mrs. Kowalski | 2026-08-22 | 1:00 PM | Crown prep',
    '---',
    'GIBBERISH_BLOCK',
    'nothing real'
].join('\n');
const routed = R.sullyRouteBlocks('```\n' + paste + '\n```');
eq(routed.byApp.stimCalc.length, 1, 'one stim block');
eq(routed.byApp.bodyComp.length, 1, 'one bodycomp block');
eq(routed.byApp.roadmap.length, 1, 'one roadmap block');
eq(routed.unknown.length, 1, 'one unknown');
eq(routed.syntaxWarning, null, 'known syntax no warning');
eq(routed.byApp.stimCalc[0].includes('SYNTAX'), false, 'syntax line stripped');

const routedV2 = R.sullyRouteBlocks('SYNTAX: SULLYOS-9\nSTIM_DAY\nDATE: 2026-08-20');
eq(!!routedV2.syntaxWarning, true, 'unknown version warns');
eq(routedV2.byApp.stimCalc.length, 1, 'still parses on unknown version');

// CRLF tolerance
const crlf = R.sullyRouteBlocks('STIM_DAY\r\nDATE: 2026-08-20\r\n---\r\nMEAL|X|100||||08:00');
eq(crlf.byApp.stimCalc.length, 1, 'crlf stim');
eq(crlf.byApp.bodyComp.length, 1, 'crlf bodycomp');

// --- destructive detection ---
eq(R.sullyBlockIsDestructive('APPOINTMENT_DELETE\nCHART: 12345\nDATE: 2026-08-21\nTIME: 09:00'), true, 'appt delete destructive');
eq(R.sullyBlockIsDestructive('APPOINTMENT_MOVE\nCHART: 12345\nFROM: 2026-08-21 09:00\nTO: 2026-08-22 13:00'), false, 'move not destructive');
eq(R.sullyBlockIsDestructive('PATIENT_DELETE\nCHART: 12345\nCONFIRM_NAME: Test'), true, 'patient delete destructive');
eq(R.sullyBlockIsDestructive('MEAL_DELETE|Chicken Bowl|2026-08-19'), true, 'meal delete destructive');
eq(R.sullyBlockIsDestructive('STIM_DAY\nDATE: 2026-08-20\nDOSE_DELETE: 07:15'), true, 'dose delete destructive');
eq(R.sullyBlockIsDestructive('STIM_DAY\nDATE: 2026-08-20\nDOSE: 30 @ 07:15'), false, 'plain stim not destructive');
eq(R.sullyBlockIsDestructive('MEAL|Chicken Bowl|650|45|60|18'), false, 'meal add not destructive');

// --- STIM_DAY split-shape reassembly (reference-doc / webchat bug) ---
// A `---` placed between STIM_DAY and its own fields used to make the router
// relay an empty header and drop the fields as "unrecognized". Must reassemble.
const split = R.sullyRouteBlocks(`SYNTAX: SULLYOS-1
STIM_DAY
---
DATE: 2026-08-19
WOKE: 07:15
---
STIM_DAY
---
DATE: 2026-08-20
FELL_ASLEEP: 03:15
WOKE: 07:30`);
eq(split.byApp.stimCalc.length, 2, 'split shape → 2 stim blocks (not header-only)');
eq(split.unknown.length, 0, 'no orphan field blocks left unrecognized');
eq(split.byApp.stimCalc[0].includes('DATE: 2026-08-19') && split.byApp.stimCalc[0].includes('WOKE: 07:15'), true, 'day 1 header carries its fields');
eq(split.byApp.stimCalc[1].includes('FELL_ASLEEP: 03:15'), true, 'day 2 header carries its fields');

// split shape MIXED with other apps: orphan fields fold, MEAL still routes alone
const splitMixed = R.sullyRouteBlocks(`STIM_DAY
---
DATE: 2026-08-20
DOSE: 30 @ 07:05
---
MEAL|Yogurt|310|21|41|8|07:50|2026-08-20`);
eq(splitMixed.byApp.stimCalc.length, 1, 'mixed: one stim day');
eq(splitMixed.byApp.stimCalc[0].includes('DOSE: 30 @ 07:05'), true, 'mixed: dose folded into stim day');
eq(splitMixed.byApp.bodyComp.length, 1, 'mixed: meal still its own bodycomp block');
eq(splitMixed.unknown.length, 0, 'mixed: nothing dropped');

// --- summary ---
const summary = R.sullyRoutingSummary(routed, 'stimCalc');
eq(summary.includes('this app'), true, 'summary marks local');
eq(summary.includes('unrecognized'), true, 'summary counts unknown');

console.log(`\nrouter harness: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
