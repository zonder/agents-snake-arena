# Lobby clarity / polish pass — dev notes

## Round-2 redesign implementation summary
- Reworked the lobby to follow the approved **round-2 Fight Poster direction**.
- Implemented the UX brief's recommended hybrid:
  - **Concept B — Fight Poster** as the primary structure and visual tone
  - **Concept A — Scoreboard Showdown** room-code clarity via oversized split ticket digits
  - **Concept C — Ready Room Channel** style live-guidance copy for the next-step panel
- Kept the existing room/lobby/game socket flow and server-authoritative state machine intact.
- Preserved reconnect clarity, duplicate-name handling, ready/unready behavior, countdown handoff, and mobile responsiveness.
- Kept motion lightweight and CSS-only, with the existing `prefers-reduced-motion` protection still in place.

## What changed in app code
- Replaced the earlier lobby shell with a more theatrical poster-style composition:
  - large poster hero block
  - launch ring status module
  - ticket-style room-code card
  - dedicated live-guidance card
  - clearer red-corner / blue-corner readiness cards
- Updated client-side lobby presentation derivation so each room state now drives:
  - poster callout text
  - launch ring label/state
  - ticket helper copy
  - live-guidance messaging
- Added client rendering for giant room-code digits so the code reads as a featured object instead of a small label/value pair.
- Shifted player cards from a generic readiness rail to corner-themed matchup cards while preserving the same underlying player data and status rules.

## Notes on contracts
- No new Socket.IO events or room lifecycle phases were added.
- The optional `nextStep` / `shareHint` payload additions remain unnecessary for this pass because the client-side presentation layer still cleanly derives the required copy from existing lobby state.
