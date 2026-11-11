# World Lab verification — 2026-11-12

## Celestial Atlas release check

Windows Chrome 157, Intel UHD / ANGLE D3D11, production Vite preview, DPR 1.
TypeScript + Vite build passes (51 modules, host approximately 1,149 kB / 327 kB gzip,
separate Atlas worker approximately 41 kB). Existing chunk-size warning remains.
No new runtime npm dependency or automatic quality reduction.

- `node scripts/verify-atlas.mjs` passed with **zero page/console errors**: WORLD
  Reference Earth; all seven Atlas selections; actual drag/inertia, wheel,
  sun X, atmosphere density, terrain height/cloud speed, both resets; per-body
  defaults; backward/forward navigation; Jupiter URL reload. Procedural seed
  changes altered the pixels; restoring seed 162711/time 0 restored exact pixels.
- Both 1920×1080 and 1280×720 document scroll dimensions equal viewport dimensions;
  header, navigation, seven body buttons and required controls fit. Optics uses
  internal scrolling. Reviewed 1280 captures were refined to keep the bottom
  caption and actions below the planet.
- The Genesis render-version counter stays unchanged while Atlas is active;
  Atlas frame count stops after returning to Anatomy. No background composer
  submission or additional Atlas context is created per body switch.
- `npm run verify` passed with **zero page/console errors**, including Anatomy
  probe/peel/layers, Seismic shadows, Cosmos and Impact, 1280 layout, New World,
  restored seed signatures **23001190 / 29a8fc1e**, exact restored final and
  collision-frame pixels, direct Seismic and Korean tour. The tour test now waits
  for actual visibility instead of racing the Lab CSS transition.
- A separate focused run exercised Stardust (420,000 GPU particles), Korean tour
  next/back/close, continuous **32-second** Replay into Genesis World Lab, and
  Skip. Zero errors. The movie duration and existing GPU engines are unchanged.
- Seven actual original-site and integrated-render comparisons were captured at
  1920×1080/time 0. Four texture bodies have exact central-region pixels; Venus
  and Mars each differ by one 1/255 channel value. This does not assert whole-frame
  or cross-GPU pixel identity. [Captures and comparison method](screenshots/planet-atlas/README.md).

The uncredited original noise and star assets are excluded. Procedural land/cloud
patterns and texture-mode star background deliberately differ. No Genesis visual
fusion was applied. Initial Genesis physics/shader preparation is still required
before entering a direct Atlas link. WebGL2 OffscreenCanvas workers are verified
on this Windows Chrome only; other GPU/browser combinations are not verified.
GitHub Actions / public Pages verification is recorded with the release commit.

## Previous World Lab release

Actual installed Windows Chrome 157, Playwright `channel: chrome`, production
Vite preview; Intel UHD / ANGLE Direct3D 11, native DPR 1. No automatic quality
reduction. TypeScript + Vite production build passes: 48 modules, approximately
1,138 kB JavaScript / 323 kB gzip. The existing large-chunk warning remains.

- Watched all eight chapters play continuously through 32 seconds into Lab.
  The complete movie HUD becomes hidden; the same maps, seed and cloud phase
  continue. Replay restores Genesis; Skip returns to Lab.
- Exercised cut 0/90/180/270°, rough peel inward and reverse, layer selection,
  five material/data views, actual/schematic scale, depth probe and linked graph.
  A sampled lower-mantle probe read 1,522 km / 2,480 K / 61.7 GPa /
  4.82 g/cm³ / P 11.97 and S 6.49 km/s, all from the shared model.
- Seismic launch, pause, restart and wave filtering operate on integrated paths.
  Gaussian quadrature handles turns; non-transmitting discontinuities terminate
  a direct branch. This model calculates a primary P arrival gap about **95–144°**
  and S non-arrival beyond **99°**. Inner-core P branches are drawn separately
  from the primary-gap calculation. These are approximations, not observed bounds.
- Cosmos live body/merger counters change as the GPU executes; body count and
  gravity changes take effect. Stardust assemble/scatter/reverse/pause/palettes
  operate on 420,000 targets. Impact prepares all 32,768 particles for the chosen
  conditions: changing ratio .25→.50 and angle 30→55 produces a new physical cache
  and a visibly different collision. Independent approach/aftermath scrubbing works.
- 1920×1080 and 1280×720: document dimensions equal the viewport; all four modes'
  essential controls fit. Additional 720p Impact controls also fit. Only narrow
  layer/inspector panels may scroll internally. Drag, wheel and keyboard work.
- Eight-step Korean tour completes and closes; next/back/close are manual.
- No page exceptions or console errors in the full focused acceptance run.
  Film checksums remain **23001190** (maps) / **29a8fc1e** (physics), seed 162711.
- A separate final production-preview check passed direct Anatomy, Seismic and
  tour URLs. Regenerating seed 162711 reproduced map/physics checksums and
  byte-identical canvas captures of both the finished world and impact shot on
  this GPU. Loading and UI overlays were excluded from the canvas comparison.

The integrated GPU observed about 26 FPS on the mature world in the continuous
run; heavy source physics/skin reconstruction remains slower. Fidelity stays
fixed. Scientific/material boundaries and omissions are in [WORLD_LAB.md](WORLD_LAB.md).
`npm run verify` is the focused Windows Chrome regression/capture entry point;
`GAIA_URL` may target a preview or the public demo. Original PNGs and numerical
results are ignored under `artifacts/lab`; reviewed [captures and the matched-camera
comparison](screenshots/world-lab/README.md) are committed.

## Prior source integration verification — 2026-11-11

Installed Windows Google Chrome through Playwright `channel: chrome`, headless;
production Vite preview. ANGLE / Intel UHD Graphics / Direct3D 11. Native DPR 1.

- TypeScript + `npm run build`: passed. Production JS is approximately 1,078 kB
  (302 kB gzip); Vite's large-chunk warning remains. No new npm dependency was
  added: the three engines are pinned MIT source adaptations.
- Uninterrupted **32-second playback**, all **eight chapters**, final controls:
  passed. Actual Cosmos mergers and Cosmic Collisions heat are nonzero.
- **1920×1080 and 1280×720**: document scroll dimensions equal viewport dimensions;
  canvas resizes and every visible button stays inside the viewport. No page scroll.
- Skip, Replay, New World, nonsequential seeks, timeline keyboard scrubbing,
  keyboard rotation/zoom and final drag/wheel: passed.
- Seed **162711**: 512 initial Cosmos bodies, **511 mergers**; **32,768** collision
  particles, 96 cached impact states. Physics-state checksum **29a8fc1e**;
  generated terrain/biome/weather/volume checksum **23001190**. Regeneration
  reproduces both checksums and **byte-identical rendered canvases** at the impact
  and final shots. Another seed changes maps and appearance. These are results
  on this GPU; cross-driver floating-point bit identity is not promised.
- Browser page exceptions and console errors: **zero** in the focused smoke test.
- Direct browser captures at **1.5 / 6.2 / 7.3 / 9.5 / 10.7 / 13.9 / 17.5 /
  26.1 / 32.0 s** were inspected. [Captures and comparisons](screenshots/source-integration/README.md)
  include original `d4488fb`, prior remaster `0159efa` and revised exterior.
  Films have different stage timings; comparable stages are identified explicitly.
- All three original hosted demos were opened in Chrome and their actual canvases
  inspected: [Cosmos](https://absoyak.github.io/cosmos-demo/),
  [Cosmic Collisions](https://gaploid.github.io/cosmic-collisions/) and
  [Stardust](https://gaploid.github.io/stardust/). No page exceptions were recorded.
  These native demos are not embedded or shipped.

## Performance observation, not a universal benchmark

At 1920×1080, native DPR 1, approximately **24 seconds initial preparation**,
**12 FPS** in the heavy late-impact shot and **22–26 FPS** on the completed
world were observed on this Intel UHD. Preparation includes generated maps,
original GPU physics prepasses, shader compilation and an actual first collision
composite. No FPS-triggered DPR, particle count, sample count or cloud-resolution
reduction occurs. Collision MRTs and fine clouds remain full canvas resolution;
the volume underlayer stays fixed at half resolution. Bypassing an atmosphere
with exactly zero contribution avoids unnecessary work without changing fidelity.

The low-end integrated GPU does not provide smooth impact playback at this
quality. The bounded particle resolution also leaves some silhouette scalloping.
Clouds are deliberately hybrid; exterior fidelity is not NASA photography. Source
physics is approximate and the stage handoffs are art direction, not one conserved
scientific solver. See [provenance](SOURCE_PROVENANCE.md) for exact integrations,
model scope and exclusions. This is one browser/GPU environment.

The focused smoke check is `scripts/verify.mjs`. Set `GAIA_URL` to a preview or
deployed URL with trailing slash. Transient numerical results and original PNG
captures are written under ignored `artifacts/`; reviewed JPEG captures are
committed. GitHub Actions and the public Pages build are checked separately during
release; the completion message links the actual deployment result.
