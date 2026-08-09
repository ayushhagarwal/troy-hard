# Visual fidelity ledger

The five files in `reference/` are the locked source of truth. Final QA compares the running desktop title, desktop gameplay, portrait gameplay, success, and failure states against them at their native aspect ratios.

| Surface | Locked reference | Implementation target |
| --- | --- | --- |
| Desktop gameplay | `reference/desktop-gameplay.png` | Low three-quarter camera, horse left-center, Troy gate at upper right, sparse pottery HUD |
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
