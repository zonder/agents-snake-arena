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


## Follow-up fix: created-room poster looked stretched/corrupted
- Reproduced the stakeholder report on build `v0.1.0+b4d4d14`: the host-created room state showed a large empty block inside the left fight-poster column, which made the lobby read as visually broken.
- Root cause: the new two-column `.lobby-poster-shell` grid was stretching its left poster card to the full row height instead of letting it size to its own content, so the waiting-for-player-two state exposed a tall dead area under the launch ring.
- Fix: set the poster shell to `align-items: start` so both columns keep their intrinsic content height and the created-room lobby composes as a compact, intentional poster + command stack instead of a stretched panel.
- Verified with a fresh local host-created-room screenshot before/after, then reran automated checks.

## Follow-up fix: desktop live-guidance card + room-code balance
- Reproduced the current desktop regression from stakeholder feedback on the redesign branch: the **Live guidance** area looked corrupted because its three flow steps were still rendered as three equal-width columns inside the narrow right-hand poster rail, forcing the copy into cramped micro-columns and awkward line wraps.
- Root cause: the round-2 redesign reused the global three-column `.lobby-flow-steps` treatment even after moving that module into the poster sidebar, where the available desktop width is much smaller than the original full-width flow card.
- Secondary issue: the ticket-style room-code digits were still sized for the earlier louder treatment, so in the desktop sidebar they felt oversized relative to the rest of the poster stack.
- Fix:
  - stack the live-guidance steps vertically inside `.lobby-guidance-card` so each step gets full readable width on desktop and mobile alike
  - reduce desktop ticket-digit min width / font size / padding so the room code stays prominent without overpowering the sidebar
- Preserved the poster-shell structure, launch ring emphasis, reconnect messaging, duplicate-name handling, ready/countdown flow, and mobile responsiveness.

## Feedback round: help popup + compact room-code module
- Moved the inline **Live guidance** content into a dedicated lobby help popup so the main poster layout stays cleaner while the same guidance remains one tap/click away.
- Slimmed the desktop room-code module down to a lighter **Room code** ticket with the code itself plus the relevant action buttons (`Copy code`, `How it works`) instead of the heavier inline guidance stack.
- Preserved the poster-shell direction, reconnect messaging, duplicate-name handling, ready CTA/countdown flow, and mobile usability by keeping the same client-side presentation derivation and reusing it inside the popup.

## Follow-up fix: created-room lobby still too huge on desktop
- Reproduced the latest stakeholder complaint against the branch layout: the host-created room state still felt oversized on desktop because the fight-poster shell consumed a full-width first row and the player cards plus ready panel each stacked below it as separate full-width rows.
- Root cause: even after earlier sidebar cleanup, the desktop composition was still spending too much vertical space on decorative poster scale (large launch ring, roomy ticket digits, tall cards) and on single-column stacking, so the host-only lobby routinely pushed core controls below the fold.
- Fix:
  - convert the desktop lobby shell into a two-column dashboard where the poster spans the top row, then the player corners sit beside the ready panel instead of below another full-width block
  - tighten the poster shell proportions, launch ring, room-code ticket digits, and desktop card padding/min-heights so the created-room state reads as intentional without dominating the viewport
  - keep the mobile breakpoint on the existing one-column stack so phone usability remains unchanged
- Preserved reconnect clarity, duplicate-name handling, ready/unready semantics, countdown handoff, and mobile responsiveness because this pass only rebalanced presentation-layer CSS.

