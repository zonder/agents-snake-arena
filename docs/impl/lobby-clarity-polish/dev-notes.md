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

## Feedback round: simplify main lobby copy
- Reduced main-lobby copy so the room stays focused on the essentials: branding, room code, players, ready state, and a single clear next-step area.
- Moved the primary dynamic next-step text into the action panel and removed the extra poster subtitle plus the per-player explanatory paragraph from the main layout.
- Tightened state-driven copy in `deriveLobbyPresentation()` so the main view uses shorter labels while the help popup keeps the fuller guidance and flow summary.
- Preserved reconnect visibility by keeping reconnect-specific status text on the main poster only when it matters, while duplicate-name handling, ready semantics, countdown handoff, and mobile layout remain unchanged.

## Feedback round: remove Fight Poster widget from live lobby
- Applied stakeholder feedback to drop the live **Fight Poster** treatment instead of trying to salvage it.
- Rebalanced the lobby shell around a cleaner branded header + status layout:
  - replaced the poster hero framing with a simpler `Snake Arena lobby` hero panel
  - converted the oversized launch-ring callout into a smaller **Stage** status indicator card so countdown / ready / reconnect states still read clearly without dominating the page
  - kept the compact room-code module and help popup so the code, invite flow, and next-step guidance stay easy to reach
- Updated lobby copy to remove poster-specific language (`Fight poster`, `ticket`, `poster hold`, etc.) in favor of clearer room / lobby wording.
- Preserved the existing client-side state derivation and all underlying room behavior:
  - reconnect reservation clarity still comes from the authoritative reconnect payload
  - duplicate-name handling still uses the existing display-name logic
  - ready/unready and countdown flow still use the same `lobby:state` / `game:countdown` transitions
  - mobile layout remains a stacked single-column composition under the existing responsive breakpoints

## Feedback round: remove remaining Fight Poster Live treatment
- Addressed the latest stakeholder note to drop the lingering **Fight Poster Live** feel from the shipped lobby, not just the earlier copy references.
- Simplified the live lobby presentation layer again so it reads like a branded staging screen instead of an event poster:
  - converted the stage callout from a large circular launch ring into a calmer rectangular status panel
  - removed the remaining ticket-style room-code framing and added an inline room-code hint so sharing/reconnect guidance stays explicit without the poster metaphor
  - renamed the player-grid presentation hooks away from poster-specific structure while keeping the same responsive two-card / one-column behavior
- Kept the core lobby flows intact: room code visibility, player list/readiness, reconnect guidance, duplicate-name handling, next-step prompts, and mobile stacking still rely on the same client-side state derivation.

## Round-3 redesign implementation summary
- Reworked the live lobby to follow the approved **round-3 Mission Control** direction from the updated non-poster mockups.
- Implemented **Concept A — Mission Control** directly rather than the older poster/fight-card hybrids.
- The shipped layout now emphasizes:
  - a compact branded Mission Control hero/status header
  - a room-code command card with adjacent help/copy actions
  - a persistent in-layout “What happens next” step rail
  - simpler player cards labeled by player slot instead of corner/poster framing
  - a clearer bottom action panel for the current next step and ready CTA
- Preserved room-code clarity, duplicate-name handling, reconnect guidance, mobile stacking, ready/countdown handoff, and reduced-motion-safe CSS polish.

## Review cycle 3 follow-up fixes
- Restored the approved in-shell Mission Control countdown handoff by keeping `starting` on the lobby shell until the actual `game:start` transition, instead of flipping straight to the gameplay panel during `lobby:state` / `game:state` / `game:countdown` updates.
- Wired `#lobbyHeroSubtitle` back into `renderLobby()` so reconnect, ready-check, and countdown states now show their derived state-specific guidance instead of the stale default subtitle.
- Kept the scope limited to presentation/rendering behavior; no room-state contracts or server events changed.
