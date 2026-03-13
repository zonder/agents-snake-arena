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


## Stakeholder review refresh redeploy — 2026-03-13T16:53:24Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the created-room fit-on-screen fix is live for stakeholder review
- Requested fix commit: `8bedfb4`
- Redeployed commit:
  - full: `8bedfb45ba8e7cb638c15ddf529c2e925a7bb24d`
  - short: `8bedfb4`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `8bedfb45ba8e7cb638c15ddf529c2e925a7bb24d`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"8bedfb4","builtAt":"2026-03-13T16:52:48.160Z","displayVersion":"v0.1.0+8bedfb4"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 logs app-dev --lines 8 --nostream` shows the active startup line for `v0.1.0+8bedfb4`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `8bedfb45ba8e7cb638c15ddf529c2e925a7bb24d` |
| Short | `8bedfb4` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T16:53:24Z` |
| Status | `SUCCESS` |


## Stakeholder review refresh redeploy — 2026-03-13T16:54:19Z
- Trigger: final dev redeploy after pushing the deploy-log artifact so live dev matches the latest feature branch HEAD exactly
- App fix commit included in deployed branch history: `8bedfb4`
- Redeployed branch HEAD:
  - full: `a248ab13f13916b91176cae9e793ed7b0e02c56b`
  - short: `a248ab1`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `a248ab13f13916b91176cae9e793ed7b0e02c56b`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"a248ab1","builtAt":"2026-03-13T16:54:15.774Z","displayVersion":"v0.1.0+a248ab1"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 logs app-dev --lines 8 --nostream` shows the active startup line for `v0.1.0+a248ab1`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `a248ab13f13916b91176cae9e793ed7b0e02c56b` |
| Short | `a248ab1` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T16:54:19Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-13T20:18:46Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the latest lobby simplification pass is live for stakeholder review
- Requested fix commit: `30c11f0`
- Redeployed branch HEAD before deploy-log update:
  - full: `30c11f0509cc5b7668817d7d1e2cbfe533f2b471`
  - short: `30c11f0`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `30c11f0509cc5b7668817d7d1e2cbfe533f2b471`.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"30c11f0","builtAt":"2026-03-13T20:17:50.313Z","displayVersion":"v0.1.0+30c11f0"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"30c11f0","builtAt":"2026-03-13T20:17:50.313Z","displayVersion":"v0.1.0+30c11f0"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 restart app-dev --update-env` completed successfully during deploy.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `30c11f0509cc5b7668817d7d1e2cbfe533f2b471` |
| Short | `30c11f0` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T20:18:46Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-13T21:19:05Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the Fight Poster removal is live for stakeholder review
- Requested fix commit: `4826201`
- Redeployed branch HEAD before deploy-log update:
  - full: `48262019da7b11d17db6e447c12e2eeab770c218`
  - short: `4826201`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `48262019da7b11d17db6e447c12e2eeab770c218`.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"4826201","builtAt":"2026-03-13T21:18:40.754Z","displayVersion":"v0.1.0+4826201"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"4826201","builtAt":"2026-03-13T21:18:40.754Z","displayVersion":"v0.1.0+4826201"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev` completed successfully; older log lines still include historical startup failures from earlier deploy attempts, but the active startup line now shows `Room lobby server listening on http://localhost:3001 (v0.1.0+4826201)`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `48262019da7b11d17db6e447c12e2eeab770c218` |
| Short | `4826201` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T21:19:05Z` |
| Status | `SUCCESS` |

## Stakeholder review refresh redeploy — 2026-03-13T21:51:37Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the approved review-cycle-4 fixes are live for stakeholder review
- Approved fix commit included in deployed history: `614bbd5`
- Review artifact commit deployed before deploy-log update:
  - full: `13d329efc10935c804699643cb115d57e3552115`
  - short: `13d329e`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `13d329efc10935c804699643cb115d57e3552115` before the deploy-log commit.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"13d329e","builtAt":"2026-03-13T21:50:55.584Z","displayVersion":"v0.1.0+13d329e"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"13d329e","builtAt":"2026-03-13T21:50:55.584Z","displayVersion":"v0.1.0+13d329e"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.

### Latest deployment record

| Field | Value |
|---|---|
| Commit | `13d329efc10935c804699643cb115d57e3552115` |
| Short | `13d329e` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T21:51:37Z` |
| Status | `SUCCESS` |

## Blocking syntax-fix refresh redeploy — 2026-03-13T23:01:11Z
- Trigger: refresh dev so the blocking `app.js` syntax fix from parent issue #99 / PR #102 is live for stakeholder review
- Requested application fix commit: `e26b09ac16799ed5732754e01e0db5343c549fb7` (`e26b09a`)
- Redeployed branch HEAD before artifact commit:
  - full: `e26b09ac16799ed5732754e01e0db5343c549fb7`
  - short: `e26b09a`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` resolved to `e26b09ac16799ed5732754e01e0db5343c549fb7` immediately after deploy.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"e26b09a","builtAt":"2026-03-13T23:00:27.773Z","displayVersion":"v0.1.0+e26b09a"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"e26b09a","builtAt":"2026-03-13T23:00:27.773Z","displayVersion":"v0.1.0+e26b09a"}`.
- `curl -sf http://20.106.185.110:8081/` served the updated lobby shell containing the current lobby polish markup.
- `pm2 logs app-dev --lines 8 --nostream` showed the active startup line for `v0.1.0+e26b09a`.

### Deployment record

| Field | Value |
|---|---|
| Commit | `e26b09ac16799ed5732754e01e0db5343c549fb7` |
| Short | `e26b09a` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T23:01:11Z` |
| Status | `SUCCESS` |


## Stakeholder review refresh redeploy — 2026-03-13T23:14:13Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the desktop lobby composition crowding fix is live for stakeholder review
- Requested fix commit: `198e1b0`
- Redeployed branch HEAD before deploy-log update:
  - full: `198e1b0267dc03bb64753923138b0c3ac3c54442`
  - short: `198e1b0`
- Dev URL: `http://20.106.185.110:8081/`
- Runtime: `pm2` process `app-dev` behind nginx on port `8081`, forwarding to local app on port `3001`

### Verification
- `git -C /home/rootagent/deployments/dev rev-parse HEAD` returned `198e1b0267dc03bb64753923138b0c3ac3c54442`.
- `curl -sf http://127.0.0.1:3001/build-info.json` returned `{"version":"0.1.0","commit":"198e1b0","builtAt":"2026-03-13T23:14:04.488Z","displayVersion":"v0.1.0+198e1b0"}`.
- `curl -sf http://20.106.185.110:8081/build-info.json` returned `{"version":"0.1.0","commit":"198e1b0","builtAt":"2026-03-13T23:14:04.488Z","displayVersion":"v0.1.0+198e1b0"}`.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- `pm2 logs app-dev --lines 8 --nostream` showed the active startup line for `v0.1.0+198e1b0`.

### Deployment record

| Field | Value |
|---|---|
| Commit | `198e1b0267dc03bb64753923138b0c3ac3c54442` |
| Short | `198e1b0` |
| Branch | `feature/issue-98` |
| Environment | `dev` |
| PM2 Process | `app-dev` |
| URL | `http://20.106.185.110:8081/` |
| Timestamp | `2026-03-13T23:14:13Z` |
| Status | `SUCCESS` |
