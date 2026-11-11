# Third-party notices

Runtime packages (full texts are shipped with the installed packages; dependency versions are locked in `package-lock.json`):

- Three.js — MIT; Copyright © 2010–2026 three.js authors. https://github.com/mrdoob/three.js/blob/dev/LICENSE
- GSAP — Standard GSAP License, GreenSock; https://gsap.com/standard-license/ . Used as an application animation dependency, not redistributed as a competing animation tool.
- Barlow Condensed — SIL Open Font License 1.1; Jeremy Tribby / Barlow Project Authors. Bundled locally via `@fontsource/barlow-condensed`.
- IBM Plex Mono — SIL Open Font License 1.1; IBM Corp. Bundled locally via `@fontsource/ibm-plex-mono`.
- Vite — MIT; TypeScript — Apache-2.0; Playwright — Apache-2.0; Three.js type definitions — MIT. Development tooling, not scene assets.

The original GLSL, worker terrain/weather generation and section mesh construction do not contain code copied from the P0 repositories. Deep-Fold/PixelPlanets, owenyuwono/demiurge, theanandprasad/web-planet, owenyuwono/poseidon and Token-Gremlin/natural-disasters were inspected as MIT-licensed design references. Their code and images are not redistributed. See `docs/ART_REFERENCE_NOTES.md` for exact source paths and decisions. This statement applies to the Genesis renderer; GPL-3.0 Atlas code is now separately distributed as described below. No paid assets or character models are included. NASA reference imagery is isolated from default generation as described below.


## Source-transplanted birth engines

- **Cosmos — GPU N-Body**, © 2026 A. Burak Soyak, **MIT**: actual force/integrate/merge and rocky-body GLSL; full notice `public/licenses/cosmos-MIT.txt`.
- **Cosmic Collisions**, © 2026 Victor Kiselev, **MIT**: actual layered particle construction, GPU particle-mesh/contact/heating, sphere-impostor/bilateral fluid-skin rendering and shading; full notice `public/licenses/collisions-MIT.txt`.
- **Stardust**, © 2026 Victor Kiselev, **MIT**: actual GPU scatter/assembly, point sizing and particle shading; full notice `public/licenses/stardust-MIT.txt`. Its NASA/NOAA imagery, UI and media are not included.

Exact upstream SHAs, source paths, runtime adapters and changes are recorded in [source provenance](docs/SOURCE_PROVENANCE.md). Complete original copyright/license headers accompany source copies under `src/vendor/`. These additions do not change the separate reference-only status of the original P0 repositories listed above.

## Atmosphere and compositor dependencies

- **@takram/three-atmosphere 0.19.1** and its **@takram/three-geospatial 0.9.1** dependency — MIT, Takram / Shota Matsuda. Vanilla WebGL `AerialPerspectiveEffect` and `PrecomputedTexturesLoader` are actually integrated. The four files under `public/atmosphere/` are unmodified EXR LUT assets shipped in atmosphere 0.19.1. Source and full license: https://github.com/takram-design-engineering/three-geospatial . Distributed text: `public/licenses/takram-three-geospatial-MIT.txt`.
- The included Bruneton atmospheric-scattering shaders derive from **Eric Bruneton (2017), BSD-3-Clause**. Full original notice is distributed at `public/licenses/Bruneton-BSD-3-Clause.txt`.
- **postprocessing 6.39.6** — **Zlib**, Raoul van Rüschen. HDR compositor, AgX tone mapping, restricted highlight bloom, and pass infrastructure. Full notice: `public/licenses/postprocessing-Zlib.txt`. https://github.com/pmndrs/postprocessing
- Takram's vanilla dependency graph includes **astronomy-engine** (Don Cross), **@petamoriken/float16** (Kenta Moriuchi), **tiny-invariant** (Alexander Reardon) and **url-join** (Johan Sundström), MIT. Their complete package notices, plus Three.js and both fonts' license texts, are distributed in `public/licenses/`. React/R3F peer packages may be installed by npm but are not used to render this application.
- The cloud volume raymarcher, density atlas generator, geological heuristics, interior shaders and section geometry are original project code. Takram Clouds, Procedural Terrains and leoawen's engine are **not integrated**. Strata/world-layers and TerraScan code/assets are **not copied**; no repository LICENSE was found at review time.

## World Lab / Origins extension (2026-11-12)

The same pinned MIT Cosmos, Cosmic Collisions and Stardust sources above additionally execute in interactive Lab adapters; no new license or dependency is introduced. Live Cosmos and configured collision physics retain original force/merger and fluid-skin implementations. Stardust receives GAIA-generated targets/colours. Full notices remain distributed under `public/licenses/`.

Strata/world-layers at `69f756355fe8be1d4291edd59738ab6ed6a50514` had no root LICENSE and GitHub `license: null` when inspected. It is a functional study reference only: no code, CSS, media or scientific tables copied. Independent scientific model sources and boundaries are in `docs/WORLD_LAB.md`; implementation provenance is in `docs/SOURCE_PROVENANCE.md`.

## NASA developer reference only

`?reference=earth` loads the checked-in 2048×1024 Blue Marble surface and cloud composites; this mode is explicitly labelled **NASA BLUE MARBLE / REFERENCE**. Default procedural worlds never request or sample these images. The comparison uses the same camera, sun, atmosphere and cloud renderer; observed cloud coverage is converted to a density-control weather map. Its heuristic ocean classification is not an observed elevation product.

NASA Goddard Space Flight Center; Reto Stöckli (land, shallow water, clouds) and Robert Simmon (ocean colour/compositing). Source article and image links: https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/ . Original files, unmodified:

- https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_2048.jpg
- https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg

NASA media usage guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/ . These NASA/GSFC scientific visualizations are credited reference material; no NASA endorsement is implied, and no NASA identifiers are used as the product logo.


## Celestial Atlas (2026-11-12)

Julien Sulpis / realtime-planet-shader, revision cfa2776033d31250bb826b677e4539c4cecbd4be — **GPL-3.0**, not MIT. Four unchanged GLSL files actually execute in a standalone WebGL2 worker program, outside the GAIA/GSAP bundle and compositor. Original full license is included under src/vendor/jsulpis/LICENSE, COPYING and public/licenses/jsulpis-GPL-3.0.txt. GAIA's host additional permission for GSAP applies only to GAIA-authored host code, never to upstream GPL code. Complete corresponding source and build files are public. See [Atlas source and licensing](docs/ATLAS_SOURCE.md) and root LICENSE.

Earth's five unchanged upstream reference maps are credited by the original author to NASA Visible Earth. Moon, Mercury, Venus, Mars and Jupiter maps: **Solar System Scope / INOVE, CC BY 4.0**, unchanged upstream 2K derivatives. Stars: **Solar System Scope / INOVE, CC BY 4.0**, official 8K Milky Way file renamed only. License: https://creativecommons.org/licenses/by/4.0/ ; source and asset manifest: https://www.solarsystemscope.com/textures/ . The uncredited upstream stars and Shadertoy 3DNoise.bin are not distributed; noise is independently seeded and generated. Detailed per-file sources, modifications and attribution limitations are in docs/ATLAS_SOURCE.md. NASA/INOVE/Julien Sulpis do not endorse GAIA.
