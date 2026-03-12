# Feature Spec: Mobile Support

## Status
Draft for stakeholder approval

## Feature Summary
As a player, I want the game to work well on phones and tablets in both portrait and landscape so that I can create/join rooms and play smoothly on mobile devices.

## Scope
In scope for this feature:
- responsive layout for phone and tablet screens
- support for both portrait and landscape orientations
- portrait-preferred gameplay presentation
- mobile-friendly create/join/lobby/game/rematch/result flow
- touch controls via swipe input
- touch controls via on-screen directional buttons
- mobile-oriented spacing, button sizing, and interaction polish
- preserving current sound behavior on mobile

Out of scope for this feature:
- native mobile apps
- app store packaging
- offline support
- device-specific haptics unless explicitly added later
- fullscreen/install prompts unless added during implementation as minor polish

## Stakeholder Decisions Captured
- Mobile should support both portrait and landscape.
- Portrait is the preferred orientation.
- Controls should support both swipe and on-screen buttons.
- The full flow should be mobile-friendly: create/join, lobby, gameplay, rematch, and result.
- Sound behavior should remain the same as desktop.
- Scope should include responsive layout plus mobile-specific polish.
- Tablet support is included.

## Assumptions
- Desktop support must remain intact.
- Portrait-preferred means the most optimized experience is portrait, but landscape should still be usable.
- Swipe and on-screen controls should coexist without conflicting with current keyboard support.
- Mobile polish should improve tap comfort, readability, and board visibility without changing gameplay rules.

## User Scenarios

### Scenario 1: Use the app on a phone in portrait
**As a mobile player**, I want the game to fit naturally on my phone in portrait mode so I can create/join and play without awkward layout problems.

#### Expected behavior
- Entry, lobby, gameplay, and rematch screens fit a phone viewport.
- Key controls and information remain readable and reachable.
- The board remains visible and prioritized.

### Scenario 2: Play in landscape when needed
**As a mobile player**, I want landscape support so I can still play comfortably if I rotate my device.

#### Expected behavior
- The layout adapts when orientation changes.
- Core information and controls remain usable.
- The board remains visible and playable in landscape.

### Scenario 3: Use touch controls naturally
**As a mobile player**, I want intuitive touch controls so I can steer without a keyboard.

#### Expected behavior
- Swipe input can control direction changes.
- On-screen directional controls are also available.
- Input remains responsive and respects the existing no-instant-reverse rules.

### Scenario 4: Complete the whole game loop on mobile
**As a mobile player**, I want the full experience to work on my device so I can go from room creation to rematch without switching devices.

#### Expected behavior
- Create/join works cleanly on small screens.
- Lobby and ready state are readable and tappable.
- In-game UI, rematch CTA, and result screens remain usable on mobile.

## Functional Requirements

### Responsive layout
1. The UI must support phone and tablet layouts.
2. The UI must support both portrait and landscape orientations.
3. Portrait orientation should receive the preferred/most optimized layout.
4. Entry, lobby, gameplay, result, and rematch screens must all adapt responsively.
5. Responsive behavior must preserve the current board-first layout priority.

### Mobile interaction polish
6. Tap targets must be comfortably usable on touch devices.
7. Spacing, sizing, and typography should be adapted for smaller screens.
8. Important controls and status information must remain visible and readable on mobile.
9. Mobile polish must not reintroduce board displacement/jumping issues.

### Touch controls
10. The game must support swipe controls on touch devices.
11. The game must support on-screen directional buttons.
12. Swipe and on-screen controls must work with the existing gameplay input model.
13. Touch controls must respect the same direction validity rules as keyboard controls.
14. Touch controls must not permit instant reverse movement if keyboard controls do not.

### Full mobile flow
15. Room create/join flows must be usable on mobile.
16. Lobby ready/unready interactions must be usable on mobile.
17. Gameplay HUD and player information must remain usable on mobile.
18. Result/rematch interactions must remain usable on mobile.
19. Tablet layouts should use available space effectively without breaking the visual system.

### Sound behavior
20. Mobile sound behavior should remain aligned with the current desktop approach.
21. If browser interaction is required to unlock sound, mobile should follow the same unlock pattern gracefully.

## Non-Functional Requirements
- Mobile support must preserve current gameplay rules and server behavior.
- Input responsiveness should remain suitable for real gameplay on touch devices.
- Responsive/mobile changes must not regress the desktop experience.
- The experience should remain legible and stable across common phone and tablet sizes.

## Edge Cases
- Orientation changes mid-session or mid-round.
- Swipe gestures near page edges or on devices with browser UI overlays.
- On-screen controls overlapping important game UI on small screens.
- Sound unlock differences across mobile browsers.
- Tablet layouts that accidentally feel like stretched phone layouts instead of intentional responsive designs.

## Acceptance Criteria
1. The game is usable on phones and tablets.
2. The game supports both portrait and landscape orientations.
3. Portrait provides the preferred mobile experience.
4. The full product flow works on mobile: create/join, lobby, game, result, and rematch.
5. Players can control the snake via swipe input.
6. Players can control the snake via on-screen directional controls.
7. Mobile layouts preserve readable UI and a board-first presentation.
8. Mobile support preserves current sound behavior and current gameplay rules.
9. Desktop behavior remains intact after the mobile support changes.

## Open Notes for Implementation
- If both swipe and on-screen controls are present at once, implementation should ensure they feel complementary rather than redundant or cluttered.
- Responsive design should prioritize practical playability over strict visual symmetry.
