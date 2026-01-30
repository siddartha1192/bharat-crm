# Stateless CRM Architecture Documentation

This folder contains comprehensive documentation for deploying Bharat CRM in a stateless, horizontally-scalable architecture using Docker and DigitalOcean.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   INTERNET                                       │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │     LOAD BALANCER        │
                          │        (Nginx)           │
                          │   - SSL Termination      │
                          │   - Health Checks        │
                          │   - Rate Limiting        │
                          └────────────┬─────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
               ▼                       ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
    │   APP SERVER 1   │    │   APP SERVER 2   │    │     WORKER       │
    │   (Stateless)    │    │   (Stateless)    │    │                  │
    │                  │    │                  │    │  - Cron Jobs     │
    │  - REST API      │    │  - REST API      │    │  - Campaigns     │
    │  - WebSocket     │    │  - WebSocket     │    │  - Reminders     │
    │  - No Local      │    │  - No Local      │    │  - Qdrant DB     │
    │    State         │    │    State         │    │                  │
    └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐       ┌──────────────────────┐      ┌───────────────────┐
│     REDIS       │       │  DIGITALOCEAN        │      │  DIGITALOCEAN     │
│                 │       │  MANAGED DB          │      │  SPACES (S3)      │
│ - Sessions      │       │  (PostgreSQL)        │      │                   │
│ - Socket.IO     │       │                      │      │ - File Storage    │
│ - Locks         │       │ - Primary Data       │      │ - Documents       │
│ - Cache         │       │ - Auto Backups       │      │ - Media           │
└─────────────────┘       └──────────────────────┘      └───────────────────┘
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [01-ARCHITECTURE-OVERVIEW.md](./01-ARCHITECTURE-OVERVIEW.md) | Detailed architecture design, component responsibilities, scaling strategy |
| [02-DOCKER-COMPOSE.md](./02-DOCKER-COMPOSE.md) | Docker Compose configuration guide and service definitions |
| [03-NGINX-CONFIG.md](./03-NGINX-CONFIG.md) | Load balancer configuration, SSL setup, rate limiting |
| [04-WORKER-CONFIG.md](./04-WORKER-CONFIG.md) | Worker server setup, cron jobs, distributed locking |
| [05-ENVIRONMENT-GUIDE.md](./05-ENVIRONMENT-GUIDE.md) | Environment variables, secrets management, service credentials |
| [06-MIGRATION-GUIDE.md](./06-MIGRATION-GUIDE.md) | Code changes required, migration scripts, rollback plan |
| [07-DEPLOYMENT-CHECKLIST.md](./07-DEPLOYMENT-CHECKLIST.md) | Step-by-step deployment guide, verification tests |

## Configuration Files

| File | Purpose |
|------|---------|
| [docker-compose.stateless.yml](./docker-compose.stateless.yml) | Main Docker Compose for stateless deployment |
| [.env.stateless.example](./.env.stateless.example) | Environment variable template |
| [nginx/nginx.stateless.conf](./nginx/nginx.stateless.conf) | Nginx load balancer configuration |
| [backend/Dockerfile.stateless](./backend/Dockerfile.stateless) | Stateless app server Dockerfile |
| [backend/Dockerfile.worker](./backend/Dockerfile.worker) | Worker server Dockerfile |
| [backend/worker.js](./backend/worker.js) | Worker entry point with cron jobs |
| [backend/supervisord.worker.conf](./backend/supervisord.worker.conf) | Supervisor configuration for worker |

## Quick Start

```bash
# 1. Copy configuration files to project root
cp docs/stateless-architecture/docker-compose.stateless.yml ./
cp docs/stateless-architecture/.env.stateless.example ./.env
cp -r docs/stateless-architecture/nginx ./
cp docs/stateless-architecture/backend/Dockerfile.* ./backend/
cp docs/stateless-architecture/backend/worker.js ./backend/
cp docs/stateless-architecture/backend/*.sh ./backend/
cp docs/stateless-architecture/backend/supervisord.worker.conf ./backend/

# 2. Configure environment variables
nano .env

# 3. Build and deploy
docker-compose -f docker-compose.stateless.yml up -d --build

# 4. Verify deployment
curl http://localhost/api/health
```

## Key Benefits

### Horizontal Scalability
- Add/remove app servers based on load
- No code changes required for scaling
- Zero-downtime deployments

### High Availability
- Load balancer distributes traffic
- Automatic health checks
- Failed servers removed from rotation

### Managed Services
- DigitalOcean PostgreSQL: Automatic backups, failover
- DigitalOcean Spaces: Reliable object storage
- No database administration overhead

### Cost Efficiency
- Start small (~$107/month)
- Scale resources as needed
- Pay only for what you use

## Estimated Monthly Costs

| Component | Specification | Cost |
|-----------|--------------|------|
| Load Balancer | Nginx on 1GB Droplet | $6 |
| App Server x2 | 2GB RAM each | $24 |
| Worker | 4GB RAM | $24 |
| Redis | 1GB | $15 |
| Managed PostgreSQL | Basic | $15 |
| Spaces | 250GB + Transfer | $5 |
| **Total** | | **~$89/month** |

## Support

For questions or issues:
1. Review the documentation in this folder
2. Check the troubleshooting sections in each guide
3. Open an issue in the repository

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial stateless architecture documentation |
