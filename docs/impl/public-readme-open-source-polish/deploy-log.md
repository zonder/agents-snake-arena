# Deploy log — Public README / Open-Source Repo Polish

## Production deployment update — 2026-03-12T23:56:29Z
- Environment: `prod`
- Trigger: deploy merged PR #95 / parent issue #92 from `main`
- Previous prod commit: `3582c9149eb5f6bb7f3a8ca571b4bacffb4f1100` (`3582c91`)
- Deployed commit: `74e91473a214319fc64eae7998f43a543382569e` (`74e9147`)
- Production URL: `http://20.106.185.110/`
- Runtime: `pm2` process `app-prod` behind nginx on port `80`, forwarding to local app on port `3000`

### Production deployment actions
```bash
cd /home/rootagent/deployments/prod
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-prod
pm2 save
```

### Production verification
- `git -C /home/rootagent/deployments/prod rev-parse HEAD` returned `74e91473a214319fc64eae7998f43a543382569e`.
- `pm2 list` showed `app-prod` online after restart.
- `curl -I http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx.
- `curl http://20.106.185.110/build-info.json` returned `{"version":"0.1.0","commit":"74e9147","builtAt":"2026-03-12T23:56:29.898Z","displayVersion":"v0.1.0+74e9147"}`.
- `pm2 logs app-prod --lines 20 --nostream` showed the active startup line: `Room lobby server listening on http://localhost:3000 (v0.1.0+74e9147)`.
- The served app shell still includes the visible build marker elements (`#buildMarker` and `#gameBuildMarker`) used for deployment freshness checks.
- The repository checkout on `main` contains the polished public `README.md`; from this headless environment, README/docs presence was verified at the repo artifact level rather than via an in-app UI surface.

### Production deployment record

| Field | Value |
|-------|-------|
| Commit | `74e91473a214319fc64eae7998f43a543382569e` |
| Short | `74e9147` |
| Branch | `main` |
| Environment | `prod` |
| PM2 Process | `app-prod` |
| URL | `http://20.106.185.110/` |
| Timestamp | `2026-03-12T23:56:29Z` |
| Status | `SUCCESS` |
