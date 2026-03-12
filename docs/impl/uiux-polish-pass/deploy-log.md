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
