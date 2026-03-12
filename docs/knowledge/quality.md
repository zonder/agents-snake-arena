# Quality Tracker

Per-module health assessment. Updated after each feature ships.

## Module Health

| Module | Unit Tests | E2E Coverage | Known Issues | Tech Debt |
|--------|-----------|-------------|-------------|----------|
| `server/gameLogic.ts` | vitest | — | none | none |
| `server/roomService.ts` | vitest | — | reconnect edge cases | needs refactor for multi-room cleanup |
| `server/index.ts` | — | — | none | event routing could be extracted |
| `shared/contracts.ts` | — (types only) | — | none | none |
| `shared/playerName.ts` | — | — | none | none |
| `public/` (client) | — | pending | mobile layout fixes (#40) | CSS needs cleanup |

## Test Coverage Summary

- **Unit tests**: `gameLogic.ts`, `roomService.ts` (vitest)
- **E2E tests**: Playwright in `tests/e2e/` (new -- first tests coming with next feature)
- **Type checking**: `tsc` via `npm run build`

## Shipped Features Quality Notes

| Feature | Slug | Quality Notes |
|---------|------|---------------|
| Core gameplay loop | `core-gameplay-loop` | Solid. Unit tested. |
| Room/lobby/autostart | `room-lobby-autostart` | Stable. |
| Player names | `player-names-identity` | Simple, no issues. |
| Disconnect handling | `disconnect-reconnect-handling` | Works but reconnect has edge cases. |
| Replay/rematch | `replay-rematch-flow` | Functional. |
| UI/UX polish | `uiux-polish-pass` | Audio, animations added. |
| Mobile support | `mobile-support` | Layout fixes applied. Needs E2E regression. |

## Update Instructions

After shipping a feature, update this file:
1. Add/update the module row if you changed a module's test coverage or introduced debt.
2. Add a row to "Shipped Features Quality Notes" with the feature slug and quality observations.
3. Commit this update on the feature branch before merge.
