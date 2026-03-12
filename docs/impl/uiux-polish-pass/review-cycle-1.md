# UI/UX Polish Pass — Review Cycle 1

## Verdict
CHANGES_REQUESTED

## What I reviewed
- PR #28 against `docs/impl/uiux-polish-pass/spec.md`
- Architecture/design in `docs/impl/uiux-polish-pass/design.md`
- API guidance in `docs/impl/uiux-polish-pass/api-contracts.md`
- Frontend changes in `public/index.html`, `public/styles.css`, and `public/app.js`
- Validation run: `npm ci`, `npm test`, `npm run build`

## What looks good
- The retro-arcade visual system is coherent across entry, lobby, gameplay, and post-game states.
- The board remains the visual anchor and the new `game-stage` / overlay structure is aligned with the board-first layout requirement.
- Reduced-motion handling is present in both CSS and board rendering.
- Audio is browser-safe: first-interaction unlock, local persistence, and silent failure behavior are implemented.
- The implementation keeps the existing socket contracts intact and uses transition-driven effects rather than changing gameplay rules.

## Findings

### 1. Countdown pulse/audio can fire twice for the same countdown value
**Severity:** Medium
**Why it matters:** The design/API docs explicitly require countdown effects to fire once per countdown value and to avoid duplicate replays on repeated or overlapping updates. Right now the client triggers countdown FX from both `game:countdown` and `game:state`, but it only de-duplicates within each stream, not across them.

**Where:**
- `public/app.js:107-114` (`socket.on('game:countdown', ...)`)
- `public/app.js:500-505` (`applyGameTransitionEffects`)

**What happens:**
- The server emits both `game:countdown` and `game:state` during countdown progression (see `src/server/__tests__/roomService.test.ts`).
- `game:countdown` calls `triggerCountdownStep(...)`.
- Then `game:state` can call `applyGameTransitionEffects(...)`, which calls `triggerCountdownStep(...)` again for the same `countdownSecondsRemaining` value.
- Result: duplicate pulse/sound on the same visible countdown step, which makes the polish feel noisy and violates the intended transition gating.

**Required fix:**
- Centralize countdown de-duplication across both event sources.
- Keep a single last-rendered countdown value (or last FX key) and only trigger the overlay/audio when that global value changes.
- After the fix, `3`, `2`, `1`, and `GO` should each animate/play once even if both socket events arrive for the same step.

## Recommended follow-up validation
- Start a round and confirm each countdown step (`3`, `2`, `1`, `GO`) produces exactly one visual pulse and one sound cue.
- Re-check reduced-motion behavior after the de-duplication change to ensure the shortened countdown overlay still clears correctly.

## Validation notes
- `npm ci` ✅
- `npm test` ✅ (16 tests passed)
- `npm run build` ✅
