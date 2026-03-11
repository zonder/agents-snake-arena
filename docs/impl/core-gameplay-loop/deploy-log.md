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
