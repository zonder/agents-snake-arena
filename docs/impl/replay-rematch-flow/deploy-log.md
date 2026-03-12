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
