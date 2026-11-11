# Runtime source provenance — 2026-11-12

## World Lab additions

The exact pinned MIT revisions below also execute in interactive Origins: `lab/cosmos.ts` runs live force/integrate/merge and original body shading; `lab/origins.ts` calls parameterized `prewarmBirth` for independent full collision experiments; `BirthObjects.laboratory` executes original Stardust shaders with seeded GAIA targets. No new upstream code/image is imported. Configurable physics caches are state buffers, not film timestamps or rendered frames.

Strata / `jamesponwith/world-layers` was inspected at **69f756355fe8be1d4291edd59738ab6ed6a50514**. GitHub metadata reported `license: null`; no root LICENSE was present. Studied: scene interior/earth/seismic/uniforms; data earth/scale/tour; common shaders; UI labels/chart. Functional principles only: dynamic wedge, radial remapping, irregular peel, depth profiles, conserved seismic ray parameter and readable callouts. **No code, assets, CSS or data tables copied.** GAIA's Lab geometry, peel, profiles, ray quadrature, UI and tour are independently authored. Scientific sources and limitations: [WORLD_LAB.md](WORLD_LAB.md).

Root licenses were read at these exact revisions: all **MIT**. Full notices are
preserved in `src/vendor/<engine>/LICENSE`, copied source headers, and
`public/licenses/`. No upstream UI, analytics, branding, photographs or video
is shipped. Native-demo QA captures and source clones remain ignored artifacts.

| Upstream revision | Original paths | Destination / executed code |
| --- | --- | --- |
| [Cosmos](https://github.com/absoyak/cosmos-demo/tree/a247d9f18aa78d07891d72cc424ea2ee8b165472), `a247d9f18aa78d07891d72cc424ea2ee8b165472`, © 2026 A. Burak Soyak | `index.html`: `GLSL_HEAD`, `GLSL_NOISE`, `VS_FULL`, `FS_FORCE`, `FS_INTEGRATE`, `VS_BODY`, `FS_BODY` | `src/vendor/cosmos/shaders.ts`; `engines/gpu-cache.ts` executes all-pairs force + merge/integrate MRT shaders on 512 float-texture bodies. `birth-objects.ts` displays positions, masses, merger flashes and rock shading at 0–4.6 s. |
| [Cosmic Collisions](https://github.com/Gaploid/cosmic-collisions/tree/b6c8a59c38422f881dea7cc418eca2c1853133bd), `b6c8a59c38422f881dea7cc418eca2c1853133bd`, © 2026 Victor Kiselev | `src/{math,bodies,glsl-common,glsl-sim,glsl-draw,gl,nbody}.js`; bilateral scheduling from `src/view.js` | Seven modules in `src/vendor/collisions/`. `gpu-cache.ts` runs `build`, `settleSome`, `rigidStep`, `step`: 32,768 layered iron/silicate particles, contact hash, fine/coarse mesh gravity, heat and ejecta. `collision-pass.ts` executes original `G_VS/G_FS`, `BLUR_FS`, `SHADE_FS` at 4.6–10.25 s. |
| [Stardust](https://github.com/Gaploid/stardust/tree/93ad5fbda35404df909d852eef46041899c44cab), `93ad5fbda35404df909d852eef46041899c44cab`, © 2026 Victor Kiselev | `index.html`: `VSH`, `FSH`, spherical target/normalized-coordinate contract | Full shaders in `src/vendor/stardust/shaders.ts`; `birth-objects.ts` supplies 420,000 seeded spherical targets and GAIA atlas colours. Original staggered assembly, mid-flight wobble, lighting, point-size energy compensation and soft particle shading run at 10–12.5 s. Scatter begins at the actual last collision state. |

## Adapter changes

One Three.js WebGL2 context renders the film. A temporary offscreen WebGL2
context runs both physics prepasses during loading. Only Float32 **state** buffers
cross through `readPixels`; never GL textures or rendered images. The temporary
context is lost in `finally`, reclaiming original private grids, buffers and
programs. There is no readback during playback.

The private Cosmic Collisions namespace excludes `shell.js` and `view.js`, so no
original globals, listeners or quality governor are installed. Two fixed RNG
seeds in `nbody.js` become GAIA's seed. IDs and neighbour counts remain discrete
during interpolation: fractional depth-channel bits belong to skin coverage.
Four directional blur passes and projected-particle-size taps follow `view.js`,
including its dense close-view prefilter. Detail level 1 is compiled as a constant
to exclude expensive crater loops; source terrain shading, convection, micro
relief and thermal emission remain. Source film/FXAA is replaced by one GAIA
linear HDR → AgX → sRGB output, with GAIA's sun in camera coordinates.

Cosmos uses a bounded rotating rocky disk around one selected massive seed.
Stellar classification, halos and gas drag are disabled; rocky shading, local
merger timing, inherited mass/momentum/colour and force integration remain.
The full-disc merger emission is localized to a seeded hot scar to preserve
rock shading. Its direction is an artistic cue, not a solved contact normal.
The selected body's final radius is normalized to GAIA's unit radius.

Stardust projection becomes Three.js model/view/projection under the same sun;
original `ONE, ONE` blending is retained. Earth/NOAA image lookup, solar features,
cursor physics and its orbit controller are inactive. Targets use GAIA's seed,
exact spherical coordinates and generated atlas. Scatter is transformed into
the same rotating world frame; the geometric dissolve exposes an intact subsurface.

Lifecycle: `prewarmBirth` initializes/caches physics; `setCache`/`setSeed` dispose
old resources; `seek` reconstructs absolute-time state; `update` activates only
the relevant stage; `setSize` resizes render targets; `dispose` releases GPU
resources. The loading veil covers compilation and a first collision composite.

## Scope and visual decisions

Cosmos is simplified dimensionless gravity/merging. Cosmic Collisions is
approximate particle-mesh gravity/contact/heating, **not SPH, shock hydrodynamics
or phase-change physics**. Heat values are model values, not validated thermometry.
Approach follows a rigid two-body orbit before deformable GPU contact takes over.
Stardust movement is authored animation, **not gravitational dynamics**. The
scale/colour handoffs are art direction, not one numerically conserved model.
Mature solid inner core anatomy is a later time projection, separate from initial
liquid-metal differentiation.

The previous volumetric-only remaster blurred the original weather fronts. Fine
cloud skin is restored over a restrained 3-D optical-depth underlayer: deliberately
a hybrid, not fully volumetric filaments. DPR/cloud resolution never change with
FPS. The volume stays half resolution; detailed clouds and collision MRTs are
full canvas resolution. Zero-contribution atmospheric passes are bypassed during
airless/fully detached shots; no samples or resolution are reduced. Source spark streaks, collision-body atmosphere and full
upstream postprocessing are not ported; ejected particles and heat emission are.

# Celestial Atlas addition — 2026-11-12

Actual GPL-3.0 source transplantation from Julien Sulpis, revision
`cfa2776033d31250bb826b677e4539c4cecbd4be`: four GLSL files under
`src/vendor/jsulpis/`, executed by standalone `src/atlas/renderer.worker.ts`.
This is separate from the existing MIT birth engines below. Exact per-body
runtime paths, asset rights, modifications, corresponding source and host/worker
licensing boundaries: [Atlas source manifest](ATLAS_SOURCE.md). Seven actual
original-versus-integrated comparisons: [Atlas captures](screenshots/planet-atlas/README.md).

