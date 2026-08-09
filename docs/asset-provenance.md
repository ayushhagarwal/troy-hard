# Asset provenance

All visual production assets in this repository were created for TROY HARD through OpenAI Image Generation from the five user-approved concepts in `docs/design/reference/`. Chroma-key subjects were cleaned locally with the official image-generation helper, visually inspected for transparency, and compressed to WebP. The adaptive score and effects are synthesized at runtime with Web Audio; no third-party recordings are distributed.

| Final asset | Generation source | Purpose | License/status |
| --- | --- | --- | --- |
| `troy-road-desktop.webp` | `exec-b12fcd2a-78f3-4535-8873-4ba69ad1d3fb.png` | Desktop living-pottery environment | Original project generation |
| `troy-road-portrait.webp` | `exec-5fdc642c-e4ed-45d1-b813-f9ed4c4b8327.png` | Portrait-specific environment | Original project generation |
| `horse.webp` | `exec-4da9927c-ff11-43b9-a742-7a52fec9f2de.png` | Transparent horse rig | Original project generation; chroma removed locally |
| `pullers.webp` | `exec-90ff2c2b-1440-44b2-af91-4803684a76e6.png` | Transparent four-puller rig | Original project generation; chroma removed locally |
| `puller-strip.webp` | `exec-399f79d9-216b-4b85-9169-6123b7731925.png` | Four independently animated puller pieces | Original project generation; chroma removed locally |
| `inspector-strip.webp` | `exec-8f981d38-5638-4e4f-aea3-895e396b93c9.png` | Idle, torch-raised, and inspection guard poses | Original project generation; chroma removed locally |
| `success-freeze.webp` | `exec-6e6efc92-d85f-4445-9cd7-0e2bc8f845d2.png` | Success/result framing | Original project generation |
| `failure-freeze.webp` | `exec-bce7de09-3474-42cb-b80a-4966cbaf0b17.png` | Failure/result framing | Original project generation |
| `failure-spotted.webp` | `exec-9ac09881-f5ba-462d-94c5-0348717c37d5.png` | Spotted-by-inspector result framing | Original project generation |
| `failure-gate-crash.webp` | `exec-c66cd4dc-142e-4016-8d8c-64605de3fa8c.png` | Unsafe gate-entry result framing | Original project generation |
| `failure-timeout.webp` | `exec-63ab9764-3b3b-407f-b75c-a47d9f978355.png` | Closed-gate timeout result framing | Original project generation |
| Archivo Variable | `@fontsource-variable/archivo` | Interface typography | SIL Open Font License 1.1 |
| IBM Plex Mono | `@fontsource/ibm-plex-mono` | Numerals and telemetry | SIL Open Font License 1.1 |

## Creative boundaries

The project is independently based on ancient mythology. Prompts excluded actors, film stills, studio logos, copyrighted production design, and recognizable modern adaptations. Human anatomy, wheels, ropes, repeated architecture, alpha edges, and native-aspect-ratio crops were manually reviewed before integration.

## Prompt-direction ledger

- **World plates:** cinematic sun-baked approach to Bronze Age Troy, low three-quarter camera, limestone and terracotta architecture, black-figure pottery details, teal banners, clear gate silhouette, no modern adaptation references.
- **Horse rig:** monumental cedar Trojan horse on wheels, readable joints and rope anchors, black-figure “hidden Greeks” side panel, isolated production subject on a flat removable key.
- **Puller rig:** four distinct Trojan caricatures in separated full-body hauling poses, readable hands and feet, individualized helmets and clothing, isolated with no baked rope so motion can be controlled in code.
- **Inspector rig:** the same guard in idle spear-and-shield, torch-raised telegraph, and suspicious leaning poses, consistent costume and silhouette, separated on a flat key.
- **Result scenes:** 16:9 poster compositions with the visual gag on the left and protected dark copy space on the right; separate spotted, rollover/rope, gate-impact, timeout, and success scenarios.

Prompts were iterated against the locked concepts, not used as one-shot final output. Malformed anatomy, duplicated figures, broken spokes, incoherent ropes, damaged alpha edges, and repeating architectural artifacts were rejection criteria.
