import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = resolve(import.meta.dirname, '..');
const server = createServer(async (request, response) => {
    try {
        const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
        if (!path.startsWith(root + '/')) throw new Error('Invalid path');
        response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(path)] || 'text/plain');
        response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;

async function load(context, file) {
    const page = await context.newPage();
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.fulfill({ body: '' }));
    await page.addInitScript(() => {
        const add = document.addEventListener.bind(document);
        document.addEventListener = (type, listener, options) => {
            if (type !== 'DOMContentLoaded') add(type, listener, options);
        };
    });
    await page.goto(`${base}/${file}`);
    return page;
}

async function fits(page, selector) {
    const result = await page.locator(selector).evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight, overflow: element.scrollWidth - element.clientWidth };
    });
    assert(result.left >= -1 && result.right <= result.width + 1 && result.top >= -1 && result.bottom <= result.height + 1, JSON.stringify(result));
    assert(result.overflow <= 1, `Horizontal overflow: ${JSON.stringify(result)}`);
}

try {
    for (const engine of [chromium, webkit]) {
        const browser = await engine.launch();
        try {
            for (const viewport of [{ width: 390, height: 750 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
                const context = await browser.newContext({ viewport, timezoneId: 'America/New_York', hasTouch: viewport.width < 600 });
                const page = await load(context, 'body-comp-tracker.html');
                await page.evaluate(() => {
                    state = getDefaultState();
                    state.today.date = getLocalDateString();
                    state.today.setupComplete = true;
                    state._dataLoaded = true;
                    pinValidated = true;
                    isInitialLoad = false;
                    hasLoadedFromCloud = true;
                    state.frequentFoods = {};
                    for (let index = 0; index < 45; index++) {
                        const id = `food_${index}`;
                        state.frequentFoods[id] = { id, name: index === 44 ? 'History favorite with a very long food name & <safe>' : `Food ${index}`, calories: 150, protein: 16, carbs: 10, fat: 6, uses: index === 1 ? 10 : 0 };
                    }
                    const date = parseLocalDate(getLocalDateString());
                    date.setDate(date.getDate() - 1);
                    const yesterday = getLocalDateString(date);
                    state.dailyLogs[yesterday] = { date: yesterday, calories: 150, deficit: 500, meals: { meal: { name: state.frequentFoods.food_44.name, libraryId: 'food_44', calories: 150 } }, workouts: { gym: { type: 'Lift', calories: 320 } } };
                    openAddMealModal();
                });
                await page.waitForFunction(() => getComputedStyle(document.getElementById('logModal')).visibility === 'visible');
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 0);
                assert((await page.locator('#frequentFoodsGrid').textContent()).includes('No pinned foods yet'));
                await page.locator('#frequentFoodsGrid button').click();
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 45);
                const initial = await page.locator('#frequentFoodsGrid .ff-name').allTextContents();
                await fits(page, '#logModal .modal');
                assert.equal(await page.locator('#frequentFoodsGrid').evaluate(element => element.scrollWidth <= element.clientWidth), true);
                if (viewport.width < 600 || viewport.height <= 500) {
                    assert.equal(await page.locator('#ffPickerSearch').evaluate(element => getComputedStyle(element).fontSize), '16px');
                }
                await page.locator('#ffPickerSearch').fill('No matching food exists');
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 0);
                await page.locator('#ffPickerSearch').fill('History favorite');
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 1);
                await page.locator('#ffPickerSearch').fill('');
                assert.deepEqual(await page.locator('#frequentFoodsGrid .ff-name').allTextContents(), initial);
                await page.locator('#ffPickerSearch').fill('History favorite');
                await page.locator('#frequentFoodsGrid .ff-pin-btn').click();
                assert.equal(await page.evaluate(() => state.frequentFoods.food_44.pinned), true);
                assert.equal(await page.locator('#qtySelectorModal.active').count(), 0);
                await page.locator('#ffViewBtnFrequents').click();
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 1);
                assert.equal(await page.locator('#ffPickerSearch').isVisible(), false);
                await page.evaluate(() => {
                    document.getElementById('ffPickerSearch').value = 'Food 1';
                    renderFrequentFoods();
                });
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 1);
                await page.locator('#frequentFoodsGrid .ff-pin-btn').click();
                assert.equal(await page.evaluate(() => ffPickerView), 'pinned');
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 0);
                assert.equal(await page.evaluate(() => getValues(state.frequentFoods).length), 45);
                assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bodyCompTrackerState')).frequentFoods.food_44.pinned), false);
                await page.locator('#ffViewBtnAll').click();
                await page.locator('#ffPickerSearch').fill('History favorite');
                await page.locator('#frequentFoodsGrid .ff-pin-btn').focus();
                await page.keyboard.press('Enter');
                assert.equal(await page.locator('#qtySelectorModal.active').count(), 0);
                await page.reload();
                await page.evaluate(() => {
                    loadState();
                    state._dataLoaded = true;
                    pinValidated = true;
                    isInitialLoad = false;
                    hasLoadedFromCloud = true;
                    openAddMealModal();
                });
                assert.equal(await page.evaluate(() => ffPickerView), 'pinned');
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 1);
                assert.equal(await page.evaluate(() => state.frequentFoods.food_44.pinned), true);
                await fits(page, '#mealActionFooter');
                await page.locator('#frequentFoodsGrid .ff-pin-btn').click();
                await page.reload();
                await page.evaluate(() => {
                    loadState();
                    state._dataLoaded = true;
                    pinValidated = true;
                    isInitialLoad = false;
                    hasLoadedFromCloud = true;
                    openAddMealModal();
                });
                assert.equal(await page.evaluate(() => state.frequentFoods.food_44.pinned), false);
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 0);
                await page.locator('#ffViewBtnAll').click();
                await page.locator('#ffPickerSearch').fill('History favorite');
                await page.locator('#frequentFoodsGrid .ff-pin-btn').click();
                await page.locator('#ffViewBtnFrequents').click();
                await page.locator('#ffViewBtnAll').click();
                await page.locator('#frequentFoodsGrid .frequent-food-btn').last().scrollIntoViewIfNeeded();
                assert.equal(await page.evaluate(() => [...document.querySelectorAll('#frequentFoodsGrid .frequent-food-btn')].at(-1).getBoundingClientRect().bottom <= document.getElementById('mealActionFooter').getBoundingClientRect().top), true);
                await page.locator('[data-meal-entry="manual"]').click();
                await fits(page, '#logMealSubmitBtn');
                assert.equal(await page.locator('#mealNameInput').isVisible(), true);
                await page.locator('[data-meal-entry="paste"]').click();
                await fits(page, '#logMealPasteSubmitBtn');
                await page.evaluate(() => { closeAddMealModal(); openAddMealModal(); });
                assert.equal(await page.evaluate(() => ffPickerView), 'pinned');
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 1);
                await page.waitForFunction(() => getComputedStyle(document.getElementById('logModal')).opacity === '1');
                await page.screenshot({ path: `/tmp/food-picker-${engine.name()}-${viewport.width}.png` });
                if (viewport.width < 600) {
                    assert.equal(await page.evaluate(() => document.querySelector('#frequentFoodsGrid .frequent-food-btn').getBoundingClientRect().bottom <= document.getElementById('mealActionFooter').getBoundingClientRect().top), true);
                }
                await page.locator('#frequentFoodsGrid .ff-select-btn').click();
                await fits(page, '#qtySelectorModal .modal');
                await fits(page, '#qtySelectorModal .submit-btn');
                await page.locator('#qtySelectorModal .submit-btn').click();
                assert.equal(await page.evaluate(() => getValues(state.today.meals).length), 1);
                assert.equal(await page.evaluate(() => getValues(state.today.meals)[0].calories), 150);
                assert.equal(await page.evaluate(() => getValues(state.dailyLogs[state.today.date].meals).length), 1);
                assert.equal(await page.evaluate(() => getValues(JSON.parse(localStorage.getItem('bodyCompTrackerState')).today.meals).length), 1);
                await page.evaluate(() => {
                    const date = parseLocalDate(getLocalDateString());
                    date.setDate(date.getDate() - 14);
                    window.testMealDate = getLocalDateString(date);
                    openAddMealModal(window.testMealDate);
                });
                await page.locator('#ffViewBtnAll').click();
                await page.locator('#ffPickerSearch').fill('Food 0');
                await page.locator('#frequentFoodsGrid .ff-select-btn').click();
                await page.locator('#qtySelectorModal .submit-btn').click();
                assert.equal(await page.evaluate(() => getValues(state.dailyLogs[window.testMealDate].meals)[0].calories), 150);
                assert.equal(await page.evaluate(() => getValues(state.today.meals).length), 1);
                await page.locator('#dayDetailModal').waitFor({ state: 'visible' });
                await page.evaluate(() => closeDayDetailModal());
                await page.evaluate(() => {
                    const date = parseLocalDate(getLocalDateString());
                    for (const [offset, log] of [[2, { calories: 2500, deficit: -200 }], [3, { nutritionStatus: 'assumed', assumedDeficit: 100 }], [4, { workouts: { walk: { calories: 90 } } }], [5, { calories: 2000, deficit: 0 }], [6, { tdee: 2000, meals: { old: { calories: 1700 } } }]]) {
                        const previous = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
                        state.dailyLogs[getLocalDateString(previous)] = log;
                    }
                    const before = JSON.stringify(state);
                    renderRecentProgress();
                    if (JSON.stringify(state) !== before) throw new Error('History render mutated state');
                });
                const history = await page.locator('#recentProgressList').innerText();
                for (const expected of ['−500 cal deficit', '320 cal exercise', '+200 cal surplus', '−100 cal deficit', 'Assumed', 'Untracked', '0 cal maintenance', '−300 cal deficit']) assert(history.includes(expected), expected);
                await page.waitForFunction(() => getComputedStyle(document.getElementById('qtySelectorModal')).visibility === 'hidden');
                await page.locator('#recentProgressList').scrollIntoViewIfNeeded();
                await page.screenshot({ path: `/tmp/bodycomp-${engine.name()}-${viewport.width}.png` });
                const exportCheck = await page.evaluate(() => {
                    const today = parseLocalDate(getLocalDateString());
                    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
                    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                    const before = JSON.stringify(state);
                    const report = generateProgressExport(getLocalDateString(start), getLocalDateString(end));
                    if (JSON.stringify(state) !== before) throw new Error('Export mutated state');
                    for (const row of report.rows) {
                        const canonical = getDisplayDeficitForDate(row.date);
                        if (row.deficit !== (canonical === null ? null : Math.round(canonical))) throw new Error('Balance differs from Calendar');
                    }
                    return report;
                });
                assert.equal(exportCheck.summary.days, 6);
                assert.equal(exportCheck.summary.deficit, 700);
                assert.equal(exportCheck.summary.balanceDays, 5);
                assert.equal(exportCheck.summary.intake, 6350);
                assert.equal(exportCheck.summary.exercise, 410);
                assert.equal(exportCheck.summary.deficit, exportCheck.rows.reduce((sum, row) => sum + (row.deficit ?? 0), 0));
                assert(exportCheck.text.includes('Average daily balance — Deficit: 140 kcal/day'));
                assert(exportCheck.text.includes('Surplus: 200 kcal'));
                const missingChecks = await page.evaluate(() => {
                    const date = '2024-02-29';
                    const previous = state.dailyLogs[date];
                    try {
                        delete state.dailyLogs[date];
                        const missing = generateProgressExport(date, date);
                        state.dailyLogs[date] = { meals: [{ calories: 0 }], deficit: 0, workouts: [{ calories: 0 }] };
                        const zero = generateProgressExport(date, date);
                        state.dailyLogs[date] = { workouts: [{ calories: 80 }, { type: 'Walk' }] };
                        const partial = generateProgressExport(date, date);
                        return { missing, zero, partial };
                    } finally {
                        if (previous) state.dailyLogs[date] = previous;
                        else delete state.dailyLogs[date];
                    }
                });
                assert.equal(missingChecks.missing.summary.deficit, null);
                assert.equal(missingChecks.missing.summary.exercise, null);
                assert.equal(missingChecks.missing.summary.intake, null);
                assert.equal(missingChecks.zero.rows[0].intake, 0);
                assert.equal(missingChecks.zero.rows[0].exercise, 0);
                assert.equal(missingChecks.zero.rows[0].deficit, 0);
                assert.equal(missingChecks.partial.rows[0].exercise, 80);
                assert(missingChecks.partial.text.includes('80 kcal (incomplete)'));
                assert.deepEqual(await page.evaluate(() => getProgressExportRange('7', '2026-03-10')), { start: '2026-03-04', end: '2026-03-10' });
                assert.deepEqual(await page.evaluate(() => getProgressExportRange('month', '2024-02-29')), { start: '2024-02-01', end: '2024-02-29' });
                assert.deepEqual(await page.evaluate(() => getProgressExportRange('week', '2026-09-20')), { start: '2026-09-14', end: '2026-09-20' });
                await page.evaluate(() => closeDayDetailModal());
                await page.locator('.progress-export-open').click();
                await fits(page, '#progressExportModal .modal');
                await fits(page, '#progressExportCopy');
                for (const [preset, days] of [['today', 1], ['yesterday', 1], ['7', 7], ['30', 30], ['90', 90]]) {
                    await page.locator(`[data-progress-range="${preset}"]`).click();
                    assert.equal(await page.evaluate(() => progressExportReport.rows.length), days);
                    assert.equal(await page.locator('#progressExportPreview').evaluate(element => element.scrollWidth <= element.clientWidth), true);
                }
                await page.waitForFunction(() => getComputedStyle(document.getElementById('progressExportModal')).opacity === '1');
                await fits(page, '#progressExportPreview');
                await page.screenshot({ path: `/tmp/progress-export-${engine.name()}-${viewport.width}.png` });
                if (engine.name() === 'chromium') {
                    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
                    await page.locator('#progressExportCopy').click();
                    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.evaluate(() => progressExportReport.text));
                }
                await page.evaluate(() => {
                    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedProgress = text; } } });
                });
                await page.locator('#progressExportCopy').click();
                assert.equal(await page.locator('#progressExportCopy').innerText(), '✓ Copied');
                assert.equal(await page.evaluate(() => window.copiedProgress === progressExportReport.text), true);
                await page.evaluate(() => {
                    navigator.clipboard.writeText = async () => { throw new Error('Clipboard denied'); };
                    document.execCommand = () => false;
                });
                await page.locator('#progressExportCopy').click();
                assert((await page.locator('#progressExportStatus').innerText()).includes('Press and hold'));
                assert.equal(await page.evaluate(() => window.getSelection().toString() === progressExportReport.text), true);
                await page.locator('[data-progress-range="custom"]').click();
                await page.evaluate(() => {
                    const date = getProgressExportRange('yesterday').start;
                    document.getElementById('progressExport-start').value = date;
                    document.getElementById('progressExport-end').value = date;
                });
                await page.locator('#progressExportCopy').click();
                assert.equal(await page.evaluate(() => progressExportReport.rows.length), 1);
                await page.locator('#progressExport-start').fill('2026-09-15');
                await page.locator('#progressExport-end').fill('2026-09-01');
                await page.locator('#progressExport-end').blur();
                assert.equal(await page.locator('#progressExportCopy').isDisabled(), true);
                await page.locator('[data-progress-range="7"]').click();
                assert.equal(await page.locator('#progressExportCopy').isEnabled(), true);
                if (viewport.width < 600) {
                    await page.locator('[data-progress-range="custom"]').click();
                    await page.setViewportSize({ width: viewport.width, height: 330 });
                    await page.waitForFunction(() => parseFloat(document.documentElement.style.getPropertyValue('--modal-viewport-height')) === 330);
                    await fits(page, '#progressExportCopy');
                    await page.setViewportSize(viewport);
                }
                await page.locator('#progressExportModal .modal-close').click();
                assert.equal(await page.evaluate(() => document.body.style.overflow), '');
                assert.equal(await page.evaluate(() => document.activeElement.classList.contains('progress-export-open')), true);
                await page.locator('.progress-export-open').click();
                await page.keyboard.press('Escape');
                assert.equal(await page.evaluate(() => document.body.style.overflow), '');
                const beforeManual = await page.evaluate(() => getValues(state.today.meals).length);
                await page.evaluate(() => openAddMealModal());
                await page.locator('[data-meal-entry="manual"]').click();
                await page.locator('#mealNameInput').fill('Manual test meal');
                await page.locator('#mealCalInput').fill('230');
                await page.locator('#mealProteinInput').fill('22');
                await fits(page, '#logMealSubmitBtn');
                await page.locator('#logMealSubmitBtn').click();
                assert.equal(await page.evaluate(() => getValues(state.today.meals).length), beforeManual + 1);
                await page.evaluate(() => {
                    window.manualTestId = getValues(state.today.meals).find(meal => meal.name === 'Manual test meal').id;
                    editMeal(window.manualTestId);
                });
                assert.equal(await page.locator('#mealManualSection').isVisible(), true);
                await page.locator('#mealCalInput').fill('250');
                await page.locator('#logMealSubmitBtn').click();
                assert.equal(await page.evaluate(() => state.today.meals[window.manualTestId].calories), 250);
                await page.evaluate(() => openAddMealModal());
                await page.locator('[data-meal-entry="paste"]').click();
                await page.locator('#quickMealPaste').fill('MEAL|Paste test meal|180|20|5|2');
                await fits(page, '#logMealPasteSubmitBtn');
                await page.locator('#logMealPasteSubmitBtn').click();
                assert.equal(await page.evaluate(() => getValues(state.today.meals).length), beforeManual + 2);
                await page.close();

                const dental = await load(context, 'index.html');
                await dental.evaluate(() => {
                    document.getElementById('loadingOverlay').remove();
                    tasks = { test: { id: 'test', text: 'Original task', category: 'health', size: 'medium', urgency: 'inbox', completed: false } };
                    openTaskEditModal('test');
                });
                await fits(dental, '#taskEditModal > div');
                await fits(dental, '#taskEditModal button[onclick="saveTaskEdit()"]');
                await dental.locator('#editTaskText').fill('Edited task');
                if (viewport.width < 600) {
                    await dental.setViewportSize({ width: viewport.width, height: 330 });
                    await dental.waitForFunction(() => parseFloat(document.documentElement.style.getPropertyValue('--modal-viewport-height')) === 330);
                    await fits(dental, '#taskEditModal button[onclick="saveTaskEdit()"]');
                    await dental.setViewportSize(viewport);
                    await dental.waitForFunction(height => parseFloat(document.documentElement.style.getPropertyValue('--modal-viewport-height')) === height, viewport.height);
                }
                await dental.locator('#taskEditModal button[onclick="saveTaskEdit()"]').click();
                assert.equal(await dental.evaluate(() => tasks.test.text), 'Edited task');
                await dental.waitForFunction(() => JSON.parse(localStorage.getItem('dentalStudentQuestData') || '{}').tasks?.test?.text === 'Edited task');
                assert.equal(await dental.locator('#taskEditModal').isVisible(), false);
                await dental.evaluate(() => showCustomPrompt('Edit task '.repeat(120), 'Old', value => { window.promptResult = value; }));
                await dental.locator('.custom-modal-input').fill('New');
                await dental.locator('.custom-modal-btn-primary').click();
                assert.equal(await dental.evaluate(() => window.promptResult), 'New');
                await dental.evaluate(() => openTaskEditModal('test'));
                await dental.screenshot({ path: `/tmp/task-edit-${engine.name()}-${viewport.width}.png` });
                await context.close();
                console.log(`PASS ${engine.name()} ${viewport.width}×${viewport.height}: picker, logging, history, progress export, task edit, shared prompt`);
            }
        } finally { await browser.close(); }
    }
} finally { server.close(); }
