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

## Stakeholder review refresh redeploy — 2026-03-13T01:36:41Z
- Trigger: redeploy latest branch head for parent issue #99 / PR #102 so the redesigned lobby review build is live
- Previous dev commit:
  - full: 
  - short: 
- Redeployed commit:
  - full: 
  - short: 
- Dev URL: 
- Runtime: usage: pm2 [options] <command>

pm2 -h, --help             all available commands and options
pm2 examples               display pm2 usage examples
pm2 <command> -h           help on a specific command

Access pm2 files in ~/.pm2 process  behind nginx on port , forwarding to local app on port 

### Verification
- 5ef329aa8645e57b2e73afa99cb652b134dae788 now resolves to .
- [TAILING] Tailing last 30 lines for [app-dev] process (change the value with --lines option)
/home/rootagent/.pm2/logs/app-dev-error.log last 30 lines:
1|app-dev  | npm error errno -2
1|app-dev  | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/dev/package.json'
1|app-dev  | npm error enoent This is related to npm not being able to find a file.
1|app-dev  | npm error enoent
1|app-dev  | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_46_16_084Z-debug-0.log
1|app-dev  | npm error code ENOENT
1|app-dev  | npm error syscall open
1|app-dev  | npm error path /home/rootagent/deployments/dev/package.json
1|app-dev  | npm error errno -2
1|app-dev  | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/dev/package.json'
1|app-dev  | npm error enoent This is related to npm not being able to find a file.
1|app-dev  | npm error enoent
1|app-dev  | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_46_21_514Z-debug-0.log
1|app-dev  | npm error code ENOENT
1|app-dev  | npm error syscall open
1|app-dev  | npm error path /home/rootagent/deployments/dev/package.json
1|app-dev  | npm error errno -2
1|app-dev  | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/dev/package.json'
1|app-dev  | npm error enoent This is related to npm not being able to find a file.
1|app-dev  | npm error enoent
1|app-dev  | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_46_26_962Z-debug-0.log
1|app-dev  | npm error code ENOENT
1|app-dev  | npm error syscall open
1|app-dev  | npm error path /home/rootagent/deployments/dev/package.json
1|app-dev  | npm error errno -2
1|app-dev  | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/dev/package.json'
1|app-dev  | npm error enoent This is related to npm not being able to find a file.
1|app-dev  | npm error enoent
1|app-dev  | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_46_32_424Z-debug-0.log
1|app-dev  | sh: 1: tsx: not found

/home/rootagent/.pm2/logs/app-dev-out.log last 30 lines:
1|app-dev  | 
1|app-dev  | > my-test-startup@0.1.0 start
1|app-dev  | > tsx src/server/index.ts
1|app-dev  | 
1|app-dev  | Room lobby server listening on http://localhost:3001 (v0.1.0+b5907d5)
1|app-dev  | 
1|app-dev  | > my-test-startup@0.1.0 start
1|app-dev  | > tsx src/server/index.ts
1|app-dev  | 
1|app-dev  | Room lobby server listening on http://localhost:3001 (v0.1.0+b5907d5)
1|app-dev  | 
1|app-dev  | > my-test-startup@0.1.0 start
1|app-dev  | > tsx src/server/index.ts
1|app-dev  | 
1|app-dev  | Room lobby server listening on http://localhost:3001 (v0.1.0+355e94d)
1|app-dev  | 
1|app-dev  | > my-test-startup@0.1.0 start
1|app-dev  | > tsx src/server/index.ts
1|app-dev  | 
1|app-dev  | Room lobby server listening on http://localhost:3001 (v0.1.0+a8a8aff)
1|app-dev  | 
1|app-dev  | > my-test-startup@0.1.0 start
1|app-dev  | > tsx src/server/index.ts
1|app-dev  | 
1|app-dev  | Room lobby server listening on http://localhost:3001 (v0.1.0+c1352c4)
1|app-dev  | 
1|app-dev  | > my-test-startup@0.1.0 start
1|app-dev  | > tsx src/server/index.ts
1|app-dev  | 
1|app-dev  | Room lobby server listening on http://localhost:3001 (v0.1.0+5ef329a) shows the active startup line: .
- {"version":"0.1.0","commit":"5ef329a","builtAt":"2026-03-13T01:35:35.579Z","displayVersion":"v0.1.0+5ef329a"} returned .
- {"version":"0.1.0","commit":"5ef329a","builtAt":"2026-03-13T01:35:35.579Z","displayVersion":"v0.1.0+5ef329a"} returned the same live build marker: .
- HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: Fri, 13 Mar 2026 01:36:42 GMT
Content-Type: text/html; charset=utf-8
Connection: keep-alive
Cache-Control: no-store, max-age=0
 returned .

### Latest deployment record

| Field | Value |
|---|---|
| Commit |  |
| Short |  |
| Branch |  |
| Environment |  |
| PM2 Process |  |
| URL |  |
| Timestamp |  |
| Status |  |
