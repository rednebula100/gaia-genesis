# GAIA//GENESIS

A 22-second real-time planetary birth. An independent desktop WebGL2 scene built with TypeScript, Three.js and one GSAP timeline. No backend, API keys or video. Default worlds are procedural; NASA imagery exists only in an explicitly labelled developer reference mode.

[Open the live scene](https://rednebula100.github.io/gaia-genesis/) · [Anatomical frame](docs/screenshots/anatomy-1280.png)

[Six before/after captures](docs/screenshots/README.md) · [Verification](docs/VERIFICATION.md)

![The completed world](docs/screenshots/genesis-1920.png)

## Run

Node 22.12+:

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/gaia-genesis/`. Production: `npm run build`, then `npm run preview`. Windows Chrome checks: start the dev server, then `npm run verify` (uses installed Windows Chrome).

## Experience

Accretion → metal differentiation → continuous basalt cooling → ocean/atmosphere → mature anatomical projection → closure. Skip, Replay, New World; drag/scroll in the final scene. Keyboard: focus the canvas, arrows rotate, +/- zoom. The narrow bottom timeline can also be scrubbed with pointer or keyboard. A `?seed=162711` URL reproduces the world; New World updates it. Loading is performed in a worker, and hidden tabs pause the film.

## Scientific scope

This is art direction, not a physical formation simulation. Initial liquid metal differentiation and the much later solid inner core are **not simultaneous events**. The signature shot is labelled a mature interior/time projection. Inner core radius: **0.1916 R**; liquid outer core boundary: **0.546 R**; mantle outer boundary: **0.985 R**. Crust thickness is exaggerated to **0.015 R**. The mantle is represented as mostly solid silicate; animated plume/slab motifs compress geological time. The liquid core is opaque metal, not transparent water.

Plate-neighbourhood uplift, coast distance, altitude and humidity are linked artistic heuristics, not tectonics or meteorology. The cloud layer is a real raymarched 3-D density volume with optical extinction and sunward density sampling. Multiple-scattering fill and surface shadows remain approximations. Its 0.001–0.006 R height range is vertically exaggerated for orbital readability. The uncut atmosphere uses Takram/Bruneton precomputed Rayleigh/Mie/ozone scattering; it fades away while the sector is detached because a single spherical LUT atmosphere cannot describe both opened pieces correctly. Interior lighting is an exhibit light, not sunlight penetrating the planet.

## Rendering and reference

One WebGL2 renderer: linear scene radiance → half-float HDR → depth-clipped, half-resolution cloud integration → atmospheric LUTs → restrained highlight bloom → **one AgX tone map and sRGB output**. Explicit texture LOD inside raymarch loops avoids undefined derivatives on divergent rays. Slow GPUs reduce cloud integration resolution to quarter size while retaining volume and self-shadowing. Shaders and passes are warmed before the film starts.

`?reference=earth` opens a **developer-only NASA Blue Marble reference**, automatically at the final shot, under the same sun/camera/LUT pipeline. NASA surface/coverage maps are not used by generated worlds. It is an optical comparison, not a claim that generated geology equals observed Earth. Credits and original URLs are in [notices](THIRD_PARTY_NOTICES.md).

Systems are separated into `geology.ts`/`maps.worker.ts`, `section-geometry.ts`, `shaders.ts`, `cloud-volume.ts`, `render-pipeline.ts`, `cinematic.ts` and `earth-reference.ts`. Timeline-driven shaders, fragments and weather use seed + film time. Paused inspection frames do not accumulate temporal history; final live viewing resumes slow drift. New World disposes replaced maps and 3-D textures.

## Deployment

GitHub Actions builds on `main` push and publishes `dist/` to GitHub Pages. The Vite base is `/gaia-genesis/`. Enable Pages with Source: **GitHub Actions**. If using a different repository name, update `vite.config.ts` base to match it. No secrets are required.

## Scope and limitations

Desktop only, designed for 1920×1080 and 1280×720. Graphics acceleration required. No sound, exploration, editor or climate solver. Interior textures are original scientific illustrations; there are no photographs of the deep Earth. The cloud raymarcher uses a bounded single-scattering approximation and bilateral spatial upsampling, not temporal reconstruction. High-quality frame rate depends on GPU; adaptive cloud resolution keeps the same density/material model. No universal NASA/photographic fidelity or frame-rate claim is made.

See [reference decisions](docs/ART_REFERENCE_NOTES.md), [notices](THIRD_PARTY_NOTICES.md) and [verification](docs/VERIFICATION.md).
