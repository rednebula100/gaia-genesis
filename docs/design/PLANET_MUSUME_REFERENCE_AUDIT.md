# 행성무스메 — reference audit and implementation contract

Baseline main: 5b389601892c7c5c112fedd916463d64b5e37bc6 (latest checked with fast-forward pull). No uncommitted baseline changes.

## Observed sources (not shipped assets)

- [Official game system / screenshots and embedded movies](https://umamusume.jp/contents/game/system/?step=3). Actual image contact sheet inspected locally under ignored artifacts/musume/references.jpg.
- [Official FAQ](https://support.umamusume.jp/faq/).
- [Training guide](https://umamusume.gg/career-training-guide/) returned HTTP 403; not represented as read.
- [Career / deck / scout analysis](https://mihonostudios.com/guides/getting-started).
- [JWC producer release](https://prtimes.jp/main/html/rd/p/000000001.000002402.html). Serious race framing contrasts with impossible competitors; no betting system or copied dialogue/assets.
- Actual additional frames: [six-slot support deck](https://uma.guide/img/guides/article/deckbuilder.webp) and [scout screen](https://mihonostudios.com/guides/player/shots/scout.webp), both visually inspected in Chrome. Deck: distinct selected slots, compact support information and a single bottom action; adapted as four fixed slots and explicit matching stat gain. Scout: strong featured subject with two pull sizes and persistent balance; adapted as real 3D planetary assembly beside an independent result grid.
- [Official system event movie](https://www.youtube.com/watch?v=Jz28NDzev7g): actual Chrome WATCH playback reached approximately 11 seconds; inspected event scene with persistent resource hierarchy and compact skip controls. No copied footage. YouTube embeds returned error 153 and were not counted as viewed.
- [JWC3 archived gameplay](https://www.youtube.com/watch?v=PkG9LvZYCMM): WATCH playback initially reached its introductory title; subsequent seeks to the actual race stalled (95→95 seconds; later retry 0→0). **No claim to have observed its moving race cuts.** This comparison is limited to the producer's primary release/stills and visible introductory framing. Our own moving race is recorded and inspected; external playback failure is not presented as successful research.

| Official actual frame | Observed hierarchy and motion target | Independent adaptation |
|---|---|---|
| [Training choice: top turn/energy, center athlete, five gains directly above actions](https://umamusume.jp/_nuxt/images/step1_thumb3-NIez_ocC.jpg) | Training choice: top turn/energy, center athlete, five gains directly above actions | Top turn/energy, central real planet, five explicit stat previews; four support slots |
| [Career home: hero behind legible bottom action band](https://umamusume.jp/_nuxt/images/screenshot_11-8U80Y6WL.jpg) | Career home: hero behind legible bottom action band | One primary action, strong asymmetric sports typography |
| [Friendship training: full-hero reward reveal](https://umamusume.jp/_nuxt/images/step1_thumb2-jXnzYPNh.jpg) | Friendship training: full-hero reward reveal | Stat burst + participating support tint, short transition |
| [Pre-race course presentation](https://umamusume.jp/_nuxt/images/step1_thumb4_movie-Z9QsHh70.jpg) | Pre-race course presentation | Eight real 3D spheres, course and strategy before launch |
| [Unique skill cut-in](https://umamusume.jp/_nuxt/images/step1_thumb4-Q_Y04WwR.jpg) | Unique skill cut-in | Telemetry-triggered 3D camera/rim pulse, timed commentary |
| [Result: winning athlete and single large place](https://umamusume.jp/_nuxt/images/step1_thumb5-TpB1Khwr.jpg) | Result: winning athlete and single large place | Winner camera, actual finish times and one-time reward |
| [Choice event: two decisions in foreground](https://umamusume.jp/_nuxt/images/screenshot_05-cFjb7o1j.jpg) | Choice event: two decisions in foreground | Three finite branching events with visible effects |

Official screenshots are portrait mobile material. We borrow ordering and feedback, not their mobile layout, characters, rounded green buttons or artwork. Our desktop arena uses deep marine blue, ivory sports panels, acid-lime primary actions and restrained vermilion broadcast highlights. Korean uses local system sans; existing licensed Barlow Condensed supplies athletic English display. No new font distribution.

## Vertical slice decisions

Default game route is separate from all historic GAIA query routes. 10-turn model, two free scouts (3/18/79 percent, first planet ten-pull protection disclosed), four support slots, real low-energy failure, three two-choice events, three purchasable skills. Eight racers / two courses / three strategies / seven native skill types. A fixed 60 Hz seeded simulation determines finish order. Replay re-simulates the same config; rewards are idempotent by race ID. Local versioned save with reset and corruption fallback. Science and fictional stat rules are labelled separately.

Race uses the already licensed full-resolution 2K NASA/SSS spherical maps on actual lit 3D sphere meshes, independent clouds/atmospheric shells, and seeded GAIA worker terrain for two custom worlds. This is permitted option 2, not a claim to run the fullscreen Atlas GLSL eight times. Original Atlas worker and all its shaders remain intact and reachable. No automatic quality reductions.

## Visual review and evidence

Actual Windows Chrome frames and the moving race are linked in the [capture index](../screenshots/planet-musume/README.md). Reference media stays ignored; no third-party game graphic is deployed.

1. Initial home had an excessive cyan ocean highlight; reduced Earth specular colour twice while preserving full 2K maps and geometry. Initial 720p support cards overlapped the stat/action band; shortened that compact strip and separated its spacing.
2. Initial scout result covered its 3D subject; moved the real result grid left, made its panel opaque and hid the underlying banner while revealing. Initial wide race made contestants too small; AUTO now establishes the course briefly, then follows the leader/skill subject. Native skills use actual telemetry, temporary camera focus and independent 3D orbital rings.
3. Initial result showed all finished bodies at the same line, hiding the winner; result camera now isolates the actual winning mesh and explicitly names it while retaining the player's independent placement/time. Course selected text initially lost contrast after legacy CSS was imported; scoped the selected material and global button/span resets. Replaced the misplaced horizontal starting pipes with a real cross-lane finish stripe and two small upright posts.
4. The real lab task initially exposed a camera excursion after long GPU warm-up. A RAF timestamp can predate the completed warm-up; negative deltas caused exponential interpolation to diverge. Clamped the delta to non-negative and re-observed the actual spherical cutaway centrally. The task requires a true layer selection and 135° user input before awarding one turn's reward; returning suspends the hidden engine. Compact bridge avoids the inspector heading.

The game preserves the reference's useful hierarchy (athlete, gains, actions; live ranking, race, result) but uses its own desktop marine/ivory/lime identity, real spherical protagonists and dry original sports commentary. It does not claim the same production budget, character animation, cinematographic complexity or presentation fidelity as the reference games.
