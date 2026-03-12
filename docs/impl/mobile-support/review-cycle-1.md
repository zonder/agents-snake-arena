# Review Cycle 1 — Mobile Support

## Verdict
APPROVED

## Scope reviewed
- PR #43 against `docs/impl/mobile-support/spec.md`
- Architecture in `docs/impl/mobile-support/design.md`
- API expectations in `docs/impl/mobile-support/api-contracts.md`
- Implementation in `public/index.html`, `public/styles.css`, and `public/app.js`

## What I checked
- Responsive layout behavior for desktop, tablet, mobile portrait, and mobile landscape
- Board-first layout priority on narrow screens
- Portrait-preferred behavior while preserving landscape support
- Swipe input and on-screen directional controls reusing the existing gameplay event
- Touch-action scoping to gameplay surface only
- Preservation of desktop keyboard behavior and existing gameplay/audio rules
- Regression risk via test/build verification

## Findings
No blocking issues found.

### Responsive layout strategy
- The implementation introduces a clear viewport model (`desktop`, `tablet`, `mobile-portrait`, `mobile-landscape`) and projects it onto the root panel via data attributes, matching the design intent.
- Mobile portrait and landscape both collapse the desktop three-column shell into a board-first stacked layout, with the board remaining the dominant element.
- Tablet gets a compact stacked variant without forcing phone-specific layout, which aligns with the spec's tablet requirement.

### Portrait-preferred behavior
- Portrait receives the more optimized phone layout (`mobile-portrait`) while landscape remains supported through a separate layout path.
- There is no portrait lock or orientation gate, so landscape remains playable as required.

### Swipe + on-screen controls
- Swipe handling is attached to `#gameStage`, not the whole document, which avoids accidental direction changes on non-gameplay UI.
- On-screen controls are real buttons with directional mapping funneled through the same `requestDirection()` helper used by keyboard input.
- The shared direction path preserves server-authoritative validation and local reverse-direction prefiltering without changing gameplay rules.

### Desktop behavior preservation
- Keyboard input remains available and still routes through the existing `player:direction:set` event.
- Desktop layout remains the default path and touch controls are gated behind touch/mobile conditions, reducing regression risk for non-mobile play.

### Touch-action scoping
- `touch-action: none` is applied only to `.game-stage.is-touch-active`, while buttons use `touch-action: manipulation`.
- This matches the design requirement to avoid disabling scrolling across the whole app.

### Audio/gameplay regression risk
- Touch and swipe interactions now participate in the same audio unlock flow without changing audio-manager semantics.
- Server contracts and gameplay rules remain unchanged; tests and build passed after installing dependencies locally.

## Verification
- `npm test` ✅
- `npm run build` ✅

## Notes
- I attempted to create the required subtask with the documented `subtask` label, but that label does not exist in this repository; I created issue #44 with the available `in-review` label instead and linked it to parent #40.
