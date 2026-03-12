# Dev deployment log — Replay / Rematch Flow

## Deployment target
- Parent issue: `#13`
- PR: `#16`
- Branch: `feature/issue-13`
- Feature slug: `replay-rematch-flow`
- Environment: `dev`
- Dev URL: `http://20.106.185.110:8081/`
- Deployed commit: `ec7474c03b459df85bc5549a69293244b04838ab` (`ec7474c`)
- Deployed at (UTC): `2026-03-12T00:44:35Z`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-13
git checkout feature/issue-13 || git checkout -b feature/issue-13 origin/feature/issue-13
git reset --hard origin/feature/issue-13
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Health checks
- `pm2 list` showed `app-dev` online after restart.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `curl http://20.106.185.110:8081/build-info.json` returned build marker `v0.1.0+ec7474c`.
- Deployed `app.js` at the dev URL includes the rematch UI / transport wiring for:
  - `game:rematch-request`
  - `game:rematch-state`
  - waiting-state messaging
  - same-room replay UI controls

## Live rematch verification
A two-client live Socket.IO verification was run against the deployed dev URL.

Verified live:
1. Room creation and join both succeeded.
2. Both players could ready up and start a round.
3. After `game-over`, rematch became available for both clients.
4. One-player rematch acceptance produced authoritative waiting state (`status=waiting`) visible to both clients.
5. Second-player acceptance restarted the game in the **same room code** with a fresh countdown.
6. The rematch round reset to clean state:
   - scores reset to `0`
   - `tickIntervalMs` reset to `200`
   - room code remained unchanged
7. After a later post-game leave, the remaining player received:
   - `player:left`
   - `lobby:state` with phase `waiting-for-players`
   - cleared rematch state with both acceptance flags reset and `available=false`

Verification result: **PASS**

## Deployment record

| Field | Value |
|-------|-------|
| Commit | `ec7474c03b459df85bc5549a69293244b04838ab` |
| Short | `ec7474c` |
| Branch | `feature/issue-13` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T00:44:35Z` |
| Status | `SUCCESS` |

## Redeploy refresh — 2026-03-12
- Trigger: stakeholder review refresh after rematch CTA visibility fix
- Source commit: `dc5e3b6ed2eeb8f86afbd9d298627243882bc28f` (`dc5e3b6`)
- Redeployed at (UTC): `2026-03-12T01:00:26Z`
- Result: `SUCCESS`

### Refresh verification
- `~/deployments/dev` reset to `origin/feature/issue-13` at `dc5e3b6ed2eeb8f86afbd9d298627243882bc28f`
- `npm ci && npm run build` completed successfully
- `pm2 restart app-dev --update-env` completed successfully
- `curl http://127.0.0.1:3001/` returned `200`
- `curl http://20.106.185.110:8081/` returned `200`
- Served `/app.js` SHA-256 matched the deployed file SHA-256: `e7f4149980ef5fece49e86cb86448c70855c634b79d76f7365da02a4dd618815`
- Served asset contains the rematch CTA visibility fix strings:
  - `Accept rematch now`
  - `Your opponent wants a rematch. Accept to restart in the same room.`
  - highlighted rematch card state

### Latest deployment record

| Field | Value |
|-------|-------|
| Commit | `dc5e3b6ed2eeb8f86afbd9d298627243882bc28f` |
| Short | `dc5e3b6` |
| Branch | `feature/issue-13` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T01:00:26Z` |
| Status | `SUCCESS` |


## Production deployment update — 2026-03-12
- Environment: `prod`
- Trigger: merged PR `#16` for parent issue `#13`
- Branch: `main`
- Previous prod commit: `78f050b434597c234072e17d20d5ef27109cbd30` (`78f050b`)
- Deployed commit: `10055d5ceaad6312ee2c53f48f5a763d607d5150` (`10055d5`)
- Production URL: `http://20.106.185.110/`
- Deployed at (UTC): `2026-03-12T08:22:05Z`
- Runtime: `pm2` process `app-prod` behind nginx on port `80`, forwarding to local app on port `3000`

### Production deployment actions
```bash
cd /home/rootagent/deployments/prod
git fetch origin main
git checkout main
git reset --hard origin/main
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-prod
pm2 save
```

### Production health-check results
- `pm2 list` showed `app-prod` online after restart.
- `curl -I http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx.
- `curl http://20.106.185.110/build-info.json` returned `{"version":"0.1.0","commit":"10055d5","builtAt":"2026-03-12T08:22:05.692Z","displayVersion":"v0.1.0+10055d5"}`.
- `curl 'http://20.106.185.110/socket.io/?EIO=4&transport=polling'` returned a valid Engine.IO / Socket.IO handshake payload.
- Served `/app.js` contains the rematch-related UI/build markers:
  - `Accept rematch now`
  - `Waiting for other player`
  - `Your opponent wants a rematch. Accept to restart in the same room.`
  - build marker fetch via `build-info.json`
- PM2 app output reports: `Room lobby server listening on http://localhost:3000 (v0.1.0+10055d5)`.

### Notes
- Production was previously serving commit `78f050b`; this deploy advanced prod to merged PR `#16` on `main`.
- Rematch-specific verification in prod was feasible at the asset/build-marker level from this headless environment; live two-client gameplay flow was already covered on dev before merge.

### Production deployment record

| Field | Value |
|-------|-------|
| Commit | `10055d5ceaad6312ee2c53f48f5a763d607d5150` |
| Short | `10055d5` |
| Branch | `main` |
| Environment | `prod` |
| PM2 Process | `app-prod` |
| URL | `http://20.106.185.110/` |
| Timestamp | `2026-03-12T08:22:05Z` |
| Status | `SUCCESS` |
