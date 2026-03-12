# Dev deployment log — Player Names / Identity

## Deployment target
- Parent issue: #73
- PR: #76
- Branch: `feature/issue-73`
- Feature slug: `player-names-identity`
- Environment: dev
- Dev URL: `http://20.106.185.110:8081/`
- Deployed commit: `aa97a7e0112f1f1f328687a79d2aeab1de5ab98a` (`aa97a7e`)
- Deployed at (UTC): `2026-03-12T18:48:41Z`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

## Deployment actions
```txt
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-73
git checkout feature/issue-73
git reset --hard origin/feature/issue-73
npm install
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Health verification
- `curl -I http://20.106.185.110:8081/` returned HTTP 200.
- `curl http://20.106.185.110:8081/build-info.json` returned build marker `v0.1.0+aa97a7e` after the final artifact-refresh redeploy.
- Deployed HTML contains visible build-marker placeholders:
  - `#buildMarker` with text `Build: loading…` before hydration.
  - `#gameBuildMarker` with text `Build: loading…` before hydration.
- Deployed client bundle at `/app.js` confirms the live build marker fetch and player-name feature wiring:
  - `Build:` marker text is populated from `/build-info.json`.
  - `snake:player-name` local persistence is present.
  - `playerNameInput` is present with `Your name` placeholder UX.
  - `disconnectedPlayerDisplayName` handling is present for duplicate-name-safe reconnect banners.
- PM2 startup logs show the dev server listening on `http://localhost:3001` for this branch.

## Deployment record

| Field | Value |
|-------|-------|
| Commit | `aa97a7e0112f1f1f328687a79d2aeab1de5ab98a` |
| Short | `aa97a7e` |
| Branch | `feature/issue-73` |
| Environment | dev |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T18:48:41Z` |
| Status | SUCCESS |


## Production deployment update — 2026-03-12
- Environment: `prod`
- Trigger: merged PR `#76` for parent issue `#73`
- Branch: `main`
- Previous prod commit: `662b4b9`
- Deployed commit: `13288ac3ec87a3cd3903e7c935064cb3045243c2` (`13288ac`)
- Production URL: `http://20.106.185.110/`
- Deployed at (UTC): `2026-03-12T19:18:41Z`
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
- `curl -I http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx.
- `curl http://20.106.185.110/build-info.json` returned `{"version":"0.1.0","commit":"13288ac","builtAt":"2026-03-12T19:18:41.105Z","displayVersion":"v0.1.0+13288ac"}`.
- `curl 'http://20.106.185.110/socket.io/?EIO=4&transport=polling'` returned a valid Engine.IO / Socket.IO handshake payload.
- Served HTML still exposes the visible build-marker placeholders `#buildMarker` and `#gameBuildMarker` before hydration.
- Served `/app.js` confirms the player-name feature wiring is live in prod:
  - local persistence key `snake:player-name`
  - required `playerNameInput` flow and validation messaging
  - reconnect-safe `disconnectedPlayerDisplayName` handling
  - build marker fetch via `/build-info.json`

### Notes
- Production was previously serving commit `662b4b9`; this deploy advanced prod to merged PR `#76` on `main`.
- From this headless environment, prod verification was feasible at the HTTP/build-marker/client-asset level; the interactive multiplayer behavior had already been validated on dev in QA before merge.

### Production deployment record

| Field | Value |
|-------|-------|
| Commit | `13288ac3ec87a3cd3903e7c935064cb3045243c2` |
| Short | `13288ac` |
| Branch | `main` |
| Environment | `prod` |
| PM2 Process | `app-prod` |
| URL | `http://20.106.185.110/` |
| Timestamp | `2026-03-12T19:18:41Z` |
| Status | `SUCCESS` |
