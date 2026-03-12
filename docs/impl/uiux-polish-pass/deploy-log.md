# Dev deployment log — UI/UX polish pass

## Deployment target
- Parent issue: `#25`
- PR: `#28`
- Branch: `feature/issue-25`
- Feature slug: `uiux-polish-pass`
- Environment: `dev`
- Dev URL: `http://20.106.185.110:8081/`
- Deployed commit: `04906cc984be7f1068ec89150d345971591bacac` (`04906cc`)
- Deployed at (UTC): `2026-03-12T09:07:04Z`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-25
git checkout feature/issue-25 || git checkout -b feature/issue-25 origin/feature/issue-25
git reset --hard origin/feature/issue-25
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Health checks
- `pm2 list` showed `app-dev` online after restart.
- `curl -I http://127.0.0.1:3001/` returned HTTP 200 after process warm-up.
- `curl -I http://20.106.185.110:8081/` returned HTTP 200.
- `curl http://20.106.185.110:8081/build-info.json` returned build marker `v0.1.0+04906cc`.
- Served HTML contains the refreshed UX polish shell markers:
  - `Retro arcade multiplayer`
  - `Clean boards. Neon tension. Quick rematches.`
  - visible build marker placeholders that hydrate from `/build-info.json`
- Served `app.js` contains the UI polish wiring for:
  - countdown overlay FX (`countdownOverlay`)
  - collision / result board flash (`flash-collision`)
  - rematch CTA copy (`Accept rematch now`)
  - build marker hydration from `buildInfo.displayVersion`
  - sound toggle UI state (`Sound: on` / `Sound: off`)

## Notes
- The first immediate localhost curl right after PM2 restart hit process warm-up and failed once, but a follow-up probe succeeded with the app stable and online.
- PM2 startup logs now report: `Room lobby server listening on http://localhost:3001 (v0.1.0+04906cc)`

## Deployment record

| Field | Value |
|-------|-------|
| Commit | `04906cc984be7f1068ec89150d345971591bacac` |
| Short | `04906cc` |
| Branch | `feature/issue-25` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T09:07:04Z` |
| Status | `SUCCESS` |


## Redeploy refresh — 2026-03-12
- Trigger: sync live dev environment to branch head after committing deployment artifact
- Redeployed commit: `5c2bde1f262e4f487bcaec4b4bb50bf7eb6b3320` (`5c2bde1`)
- Redeployed at (UTC): `2026-03-12T09:07:45Z`
- Result: `SUCCESS`

### Latest deployment record

| Field | Value |
|-------|-------|
| Commit | `5c2bde1f262e4f487bcaec4b4bb50bf7eb6b3320` |
| Short | `5c2bde1` |
| Branch | `feature/issue-25` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T09:07:45Z` |
| Status | `SUCCESS` |

## QA-unblock redeploy refresh — 2026-03-12T09:53Z
- Trigger: redeploy latest branch head for board-displacement fix verification
- Requested target commit: `72735311fcd46e33848600122fa9a0323b477531` (`7273531`)
- Verified live commit: `72735311fcd46e33848600122fa9a0323b477531` (`7273531`)
- Verified at (UTC): `2026-03-12T09:54:18Z`
- Result: `SUCCESS`

### Latest deployment record

| Field | Value |
|-------|-------|
| Commit | `72735311fcd46e33848600122fa9a0323b477531` |
| Short | `7273531` |
| Branch | `feature/issue-25` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T09:54:18Z` |
| Status | `SUCCESS` |

## Production deployment update — 2026-03-12
- Environment: `prod`
- Branch: `main`
- Parent issue: `#25`
- PR: `#28`
- Previous prod commit: `10055d5ceaad6312ee2c53f48f5a763d607d5150` (`10055d5`)
- Deployed commit: `a5a0b41eea8278981ce65bd0e7b8f9de70b1fc36` (`a5a0b41`)
- Production URL: `http://20.106.185.110/`
- Deployed at (UTC): `2026-03-12T10:26:52Z`
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
- `curl -I http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK`.
- `curl -I http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx.
- `curl http://20.106.185.110/build-info.json` returned `{"version":"0.1.0","commit":"a5a0b41","builtAt":"2026-03-12T10:25:41.038Z","displayVersion":"v0.1.0+a5a0b41"}`.
- `curl 'http://20.106.185.110/socket.io/?EIO=4&transport=polling'` returned a valid Engine.IO / Socket.IO handshake payload.
- Served HTML contains the polished UI markers `Retro arcade multiplayer`, `Clean boards. Neon tension. Quick rematches.`, `build-marker`, and `fx-layer`.
- Served `app.js` contains the shipped UI polish / gameplay markers `countdownOverlay`, `flash-collision`, `Accept rematch now`, and `buildInfo.displayVersion`.
- PM2 logs show the current startup line: `Room lobby server listening on http://localhost:3000 (v0.1.0+a5a0b41)`.

### Production deployment record

| Field | Value |
|-------|-------|
| Commit | `a5a0b41eea8278981ce65bd0e7b8f9de70b1fc36` |
| Short | `a5a0b41` |
| Branch | `main` |
| Environment | `prod` |
| PM2 Process | `app-prod` |
| URL | `http://20.106.185.110/` |
| Timestamp | `2026-03-12T10:26:52Z` |
| Status | `SUCCESS` |
