# Dev deployment log — Core Gameplay Loop

## Deployment target
- Parent issue: `#10`
- PR: `#12`
- Branch: `feature/issue-10`
- Feature slug: `core-gameplay-loop`
- Environment: `dev`
- Dev URL: `http://20.106.185.110:8081/`
- Deployed commit: `d9b11bb`
- Deployed at (UTC): `2026-03-11 22:54`

## Deployment actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-10
git checkout feature/issue-10 || git checkout -b feature/issue-10 origin/feature/issue-10
git reset --hard origin/feature/issue-10
npm ci
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

## Validation
### Pre-deploy verification
```bash
npm ci
npm test
npm run build
```

Results:
- `vitest`: 2 test files passed / 10 tests passed
- TypeScript build completed successfully

### Runtime health checks
```bash
pm2 list
curl -I http://127.0.0.1:3001/
curl -I http://20.106.185.110:8081/
curl 'http://20.106.185.110:8081/socket.io/?EIO=4&transport=polling'
```

Results:
- `app-dev` is `online` in PM2
- local app on `127.0.0.1:3001` returned `HTTP/1.1 200 OK`
- public dev URL returned `HTTP/1.1 200 OK` through nginx
- Socket.IO polling handshake returned a valid session payload

### Gameplay-path socket verification
A two-client live socket check was run against the deployed dev URL to confirm the gameplay-relevant path beyond a bare handshake.

Verified sequence:
1. Player 1 created room `WTYZ`
2. Player 2 joined the room
3. Both players marked ready
4. Server emitted countdown events `3 → 2 → 1 → 0`
5. Server emitted `game:start` with authoritative tick interval
6. Server emitted `game:state` with `phase: in-progress` and `tickNumber: 1`

This confirms the deployed environment is serving both the app shell and the gameplay socket flow required to enter an active round.

## Notes
- The first immediate localhost curl right after PM2 restart failed during process warm-up, but a follow-up check seconds later succeeded with the process stable and online.
- No merge was performed.

---

## Dev refresh update
- Refresh reason: stakeholder reported dev looked stale and did not reflect the latest lobby-hiding change
- Previous deployed commit found on server checkout: `d9b11bb`
- Refreshed deployed commit: `e7397cb` (`Hide lobby UI during active game states`)
- Refreshed at (UTC): `2026-03-11 23:33`
- Dev URL: `http://20.106.185.110:8081/`

### Refresh actions
```bash
cd /home/rootagent/deployments/dev
git fetch origin feature/issue-10
git checkout feature/issue-10 || git checkout -b feature/issue-10 origin/feature/issue-10
git reset --hard origin/feature/issue-10
npm ci
npm test
npm run build
pm2 startOrRestart /home/rootagent/deployments/ecosystem.config.js --only app-dev
pm2 save
```

### Refresh validation
- Server deployment checkout now resolves to `e7397cb7e3d038a849e7c71e2c91969aee88bde7`.
- `npm test` passed: 2 test files / 10 tests.
- `npm run build` passed.
- `pm2 list` shows `app-dev` online after restart.
- `curl -I http://127.0.0.1:3001/` returned `HTTP/1.1 200 OK` after warm-up.
- `curl -I http://20.106.185.110:8081/` returned `HTTP/1.1 200 OK`.
- Live `http://20.106.185.110:8081/app.js` now contains the updated gameplay-screen switch:
  - `const gameplayFocused = state.phase === 'starting' || state.phase === 'in-progress' || state.phase === 'game-over';`
  - `showScreen(gameplayFocused ? 'gameplay' : 'lobby');`

### Caching / stale-asset conclusion
- The stale behavior was caused by the dev server checkout itself still being on old commit `d9b11bb`, not by a mismatched feature-branch HEAD.
- This app serves non-fingerprinted static assets such as `/app.js`, so browser caching can potentially confuse verification, but the server-side deploy target was definitively outdated before the refresh.
- After resetting the dev checkout to `origin/feature/issue-10` and restarting PM2, the public dev URL served the updated client code from `e7397cb`.

---

## Dev refresh update
- Refresh reason: publish latest gameplay UI fixes together for stakeholder review
- Refreshed deployed commit:   - full:                                                                 d006d267a1a8bd1665b533ccedb200fbedcda739
  - short:     d006d26
- Refreshed at (UTC):   2026-03-11 23:57
- Dev URL:   http://20.106.185.110:8081/

### Refresh validation
- Dev deploy checkout reset to       origin/feature/issue-10 at   d006d26.
-             npm test passed: 2 test files / 10 tests.
- npm run build passed.
- pm2 restart completed with               app-dev online.
- Local health check on http://127.0.0.1:3001/ returned HTTP 200.
- Public health check on http://20.106.185.110:8081/ returned HTTP 200.
- Socket.IO polling handshake succeeded on /socket.io/.
- Live /build-info.json returned:       {"version":"0.1.0","commit":"d006d26","builtAt":"2026-03-11T23:56:25.465Z","displayVersion":"v0.1.0+d006d26"}
- Live /app.js contains gameplay-focused screen switching:   yes
- Live /app.js contains transient message helper:   no
