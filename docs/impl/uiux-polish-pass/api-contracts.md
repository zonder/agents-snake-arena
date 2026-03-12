# UI/UX Polish Pass — API Contracts

## Contract stance
This feature should be implemented primarily with the **existing client/server contracts**. The current Socket.IO payloads already contain enough information to support the required polish if the frontend adds transition detection and local presentation state.

Preferred approach:
- **no breaking changes** to current event names or required payload fields
- **no gameplay contract changes** required for MVP polish
- optional additive client-side metadata only if the implementation agent finds a clear need

---

## Existing contracts to preserve
Source of truth: `src/shared/contracts.ts`

### Room/lobby events
- `room:created`
- `room:joined`
- `room:error`
- `lobby:state`
- `player:left`

### Gameplay events
- `game:countdown`
- `game:start`
- `game:state`
- `game:ended`
- `game:rematch-state`
- `room:closed`

### Client emit events
- `room:create`
- `room:join`
- `player:ready:set`
- `player:direction:set`
- `game:rematch-request`

These should remain stable unless a strictly additive improvement is justified.

---

## UI needs mapped to current payloads

## 1. Lobby polish
Use existing `LobbyStatePayload` fields:
- `roomCode`
- `phase`
- `players`
- `occupiedCount`
- `allPlayersPresent`
- `allReady`
- `canStart`
- `message`
- `rematch`

These support:
- polished room-code display
- player slot styling
- ready/not-ready visual states
- waiting-for-player messaging
- lobby emphasis when both players are present / all-ready

No API change required.

## 2. Countdown emphasis
Use existing countdown/game fields:
- `GameCountdownPayload.secondsRemaining`
- `GameCountdownPayload.startsAt`
- `GameCountdownPayload.serverNow`
- `PublicGameStatePayload.countdownSecondsRemaining`
- `phase`

These support:
- countdown overlay text
- pulse/glow per countdown step
- optional synchronized timing based on server timestamps

No API change required.

## 3. Scoreboard polish and score delta feedback
Use existing game-state fields:
- `snakes[n].score`
- `snakes[n].alive`
- `tickNumber`
- `phase`

The frontend can compare previous vs next payloads to detect score increases and trigger score-pop animations and food sounds.

No API change required.

## 4. Collision flash / round-end result styling
Use existing result fields:
- `GameEndedPayload.result.bySlot`
- `GameEndedPayload.result.winnerSlotIndex`
- `GameEndedPayload.result.deathReasons`
- `PublicGameStatePayload.result`
- `phase === 'game-over'`

The frontend can derive win/lose/draw theme and round-end flash behavior from the transition to `game-over`.

No API change required.

## 5. Rematch/result CTA states
Use existing rematch fields:
- `RematchView.available`
- `RematchView.status`
- `requestedBySlot`
- `requestedByYou`
- `waitingForOtherPlayer`
- `bothAccepted`
- `eligiblePlayerCount`
- `GameRematchStatePayload.message`

These support polished waiting/accepted/incoming states for side-card and banner CTA treatments.

No API change required.

## 6. Audio triggers
Audio should be driven by client-side state transitions and user interactions, not new server events.

Suggested trigger sources:
- button click handlers for UI click/copy/ready/rematch sounds
- `game:countdown` / `countdownSecondsRemaining` transitions for countdown sounds
- `snakes[].score` increases for food sounds
- `game:ended` for collision/result sounds
- `game:rematch-state` transitions for rematch acknowledgement sounds

No API change required.

---

## Client-side presentation contract additions
These are **frontend-internal contracts**, not network contracts.

## Derived UI state model
Recommended local model in JS:

```ts
interface UiFxState {
  phaseTheme: 'entry' | 'lobby' | 'countdown' | 'live' | 'result';
  outcomeTheme: 'neutral' | 'win' | 'lose' | 'draw';
  countdownValue: 3 | 2 | 1 | 0 | null;
  highlightedScoreSlots: Array<0 | 1>;
  boardFlash: 'none' | 'collision' | 'win' | 'lose' | 'draw';
  rematchCtaState: 'hidden' | 'idle' | 'waiting' | 'incoming' | 'accepted';
}
```

This should be derived from socket payloads and previous state snapshots. It must not be sent over the network.

## Audio manager contract
Recommended local interface:

```ts
interface AudioManager {
  enabled: boolean;
  unlocked: boolean;
  initFromStorage(): void;
  unlock(): Promise<void> | void;
  setEnabled(enabled: boolean): void;
  play(eventName: UiSoundEvent): void;
}

type UiSoundEvent =
  | 'ui.click'
  | 'ui.copy'
  | 'lobby.ready-on'
  | 'countdown.tick'
  | 'countdown.go'
  | 'game.food'
  | 'game.collision'
  | 'result.win'
  | 'result.lose'
  | 'rematch.requested'
  | 'rematch.accepted';
```
```

Again: local-only, no server change needed.

---

## Optional additive contract changes (only if necessary)
The following additions are allowed only if implementation reveals a real ambiguity. They should remain additive and backward-compatible.

## Option A: explicit event IDs / sequence numbers for FX gating
Current payloads already include `version` on major state payloads. Prefer using `version` plus local previous-state comparison before requesting anything new.

No additional field recommended at this time.

## Option B: richer result descriptors
Current result payloads already expose enough data for win/lose/draw and cause-of-death-driven styling.

No additional field recommended at this time.

## Option C: server-provided sound/FX hints
Not recommended. This polish pass is presentation-only; sound/FX decisions should stay client-side.

---

## DOM contract recommendations for implementation
These are stable selector-level expectations the frontend should preserve once added.

Recommended new ids/classes:
- `#countdownOverlay`
- `#soundToggleButton`
- `.game-stage`
- `.board-frame`
- `.board-fx-layer`
- `.status-chip`
- `.phase-*` top-level root classes
- `.is-win`, `.is-lose`, `.is-draw`, `.is-waiting`, `.is-confirmed`, `.is-highlighted`

Guidelines:
- prefer `data-phase`, `data-outcome`, and `data-player` attributes for styling variants
- use transient classes for one-shot animations
- keep selectors semantic and presentation-oriented

---

## Transition-detection contract
To prevent duplicate effects, the implementation should treat the following as canonical transitions:

### Countdown transition
Trigger only when:
- previous countdown value !== next countdown value
- and next phase is `starting`

### Score increase transition
Trigger only when:
- `next.snakes[slot].score > prev.snakes[slot].score`

### Round-end transition
Trigger only when:
- previous phase !== `game-over`
- and next phase === `game-over`

### Rematch incoming transition
Trigger only when:
- previous `requestedBySlot[other] === false`
- and next `requestedBySlot[other] === true`
- and `requestedByYou === false`

### Rematch accepted transition
Trigger only when:
- previous `bothAccepted === false`
- and next `bothAccepted === true`

This transition logic is essential to avoid over-firing audio/animations on repeated `game:state` or `game:rematch-state` updates.

---

## Accessibility and browser-behavior contract
Implementation should preserve these behavioral guarantees:
- audio playback failures never throw user-visible errors or block interaction
- countdown/result overlays remain readable with CSS disabled motion preferences
- focus-visible styles are preserved for buttons/inputs/toggles
- nonessential decorative layers use `aria-hidden="true"`
- live status messaging stays available through existing text/live regions where appropriate

---

## Acceptance mapping
The implementation should be considered contract-compliant if:
1. existing socket events still drive the experience end-to-end
2. no gameplay rule payloads are changed incompatibly
3. polish behaviors are driven from current payload fields and local transition detection
4. optional mute state, if added, remains local browser state rather than a server contract

---

## Handoff recommendation to fullstack developer
Implement this feature without changing server APIs unless you discover a concrete missing signal during development. Start by wiring a local presentation/effects layer that derives animation/audio triggers from existing `lobby:state`, `game:countdown`, `game:state`, `game:ended`, and `game:rematch-state` payloads.
