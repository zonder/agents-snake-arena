# Dev deployment log — Game balancing / fairness pass

## Deployment target
- Parent issue: `#83`
- PR: `#87`
- Branch: `feature/issue-83`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`
- Deployed commit: `172d9a29d4eefc054c6ccf7fde78004e3974f192` (`172d9a2`)
- Deployed at (UTC): `2026-03-12T23:13:18Z`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-83
git checkout feature/issue-83
git reset --hard origin/feature/issue-83
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Health verification
- `pm2 list` showed `app-dev` online on branch `feature/issue-83`.
- `curl -I http://127.0.0.1:3001/` returned `HTTP/1.1 200 OK` after process warm-up.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK` after nginx routing was corrected.
- `curl http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"172d9a2","builtAt":"2026-03-12T23:12:09.444Z","displayVersion":"v0.1.0+172d9a2"}`.
- Deployed HTML contains visible build marker placeholders:
  - `<div id="buildMarker" class="build-marker" aria-live="polite">Build: loading…</div>`
  - `<span id="gameBuildMarker" class="inline-build-marker" aria-live="polite">Build: loading…</span>`
- Deployed `app.js` hydrates the visible marker from `/build-info.json` and includes the fairness-pass presentation wiring, including:
  - `buildMarkerText = \`Build: ${buildInfo.displayVersion}\``
  - countdown / result copy strings including `GO` and `Ready for the rematch?`
- `pm2 logs app-dev --lines 30 --nostream` shows the active startup line: `Room lobby server listening on http://localhost:3001 (v0.1.0+172d9a2)`.

## Deployment note
- The feature app deploy itself succeeded on the first pass, but the public dev URL was initially unreachable because `/etc/nginx/sites-available/startup-factory` existed but was not enabled in `/etc/nginx/sites-enabled/`.
- Enabling that site and reloading nginx restored the expected `:8081` reverse proxy without changing application code.

## Deployment record

| Field | Value |
|-------|-------|
| Commit | `172d9a29d4eefc054c6ccf7fde78004e3974f192` |
| Short | `172d9a2` |
| Branch | `feature/issue-83` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-12T23:13:18Z` |
| Status | `SUCCESS` |
