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
