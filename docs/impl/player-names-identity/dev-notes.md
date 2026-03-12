# Dev Notes — Player Names / Identity

## What shipped
- Added shared player-name normalization/validation helpers in `src/shared/playerName.ts`.
- Required `name` on fresh `room:create` and `room:join` payloads, while keeping `session:resume` unchanged.
- Stored canonical names on server-side player slots and carried them through lobby, game, rematch, and reconnect payloads.
- Updated lobby and in-game UI to show player names as the primary label with slot labels as secondary context.
- Added browser-local persistence for the last valid name under `snake:player-name`.
- Updated disconnect/reconnect copy to prefer player names and append slot labels when duplicate names need disambiguation.

## Notes / deviations
- The reconnect payload now includes `disconnectedPlayerName` so the client can render name-aware reconnect banners without reconstructing identity from other state.
- Internal whitespace is normalized to a single space on both client and server for consistency.
- Duplicate names are allowed intentionally; the server keeps slot labels available for fallback/disambiguation.

## Verification
- `npm test`
- `npm run build`
