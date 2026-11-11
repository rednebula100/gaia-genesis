# Art and implementation decisions

P0 source review, 2026-11-11. These are design references, not merged engines. All scene code is original.

| Reference / source inspected | Detail retained | Deliberate limit |
| --- | --- | --- |
| [Deep-Fold / PixelPlanets](https://github.com/Deep-Fold/PixelPlanets), README, `Planets/LandMasses/PlanetLandmass.gdshader`, `Clouds.gdshader`; [visual demo](https://deep-fold.itch.io/pixel-planet-generator) | Surface and cloud masks are separate, shadows contribute to cloud volume, one restrained palette makes lighting readable. | No pixel filter, Godot shader port or copied noise code. |
| [Demiurge](https://github.com/owenyuwono/demiurge), README, `src/planet/terrainSampler.ts` | Seed + spherical position define one continuous field; costly generation is kept off the render thread. | No tectonic simulation, LOD engine or surface traversal. |
| [Web Planet](https://github.com/theanandprasad/web-planet), README, `js/wgsl/atmosphere.js`, `clouds.js` | The same sun lights the surface, clouds and thin atmospheric limb. Warped weather fields need clear lanes and small internal structure. | WebGL2 implementation; no WGSL renderer or atmospheric LUT port. |
| [Poseidon](https://github.com/owenyuwono/poseidon), README, `src/ocean/oceanSurfaceMaterial.js` | Water is dark in depth, brighter at shallows, with a restrained directional specular highlight and Fresnel response. | An orbit-scale shading approximation, no FFT simulation. |
| [ABYSSAL](https://github.com/Token-Gremlin/natural-disasters), README, `src/core/Quality.js`, `src/sky/Clouds.js` | Shape clouds in grouped systems; retain shadow/depth cues and lower resolution only after sustained slow frames. | Thin shaded cloud shells, not volumetric raymarching; no weather disasters or temporal reconstruction. |

All five repository metadata licenses were MIT at review time. No source or assets from those repositories are included. P1 projects were not needed or copied.

The UI takes the restraint of In Other Waters, the functional hierarchy of HighFleet and Observation's timed appearance of information as principles. It uses its own ivory/lichen instrument language; no game HUD assets, CRT filter or copied layouts.

## Remaster review — 2026-11-11

| Source checked | Adopted / rejected |
| --- | --- |
| Takram three-geospatial README; atmosphere `AerialPerspectiveEffect`, `PrecomputedTexturesLoader`, Bruneton shaders; clouds `CloudsEffect` | **Integrated** atmosphere 0.19.1 + bundled EXR LUTs. Three peer >=0.170 accepts 0.185.1. Optional React peers are unused. Full-globe temporal CloudsEffect cannot directly follow the translated sector and deterministic seeks, so the cloud pass is original. MIT + Bruneton BSD notices retained. |
| leoawen volumetric_cloud_atmosphere_scattering README and renderer structure, MIT, Three r165 | Density/weather separation, Beer extinction and reduced-resolution integration principles; no code/assets adopted. |
| ProceduralTerrains README/package 2.0.5, MIT, Three ~0.185.1 | Peer-compatible, but replacing its engine would discard existing section geometry/seed contract. Not installed; original plate-neighbourhood worker and 16-bit elevation fields instead. |
| Strata/world-layers README; `src/scene/interior.js`, `src/scene/earth.js`, `src/data/earth.js` | Crystalline solid / flowing opaque liquid / rock fabric and sparse plume-slabs, mature time projection. No repository LICENSE found: **no code or assets copied**. |
| TerraScan README / repository metadata | Observed data and inferred models must be distinguished. No repository LICENSE found; no code/data copied. |
| NASA Blue Marble source article + original surface/cloud JPEGs | Optional, explicitly labelled developer comparison only. All default worlds remain procedural. Attribution and conditions in notices. |
| postprocessing 6.39.6 | **Integrated** WebGL HDR composer, depth texture infrastructure, AgX and limited bloom. Three >=0.168 <0.188 accepts 0.185.1. License is **Zlib**, not MIT. |

The original five MIT references above remain design references; their previously documented shell-cloud limitation describes the first version and is superseded by the remaster's real volume pass. Current code is original except the explicitly integrated npm dependencies/LUTs and isolated NASA comparison assets. No WebGPU/CUDA engine mixing, GPL source, or Strata source reuse.

## One renderer, one world

The meridional half-annuli and curved shell boundaries are actual tessellated mesh geometry. Both pieces share the same spherical coordinate fields and radial boundaries. The 90° wedge closes to its original transform. Cloud rays are clipped to each piece's angular sector and the scene's actual depth buffer. The surface, water fill and relief share one 16-bit elevation field; climate colours and weather are seeded in the same worker. Cloud volume noise is a tileable 64³ seeded Perlin-like/value–Worley hybrid.

All cinematic state is evaluated from one GSAP timeline. The slower late interior camera orbit and radial scan accent are keyed to the film time. Formation uses a gradually growing mass; cooling advances across a warped surface field. Atmospheric scattering is one spherical model and is deliberately absent during the detached anatomy shot. This limitation is preferable to a misleading halo spanning the gap.
