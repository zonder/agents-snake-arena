# Deployment

## Two-Environment Model

| Env | PM2 | Port | nginx | Branch | Trigger |
|---|---|---|---|---|---|
| dev | app-dev | 3001 | :8081 | Feature branch | After code review |
| prod | app-prod | 3000 | :80 | main | After final approval |

### URLs
- Dev: https://dev.snakearena.website
- Prod: https://snakearena.website

## Infrastructure
- VM: Azure Ubuntu 24.04, 2 vCPU, 8GB RAM
- Process Manager: PM2 (auto-restart, log management)
- Reverse Proxy: nginx (WebSocket support)
- Deploy Root: ~/deployments/ (dev/ and prod/)

## Deploy Commands
bash scripts/deploy-env.sh dev feature/issue-N
bash scripts/deploy-env.sh prod main

Each deploy: pulls branch, npm ci, npm run build, pm2 restart, health check.

## Health Checks
pm2 list, pm2 logs app-dev/app-prod
curl http://localhost:3001/ (dev)
curl http://localhost:3000/ (prod)

## MVP Constraints
- Single Node.js instance per env (in-memory room state)
- No horizontal scaling
- Backend restart clears active rooms
- No database, anonymous access

## Future
- Domain + SSL (certbot)
- Dynamic feature subdomains
- Docker Compose migration
- Shared state store for scaling
