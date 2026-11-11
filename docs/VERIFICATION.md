# Remaster verification — 2026-11-11

Windows installed Google Chrome, Playwright `channel: chrome`, headless; built production bundle served by Vite preview. WebGL device: ANGLE / Intel UHD Graphics / Direct3D 11.

- `npm install` and `npm run build`: passed (TypeScript + Vite), zero npm audit findings. The local CA required per-process `NODE_OPTIONS=--use-system-ca`; no insecure TLS setting is saved. Vite reports the expected large shader/dependency chunk (850 kB, 230 kB gzip).
- Uninterrupted playback: all six chapters observed across the full 22-second timeline; final Replay/New World controls appeared.
- 1920×1080 and 1280×720: document scroll width/height exactly matched viewport width/height; visible buttons remained within the viewport; canvas dimensions updated with resize.
- Drag rotation, wheel zoom, keyboard rotation/zoom, Replay, Skip, timeline keyboard scrubbing, nonsequential seeks and New World: passed. Wheel did not scroll the document.
- Different seeds: different map signatures and rendered images. Regenerating seed **162711** reproduced combined terrain/biome/weather/volume checksum **ce130134** and an **exactly identical rendered image** at fixed time/viewport/quality. The image assertion waits for a newly rendered frame and loading fade, temporarily hiding HUD overlays so button hover cannot contaminate the comparison.
- Runtime page exceptions and console errors: **zero**. Actual before/after frames at **1.8 / 5.1 / 9.0 / 12.5 / 16.9 / 22.0 seconds** were captured. Before is commit `d4488fb`; after is the remaster. No scene painting or image replacement was used.
- Explicit `?reference=earth` production reference mode: NASA label and surface/cloud assets loaded successfully; zero runtime/console errors. [Reference capture](screenshots/earth-reference-1920.png).
- Intel UHD observation after removing costly multisampled HDR resolves: approximately **29 fps** near film completion, cloud integration at 0.375 resolution. One short observation, not a universal benchmark. No claim of 60 fps or NASA photographic equivalence.

[Capture index and comparisons](screenshots/README.md). The focused automated check is `scripts/verify.mjs`; by default it expects the dev server at port 5178. Set `GAIA_URL` to a preview or deployed URL, including the trailing slash. Transient results are written to ignored `artifacts/verification.json`.

Limits: one Chrome/GPU environment, not a compatibility matrix. Cloud lighting/shadows and geology remain artistic approximations; spherical atmosphere fades during the detached cut. See README for scientific scope and notices for reference-data conditions.
