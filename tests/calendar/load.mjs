// Loads the DOM-free sentinel sections of the calendar modules into one vm context.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../js/calendar');
const SECTIONS = [
    ['state.js', 'CAL-PURE'],
    ['recurrence.js', 'CAL-RECUR'],
    ['parse.js', 'CAL-PARSE'],
    ['importer.js', 'CAL-IMPORT'],
    ['resolve.js', 'CAL-RESOLVE'],
    ['claude-instructions.js', 'CAL-INSTR'],
    ['firebase-sync.js', 'CAL-MERGE']
];

export function extract(file, tag) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    const a = src.indexOf('// [' + tag + '-START]');
    const b = src.indexOf('// [' + tag + '-END]');
    if (a === -1 || b === -1) throw new Error('sentinel ' + tag + ' missing in ' + file);
    return src.slice(a, b);
}

export function loadCalendar(only) {
    const ctx = vm.createContext({ console });
    for (const [file, tag] of SECTIONS) {
        if (only && !only.includes(file)) continue;
        if (!fs.existsSync(path.join(root, file))) continue;
        vm.runInContext(extract(file, tag), ctx, { filename: file });
    }
    return ctx;
}
