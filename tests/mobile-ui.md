# Mobile UI regression checks

Run `node tests/mobile-ui.mjs` with Playwright and its Chromium/WebKit browsers installed. If Playwright is installed outside the repository, set `PLAYWRIGHT_PATH` to its package directory.

The harness serves the actual HTML, CSS, and JavaScript locally. It uses isolated browser contexts, blocks external requests, skips cloud/bootstrap initialization, and seeds synthetic records. Real localStorage and the existing save functions are exercised without accessing user data or Firebase.

Both engines cover 320×568, 390×750, 844×390, and 1280×900 viewports:

- All 45 library foods appear immediately, including a history favorite with no usage counter; search and clearing preserve the complete list.
- Long food names fit, mobile inputs remain 16px, and food selection logs correct calories to today or a historical date and localStorage.
- Recent progress uses canonical deficit/workout helpers, covers deficit, surplus, maintenance, assumed, legacy, and workout-only days, and does not mutate state while rendering.
- Task editing persists its text, keeps Save Changes within the viewport, and survives a reduced viewport height. Shared long-message prompts also submit correctly.

Screenshots are written to `/tmp/food-picker-*.png`, `/tmp/bodycomp-*.png`, and `/tmp/task-edit-*.png`.

WebKit and viewport resizing provide automated mobile coverage; they do not reproduce a physical iPhone's browser chrome or native keyboard.
