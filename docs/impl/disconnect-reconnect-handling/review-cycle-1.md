# Review Cycle 1 — PR #66

## Verdict
CHANGES_REQUESTED

## What I reviewed
- Spec: `docs/impl/disconnect-reconnect-handling/spec.md`
- Design: `docs/impl/disconnect-reconnect-handling/design.md`
- API contracts: `docs/impl/disconnect-reconnect-handling/api-contracts.md`
- Dev notes: `docs/impl/disconnect-reconnect-handling/dev-notes.md`
- Implementation diff in PR #66
- Validation: `npm test` and `npm run build`

## Findings

### 1. Reserved post-game slot returns the wrong join error
- **Severity:** medium
- **Area:** reconnect / lobby-rematch reopen behavior
- **Files:** `src/server/roomService.ts`

#### Problem
The API contract says a reserved slot is unavailable to replacement joiners and ordinary `room:join` should fail with `ROOM_FULL` while that reservation is active. The current implementation returns `GAME_ALREADY_STARTED` whenever a `game-over` room still has two owned slots:

```ts
if (room.phase === 'game-over' && room.players.every((player) => player.playerId)) {
  return { events: [this.error(socketId, 'GAME_ALREADY_STARTED')] };
}
```

That branch also fires when one player is disconnected but still reserved, so the join path reports the room as if it were mid-match instead of accurately reflecting that the room is full because the reconnect reservation is still in force.

#### Why it matters
- Violates the documented contract in `api-contracts.md`.
- Misstates room state to the client during the reconnect window.
- Makes the rematch/lobby reopen flow harder to reason about because replacement joins fail for the wrong reason.

#### Required fix
Change the `game-over` join gate so reserved slots fail as `ROOM_FULL`, while true active-match states continue to use `GAME_ALREADY_STARTED`. Add a test covering `room:join` against a post-game reserved slot and asserting `ROOM_FULL`.

## Notes
- Reconnect token issuance, slot reservation, pause/forfeit timeout handling, and resume countdown behavior generally line up with the approved design.
- Test suite passed after installing dependencies locally with `npm ci`.
