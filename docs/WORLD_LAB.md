# World Lab: model and source boundaries

The geography is fictional and seeded. Readouts describe an **educational Earth-reference model**, radius 6371 km. They are neither observations of the generated world nor predictions for it.

## Independent scientific model

`src/lab/model.ts` is the single source of radii, composition, phase, illustrative temperature, density and P/S velocity. Each unit has representative radial end values, with jumps at boundaries. Hydrostatic pressure is numerically integrated from this density distribution using spherical enclosed mass. The geotherm is illustrative, not a recovered measurement. The model is PREM-inspired, **not an implementation or exact digitization of PREM**.

- Inner core 0–1221 km radius; outer core 1221–3480 km radius.
- Representative D″ thickness 150 km. Lower mantle extends to 660 km depth; transition zone 660–410 km; asthenosphere 410–120 km; lithospheric mantle 120–35 km; continental crust 35–0 km. Shallow and D″ boundaries vary geographically in real Earth.
- Material interiors remain predominantly solid silicates, liquid metallic outer core and crystalline solid inner core. Their motion is illustrative geological time compression.
- `drawnRadius` and its inverse map physical radii to explicitly exaggerated schematic radii. Physical readouts never use displayed thickness. At true scale, 35 km crust is only 0.00549 R. Film retains its separately documented exaggerated crust and four-region geometry.
- Atmospheric thermal boundaries 12 / 50 / 85 / 600 / 10000 km follow NOAA's educational overview. Five dashed arcs identify thermal regions; the optical atmosphere still uses the existing Takram/Bruneton LUT. Atmospheric temperature/barometric readouts are coarse illustrative approximations, not US Standard Atmosphere or a thermosphere solver.

`src/lab/seismic.ts` independently integrates direct rays with conserved **p = r sin(i) / v(r)**, Gaussian radial quadrature, velocity discontinuities, continuous turning points and travel time. A squared-radius substitution regularizes the turning-point singularity; non-transmitting discontinuities terminate a branch instead of introducing an unmodelled reflection. S velocity is zero in liquid core. Arrival gaps are calculated from a finer angular sweep than the displayed fan. This coarse one-dimensional model excludes reflections, mode conversion, attenuation, anisotropy and lateral structure; displayed shadow bounds are its calculated results, not exact real-Earth bounds. The P arrival-gap calculation excludes inner-core-transmitted branches (those remain drawn); in real observations weak inner-core phases can reach the usual P shadow. The familiar observed primary P-wave shadow is approximately 103–142°. No Strata trajectory data or algorithm code is copied.

Scientific references:

- [Dziewonski & Anderson, PREM (1981), DOI](https://doi.org/10.1016/0031-9201(81)90046-7); [EarthScope model catalogue](https://ds.iris.edu/ds/products/emc-prem/).
- [NOAA JetStream: layers of the atmosphere](https://www.noaa.gov/jetstream/atmosphere/layers-of-atmosphere).
- [NASA: Earth's atmospheric layers](https://www.nasa.gov/image-article/earths-atmospheric-layers-3/).
- [British Geological Survey / NERC: seismic interior and shadow zones](https://nora.nerc.ac.uk/id/eprint/519718/1/MarsQuake_Booklet_LowRes.pdf).

## Source engines, not film clips

Cosmos executes the pinned original MIT force and merge/integrate shaders every fixed live step, with original rocky-body impostor shading. Trails and counters sample actual state; camera, bounded seed distribution and controls are GAIA adapters. Counts are experiment parameters, not automatic quality choices.

Impact Chamber reruns original Cosmic Collisions construction, settling, approach and post-contact physics for the selected mass ratio, escape-speed multiplier, impact angle and metal fraction. Explicit preparation produces full **state** snapshots in a temporary context, disposed in `finally`; no rendered images are cached. Native sphere-impostor/bilateral skin and material shaders reconstruct the surface during independent experiment playback. The last configured cache is reused on reentry; changing parameters requires the labelled preparation action. Heat colours visualize model energy, not calibrated Kelvin. Film cache and experiment cache remain distinct. Original separate vapour/spark-streak effects remain unported.

Stardust executes original assembly/point shaders on 420,000 generated targets and seeded atlas colours. The motion is artistic GPU assembly, not gravity. Its target image is **not NASA Earth**. Palettes and particle size are live controls. Film parameters are restored on replay.

No extra runtime library is added. Only one Origins experiment is active; mode switches dispose Cosmos targets/materials/trails and stop impact/assembly rendering. Outstanding temporary prepasses are invalidated and lose their context. Returning to Genesis restores the film cache. No FPS quality governor.
