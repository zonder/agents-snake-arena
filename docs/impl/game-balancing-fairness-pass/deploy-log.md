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


## Production deployment update — 2026-03-12T23:35:26Z
- Environment: `prod`
- Trigger: deploy merged PR #87 / parent issue #83 from `main`
- Previous prod commit: `13288ac3ec87a3cd3903e7c935064cb3045243c2` (`13288ac`)
- Deployed commit: `3582c9149eb5f6bb7f3a8ca571b4bacffb4f1100` (`3582c91`)
- Production URL: `http://20.106.185.110/`
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
- `git -C /home/rootagent/deployments/prod rev-parse HEAD` now resolves to `3582c9149eb5f6bb7f3a8ca571b4bacffb4f1100`.
- `pm2 list` shows `app-prod` online after restart.
- `curl -I http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK`.
- `curl -I http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx.
- `curl http://20.106.185.110/build-info.json` returned `{"version":"0.1.0","commit":"3582c91","builtAt":"2026-03-12T23:35:13.703Z","displayVersion":"v0.1.0+3582c91"}`.
- `pm2 logs app-prod --lines 20 --nostream` shows the active startup line: `Room lobby server listening on http://localhost:3000 (v0.1.0+3582c91)`.
- Served `index.html` contains the expected build-marker placeholders (`#buildMarker`, `#gameBuildMarker`) plus the fairness-pass rematch / countdown shell.
- Served `app.js` contains the fairness-pass gameplay copy and rematch/countdown wiring, including `Countdown: GO`, `Ready for the rematch?`, `Accept rematch now`, and build-marker hydration from `/build-info.json`.
- Served `styles.css` contains the stronger countdown / result / rematch visual treatment, including `.countdown-overlay`, `@keyframes countdownPulse`, `.rematch-card.highlighted`, and the build-marker styles.

### Production deployment record

| Field | Value |
|-------|-------|
| Commit | `3582c9149eb5f6bb7f3a8ca571b4bacffb4f1100` |
| Short | `3582c91` |
| Branch | `main` |
| Environment | `prod` |
| PM2 Process | `app-prod` |
| URL | `http://20.106.185.110/` |
| Timestamp | `2026-03-12T23:35:26Z` |
| Status | `SUCCESS` |
