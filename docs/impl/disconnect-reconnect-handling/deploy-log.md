# Dev deployment log — Disconnect / reconnect handling

## Deployment target
- Parent issue: `#63`
- PR: `#66`
- Branch: `feature/issue-63`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`
- Deployed commit: `ac8ab14017da1cc69d187fa9e198a7d46a79c8ff` (`ac8ab14`)
- Deployed at (UTC): `2026-03-12T17:35:08Z`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin
git checkout -B feature/issue-63 origin/feature/issue-63
git reset --hard origin/feature/issue-63
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Verification
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `curl http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"ac8ab14","builtAt":"2026-03-12T17:35:08.005Z","displayVersion":"v0.1.0+ac8ab14"}`.
- Served HTML contains visible build marker placeholders:
  - `<div id="buildMarker" class="build-marker" ...>Build: loading…</div>`
  - `<span id="gameBuildMarker" class="inline-build-marker" ...>Build: loading…</span>`
- Served `app.js` includes the reconnect/resume flow and build marker hydration, including:
  - `Connected. Trying to resume your room…`
  - `session:resume:succeeded`
  - `session:resume:failed`
  - `Player X disconnected. Slot reserved for Ns.`
  - `Player X reconnected. Resuming in Ns.`
  - `/build-info.json` fetch with `cache: 'no-store'`
- `pm2 list` showed `app-dev` online after restart.
- `pm2 logs app-dev --lines 20 --nostream` showed the current startup line: `Room lobby server listening on http://localhost:3001 (v0.1.0+ac8ab14)`.

## Notes
- The feature did not previously have a `docs/impl/disconnect-reconnect-handling/deploy-log.md`, so this log was created as part of the dev deployment handoff.
- Historical `app-dev` log noise includes older startup failures from earlier deployments, but the active process is healthy and the live build marker matches `ac8ab14`.

## Deployment record

| Field | Value |
|---|---|
| Commit | `ac8ab14017da1cc69d187fa9e198a7d46a79c8ff` |
| Short | `ac8ab14` |
| Branch | `feature/issue-63` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T17:35:08Z` |
| Status | `SUCCESS` |
## Production deployment update — 2026-03-12
- Environment: `prod`
- Branch: `main`
- PR: `#66`
- Previous prod commit: `613861ff28e5e61b550e24d25eb0b714ce8bc942` (`613861f`)
- Deployed app commit: `662b4b99c42dbc35dc51652bbc08aa3ef5c62545` (`662b4b9`)
- Production URL: `http://20.106.185.110/`
- Deployed at (UTC): `2026-03-12T17:50:08Z`
- Runtime: `pm2` process `app-prod` behind nginx on port `80`, forwarding to local app on port `3000`
- Docs artifact update commit: `091804f5f61f8b09fedb98d6fd397f3d2206c4f5` (`091804f`) on `main`

### Production deployment actions
```bash
cd /home/rootagent/deployments/prod
git fetch origin
git checkout -B main origin/main
git reset --hard origin/main
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-prod
pm2 save
```

### Production health-check results
- `curl -I http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx.
- `curl http://20.106.185.110/build-info.json` returned `{"version":"0.1.0","commit":"662b4b9","builtAt":"2026-03-12T17:50:08.352Z","displayVersion":"v0.1.0+662b4b9"}`.
- `curl 'http://20.106.185.110/socket.io/?EIO=4&transport=polling'` returned a valid Engine.IO / Socket.IO handshake payload.
- Served HTML exposes the build marker anchors `#buildMarker` and `#gameBuildMarker`.
- Served `app.js` includes reconnect/resume and build-marker hydration strings for:
  - `Connected. Trying to resume your room…`
  - `session:resume:succeeded`
  - `session:resume:failed`
  - `Slot reserved for ${seconds}s.`
  - `Resuming in ${seconds}s.`
  - `/build-info.json` fetch with `cache: 'no-store'`
- `pm2 list` showed `app-prod` online after restart.
- `pm2 logs app-prod --lines 20 --nostream` showed the active startup line: `Room lobby server listening on http://localhost:3000 (v0.1.0+662b4b9)`.
- Historical `app-prod` error log lines from 2026-03-11 are still present in PM2 logs, but they predate this deploy and the current process is healthy.

### Production deployment record

| Field | Value |
|---|---|
| App Commit | `662b4b99c42dbc35dc51652bbc08aa3ef5c62545` |
| Short | `662b4b9` |
| Branch | `main` |
| Environment | `prod` |
| PM2 Process | `app-prod` |
| URL | `http://20.106.185.110/` |
| Timestamp | `2026-03-12T17:50:08Z` |
| Status | `SUCCESS` |
