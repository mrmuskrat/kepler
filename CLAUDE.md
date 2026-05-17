# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An interactive browser-based solar system simulation implementing Kepler's laws of orbital mechanics, based on data from NASA planetary fact sheets and the OpenStax Astronomy 2e textbook. No build step, no dependencies, no package manager.

## Running Locally

Open `index.html` directly in a browser, or serve it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Deployed on Cloudflare Pages via `wrangler.jsonc` (project name: `kepler-orbit-sim`, serves the repo root as static assets). There is no build step — Cloudflare serves the files as-is.

## Architecture

Four files, loaded in order by `index.html`:

1. **[config.js](config.js)** — All constants and data. Edit here to change planet properties, tweak defaults, or add celestial bodies. Defines `G`, `AU`, `SOLAR_MASS`, `DEFAULT_CONFIG`, `PLANETS`, and `UI_SCALE` as globals.
2. **[script.js](script.js)** — The `SolarSystem` class that owns all simulation logic: Kepler equation solver (Newton-Raphson), orbital position calculations, canvas rendering, mouse/touch/keyboard event handling, and the animation loop.
3. **[style.css](style.css)** — Visual design and responsive layout.
4. **[index.html](index.html)** — HTML structure and UI controls.

`config.js` must load before `script.js` because `script.js` reads the globals directly.

## Key Physics

- **Coordinate system**: orbital calculations in AU, rendered in pixels with y-axis flipped (so orbits go counterclockwise). Time tracked in Earth days since J2000.0 epoch.
- **Kepler's equation solver**: Newton-Raphson iteration in `script.js`. Convergence is typically ~5 iterations.
- **Zoom**: `UI_SCALE.zoomMultiplier = 1.1` means the displayed "1x" on the slider equals actual zoom of 1.1, chosen so all 8 planets including Neptune (30 AU) are visible.
- **Speed slider**: `UI_SCALE.timeSpeedMultiplier = 0.1` maps the 0–10 UI range to 0–1 actual days/frame.

## Modifying Planet Data

Edit `PLANETS` in [config.js](config.js). Each entry requires: `name`, `semiMajorAxis` (AU), `eccentricity`, `period` (Earth years), `radius` (display pixels, not to scale), `color` (hex), `mass` (kg). Reload the page to see changes.
