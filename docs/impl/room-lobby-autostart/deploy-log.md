# Deploy Log: room-lobby-autostart

## Parent / PR context
- Parent issue: #3
- PR: #7
- Branch: `feature/issue-3`
- Feature slug: `room-lobby-autostart`

## Deployment status
Local single-instance deployment is running and publicly reachable through a temporary tunnel.

This keeps the app in the required **single-instance** topology: one local Node process holds all in-memory room state, and the public URL forwards traffic into that same process.

## Deployment shape
- Runtime model: single local Node process
- Public exposure: `localtunnel` TCP/HTTP tunnel to the local process
- Horizontal scaling: **not used**
- Stability of public URL: **temporary / best-effort**, not production-stable

## Public / local endpoints
- Public UI URL: `https://huge-lemons-rule.loca.lt`
- Local bind: `0.0.0.0:3000` via Node HTTP server (`http://127.0.0.1:3000/` verified locally)
- Socket.IO endpoint: same origin at `/socket.io/`

## Exact run commands
From the feature branch checkout:

```bash
cd /home/rootagent/openclaw-startup-factory/openclaw/state/checkouts/devops/current
npm ci
npm start
```

Public tunnel command:

```bash
cd /home/rootagent/openclaw-startup-factory/openclaw/state/checkouts/devops/current
npx localtunnel --port 3000
```

## Active background process info
### App server
Observed running process:

```text
/usr/bin/node --require /home/rootagent/openclaw-startup-factory/openclaw/state/checkouts/devops/issue-3/node_modules/tsx/dist/preflight.cjs --import file:///home/rootagent/openclaw-startup-factory/openclaw/state/checkouts/devops/issue-3/node_modules/tsx/dist/loader.mjs src/server/index.ts
```

Observed listener:

```text
*:3000
```

### Public tunnel
Observed running process:

```text
npm exec localtunnel --port 3000
```

Assigned temporary URL:

```text
https://huge-lemons-rule.loca.lt
```

## Health-check results
### Build / test health
Verified previously on this branch:
- `npm ci` ✅
- `npm test` ✅ (4 tests passed)
- `npm run build` ✅

### Local runtime health
Checks:

```bash
curl -I http://127.0.0.1:3000/
```

Result:
- `HTTP/1.1 200 OK` ✅

### Public UI health
Checks:

```bash
curl -I https://huge-lemons-rule.loca.lt/
curl https://huge-lemons-rule.loca.lt/ | head
```

Result:
- `HTTP/1.1 200 OK` ✅
- returned the lobby HTML shell successfully ✅

### Public Socket.IO health
Checks:

```bash
curl 'https://huge-lemons-rule.loca.lt/socket.io/?EIO=4&transport=polling'
```

Result:
- returned valid Socket.IO handshake payload with a `sid` and `upgrades:["websocket"]` ✅

## Operational notes
- This deployment satisfies the stakeholder request for a **local deployment with a public UI URL**.
- Because room state is stored in memory, this must remain a **single Node instance**. The tunnel preserves that model.
- The public URL is **temporary** and may change if the tunnel process restarts.
- If the local app process stops, the public URL will no longer serve traffic.
- If the tunnel process stops, the app remains available locally but loses public reachability.
- Server restarts will clear active room state.

## Minimal remaining human action
No additional human step is required for this temporary MVP exposure **while the current local server and tunnel processes remain running**.

If a longer-lived or branded URL is needed later, the minimal follow-up would be to choose a persistent tunnel / edge provider or deploy the same single-instance Node service onto one websocket-capable host.

## Recommended PM wording
> ✅ Feature #3 is now deployed as a **single local instance** with a **public temporary URL**: https://huge-lemons-rule.loca.lt
> 
> The app is running locally on port 3000 and exposed through a tunnel, so it keeps the required in-memory single-instance room state. Health checks passed for the local root endpoint, the public UI, and the Socket.IO handshake.
> 
> Note: this URL is **temporary**, not a stable production address. If the local process or tunnel restarts, the public URL may change and active rooms will reset.

---

## Production deployment update (main)
- Deployed branch: `main`
- Deployed commit: `f739a5a` (`Merge pull request #7 from zonder/feature/issue-3`)
- Production URL: `http://20.106.185.110/`
- Runtime: `pm2` process `app-prod` behind nginx on port 80, forwarding to local app on port 3000

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
Checks:

```bash
pm2 list
curl -I http://127.0.0.1:3000/
curl -I http://20.106.185.110/
curl 'http://20.106.185.110/socket.io/?EIO=4&transport=polling'
```

Results:
- `app-prod` is `online` in PM2 ✅
- local app on `http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK` ✅
- public prod URL `http://20.106.185.110/` returned `HTTP/1.1 200 OK` via nginx ✅
- Socket.IO polling handshake returned a valid session payload ✅

### Production blocker resolved during deploy
Before deployment, `app-prod` was failing because `/home/rootagent/deployments/prod/package.json` was missing from the prod checkout. Syncing `origin/main` into `~/deployments/prod` resolved the startup failure.
