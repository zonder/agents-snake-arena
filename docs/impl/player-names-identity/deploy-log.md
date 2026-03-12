# Dev deployment log — Player Names / Identity

## Deployment target
- Parent issue: #73
- PR: #76
- Branch: `feature/issue-73`
- Feature slug: `player-names-identity`
- Environment: dev
- Dev URL: `http://20.106.185.110:8081/`
- Deployed commit: `9a06002777e5eb52884b18a912883ccc3282a3a2` (`9a06002`)
- Deployed at (UTC): `2026-03-12T18:48:04Z`
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
- `curl http://20.106.185.110:8081/build-info.json` returned build marker `v0.1.0+9a06002` after the final artifact-refresh redeploy.
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
| Commit | `9a06002777e5eb52884b18a912883ccc3282a3a2` |
| Short | `9a06002` |
| Branch | `feature/issue-73` |
| Environment | dev |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T18:48:04Z` |
| Status | SUCCESS |
