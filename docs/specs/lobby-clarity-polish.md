# Feature Spec: Lobby Clarity / Polish Pass

## Status
Draft for stakeholder approval

## Feature Summary
As a player, I want the lobby to feel cleaner, more branded, and easier to understand so I immediately know who is here, what to do next, and how the match will start.

## Scope
In scope for this feature:
- lobby layout polish
- clearer visual hierarchy
- stronger retro-arcade branding in the lobby
- a proper logo/emblem area in the lobby
- clearer room-code presentation
- clearer player-name and ready-state presentation
- clearer “what happens next” guidance
- improved waiting/share/ready copy
- subtle lobby animation and decorative elements

Out of scope for this feature:
- gameplay rules changes
- full brand redesign across the whole app unless needed to support lobby consistency
- final bespoke illustration/logo asset pipeline beyond MVP implementation

## Stakeholder Decisions Captured
- Main goal is **all of the above**: cleaner hierarchy, clearer status, stronger branding, and better understanding.
- The lobby should include a **proper visual logo area / emblem**.
- The most important lobby information should be:
  - room code
  - player names
  - ready status
  - what happens next
- The lobby CTA should clearly support all of:
  - share this code
  - wait for second player
  - mark ready
  - both players must be ready
- Visual style should follow the current **retro arcade** direction.
- Scope should include:
  - layout
  - branding
  - copywriting
  - subtle animation
- Decorative treatment should use **lightweight decorative elements only**.

## Assumptions
- The lobby should remain readable and fast, not overly busy.
- The logo/emblem can be implemented as an MVP-styled visual brand treatment without requiring final design-asset production.
- Subtle animation should support clarity and energy, not distract from key information.
- The lobby should continue to work well on desktop and mobile.

## User Scenarios

### Scenario 1: Understand the room immediately
**As a player**, I want to understand the lobby at a glance so I know what room I’m in, who is here, and what I should do next.

#### Expected behavior
- The room code is prominent.
- The current players are easy to identify.
- Ready state is obvious.
- The next required action is clear.

### Scenario 2: Share and fill the room easily
**As a player**, I want the lobby to help me invite the second player so I can get into the match quickly.

#### Expected behavior
- The room code is clearly presented for sharing.
- The waiting state is understandable.
- The UI makes it obvious when the second player has not joined yet.

### Scenario 3: Feel the game’s identity before the match starts
**As a player**, I want the lobby to feel polished and branded so the game has personality before gameplay begins.

#### Expected behavior
- The lobby includes a clear visual brand/logo area.
- The presentation matches the retro arcade style.
- Decorative elements and subtle motion add energy without clutter.

## Functional Requirements
1. The lobby must present a clearer visual hierarchy.
2. The lobby must include a stronger retro-arcade brand treatment.
3. The lobby must include a proper logo/emblem area.
4. The room code must be prominently displayed.
5. Player names must be clearly displayed.
6. Ready status must be clearly displayed.
7. The lobby must communicate what happens next.
8. The lobby copy must better support room sharing, waiting, and ready flow.
9. The lobby must include subtle animation or motion polish.
10. Decorative elements should remain lightweight and must not reduce clarity.
11. The lobby must remain usable on both desktop and mobile.

## Non-Functional Requirements
- The lobby should feel cleaner and easier to understand than the current baseline.
- Branding/polish should stay aligned with the current retro arcade direction.
- The lobby must remain readable and performant.
- Changes should not regress existing mobile support, reconnect flow, names, or ready logic.

## Edge Cases
- A player is alone in the lobby waiting for the second player.
- Both players have joined but one is not ready.
- Both players have the same name.
- A reconnect/disconnect status appears while in the lobby.
- Smaller mobile viewports still need strong room-code and CTA clarity.

## Acceptance Criteria
1. The lobby is visually cleaner and easier to understand than the current version.
2. The lobby prominently shows the room code.
3. The lobby clearly shows player names and ready states.
4. The lobby clearly communicates what the next step is.
5. The lobby includes a branded retro-arcade logo/emblem area.
6. Sharing/waiting/ready copy is clearer and more helpful.
7. Subtle animation and decorative elements improve feel without hurting clarity.
8. The improved lobby works on both desktop and mobile.

## Open Notes for Implementation
- Prioritize information clarity first, then polish.
- The lobby should feel like a confident pre-match staging area rather than a plain waiting screen.
