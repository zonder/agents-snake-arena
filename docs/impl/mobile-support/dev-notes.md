# Dev Notes: Mobile Support

## Summary
- Added a responsive client-side layout mode system that projects `desktop`, `tablet`, `mobile-portrait`, and `mobile-landscape` state onto the root panel via data attributes.
- Reworked the gameplay layout so small screens stack the board first, with room/meta cards and score/rematch panels compressed below it instead of keeping narrow side rails.
- Added gameplay-only touch controls and scoped swipe handling on the game stage so touch input reuses the existing `player:direction:set` transport.
- Kept sound behavior client-side and unchanged in principle; touch interactions now also attempt audio unlock.
- QA mobile overflow follow-up: phone gameplay now keeps phone-sized devices in explicit mobile modes even after rotation, resets scroll when entering the gameplay screen, and constrains phone-landscape board sizing by viewport height so the board remains visible and usable in both portrait and landscape.

## Implementation details
- Follow-up defect fix: room-code copy previously depended only on `navigator.clipboard.writeText`, which can fail in insecure contexts, embedded browsers, or permission-blocked sessions even when the UI is otherwise functional. The client now falls back to a hidden textarea + `document.execCommand('copy')` path and shows a manual-copy hint if both approaches fail.
- Introduced `requestDirection(direction, source)` so keyboard, swipe, and on-screen buttons converge on one path.
- Added a light local direction prefilter against the current/pending direction to avoid sending obvious instant-reverse inputs while still relying on server validation as the source of truth.
- Applied `touch-action: none` only to `.game-stage` while touch controls are active, leaving the rest of the page scroll-friendly.
- Added on-screen directional controls directly below the board area so thumbs stay close to gameplay on phones.
- Used root `data-layout-mode`, `data-orientation`, and `data-touch` attributes plus media queries to differentiate tablet vs phone portrait vs phone landscape layouts.
- Tightened `getLayoutMode()` to classify touch-first phone-sized devices by short-edge/long-edge instead of raw width alone, which prevents rotated phones like `844x390` from falling into the oversized tablet treatment.
- Updated `showScreen('gameplay')` to reset window/panel scroll so the board returns to the top of the active viewport after readying up instead of inheriting lobby scroll position.
- Reduced `mobile-landscape` gameplay padding and capped the board stage with `100dvh`-based sizing so surrounding HUD/cards compress before the board overflows upward.

## Verification
- `node --check public/app.js`
- `npm test`
- `npm run build`

## Deviations from architecture notes
- Touch controls are shown in `game-over` for touch-preferred/gameplay layouts so the layout stays stable through rematch/result states, but the directional buttons are disabled unless the phase is `starting` or `in-progress`.
- Subtask linking via the documented REST endpoint was not accepted by the GitHub API/token in this environment, so the implementation subtask tracks the parent in its body/title instead of a nested GitHub sub-issue relationship.
