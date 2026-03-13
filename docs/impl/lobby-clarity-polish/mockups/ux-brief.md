# Lobby clarity polish — UX brief

## Goal
Reset the lobby away from the current poster / fight-card direction and re-ground it as a **clean pre-match staging space**.

The new direction should make four things obvious within a second or two:
1. the room code
2. who is in the room
3. who is ready
4. what happens next

## What changed from stakeholder feedback
This round intentionally removes the visual ideas that the stakeholder called out as not working:
- no fight-poster metaphor
- no “fight poster live” treatment
- no “blue corner” framing or naming
- less theatrical presentation overall
- more clarity-first layout and copy

## Design principles
- **Room code first:** this is the primary artifact users need to act on.
- **Player state second:** names and ready states should be legible and low-friction.
- **One clear next step:** the lobby should always explain the current blocker or next action.
- **Branded, not noisy:** restrained retro-arcade feel through color, glow, emblem, and subtle scanline texture.
- **Same shell, multiple states:** created, full, reconnect, and countdown states should feel like one coherent system.
- **Mobile-aware by default:** desktop can show side-by-side panels; mobile should stack without hiding key guidance.

## Concepts explored

### Concept A — Mission Control
A room-centric staging dashboard with:
- large room-code hero
- persistent “what happens next” guidance
- separate player-status panel
- clear primary CTA for readiness

**Pros**
- strongest information hierarchy
- easiest to understand at a glance
- cleanest path to responsive mobile stacking
- least likely to drift back toward the rejected poster/fight-card feel

**Cons**
- depends on good motion polish and copy to avoid feeling too plain

### Concept B — Dual Ready Lanes
A symmetric two-player layout with a shared top strip for room info.

**Pros**
- very strong ready-state comparison
- well matched to a 2-player game
- visually balanced

**Cons**
- can drift closer to a versus framing if pushed too far
- gives less space to process/help copy on smaller screens
- slightly higher risk of echoing the rejected visual direction structurally

### Concept C — Status Rail
A utility-forward design with a persistent side rail for room code, steps, and reconnect messaging.

**Pros**
- handles reconnect/reserved-slot states especially well
- keeps guidance persistent
- strong operational clarity

**Cons**
- the least lively of the three
- more vertical overhead on mobile
- may feel more like a system console than a game lobby

## Recommendation
**Recommend Concept A — Mission Control.**

It best matches the stakeholder request for a lobby that is:
- cleaner
- simpler
- easier to understand
- still branded in a restrained retro-arcade way
- explicitly not poster-based

It also gives the clearest path for implementation because the hierarchy is stable across all required states:
- created room / waiting for second player
- both players present, not both ready
- reconnect / reserved-slot waiting
- about-to-start / countdown handoff

## Recommended interaction model
- Keep the room code in a large hero block near the top.
- Keep helper actions adjacent to the code: copy, share, invite.
- Present players as simple status rows/cards rather than character “corners” or versus framing.
- Use a single helper message that updates based on state:
  - “Share the code to invite a second player.”
  - “Waiting on Jordan to ready up.”
  - “Jordan has 22s to reconnect.”
  - “Match starts in 3…”
- Use a short step list for orientation so the lobby always answers “what happens next?”

## Visual direction notes
- Use the existing dark navy / cyan / green language from the product.
- Keep the emblem/brand presence small and confident rather than central and theatrical.
- Reserve bright color for state meaning:
  - green = ready / starting
  - amber = waiting / not ready
  - rose = offline / reconnect attention
- Motion should be subtle and purposeful:
  - soft pulse on ready state
  - gentle countdown emphasis
  - smooth board handoff
- Avoid oversized decorative framing that competes with room code or player clarity.

## Copy direction
Preferred tone:
- short
- direct
- calm
- game-aware, but not announcer-style

Examples:
- “Share this code with the second player.”
- “Match starts automatically when both players are ready.”
- “Slot reserved for Jordan for 22 seconds.”
- “Both players ready. Starting match…”

Avoid:
- combat-announcer language
- poster headlines
- corner labels
- lore-heavy setup text in the lobby

## Deliverables in this mockup set
- `overview.html` — 3 concept directions
- `states.html` — recommended concept across key lobby states
- `ux-brief.md` — rationale and recommendation
