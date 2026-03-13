# Code Review — Cycle 3

**PR:** #102  
**Parent issue:** #99  
**Branch:** `feature/issue-98`  
**Latest implementation commit reviewed:** `4c3d376`  
**Verdict:** CHANGES_REQUESTED

## Review focus
- Whether the updated lobby now materially matches the approved round-3 **Mission Control** direction
- Whether room-code clarity, player/ready-state clarity, next-step guidance, reconnect/name/mobile behavior, and reduced-motion safety are preserved

## Summary
This round is much closer to the approved non-poster direction than the earlier poster/fight-card implementation. The shipped layout now reads as a cleaner staging dashboard, the player cards and readiness badges are clearer, and the reconnect / flow messaging remains grounded in the existing lobby state.

However, I found **two implementation gaps that are material against the approved round-3 UX**:
1. the countdown / about-to-start state does **not** remain inside the Mission Control shell as approved, because `renderLobby()` switches straight to the gameplay screen for `starting`
2. the state-specific hero subtitle copy is derived but never rendered, so reconnect / ready-check / countdown states keep showing the default static subtitle instead of the approved context-aware guidance

Because those gaps affect the approved “same shell across states” and “one clear next step” goals, I’m marking this cycle **CHANGES_REQUESTED**.

## What is aligned well
- **Non-poster reset:** The current UI is materially away from the rejected poster / corner framing. It now reads like a control surface rather than a fight card.
- **Mission Control hierarchy:** The room-code card, persistent “what happens next” module, player status section, and single action panel match the approved concept direction well.
- **Player / ready clarity:** Player names, slot labels, `You` treatment, and status badges are easier to scan than the prior rounds.
- **Reconnect safety:** Reserved / offline states remain explicit, with dedicated copy and color treatment rather than being buried in generic lobby text.
- **Mobile / motion discipline:** The layout has explicit stacking rules under the responsive breakpoints, and the ambient motion is disabled under `prefers-reduced-motion`.

## Blocking findings

### 1. Countdown handoff does not stay in the approved Mission Control shell
**Why it matters**
The approved round-3 `states.html` specifically shows the countdown / about-to-start state as the **same Mission Control layout flexing into countdown handoff**, not an immediate jump away from the lobby shell.

**What the code does now**
In `public/app.js`, `deriveLobbyPresentation()` defines a `starting` presentation, but `renderLobby()` treats `starting` as `gameplayFocused` and immediately calls:
- `applyPhaseTheme(...)
- `showScreen('gameplay')`

That means the new lobby countdown state is never actually shown in the updated Mission Control layout.

**Impact**
- The approved “same shell, multiple states” behavior is not fully implemented
- The handoff is still more abrupt than the approved UX intended
- The new countdown-specific Mission Control copy/UI work is partially bypassed

**Requested fix**
Keep the lobby shell visible for the approved countdown handoff state, or otherwise implement an equivalent in-shell transition that preserves the Mission Control framing through `starting`.

### 2. State-specific hero subtitle is never rendered
**Why it matters**
The approved UX depends on calm, state-aware guidance. `deriveLobbyPresentation()` correctly derives different `heroSubtitle` values for waiting, reconnect, ready-check, and starting, but the DOM never receives those updates.

**What the code does now**
`public/index.html` includes:
- `#lobbyHeroSubtitle`

But `public/app.js` never queries or updates that element in `renderLobby()`.

**Impact**
The hero block keeps the default static subtitle even when the state changes, which creates misleading or stale guidance during the exact states that round 3 was supposed to clarify most:
- reconnect hold
- ready check
- match starting

**Requested fix**
Wire `#lobbyHeroSubtitle` into `renderLobby()` and update it from `presentation.heroSubtitle` alongside the other derived Mission Control labels.

## Validation performed
- `npm ci`
- `npm test` ✅ (19 tests passing)
- `npm run build` ✅

## Verdict
**CHANGES_REQUESTED** — the overall direction is now materially aligned with the approved non-poster Mission Control concept, but the countdown handoff and stale hero-subtitle rendering still leave the implementation short of the approved state model and guidance clarity.
