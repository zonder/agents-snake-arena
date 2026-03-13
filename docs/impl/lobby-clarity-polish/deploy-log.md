# Dev deployment log — Lobby clarity / polish pass

## Deployment target
- Parent issue: `#99`
- PR: `#102`
- Branch: `feature/issue-98`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`
- Deployed commit: `089840b1c7221a4ddaf84074f54edaccc1399b11` (`089840b`)
- Deployed at (UTC): `2026-03-13T00:43:10Z`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-98
git checkout feature/issue-98
git reset --hard origin/feature/issue-98
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` resolved to `089840b1c7221a4ddaf84074f54edaccc1399b11`.
- `pm2 list` showed `app-dev` online after restart.
- `pm2 logs app-dev --lines 30 --nostream` showed the active startup line: `Room lobby server listening on http://localhost:3001 (v0.1.0+089840b)`.
- `curl -I http://localhost:3001/` returned `HTTP/1.1 200 OK`.
- `curl http://localhost:3001/build-info.json` returned build marker `v0.1.0+089840b`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK` after process warm-up.
- `curl http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"089840b","builtAt":"2026-03-13T00:43:25.770Z","displayVersion":"v0.1.0+089840b"}`.
- Served HTML includes the visible build marker elements `#buildMarker` and `#gameBuildMarker`.
- Served lobby HTML also includes the expected clarity/polish UI hooks for this feature, including `#lobbyBrand`, `#roomCodeCard`, `#lobbyStatusSummary`, `#lobbyNextStepLabel`, and the ready CTA.

## Deployment note
- The first public curl immediately after PM2 restart returned `502 Bad Gateway` while nginx was waiting for the Node process to warm up.
- A follow-up probe a few seconds later succeeded, and both localhost and public dev checks were healthy.

## Deployment record

| Field | Value |
|-------|-------|
| Commit | `089840b1c7221a4ddaf84074f54edaccc1399b11` |
| Short | `089840b` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T00:43:10Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh — 2026-03-13T00:56:08Z
- Trigger: redeploy feature branch for parent issue #99 / PR #102 after stronger lobby-polish follow-up
- Branch: `feature/issue-98`
- Deployed commit: `a8a8affc2e87196c79e6668c63f0fa0343011c43` (`a8a8aff`)
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Refresh verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `a8a8affc2e87196c79e6668c63f0fa0343011c43`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `curl http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"a8a8aff","builtAt":"2026-03-13T00:54:58.837Z","displayVersion":"v0.1.0+a8a8aff"}`.
- The live build marker reports `v0.1.0+a8a8aff`.

### Refresh deployment record

| Field | Value |
|-------|-------|
| Commit | `a8a8affc2e87196c79e6668c63f0fa0343011c43` |
| Short | `a8a8aff` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T00:56:08Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-13T01:37:30Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the redesigned lobby review build is live
- Previous dev commit:
  - full: `c1352c4c1eef1b00810cd6c046f628ca90ec16bb`
  - short: `c1352c4`
- Redeployed commit:
  - full: `5ef329aa8645e57b2e73afa99cb652b134dae788`
  - short: `5ef329a`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` now resolves to `5ef329aa8645e57b2e73afa99cb652b134dae788`.
- `pm2 logs app-dev --lines 30 --nostream` shows the active startup line: `Room lobby server listening on http://localhost:3001 (v0.1.0+5ef329a)`.
- `curl http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"5ef329a","builtAt":"2026-03-13T01:35:35.579Z","displayVersion":"v0.1.0+5ef329a"}`.
- `curl http://20.106.185.110:8081/build-info.json` returned the same live build marker: `v0.1.0+5ef329a`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `5ef329aa8645e57b2e73afa99cb652b134dae788` |
| Short | `5ef329a` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T01:37:30Z` |
| Status | `SUCCESS` |

## Final branch-sync redeploy — 2026-03-13T01:38:10Z
- Trigger: redeploy once more after committing the repaired deployment artifact so live dev matches branch HEAD exactly
- Branch before final artifact commit: `feature/issue-98`
- Live app commit before final artifact sync: `949b1a24e238907062bfb7d75089b46c6f5c6abd` (`949b1a2`)
- Dev URL: `http://20.106.185.110:8081/`
- Expected action: push this artifact update, then redeploy the resulting branch HEAD and verify `/build-info.json`
