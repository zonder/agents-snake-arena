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

## Stakeholder review refresh redeploy — 2026-03-12T11:02:43Z
- Trigger: redeploy latest branch head so the room-code copy fallback fix is live for stakeholder review
- Requested target commit: `060c6ee15bc3f95f52015ff9be1b62a84c82e434` (`060c6ee`)
- Verified live commit: `060c6ee15bc3f95f52015ff9be1b62a84c82e434` (`060c6ee`)
- Verified at (UTC): `2026-03-12T11:02:43Z`
- Result: `SUCCESS`

### Latest deployment record

| Field | Value |
|-------|-------|
| Commit | `060c6ee15bc3f95f52015ff9be1b62a84c82e434` |
| Short | `060c6ee` |
| Branch | `feature/issue-40` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T11:02:43Z` |
| Status | `SUCCESS` |
