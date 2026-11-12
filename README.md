# GAIA//GENESIS

A 32-second real-time planetary birth that becomes **WORLD LAB**: the same seeded world, interactive anatomy, spherical seismic rays, and three source-driven Origins experiments. Integrates actual MIT source from **Cosmos**, **Cosmic Collisions** and **Stardust**. Desktop WebGL2, TypeScript, Three.js and one GSAP film timeline. No backend, API keys or video. Default worlds remain procedural. Celestial Atlas executes Julien Sulpis's actual GPL-3.0 Earth, Procedural and five solar-body GLSL programs in an isolated WebGL2 worker; NASA/SSS imagery is restricted to labelled reference views.

[Genesis + World Lab](https://rednebula100.github.io/gaia-genesis/) · [Open Anatomy](https://rednebula100.github.io/gaia-genesis/?lab=anatomy&seed=162711) · [Classroom tour](https://rednebula100.github.io/gaia-genesis/?tour=1&seed=162711)

[UI remaster: before / after](docs/screenshots/ui-remaster/README.md) · [World Lab captures and comparison](docs/screenshots/world-lab/README.md) · [Source provenance](docs/SOURCE_PROVENANCE.md) · [Verification](docs/VERIFICATION.md)

![World Forge — instrument anatomy at 720p](docs/screenshots/ui-remaster/after-anatomy-1280.jpg)

## World Forge instrument

Original chalk, graphite and bronze instrument artwork unifies the boot, film and five-mode selector. Solar Bearing changes the actual sun; the Goniometer sets the 0–270° cut; Strata Reveal controls continuous 0–8 peel; the Pulse Console runs/pauses/restarts seismic rays; Origins/Atlas selectors activate the actual source experiments and seven bodies. Auxiliary ranges retain native keyboard semantics with custom calibration bars. Hero controls support drag, arrows, Home/End and **0** reset; **1–5** selects modes when focus is outside controls, and **Escape** closes temporary UI.

Forge Boot displays real terrain/GPU cache/LUT/compiler preparation, then hands off to the actual first frame. Direct links use an abbreviated Observatory Wake and retain their destination. There is no invented total progress or repeated delay after the film. Recovery offers reload with the same URL/seed; reduced-motion preferences remove decorative transitions. Right-hand scientific explanations and optical groups expand independently; the left index stays fully visible at 1280×720, 1600×900 and 1920×1080. No renderer, shader, texture, particle count or quality default was changed; no new dependency was added.

## Celestial Atlas

[Reference Earth](https://rednebula100.github.io/gaia-genesis/?lab=world&view=reference&seed=162711) · [Atlas Earth](https://rednebula100.github.io/gaia-genesis/?lab=atlas&body=earth) · [Procedural + moon](https://rednebula100.github.io/gaia-genesis/?lab=atlas&body=procedural&seed=162711) · [Jupiter](https://rednebula100.github.io/gaia-genesis/?lab=atlas&body=jupiter)

WORLD switches between **GENESIS WORLD** and **REFERENCE EARTH** without changing the generated world. The fifth **ATLAS** tab contains Earth / Procedural / Moon / Mercury / Venus / Mars / Jupiter. Drag with inertia, wheel zoom, keyboard arrows/+/-/0, Reset View/Look and collapsible Optics control sun, ambient light, atmosphere, rotation, clouds, terrain and bump as supported by each original shader. Reference bodies return to Genesis for anatomy/seismic/origins; they do not inherit its geological model. Body/view/seed URLs restore on refresh and history navigation.

Original shader revision **cfa2776033d31250bb826b677e4539c4cecbd4be**. Reinhard/gamma/vignette remain isolated from Genesis AgX; inactive rendering stops. Original full-quality defaults remain fixed. Licensed 8K stars and independently seeded 3D noise replace uncredited assets; their patterns differ. No visual fusion or rewrite of the Genesis renderer was applied. No new npm runtime dependency is installed.

[Seven original-versus-GAIA comparisons](docs/screenshots/planet-atlas/README.md) · [Exact source/asset/license manifest](docs/ATLAS_SOURCE.md) · [Full GPL text](COPYING) · [License scope and GSAP permission](LICENSE). All corresponding source and build scripts are public in this repository; clone the deployment commit and run the commands below. Existing MIT/BSD/Zlib/font/image notices remain in force.

![Earth: original and GAIA](docs/screenshots/planet-atlas/compare-earth.jpg)

## Run

Node 22.12+:

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/gaia-genesis/`. Production: `npm run build`, then `npm run preview`. Focused Windows Chrome acceptance results are in `docs/VERIFICATION.md`.

## Experience

GPU planetesimal merging → giant impact → particle reaccretion → liquid metal differentiation → basalt cooling → ocean/atmosphere → mature anatomy → closure. Skip, Replay, New World; drag/scroll in the final scene. Keyboard: focus the canvas, arrows rotate, +/- zoom. The bottom timeline supports pointer/keyboard scrubbing. `?seed=162711` reproduces the world. Loading includes worker map generation, original GPU physics prepasses and shader warming; hidden tabs pause the film.

## World Lab

- **WORLD**: original mature meshes/maps, same cloud phase and optics; drag, wheel, clouds/atmosphere toggles and rotatable sun.
- **ANATOMY**: eight spherical units and two rotating half-annular caps, 0–270° cut, reversible seeded rough peel, depth hover/click, layer fly-to, five material/data views, linked velocity graph and true/schematic proportions. Five selectable atmospheric thermal-region arcs are an educational overlay, separate from the optical atmosphere.
- **SEISMIC**: numerically integrated spherical direct P/S rays, conserved ray parameter, animated travel time and calculated surface-arrival gaps. S stops at the liquid outer core. Start/pause/restart/speed/P/S controls.
- **ORIGINS**: live GPU Cosmos gravity and mergers (128/512/1024 bodies); configurable 32,768-particle Cosmic Collisions (ratio/speed/angle/metal, explicit preparation and independent full-state playback); 420,000-particle Stardust (seeded GAIA targets, assemble/scatter/reverse/pause/size/palette). Only the selected experiment runs.
- Eight-step Korean guided tour with next/back/close. No timed auto-advance.

At closure the entire movie HUD fades away without replacing the world. Skip enters Lab; Genesis restores the film; New World regenerates maps and physics. Presentation links: `?lab=world`, `?lab=anatomy`, `?lab=seismic`, `?lab=origins`, `?tour=1`, combined with `&seed=162711`. Developer `?inspect=` and `?reference=earth` retain their inspection behavior without automatic Lab entry. Film timeline scrubbing remains in the film HUD.

Lab state, profiles, geometry, ray solver, UI and Origins adapters are separate modules in `src/lab/`. No Strata code/assets/CSS/data tables are copied. Read [scientific/model boundaries](docs/WORLD_LAB.md) and [source provenance](docs/SOURCE_PROVENANCE.md).

## Scientific scope — film and model

This is art direction, not a physical formation simulation. Initial liquid metal differentiation and the much later solid inner core are **not simultaneous events**. The signature shot is labelled a mature interior/time projection. Inner core radius: **0.1916 R**; liquid outer core boundary: **0.546 R**; mantle outer boundary: **0.985 R**. Crust thickness is exaggerated to **0.015 R**. The mantle is represented as mostly solid silicate; animated plume/slab motifs compress geological time. The liquid core is opaque metal, not transparent water.

Cosmos uses simplified dimensionless N-body merging. Cosmic Collisions uses approximate particle-mesh gravity and contact/heat, not SPH, shock or phase-change physics. Stardust reassembly is animation, not gravity. These are staged models with art-directed handoffs, not one conserved formation simulation. [Exact source paths and adaptations](docs/SOURCE_PROVENANCE.md).

Plate-neighbourhood uplift, coast distance, altitude and humidity are artistic heuristics. Fine cloud fronts use the restored original full-resolution skin, with a restrained raymarched 3-D optical-depth layer beneath. Multiple-scattering fill and surface shadows are approximate; this is not fully volumetric fine weather. The 0.001–0.006 R cloud height is exaggerated. The uncut atmosphere uses Takram/Bruneton Rayleigh/Mie/ozone LUTs; it fades during detached anatomy because one spherical LUT cannot describe both pieces. Interior lighting is an exhibit key.

## Rendering and reference

Genesis uses one Three.js WebGL2 renderer: source engine stages → linear half-float HDR → detailed cloud skin / fixed half-resolution volume → atmospheric LUTs → restrained highlight bloom → **one AgX tone map and sRGB output**. There is **no FPS-triggered DPR or cloud-resolution reduction**. Source physics runs once per seed in a temporary GL context during loading; cached position/velocity/material/heat buffers cross contexts safely. They are states, not rendered frames. The prepass context is disposed before playback. Shaders and a collision composite are warmed under the loading veil.

Atlas is a separately bundled GPL Web Worker program, using direct WebGL2 and the original fullscreen quad. It imports no GSAP or Three.js and exchanges serialized lifecycle/settings commands with the host. Its own Reinhard output bypasses the Genesis composer; only the selected renderer submits frames. See [licensing boundaries](docs/ATLAS_SOURCE.md).

`?reference=earth` opens a **developer-only NASA Blue Marble reference**, automatically at the final shot, under the same sun/camera/LUT pipeline. NASA surface/coverage maps are not used by generated worlds. It is an optical comparison, not a claim that generated geology equals observed Earth. Credits and original URLs are in [notices](THIRD_PARTY_NOTICES.md).

Adapters live under `src/engines/`; pinned MIT sources under `src/vendor/`. Existing terrain, geometry, optics and timeline remain separate modules. Seed + film time determine state. Paused inspection frames accumulate no temporal history. New World disposes replaced maps, materials, geometry, collision targets and temporary GL resources.

## Deployment

GitHub Actions builds on `main` push and publishes `dist/` to GitHub Pages. The Vite base is `/gaia-genesis/`. Enable Pages with Source: **GitHub Actions**. If using a different repository name, update `vite.config.ts` base to match it. No secrets are required.

## Scope and limitations

Desktop only, designed for 1920×1080 and 1280×720. Graphics acceleration required. No sound, terrain exploration, editor or climate solver. Interior textures are illustrations. Collision resolution is bounded at 32,768 particles; the original's spark-streak and separate vapour-atmosphere passes are not ported. The hybrid clouds are approximate. Fidelity remains fixed on slow GPUs; measured FPS and captures are in verification. No universal NASA/photographic fidelity or frame-rate claim is made.

See [reference decisions](docs/ART_REFERENCE_NOTES.md), [notices](THIRD_PARTY_NOTICES.md) and [verification](docs/VERIFICATION.md).
