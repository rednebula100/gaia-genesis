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

## One renderer, one world

Three.js WebGLRenderer + original GLSL shaders. Seeded spherical terrain and weather are baked into 2048×1024 data textures in a worker. The terrain red channel is shared by ocean fill and relief; cooling uses the same persistent rock field. Cloud texture, sun and world mesh survive the final handoff. No planet image downloads, AI image APIs or video.

The cut is a translated 90° spherical sector with meridional half-annulus mesh caps on both pieces. Concentric spherical material boundaries remain genuine geometry under rotation. The two cut edges coincide precisely when the sector closes; no hidden front hemisphere or circular overlay is used.

The camera, thermal transition, radius, ocean/air emergence and section opening are keyed on one 22-second GSAP timeline. Debris and collision glows are evaluated from timeline time, so seeking does not depend on earlier events.
