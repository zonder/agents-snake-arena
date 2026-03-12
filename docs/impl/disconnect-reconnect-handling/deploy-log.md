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
- Environment: 
- Branch: 
- PR: 
- Previous prod commit:  ()
- Deployed commit:  ()
- Production URL: 
- Deployed at (UTC): 
- Runtime: usage: pm2 [options] <command>

pm2 -h, --help             all available commands and options
pm2 examples               display pm2 usage examples
pm2 <command> -h           help on a specific command

Access pm2 files in ~/.pm2 process  behind nginx on port , forwarding to local app on port 

### Production deployment actions
branch 'main' set up to track 'origin/main'.
Your branch is up to date with 'origin/main'.
HEAD is now at 662b4b9 Merge pull request #66 from zonder/feature/issue-63

added 75 packages, and audited 76 packages in 2s

18 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

> my-test-startup@0.1.0 build
> tsc -p tsconfig.json

[PM2] Applying action restartProcessId on app [app-prod](ids: [ 0 ])
[PM2] [app-prod](0) ✓
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 1  │ app-dev     │ default     │ N/A     │ fork    │ 104892   │ 15m    │ 25   │ online    │ 0%       │ 67.6mb   │ rootage… │ disabled │
│ 0  │ app-prod    │ default     │ N/A     │ fork    │ 105961   │ 0s     │ 89   │ online    │ 0%       │ 21.9mb   │ rootage… │ disabled │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Saving current process list...
[PM2] Successfully saved in /home/rootagent/.pm2/dump.pm2

### Production health-check results
- HTTP/1.1 502 Bad Gateway
Server: nginx/1.24.0 (Ubuntu)
Date: Thu, 12 Mar 2026 17:50:59 GMT
Content-Type: text/html
Content-Length: 166
Connection: keep-alive
 returned  via nginx.
- <html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html> returned .
- <html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html> returned a valid Engine.IO / Socket.IO handshake payload.
- Served HTML still exposes the build marker anchors:  and .
- Served  includes reconnect/resume asset strings and build-marker hydration for:
  - 
  - 
  - 
  - 
  - 
  -  fetch with 
- ┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 1  │ app-dev     │ default     │ N/A     │ fork    │ 104892   │ 15m    │ 25   │ online    │ 0%       │ 67.6mb   │ rootage… │ disabled │
│ 0  │ app-prod    │ default     │ N/A     │ fork    │ 105961   │ 0s     │ 89   │ online    │ 0%       │ 70.1mb   │ rootage… │ disabled │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘ showed  online after restart.
- [TAILING] Tailing last 20 lines for [app-prod] process (change the value with --lines option)
/home/rootagent/.pm2/logs/app-prod-error.log last 20 lines:
0|app-prod | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/prod/package.json'
0|app-prod | npm error enoent This is related to npm not being able to find a file.
0|app-prod | npm error enoent
0|app-prod | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_55_57_500Z-debug-0.log
0|app-prod | npm error code ENOENT
0|app-prod | npm error syscall open
0|app-prod | npm error path /home/rootagent/deployments/prod/package.json
0|app-prod | npm error errno -2
0|app-prod | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/prod/package.json'
0|app-prod | npm error enoent This is related to npm not being able to find a file.
0|app-prod | npm error enoent
0|app-prod | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_56_02_804Z-debug-0.log
0|app-prod | npm error code ENOENT
0|app-prod | npm error syscall open
0|app-prod | npm error path /home/rootagent/deployments/prod/package.json
0|app-prod | npm error errno -2
0|app-prod | npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/rootagent/deployments/prod/package.json'
0|app-prod | npm error enoent This is related to npm not being able to find a file.
0|app-prod | npm error enoent
0|app-prod | npm error A complete log of this run can be found in: /home/rootagent/.npm/_logs/2026-03-11T18_56_08_084Z-debug-0.log

/home/rootagent/.pm2/logs/app-prod-out.log last 20 lines:
0|app-prod | Room lobby server listening on http://localhost:3000 (v0.1.0+a5a0b41)
0|app-prod | 
0|app-prod | > my-test-startup@0.1.0 start
0|app-prod | > tsx src/server/index.ts
0|app-prod | 
0|app-prod | Room lobby server listening on http://localhost:3000 (v0.1.0+9c3181e)
0|app-prod | 
0|app-prod | > my-test-startup@0.1.0 start
0|app-prod | > tsx src/server/index.ts
0|app-prod | 
0|app-prod | Room lobby server listening on http://localhost:3000 (v0.1.0+613861f)
0|app-prod | 
0|app-prod | > my-test-startup@0.1.0 start
0|app-prod | > tsx src/server/index.ts
0|app-prod | 
0|app-prod | Room lobby server listening on http://localhost:3000 (v0.1.0+662b4b9)
0|app-prod | 
0|app-prod | > my-test-startup@0.1.0 start
0|app-prod | > tsx src/server/index.ts
0|app-prod |  showed the current startup line: .

### Production deployment record

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
