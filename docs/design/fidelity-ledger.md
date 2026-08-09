# Visual fidelity ledger

The original five files in `reference/` establish the visual family. `gameplay-auto-pull-concept.png` is the user-directed gameplay correction and supersedes the original desktop composition where they differ. Final QA compares the running desktop title, desktop gameplay, portrait gameplay, success, and failure states against them at their native aspect ratios.

| Surface | Locked reference | Implementation target |
| --- | --- | --- |
| Desktop gameplay | `reference/gameplay-auto-pull-concept.png` | Low three-quarter camera, coherent grounded pull team, continuous uphill rope, populated watched ramparts, gate at upper right, explicit automatic-pull/brace controls |
| Success | `reference/success-results.png` | Gate-side freeze, large time/score, dry receipt joke, share hierarchy |
| Portrait gameplay | `reference/portrait-gameplay.png` | Dedicated vertical background and centered lower balance rail—not a desktop crop |
| Title | `reference/title-attract.png` | Oversized stacked wordmark, ordinary-delivery line, horse/puller tableau, one dominant CTA |
| Failure | `reference/failure-results.png` | Terracotta-black freeze, one dry failure line, rapid retry and optional disaster sharing |

Any mismatches discovered during browser QA are recorded below before release.

## QA mismatch log

- Repaired results stacking: success and failure now overlay the retained game canvas instead of rendering below the viewport.
- Expanded the portrait balance rail from 42% to 84% width and raised it above the instruction/safe area.
- Preserved the locked title hierarchy, gate-facing portrait composition, terracotta/teal palette, dry result copy, and dominant replay/share actions.
- Production art intentionally uses a more dimensional carved-wood finish than the flatter concept paint while retaining the approved silhouettes and visual family.
- Removed result-heading focus outlines from captures while keeping programmatic focus for screen-reader announcement.
- Final built screenshots are stored in `artifacts/qa/`; desktop and portrait title/game/result states were visually inspected with `view_image` on 2026-08-09.
- Corrected the mythic role: Trojans now advance and stop automatically while the player braces and counterbalances only the hidden crew.
- Replaced the four overlapping puller slices with the intact full-body team asset so feet, hands, and rope remain coherent.
- Added original rampart guards, a persistent gate captain, and side-weighted Trojan citizen groups while preserving a clear hauling lane.
- Replaced the foreground pop-in inspector with a diegetic wall torch, attention cone, and 200–350 ms terracotta truth sweep.
