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

## Stakeholder review refresh redeploy — 2026-03-13T10:53:55Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the created-room lobby fix is live for stakeholder review
- Previous dev commit:
  - full: `5ef329aa8645e57b2e73afa99cb652b134dae788`
  - short: `5ef329a`
- Redeployed commit:
  - full: `3edba268b454d304dab0f0a200bb75306f436b87`
  - short: `3edba26`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `3edba268b454d304dab0f0a200bb75306f436b87`.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"3edba26","builtAt":"2026-03-13T10:53:20.125Z","displayVersion":"v0.1.0+3edba26"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"3edba26","builtAt":"2026-03-13T10:53:20.125Z","displayVersion":"v0.1.0+3edba26"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 logs app-dev --lines 6 --nostream` shows the active startup line for `v0.1.0+3edba26`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `3edba268b454d304dab0f0a200bb75306f436b87` |
| Short | `3edba26` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T10:53:55Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-13T12:13:18Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the desktop lobby fixes are live for stakeholder review
- Previous live dev build marker before redeploy: `db1a2e6`
- Redeployed commit:
  - full: `65ee89ed770d44982a81e6020f36b7d3bc5e8be4`
  - short: `65ee89e`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `65ee89ed770d44982a81e6020f36b7d3bc5e8be4`.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"65ee89e","builtAt":"2026-03-13T12:13:11.032Z","displayVersion":"v0.1.0+65ee89e"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"65ee89e","builtAt":"2026-03-13T12:13:11.032Z","displayVersion":"v0.1.0+65ee89e"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 logs app-dev --lines 8 --nostream` shows the active startup line for `v0.1.0+65ee89e`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `65ee89ed770d44982a81e6020f36b7d3bc5e8be4` |
| Short | `65ee89e` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T12:13:18Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-13T16:29:49Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the latest batched lobby feedback is live for stakeholder review
- Previous requested fix commit: `3c6ba2e`
- Redeployed commit:
  - full: `3c6ba2e2d811c94a9515d9ef9b8e32bee7fd672f`
  - short: `3c6ba2e`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `3c6ba2e2d811c94a9515d9ef9b8e32bee7fd672f`.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"3c6ba2e","builtAt":"2026-03-13T16:29:26.005Z","displayVersion":"v0.1.0+3c6ba2e"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"3c6ba2e","builtAt":"2026-03-13T16:29:26.005Z","displayVersion":"v0.1.0+3c6ba2e"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 logs app-dev --lines 8 --nostream` shows the active startup line for `v0.1.0+3c6ba2e`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `3c6ba2e2d811c94a9515d9ef9b8e32bee7fd672f` |
| Short | `3c6ba2e` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T16:29:49Z` |
| Status | `SUCCESS` |

