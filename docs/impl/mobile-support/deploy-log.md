# Dev deployment log — Mobile support

## Deployment summary
- Parent issue: `#40`
- PR: `#43`
- Branch: `feature/issue-40`
- Feature slug: `mobile-support`
- Environment: `dev`
- Dev URL: `http://20.106.185.110:8081/`
- Deployed commit: `a82b2543e0a77e337c4c8ce5ec62becadef1e036` (`a82b254`)
- Previous dev commit: `e0a69e1faa73db80ddecde945d0d92f1e22aa108` (`e0a69e1`)
- Deployed at (UTC): `2026-03-12T10:45:53Z`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin
git checkout feature/issue-40
git reset --hard origin/feature/issue-40
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Health verification
- `pm2 list` showed `app-dev` online after restart.
- `curl -I http://127.0.0.1:3001/` returned `HTTP/1.1 200 OK`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `curl http://20.106.185.110:8081/build-info.json` returned build marker `v0.1.0+a82b254`.
- The deployed HTML includes visible build marker elements:
  - `#buildMarker` with `Build: loading…`
  - `#gameBuildMarker` with `Build: loading…`
- The deployed HTML includes mobile touch controls markup via `#touchControls` and directional buttons.
- The deployed `app.js` includes build marker hydration from `/build-info.json` and touch/swipe handlers for the mobile controls.

## Deployment record

| Field | Value |
|---|---|
| Commit | `a82b2543e0a77e337c4c8ce5ec62becadef1e036` |
| Short | `a82b254` |
| Branch | `feature/issue-40` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T10:45:53Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-12T11:03:20Z
- Trigger: redeploy latest branch head so the room-code copy fallback fix is live for stakeholder review
- Code fix commit requested: `060c6ee15bc3f95f52015ff9be1b62a84c82e434` (`060c6ee`)
- Deploy log artifact commit pushed: `214bb251e806b5c097c1ac119e39e763b1df8457` (`214bb25`)
- Verified live commit: `214bb251e806b5c097c1ac119e39e763b1df8457` (`214bb25`)
- Verified via: `/build-info.json` and served `app.js` markers for `copyRoomCode`, `navigator.clipboard`, and `execCommand`
- Result: `SUCCESS`

### Latest deployment record

| Field | Value |
|-------|-------|
| Commit | `214bb251e806b5c097c1ac119e39e763b1df8457` |
| Short | `214bb25` |
| Branch | `feature/issue-40` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T11:03:20Z` |
| Status | `SUCCESS` |


## QA-unblock refresh redeploy correction — 2026-03-12T12:46:56Z
- Trigger: repair malformed deploy record and confirm latest mobile layout fix refresh deploy
- Branch head before correction commit: 8051c918e699b6861e45b5d42619b695b87468b5 (8051c91)
- Verified live before correction commit via /build-info.json: 8051c91
- Dev URL: http://20.106.185.110:8081/
- Result before correction commit: SUCCESS

## QA-unblock refresh redeploy — 2026-03-12T14:09:26Z
- Trigger: redeploy latest branch head so the mobile-landscape overflow fix is live for QA
- Previous dev commit: `e2215d39bcf0664a01ce5838f0fa495dd0823ba3` (`e2215d3`)
- Requested fix commit: `2510a99cb22a34abdf57a7f070301ba91f644e45` (`2510a99`)
- Deployed commit: `2510a99cb22a34abdf57a7f070301ba91f644e45` (`2510a99`)
- Verified live via `http://20.106.185.110:8081/build-info.json` and matching served `/app.js` SHA-256
- Result: `SUCCESS`

## QA-unblock refresh redeploy — 2026-03-12T15:10:49Z
- Trigger: redeploy latest branch head so the latest mobile-landscape overflow fix commit is live for QA
- Previous dev commit: `e9b8c7157867fdacfff6655e00f89ddb9680a1d4` (`e9b8c71`)
- Requested fix commit: `043c2c98985139d6f5befbf7eb64c6f192a0fad9` (`043c2c9`)
- Deployed commit: `043c2c98985139d6f5befbf7eb64c6f192a0fad9` (`043c2c9`)
- Verified live via `http://20.106.185.110:8081/build-info.json` returning `v0.1.0+043c2c9`
- Verified served `/app.js` SHA-256 matched deployed file SHA-256: `e7ba62e25d7f1fa8c26d296aa20fda0c524e6941d838b0653935f59ecb08bbbe`
- Result: `SUCCESS`

### Latest deployment record

| Field | Value |
|-------|-------|
| Commit | `043c2c98985139d6f5befbf7eb64c6f192a0fad9` |
| Short | `043c2c9` |
| Branch | `feature/issue-40` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T15:10:49Z` |
| Status | `SUCCESS` |
