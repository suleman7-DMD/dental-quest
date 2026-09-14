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
                assert.equal(await page.locator('#frequentFoodsGrid .frequent-food-btn').count(), 45);
                const initial = await page.locator('#frequentFoodsGrid .ff-name').allTextContents();
                assert(initial[1].startsWith('History favorite'));
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
                await page.waitForFunction(() => getComputedStyle(document.getElementById('logModal')).opacity === '1');
                await page.screenshot({ path: `/tmp/food-picker-${engine.name()}-${viewport.width}.png` });
                await page.locator('#frequentFoodsGrid .frequent-food-btn').nth(1).click();
                await fits(page, '#qtySelectorModal .modal');
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
                    openQtySelector('food_0');
                });
                await page.locator('#qtySelectorModal .submit-btn').click();
                assert.equal(await page.evaluate(() => getValues(state.dailyLogs[window.testMealDate].meals)[0].calories), 150);
                assert.equal(await page.evaluate(() => getValues(state.today.meals).length), 1);
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
                console.log(`PASS ${engine.name()} ${viewport.width}×${viewport.height}: picker, logging, history, task edit, shared prompt`);
            }
        } finally { await browser.close(); }
    }
} finally { server.close(); }
