# Verification — 2026-11-11

Verified on Windows with the installed Google Chrome (`playwright` channel `chrome`, headless), against the built production bundle served by Vite preview.

- `npm install` and `npm run build`: passed (TypeScript + Vite). The local corporate CA required `NODE_OPTIONS=--use-system-ca` for npm; no insecure TLS setting is saved in the project.
- Uninterrupted playback: all six chapters observed across the full 22-second timeline; final Replay/New World controls appeared.
- 1920×1080 and 1280×720: document scroll width/height exactly matched viewport width/height; visible buttons remained within the viewport; canvas dimensions updated with resize.
- Drag rotation, wheel zoom, Replay, Skip, nonsequential seeks and New World: passed. Wheel did not scroll the document.
- Different seeds: different baked-map signatures and rendered images at the same viewport. Regenerating seed 162711 reproduced the exact combined terrain/cloud checksum `cf6a1320`.
- Runtime page exceptions and console errors: zero. Representative final and anatomical frames were visually inspected; labels were corrected to anchor to actual cap materials and ring-like interior shading was replaced.

Two representative images are in `docs/screenshots/`. The automated check is `scripts/verify.mjs`; by default it expects the dev server at port 5178. To check preview or a deployed URL, set `GAIA_URL` to that URL (including the trailing slash). Full transient results are written to ignored `artifacts/verification.json`.

Limits: this is one Windows Chrome environment, not a browser or GPU compatibility matrix. No universal frame-rate claim is made. Generation and cloud layers are artistic approximations as documented in the README.
