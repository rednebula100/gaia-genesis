# Celestial Atlas — actual source and asset provenance

Reviewed 2026-11-12. Source: [Julien Sulpis / realtime-planet-shader](https://github.com/jsulpis/realtime-planet-shader), revision **cfa2776033d31250bb826b677e4539c4cecbd4be**. Upstream root LICENSE is **GNU GPL v3**, not MIT. Full text accompanies the source in `src/vendor/jsulpis/LICENSE`, root `COPYING` and deployed [`licenses/jsulpis-GPL-3.0.txt`](https://rednebula100.github.io/gaia-genesis/licenses/jsulpis-GPL-3.0.txt).

## Running code, not reference-only files

The four files below are byte-for-byte source copies from upstream `src/webgl/shaders/`. Copyright/author headers are retained. `src/atlas/renderer.worker.ts` imports them with Vite `?raw`, compiles and links them into actual WebGL2 programs, binds the samplers/uniforms and draws the original six-vertex fullscreen quad. The adapter moves the `#version 300 es` directive to the first line **in the compilation string**, as required by ANGLE; stored upstream files are unchanged.

| Selection | Fragment source actually executed | Textures / preset source |
|---|---|---|
| WORLD Reference / ATLAS Earth | `earth.fragment.glsl` | `pages/earth.astro`: five Earth maps, ambient .002 |
| Procedural | `procedural.fragment.glsl` | `pages/procedural.astro`: radius 1.9, position 0, quality 2; own seeded R8 noise |
| Moon / Mercury | `planet.fragment.glsl` | respective Astro page; individual map; white atmosphere .05 |
| Venus | same common shader | Venus map; [.9,.3,0], density .1, bump .005 |
| Mars | same common shader | Mars map; [.9,.15,0], density .2 |
| Jupiter | same common shader | Jupiter map; [.36,.92,.95], density .05, bump .003 |

All use original `vertex.glsl`, sun XY [1,1], rotation offset .6, sun intensity 3 and original default uniforms unless the page overrides them. Texture modes retain `min(devicePixelRatio,2)`; Procedural always uses quality **2**, including its original full octave path. No FPS governor or automatic quality reduction exists. Texture RGBA uploads, vertical flip, repeat wrapping, nearest filtering and night/star mip filters match the original `four` sampler setup. These upstream artistic shaders operate directly on the uploaded map values and perform their own Reinhard/gamma/vignette output. No sRGB texture decode, Three.js tone mapping, AgX or second output conversion is added to this canvas.

Differences: elapsed-time motion equals original 60-fps motion (.6 shader-time units/second at speed 1), rather than changing speed with frame rate. Pointer inertia uses a time-correct damping factor. The moon, its orbit and shadow remain original GLSL; no added orbital simulation. Reset View resets framing/orientation; Reset Look resets optical parameters without erasing framing. Per-body look and time are cached until reload; URL carries body/view/seed, not arbitrary slider edits.

## Distribution and corresponding source

The GPL renderer is a **standalone Web Worker/OffscreenCanvas program** with its own Vite output bundle. It imports no GSAP, Three.js, GAIA shader or compositor. The independently authored host passes serialized settings, dimensions and lifecycle commands. Inactive renderer scheduling stops; one Atlas context and shared texture/program caches serve all seven bodies. GAIA's composer stops while Atlas is visible. Full cleanup runs at page exit; New World replaces the single noise texture and seed state rather than accumulating textures. No upstream application UI, Astro runtime, analytics, quality governor or `fourwastaken` code is bundled.

The entire corresponding source is available from [this public repository](https://github.com/rednebula100/gaia-genesis), including the four GLSL sources, worker, protocol, build files and lockfile. Download the source for any deployment via that deployment's commit, run `npm ci && npm run build` using Node 22.12+, then serve the contents of `dist/` at the `/gaia-genesis/` URL base. `npm run preview` serves that base locally. The app exposes this source link from Optics and the original author's link from the Atlas list. Root `LICENSE` describes the host license and its GSAP additional permission; **no additional permission or MIT label is applied to upstream GPL code**. All pre-existing notices remain applicable.

## Asset manifest (all under public/atlas)

Code GPL does not replace image rights. The reference renderer and the new explicitly credited planet-racing materials load these assets. Genesis's procedural film/world never samples them. Racing uses independent Three.js spherical materials, not the original fullscreen GPL programs; their normals, illumination, clouds and output pipeline differ from Atlas.

| Files | Actual source and credit | Conditions / changes |
|---|---|---|
| `2k_earth_color.jpeg`, `2k_earth_night.jpeg`, `2k_earth_clouds.jpeg`, `2k_earth_specular.jpeg`, `2k_earth_bump.jpg` | Pinned upstream `public/`; its `pages/earth.astro` credits [NASA Visible Earth / Blue Marble](https://visibleearth.nasa.gov/collection/1484/blue-marble). NASA scientific imagery, no endorsement. | Original upstream 2048×1024 files copied unchanged. Upstream does not identify the individual observation dates/product IDs or processing history of each derivative map; these are artistic reference maps, not calibrated datasets. [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). |
| `2k_moon.jpeg`, `2k_mercury.jpg`, `2k_venus.jpg`, `2k_mars.jpg`, `2k_jupiter.jpg` | Pinned upstream `public/`, credited by each original page to **Solar System Scope / INOVE**. [Official textures and license declaration](https://www.solarsystemscope.com/textures/). | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream 2048×1024 files copied unchanged; upstream resize/encoding retained. Based on NASA imagery with artistic/synthetic completion, not current observational measurements. |
| `8k_stars.jpg` | **Solar System Scope / INOVE**, downloaded directly from [8k_stars_milky_way.jpg](https://www.solarsystemscope.com/textures/download/8k_stars_milky_way.jpg), official texture page above. | CC BY 4.0, 8192×4096; file renamed only. **Not** the uncredited/cropped upstream star image. Background star placement and Milky Way brightness therefore differ from upstream; planet optics are unchanged. |

The uncredited upstream `3DNoise.bin` was **not copied**. The worker independently generates 32³ seeded xorshift R8 values with linear repeat sampling. Same seed/time/settings reproduce the same field. Different terrain/cloud distribution from upstream is intentional and required by replacing that asset; FBM, domain warping, colors, light, atmosphere, moon and shadows still execute the unmodified original shader. No claim of pixel-identical Procedural continents is made. The upstream uncredited 4K/8K star files are **not distributed**.

## Visual comparison and boundaries

[Seven original-versus-integrated captures](screenshots/planet-atlas/README.md) are actual Windows Chrome renders at 1920×1080, DPR 1, original defaults and shader time 0. The original site's header remains in its reference capture. Atlas also has 1280×720 captures. Texture-mode planet illumination, orientation and materials match the original; differences outside the planet are expected from the licensed star replacement. Procedural retains its character, palette, detail and satellite with a different seeded land/cloud pattern.

Genesis renderers/maps/geometry were preserved. No optional visual fusion was applied: the two visual models remain independently inspectable. Strata code/assets are not included. These are artistic real-time visualizations, not geophysical or atmospheric simulations; Moon/Mercury atmospheric rims are the original author's visual presets, not claims about substantial physical atmospheres.
