#!/usr/bin/env node
// Sully OS Task 3 harness — grad roadmap verb layer (js/graduation-roadmap/patients.js)
//
// Extracts the REAL production code by sentinel markers (no copies, no drift):
//   [SULLYOS-CHART-START..END]  — normalizeChartNumber + findByNormalizedChart
//   [SULLYOS-VERBS-START..END]  — pure verb parse + resolve layer
// plus parsePatientImportText (with the existing sub-parsers stubbed) to prove
// verb blocks route correctly WITHOUT disturbing the existing 7 block types.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', '..', 'js', 'graduation-roadmap', 'patients.js'), 'utf8');

function extract(startMark, endMark) {
    const start = src.indexOf(startMark);
    const end = src.indexOf(endMark);
    if (start === -1 || end === -1) throw new Error('Sentinel not found: ' + startMark + ' / ' + endMark);
    return src.slice(start, end + endMark.length);
}

const chartCode = extract('// [SULLYOS-CHART-START]', '// [SULLYOS-CHART-END]');
const verbCode = extract('// [SULLYOS-VERBS-START]', '// [SULLYOS-VERBS-END]');

const parseMatch = src.match(/function parsePatientImportText\(text\) \{[\s\S]*?\n\}/);
if (!parseMatch) throw new Error('parsePatientImportText not found');
const parseCode = parseMatch[0];

// Stubs for the existing sub-parsers (their internals are covered by prior audits;
// here we only prove ROUTING is untouched by the verb layer)
const stubs = `
    function parsePatientRecord(t) { return { name: 'StubName', chartNumber: 'stub1', _stub: true }; }
    function parsePatientUpdate(t) { return { chartNumber: 'stub1', _stub: true }; }
    function parseRequirementsMatch(t) { return { canFulfill: [], completedToday: [], highValue: null, priorityNotes: '' }; }
    function parseDashboardUpdate(t) { return null; }
    function parseMissingNotesBlock(t) { return null; }
    function parseTodoListBlock(t) { return null; }
    function parseImportAppointmentBlock(t) { return { patientName: 'StubApt', date: '2026-08-21', _stub: true }; }
`;

const ctxVM = {};
vm.createContext(ctxVM);
vm.runInContext(chartCode + '\n' + verbCode + '\n' + stubs + '\n' + parseCode + `
    this.__x = { svNormalizeTime, svParseDateToken, svParseDateTimeToken, svIsVerbHeader,
        svParseVerbBlock, svResolveVerbOps, svFindPatient, svCanonName, svCheckboxKey,
        normalizeChartNumber, findByNormalizedChart, parsePatientImportText,
        SV_VERBS, SV_DESTRUCTIVE_VERBS };
`, ctxVM);
const X = ctxVM.__x;

let pass = 0, fail = 0;
function eq(actual, expected, label) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) { pass++; console.log('  PASS ' + label); }
    else { fail++; console.log('  FAIL ' + label + '\n    expected ' + e + '\n    actual   ' + a); }
}
function ok(cond, label) { eq(!!cond, true, label); }

// ---------- 1. svNormalizeTime (12h/24h tolerance) ----------
console.log('[1] svNormalizeTime');
eq(X.svNormalizeTime('9:00 AM'), '09:00', "'9:00 AM' -> 09:00");
eq(X.svNormalizeTime('1 PM'), '13:00', "'1 PM' -> 13:00");
eq(X.svNormalizeTime('13:00'), '13:00', "'13:00' passthrough");
eq(X.svNormalizeTime('12:15am'), '00:15', "'12:15am' -> 00:15");
eq(X.svNormalizeTime('12:00 PM'), '12:00', "'12:00 PM' -> 12:00 (noon)");
eq(X.svNormalizeTime('9:00'), '09:00', "'9:00' -> 09:00");
eq(X.svNormalizeTime('9 A.M.'), '09:00', "'9 A.M.' -> 09:00");
eq(X.svNormalizeTime('25:00'), null, "'25:00' invalid -> null");
eq(X.svNormalizeTime('lunchtime'), null, "'lunchtime' -> null");

// ---------- 2. svParseDateToken (regex-only, no Date()) ----------
console.log('[2] svParseDateToken');
eq(X.svParseDateToken('2026-08-21'), '2026-08-21', 'ISO passthrough');
eq(X.svParseDateToken('2026-8-3'), '2026-08-03', 'ISO unpadded');
eq(X.svParseDateToken('08/21/2026'), '2026-08-21', 'M/D/YYYY');
eq(X.svParseDateToken('8/21/26'), '2026-08-21', 'M/D/YY');
eq(X.svParseDateToken('tomorrow'), null, 'garbage -> null');

// ---------- 3. svParseDateTimeToken ----------
console.log('[3] svParseDateTimeToken');
eq(X.svParseDateTimeToken('2026-08-21 09:00'), { date: '2026-08-21', time: '09:00' }, 'ISO + 24h');
eq(X.svParseDateTimeToken('08/21/2026 9:00 AM'), { date: '2026-08-21', time: '09:00' }, 'US + 12h');
eq(X.svParseDateTimeToken('2026-08-25'), { date: '2026-08-25', time: null }, 'date-only');
eq(X.svParseDateTimeToken('3:30 PM'), { date: null, time: '15:30' }, 'time-only');

// ---------- 4. svParseVerbBlock — each verb + required-field rejects ----------
console.log('[4] svParseVerbBlock');
let op = X.svParseVerbBlock('APPOINTMENT_MOVE', 'CHART: 79118\nFROM: 2026-08-21 9:00 AM\nTO: 2026-08-25 13:00');
eq(op.parseError, null, 'MOVE parses clean');
eq([op.chart, op.fromDate, op.fromTime, op.toDate, op.toTime], ['79118', '2026-08-21', '09:00', '2026-08-25', '13:00'], 'MOVE fields');
op = X.svParseVerbBlock('APPOINTMENT_MOVE', 'PATIENT: John Smith\nFROM: 2026-08-21 9:00 AM\nTO: 3:00 PM');
eq(op.parseError, null, 'MOVE by PATIENT + time-only TO parses');
eq([op.patient, op.toDate, op.toTime], ['John Smith', null, '15:00'], 'MOVE PATIENT/time-only-TO fields');
op = X.svParseVerbBlock('APPOINTMENT_MOVE', 'CHART: 79118\nFROM: 2026-08-21 9:00 AM');
ok(op.parseError && op.parseError.indexOf('TO:') !== -1, 'MOVE missing TO -> parseError');
op = X.svParseVerbBlock('APPOINTMENT_DELETE', 'CHART: 79118\nDATE: 08/22/2026\nTIME: 1:00 PM');
eq([op.parseError, op.date, op.time], [null, '2026-08-22', '13:00'], 'APPOINTMENT_DELETE parses + normalizes');
op = X.svParseVerbBlock('APPOINTMENT_DELETE', 'CHART: 79118\nDATE: 08/22/2026');
ok(op.parseError && op.parseError.indexOf('TIME') !== -1, 'APPOINTMENT_DELETE missing TIME -> parseError');
op = X.svParseVerbBlock('TODO_DONE', 'ID: "todo-0001"');
eq([op.parseError, op.id], [null, 'todo-0001'], 'TODO_DONE ID parses, quotes stripped');
op = X.svParseVerbBlock('TODO_DONE', '');
ok(op.parseError, 'TODO_DONE no ID/MATCH -> parseError');
op = X.svParseVerbBlock('TODO_DELETE', 'MATCH: pano paperwork');
eq([op.parseError, op.match], [null, 'pano paperwork'], 'TODO_DELETE MATCH parses');
op = X.svParseVerbBlock('NOTE_CLEARED', 'ID: note-79118-20260815');
eq(op.parseError, null, 'NOTE_CLEARED ID parses');
op = X.svParseVerbBlock('NOTE_CLEARED', 'CHART: 79118\nDATE: 08/15/2026');
eq(op.parseError, null, 'NOTE_CLEARED CHART+DATE parses');
op = X.svParseVerbBlock('NOTE_CLEARED', 'CHART: 79118');
ok(op.parseError, 'NOTE_CLEARED chart without date -> parseError');
op = X.svParseVerbBlock('PROCEDURE_DELETE', 'CHART: 79118\nDATE: 2026-08-15\nPROCEDURE: composite #30');
eq(op.parseError, null, 'PROCEDURE_DELETE parses');
op = X.svParseVerbBlock('PROCEDURE_DELETE', 'CHART: 79118\nDATE: 2026-08-15');
ok(op.parseError && op.parseError.indexOf('PROCEDURE') !== -1, 'PROCEDURE_DELETE missing PROCEDURE -> parseError');
op = X.svParseVerbBlock('PATIENT_ARCHIVE', 'CHART: 79118');
eq([op.parseError, op.archived], [null, true], 'PATIENT_ARCHIVE defaults to archived=yes');
op = X.svParseVerbBlock('PATIENT_ARCHIVE', 'CHART: 200\nARCHIVED: no');
eq(op.archived, false, 'PATIENT_ARCHIVE ARCHIVED: no -> restore');
op = X.svParseVerbBlock('PATIENT_DELETE', 'CHART: 79118\nCONFIRM_NAME: John Smith');
eq(op.parseError, null, 'PATIENT_DELETE parses with CONFIRM_NAME');
op = X.svParseVerbBlock('PATIENT_DELETE', 'CHART: 79118');
ok(op.parseError && op.parseError.indexOf('CONFIRM_NAME') !== -1, 'PATIENT_DELETE missing CONFIRM_NAME -> parseError');

// ---------- 5. Routing through the real parsePatientImportText ----------
console.log('[5] parsePatientImportText routing');
const mixedPaste = [
    'SYNTAX: SULLYOS-1',
    '@ROADMAP',
    'PATIENT_UPDATE',
    'CHART: 79118',
    'NOTES_APPEND: stub',
    '---',
    'APPOINTMENT_MOVE',
    'CHART: 79118',
    'FROM: 2026-08-21 9:00 AM',
    'TO: 2026-08-25',
    '---',
    'TODO_DONE',
    'ID: todo-0001',
    '---',
    'WORKOUT_LOG',
    'TYPE: legs'
].join('\n');
let parsed = X.parsePatientImportText(mixedPaste);
eq(parsed.verbOps.length, 2, 'verbOps routed (2)');
eq(parsed.verbOps.map(o => o.verb), ['APPOINTMENT_MOVE', 'TODO_DONE'], 'verb order preserved');
eq(parsed.updates.length, 1, 'PATIENT_UPDATE still routed alongside verbs');
eq(parsed.unrecognizedHeaders, ['WORKOUT_LOG'], 'unknown header surfaced, not silently dropped');

parsed = X.parsePatientImportText('APPOINTMENTS\n---\nPATIENT: John\nDATE: 2026-08-21\nPROCEDURE: SRP');
eq(parsed.appointments.length, 1, 'classic APPOINTMENTS pendingHeader path intact');
eq(parsed.verbOps.length, 0, 'no phantom verbOps from classic blocks');

parsed = X.parsePatientImportText('APPOINTMENT_DELETE\n---\nCHART: 79118\nDATE: 2026-08-22\nTIME: 13:00');
eq(parsed.verbOps.length, 1, 'verb header-only block consumes next block (pendingHeader)');
eq(parsed.verbOps[0].verb, 'APPOINTMENT_DELETE', 'pendingHeader verb type');

// ---------- 6. Resolver fixtures ----------
console.log('[6] svResolveVerbOps');
const ctx = {
    records: {
        pt_79118: { id: 'pt_79118', name: 'John Smith', chartNumber: '79118', archived: false },
        pt_101: { id: 'pt_101', name: 'Jane Doe', chartNumber: '101' },
        pt_102: { id: 'pt_102', name: 'Jane Doe', chartNumber: '102' },
        pt_200: { id: 'pt_200', name: 'Archie Ved', chartNumber: '200', archived: true }
    },
    appointments: [
        { id: 'apt_1', patientId: 'pt_79118', date: '2026-08-21', time: '9:00 AM', procedures: 'Crown prep', status: 'scheduled' },
        { id: 'apt_2', patientId: 'pt_79118', date: '2026-08-22', time: '13:00', procedures: 'SRP', status: 'scheduled' }
    ],
    procedures: [
        { id: 'proc_1', patientId: 'pt_79118', date: '2026-08-15', procedure: 'Class II composite #30' },
        { id: 'proc_2', patientId: 'pt_79118', date: '2026-08-15', procedure: 'Class II composite #31' }
    ],
    todoItems: {
        'todo-0001': { id: 'todo-0001', description: 'Call Dr. Yancey about pano', status: 'pending' },
        'todo-0002': { id: 'todo-0002', description: 'Submit pano paperwork', status: 'pending' },
        'todo-0003': { id: 'todo-0003', description: 'Order retainer', status: 'completed' }
    },
    missingNotes: {
        'note-79118-20260815': { id: 'note-79118-20260815', chartNumber: '79118', patientName: 'John Smith', date: '08/15/2026', status: 'pending' },
        'note-101-20260810': { id: 'note-101-20260810', chartNumber: '101', patientName: 'Jane Doe', date: '08/10/2026', status: 'completed' }
    },
    deletedTodoIds: { 'todo-9999': '2026-08-19T00:00:00.000Z' },
    deletedPatientRecordIds: { 'pt_300': '2026-08-19T00:00:00.000Z' }
};
const R = (verb, body) => X.svResolveVerbOps([X.svParseVerbBlock(verb, body)], ctx)[0];

// APPOINTMENT_MOVE
let r = R('APPOINTMENT_MOVE', 'CHART: 79118\nFROM: 2026-08-21 09:00\nTO: 2026-08-25');
eq([r.status, r.targetId], ['ok', 'apt_1'], "MOVE: 24h FROM finds stored '9:00 AM' (both-sides normalization)");
eq(r.dest, { date: '2026-08-25', time: '09:00' }, 'MOVE: date-only TO keeps current time');
r = R('APPOINTMENT_MOVE', 'PATIENT: Smith, John\nFROM: 2026-08-21 9:00 AM\nTO: 2026-08-25 10:00');
eq([r.status, r.targetId], ['ok', 'apt_1'], "MOVE: PATIENT 'Last, First' resolves via comma-flip");
r = R('APPOINTMENT_MOVE', 'CHART: 79118\nFROM: 2026-08-01 08:00\nTO: 2026-08-25 10:00');
eq(r.status, 'reject', 'MOVE: no appointment at FROM slot -> reject');
r = R('APPOINTMENT_MOVE', 'CHART: 79118\nFROM: 2026-08-20 09:00\nTO: 2026-08-21 9:00 AM');
eq([r.status, r.reason.indexOf('Already at destination') === 0], ['skip', true], 'MOVE: already-at-destination -> skip (re-paste idempotent)');
r = R('APPOINTMENT_MOVE', 'CHART: 79118\nFROM: 2026-08-21 09:00\nTO: 2026-08-22 1:00 PM');
eq([r.status, r.reason.indexOf('would duplicate') !== -1], ['reject', true], 'MOVE: destination occupied -> reject, no duplicate');
r = R('APPOINTMENT_MOVE', 'PATIENT: Jane Doe\nFROM: 2026-08-21 09:00\nTO: 2026-08-25');
eq([r.status, r.reason.indexOf('Multiple patients') === 0], ['reject', true], 'MOVE: ambiguous patient name -> reject');

// APPOINTMENT_DELETE
r = R('APPOINTMENT_DELETE', 'PATIENT: John Smith\nDATE: 2026-08-22\nTIME: 1:00 PM');
eq([r.status, r.targetId], ['ok', 'apt_2'], "DELETE: 12h TIME finds stored '13:00'");
r = R('APPOINTMENT_DELETE', 'CHART: 79118\nDATE: 2026-08-30\nTIME: 09:00');
eq(r.status, 'skip', 'DELETE: absent slot -> skip (already deleted)');

// TODO_DONE / TODO_DELETE
r = R('TODO_DONE', 'ID: todo-0001');
eq([r.status, r.targetId], ['ok', 'todo-0001'], 'TODO_DONE by ID -> ok');
r = R('TODO_DONE', 'ID: todo-0003');
eq(r.status, 'skip', 'TODO_DONE already completed -> skip');
r = R('TODO_DONE', 'ID: todo-9999');
eq(r.status, 'skip', 'TODO_DONE tombstoned ID -> skip');
r = R('TODO_DONE', 'ID: todo-nope');
eq(r.status, 'reject', 'TODO_DONE unknown ID -> reject');
r = R('TODO_DONE', 'MATCH: pano');
eq([r.status, r.reason.indexOf('2 to-dos match') === 0], ['reject', true], 'TODO_DONE MATCH hits 2 pending -> reject (never guess)');
r = R('TODO_DONE', 'MATCH: yancey');
eq([r.status, r.targetId], ['ok', 'todo-0001'], 'TODO_DONE MATCH unique -> ok');
r = R('TODO_DONE', 'MATCH: retainer');
eq(r.status, 'skip', 'TODO_DONE MATCH only-completed -> skip');
r = R('TODO_DELETE', 'ID: todo-9999');
eq(r.status, 'skip', 'TODO_DELETE tombstoned -> skip');
r = R('TODO_DELETE', 'ID: todo-nope');
eq(r.status, 'reject', 'TODO_DELETE unknown ID -> reject');
r = R('TODO_DELETE', 'MATCH: zzz-nothing');
eq(r.status, 'skip', 'TODO_DELETE MATCH none -> skip');
r = R('TODO_DELETE', 'MATCH: paperwork');
eq([r.status, r.targetId], ['ok', 'todo-0002'], 'TODO_DELETE MATCH unique -> ok');

// NOTE_CLEARED
r = R('NOTE_CLEARED', 'ID: note-79118-20260815');
eq([r.status, r.targetId], ['ok', 'note-79118-20260815'], 'NOTE_CLEARED by ID -> ok');
r = R('NOTE_CLEARED', 'CHART: 079118\nDATE: 2026-08-15');
eq([r.status, r.targetId], ['ok', 'note-79118-20260815'], 'NOTE_CLEARED chart(leading-zero)+ISO-date -> ok');
r = R('NOTE_CLEARED', 'CHART: 101\nDATE: 08/10/2026');
eq(r.status, 'skip', 'NOTE_CLEARED already completed -> skip');
r = R('NOTE_CLEARED', 'ID: note-999-20260101');
eq(r.status, 'reject', 'NOTE_CLEARED unknown -> reject');

// PROCEDURE_DELETE
r = R('PROCEDURE_DELETE', 'CHART: 79118\nDATE: 2026-08-15\nPROCEDURE: composite');
eq([r.status, r.reason.indexOf('2 procedure records match') === 0], ['reject', true], 'PROCEDURE_DELETE ambiguous -> reject');
r = R('PROCEDURE_DELETE', 'CHART: 79118\nDATE: 2026-08-15\nPROCEDURE: #30');
eq([r.status, r.targetId], ['ok', 'proc_1'], 'PROCEDURE_DELETE unique substring -> ok');
r = R('PROCEDURE_DELETE', 'CHART: 79118\nDATE: 2026-08-16\nPROCEDURE: composite');
eq(r.status, 'skip', 'PROCEDURE_DELETE none -> skip');

// PATIENT_ARCHIVE
r = R('PATIENT_ARCHIVE', 'CHART: 79118');
eq([r.status, r.targetId], ['ok', 'pt_79118'], 'ARCHIVE active patient -> ok');
r = R('PATIENT_ARCHIVE', 'PATIENT: Archie Ved');
eq(r.status, 'skip', 'ARCHIVE already-archived -> skip (idempotent)');
r = R('PATIENT_ARCHIVE', 'CHART: 200\nARCHIVED: no');
eq([r.status, r.targetId], ['ok', 'pt_200'], 'ARCHIVE restore differs -> ok');

// PATIENT_DELETE
r = R('PATIENT_DELETE', 'CHART: 079118\nCONFIRM_NAME: john smith');
eq([r.status, r.targetId, r.requiresCheckbox], ['ok', 'pt_79118', true], 'PATIENT_DELETE name confirmed (case-insens) -> ok + checkbox');
r = R('PATIENT_DELETE', 'CHART: 79118\nCONFIRM_NAME: Wrong Name');
eq([r.status, r.reason.indexOf('does not match') !== -1], ['reject', true], 'PATIENT_DELETE CONFIRM_NAME mismatch -> reject');
r = R('PATIENT_DELETE', 'CHART: 300\nCONFIRM_NAME: Ghost');
eq(r.status, 'skip', 'PATIENT_DELETE tombstoned chart -> skip');
r = R('PATIENT_DELETE', 'CHART: 999\nCONFIRM_NAME: Nobody');
eq(r.status, 'reject', 'PATIENT_DELETE unknown chart -> reject');
r = X.svResolveVerbOps([X.svParseVerbBlock('PATIENT_DELETE', 'CHART: 79118')], ctx)[0];
eq([r.status, r.reason.indexOf('CONFIRM_NAME') !== -1], ['reject', true], 'PATIENT_DELETE parseError surfaces as reject');

// ---------- 7. Checkbox key hardening ----------
console.log('[7] svCheckboxKey');
eq(X.svCheckboxKey('pt_79118'), 'svPtDelChk_pt_79118', 'plain id');
eq(X.svCheckboxKey('pt_<img src=x>'), 'svPtDelChk_pt_imgsrcx', 'HTML-hostile id stripped');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
