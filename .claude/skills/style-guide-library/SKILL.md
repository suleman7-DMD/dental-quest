---
name: style-guide-library
description: Use when building any new HTML page, UI component, or visual interface. Provides 210 complete CSS design systems (colors, typography, spacing, buttons, forms, cards, alerts) as self-contained HTML references. Trigger phrases include "style guide", "design system", "theme", "make it look like", "styling", "CSS variables", "aesthetic", "visual design", "build a page", "new app", "landing page", "dashboard design", "dark mode", "light mode", "cyberpunk", "minimal", "brutalist", "retro", "modern", any aesthetic name.
---

# Style Guide Library

210 complete CSS design systems from ggprompts/htmlstyleguides. Each is a self-contained HTML file with CSS variables, typography, spacing, buttons, forms, cards, alerts — ready to extract and apply.

## Local Collection (15 curated guides)

Read directly from `docs/style-guides/`:

| File | Aesthetic | Mode | Best For |
|------|-----------|------|----------|
| `federal-night.html` | Government/tech | Dark | Dashboards, data-heavy apps, professional tools |
| `cyberpunk.html` | Neon futuristic | Dark | Gaming, tech tools, bold interfaces |
| `dark-academia.html` | Moody intellectual | Dark | Reading apps, academic tools, note systems |
| `synthwave.html` | Retro-future | Dark | Music apps, creative tools, fun projects |
| `retro-terminal.html` | Hacker/dev | Dark | CLI-style apps, dev tools, monitoring |
| `vaporwave.html` | Nostalgic/colorful | Dark | Creative projects, art tools |
| `swiss.html` | Clean minimalist | Light | Professional apps, documentation, forms |
| `nordic.html` | Scandinavian clean | Light | Calm productivity apps, wellness tools |
| `notion-style.html` | Productivity clean | Light | Task managers, wikis, organizers |
| `japanese-zen.html` | Serene minimal | Light | Meditation apps, simple tools, portfolios |
| `coffee-shop.html` | Warm cozy | Warm | Personal apps, blogs, warm dashboards |
| `art-deco.html` | 1920s elegant | Dark | Luxury/premium interfaces, event pages |
| `glassmorphism.html` | Modern glass effect | Mixed | Modern dashboards, overlays, cards |
| `brutalist-web.html` | Raw/bold | Light | Experimental, statement pieces |
| `solarpunk.html` | Green/optimistic | Mixed | Sustainability, health, nature apps |

## How to Use a Local Style Guide

1. Read the file: `Read docs/style-guides/{name}.html`
2. Extract the `:root` CSS variables block
3. Copy the component patterns you need (buttons, forms, cards, etc.)
4. Apply the Google Fonts `<link>` tags from the `<head>`
5. Adapt to your page structure

### CSS Variable Pattern (all guides follow this)

```css
:root {
  --primary: #...;    --secondary: #...;
  --bg: #...;         --text: #...;
  --font-display: '...', serif;
  --font-body: '...', sans-serif;
  --space-xs: 4px;    --space-sm: 8px;
  --space-md: 16px;   --space-lg: 32px;   --space-xl: 64px;
}
```

### Required Sections in Every Guide
1. Color Palette (named swatches + hex + usage)
2. Typography (display, heading, body, caption)
3. Spacing (visual scale, base unit 4px or 8px)
4. Buttons (primary/secondary/disabled, multiple sizes)
5. Forms (text inputs, selects, checkboxes, radios)
6. Cards/Panels (content containers)
7. Optional: Alerts, Navigation, Modals, Grid, Code blocks, Tables, Progress bars

## Fetching Remote Styles (195 more available)

For any style not in the local collection, fetch directly:

```
WebFetch url="https://raw.githubusercontent.com/ggprompts/htmlstyleguides/main/styles/{name}.html"
```

See `docs/style-guides/CATALOG.md` for the complete list of all 210 available style names.

### Popular Remote Styles Worth Fetching

| Name | Aesthetic |
|------|-----------|
| `noir` | Film noir detective |
| `steampunk` | Victorian machinery |
| `pixel-art` | 8-bit retro gaming |
| `newspaper` | Editorial broadsheet |
| `blueprint` | Technical drafting |
| `stained-glass` | Cathedral color |
| `circuit-board` | PCB green/copper |
| `comic-book` | Pop art panels |
| `holographic` | Iridescent shimmer |
| `baroque` | Ornate classical |
| `outrun` | 80s neon driving |
| `cozy-game-ui` | Stardew Valley style |
| `astronomical` | Space/stars |
| `apothecary` | Old pharmacy/herbs |
| `liminal-space` | Eerie empty rooms |

## Build Template (for creating new style guides)

Full template spec at `docs/style-guides/BUILD-TEMPLATE.md`. Key rules:
- Self-contained: all CSS inline in `<style>`, no external stylesheets
- CSS variables in `:root` for all colors, spacing, fonts
- Responsive: `@media (max-width: 768px)` breakpoint
- Semantic HTML, no frameworks, vanilla JS only if needed
- Google Fonts is the only external dependency allowed

## Applying Styles to Existing Dental Quest Apps

When restyling any of the 4 apps, extract CSS variables from a guide and map to the app's existing variable names. Do NOT replace the app's HTML structure — only remap colors, fonts, spacing, shadows, and radius values.
