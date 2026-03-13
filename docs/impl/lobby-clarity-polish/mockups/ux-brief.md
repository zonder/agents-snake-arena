# UX Brief — Lobby Redesign Options for Issue #99

## Context
Parent issue: #99  
Feature slug: `lobby-clarity-polish`  
Working branch: `feature/issue-98`

The stakeholder’s feedback is that the current lobby changes are **not clear enough** and they want a **fuller lobby redesign** to review before more implementation happens.

I grounded these mockups in the current app structure and behaviors:
- 4-letter room code remains core
- lobby states already include waiting, ready, starting, and reconnect flows
- the app already uses a retro-arcade visual language
- desktop and mobile responsiveness are required
- the lobby currently transitions straight into gameplay/countdown once both players are ready

## What’s included
Files in this folder:
- `overview.html` — side-by-side concept comparison with desktop/mobile frames
- `states.html` — key lobby states shown across all concept directions
- `ux-brief.md` — this summary and recommendation

## Shared design principles across all concepts
No matter which concept is chosen, the redesign should preserve these UX priorities:

1. **Room code is the primary object**
   - it should be visible above the fold
   - it should be copyable without hunting
   - it should explain why it matters: invite / share / join

2. **Player roster must be legible instantly**
   - clear names
   - obvious “you” marker
   - obvious ready / not-ready / reconnecting status
   - empty slot should look intentional, not broken

3. **“What happens next” must be explicit**
   - waiting for second player
   - both players must ready up
   - match auto-starts when both are ready
   - reconnect state should explain the timer / reserved slot behavior

4. **Logo / emblem area should feel deliberate**
   - not just a heading
   - should help the lobby feel like a branded pre-match space

5. **Mobile cannot be a squeezed desktop**
   - room code still needs to stay prominent
   - CTA should remain thumb-reachable
   - copy should stay short and directive

---

## Option summaries

### Concept A — Mission Control
**Summary:** clarity-first staging area.

**Strengths**
- clearest information hierarchy
- easiest to understand for new players
- strongest direct explanation of the flow
- easiest to implement on top of the current structure
- likely safest for mobile

**Trade-offs**
- most conservative visually
- could feel less “wow” than the stakeholder may want if the emblem area stays too restrained

**Best if:** the stakeholder’s top concern is usability and they want a redesign that is visibly improved without taking major visual risks.

---

### Concept B — Arena Cabinet
**Summary:** cabinet-like pre-match chamber with center-stage countdown preview.

**Strengths**
- strongest retro-arcade identity
- best continuity between lobby and gameplay
- countdown / “about to start” state feels exciting and intentional
- feels like a bigger redesign, not just polish

**Trade-offs**
- needs careful balance so the center stage does not compete with room-code prominence
- more layout complexity, especially on mobile
- easiest concept to over-style

**Best if:** the stakeholder explicitly wants the lobby to feel much more like a pre-fight arcade scene and wants the redesign to read as substantial.

---

### Concept C — Neon Marquee
**Summary:** branding-first lobby with marquee/header emphasis and poster-like structure.

**Strengths**
- strongest logo/emblem opportunity
- most visually distinct from the current lobby
- good for giving the product a memorable branded pre-match identity

**Trade-offs**
- typography and copy hierarchy must be very disciplined
- risk that the marquee becomes louder than the room code or player state
- slightly less literal about next-step flow unless paired with explicit copy blocks

**Best if:** the stakeholder wants the lobby to feel more branded and showpiece-driven, with a stronger “arcade event” tone.

---

## Recommendation
**Recommended direction: Concept B — Arena Cabinet, borrowing Concept A’s explicit next-step guidance.**

Why:
- The stakeholder asked for a **fuller redesign**, not just incremental cleanup.
- Concept B most clearly delivers that bigger step-change while still matching the game’s retro-arcade direction.
- It gives the lobby a stronger identity and makes the countdown/start transition feel more exciting.
- It can still preserve clarity if we import two specific behaviors from Concept A:
  1. a concise “what happens next” explainer block
  2. very explicit player readiness labels and reconnect messaging

### Recommended hybrid direction
If implementation proceeds, I’d suggest:
- **Use Concept B’s overall layout** (cabinet / center stage / side information columns)
- **Use Concept A’s copy model** for room instructions and step explanation
- **Use Concept C’s stronger marquee/logo treatment** only if it doesn’t push the room code out of first place

That hybrid would likely satisfy the stakeholder’s desire for a fuller redesign **without sacrificing clarity**.

---

## Specific UI guidance for implementation

### 1. Make the room code impossible to miss
- large display in the top zone or center-stage header
- support both “Copy code” and potentially “Share invite” actions
- pair with one line of explanatory copy

### 2. Keep the player states literal
Preferred labels:
- `Ready`
- `Not ready`
- `Waiting for player`
- `Reconnecting`
- `You`

Avoid vague labels like:
- `Active`
- `Pending`
- `Stand by`

### 3. Reserve space for the countdown state
Even before both players are ready, the layout should hint where the countdown/game launch appears. This helps the lobby feel like part of the match flow instead of a disconnected screen.

### 4. Reconnect state should be visually different from normal waiting
It should not look the same as “waiting for second player.”
Use:
- warning or alert styling
- specific player name
- visible timer / reserved-slot copy

### 5. Mobile layout priorities
On mobile, the order should be:
1. logo/emblem header
2. room code
3. current status / next-step message
4. player cards
5. primary CTA
6. secondary actions

---

## Suggested stakeholder decision prompt
When PM shares these, the cleanest choice prompt is:

1. Which overall direction feels closest: **A / B / C**?
2. Do you want the final lobby to lean more toward:
   - **maximum clarity**
   - **maximum arcade personality**
   - **balanced hybrid**
3. Is the logo/emblem area strong enough, or should it become even more prominent?

---

## Final take
If the goal is to convince the stakeholder that the redesign is meaningfully bigger and more intentional than the current pass, **Concept B** is the strongest lead option.

If the goal is to minimize risk and prioritize clearest UX, **Concept A** is the safest choice.

If the goal is strongest branding/showmanship, **Concept C** is the boldest option.
