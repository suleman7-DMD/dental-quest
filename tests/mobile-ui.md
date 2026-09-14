# Mobile UI regression checks

Run `node tests/mobile-ui.mjs` with Playwright and its Chromium/WebKit browsers installed. If Playwright is installed outside the repository, set `PLAYWRIGHT_PATH` to its package directory.

The harness serves the actual HTML, CSS, and JavaScript locally. It uses isolated browser contexts, blocks external requests, skips cloud/bootstrap initialization, and seeds synthetic records. Real localStorage and the existing save functions are exercised without accessing user data or Firebase.

Both engines cover 320×568, 390×750, 844×390, and 1280×900 viewports:

- Add Meal opens to explicitly pinned foods only, with an actionable empty state and no search clutter. All Foods contains all 45 fixture foods and searches the complete library. Pin/unpin never logs or deletes a food, and pin state survives a real page reload through localStorage.
- Manual entry, meal editing, paste submission, and serving confirmation retain their existing save paths with footers outside the scrolling content.
- Long food names fit, mobile inputs remain 16px, and food selection logs correct calories to today or a historical date and localStorage.
- Recent progress uses canonical deficit/workout helpers, covers deficit, surplus, maintenance, assumed, legacy, and workout-only days, and does not mutate state while rendering.
- Task editing persists its text, keeps Save Changes within the viewport, and survives a reduced viewport height. Shared long-message prompts also submit correctly.
- Progress export covers all rolling ranges, custom validation, week/month and daylight-saving boundaries, matching canonical daily balances, independently checked six-day totals, preview overflow, successful copy, denied-clipboard fallback, and modal focus/scroll restoration.

Screenshots are written to `/tmp/food-picker-*.png`, `/tmp/bodycomp-*.png`, `/tmp/progress-export-*.png`, and `/tmp/task-edit-*.png`.

WebKit and viewport resizing provide automated mobile coverage; they do not reproduce a physical iPhone's browser chrome or native keyboard.
