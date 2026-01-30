# Docker Compose Configuration Guide

## Overview

The `docker-compose.stateless.yml` file defines the complete stateless architecture for Bharat CRM. This guide explains each component and how to use it.

## Quick Start

```bash
# 1. Copy environment file
cp .env.stateless.example .env

# 2. Configure your environment variables
nano .env

# 3. Build and start all services
docker-compose -f docker-compose.stateless.yml up -d --build

# 4. View logs
docker-compose -f docker-compose.stateless.yml logs -f

# 5. Scale app servers (optional)
docker-compose -f docker-compose.stateless.yml up -d --scale app-1=1 --scale app-2=1 --no-recreate
```

## Service Definitions

### Networks

```yaml
networks:
  crm-frontend:    # Public-facing network (Nginx, Frontend)
  crm-backend:     # Internal network (App servers, Worker, Redis)
    internal: true # No external access
```

### Volumes

| Volume | Purpose | Persistence |
|--------|---------|-------------|
| `redis_data` | Redis AOF persistence | Required |
| `qdrant_data` | Vector database storage | Required |
| `nginx_certs` | SSL certificates | Required |
| `nginx_logs` | Access/error logs | Optional |

## Service Details

### 1. Nginx Load Balancer

```yaml
nginx:
  image: nginx:1.25-alpine
  ports:
    - "80:80"
    - "443:443"
```

**Features:**
- Round-robin load balancing
- WebSocket support with sticky sessions
- SSL termination
- Health check monitoring
- Rate limiting

**Health Check:**
```yaml
healthcheck:
  test: ["CMD", "nginx", "-t"]
  interval: 30s
```

### 2. App Servers (x2)

```yaml
app-1:
  build:
    context: ./backend
    dockerfile: Dockerfile.stateless
  environment:
    - IS_WORKER=false
```

**Key Environment Variables:**
| Variable | Description |
|----------|-------------|
| `APP_INSTANCE_ID` | Unique identifier (app-1, app-2) |
| `IS_WORKER` | Set to `false` for app servers |
| `REDIS_URL` | Redis connection for Socket.IO |
| `DATABASE_URL` | PostgreSQL connection string |

**Resource Limits:**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1024M
```

### 3. Worker Server

```yaml
worker:
  build:
    context: ./backend
    dockerfile: Dockerfile.worker
  environment:
    - IS_WORKER=true
```

**Responsibilities:**
- Campaign scheduler (every minute)
- Lead reminder scheduler
- Call queue processor (every 30 seconds)
- Trial expiration checker (hourly)
- Vector database (Qdrant) hosting

**Resource Limits:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 4096M  # Higher for Qdrant
```

### 4. Redis

```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --appendonly yes
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

**Configuration:**
| Setting | Value | Purpose |
|---------|-------|---------|
| `appendonly` | yes | Persistence |
| `maxmemory` | 512mb | Memory limit |
| `maxmemory-policy` | allkeys-lru | Eviction policy |

## Scaling Operations

### Scale App Servers

```bash
# Add more app servers
docker-compose -f docker-compose.stateless.yml up -d --scale app=4

# Reduce app servers
docker-compose -f docker-compose.stateless.yml up -d --scale app=2
```

### Zero-Downtime Deployment

```bash
# 1. Build new image
docker-compose -f docker-compose.stateless.yml build app-1 app-2

# 2. Rolling update (one at a time)
docker-compose -f docker-compose.stateless.yml up -d --no-deps app-1
# Wait for health check...
docker-compose -f docker-compose.stateless.yml up -d --no-deps app-2
```

## Health Checks

### App Server Health
```bash
curl http://localhost/api/health
# Response: {"status":"ok","timestamp":"...","instance":"app-1"}
```

### Redis Health
```bash
docker exec crm-redis redis-cli ping
# Response: PONG
```

### Worker Health
```bash
docker exec crm-worker wget -qO- http://localhost:3002/health
# Response: {"status":"ok","jobs":{"campaign":true,"leadReminder":true}}
```

## Logging

All services use JSON logging with rotation:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.stateless.yml logs -f

# Specific service
docker-compose -f docker-compose.stateless.yml logs -f app-1

# Worker logs (for debugging jobs)
docker-compose -f docker-compose.stateless.yml logs -f worker
```

## Maintenance Commands

### Backup Redis
```bash
docker exec crm-redis redis-cli BGSAVE
docker cp crm-redis:/data/dump.rdb ./backup/redis-$(date +%Y%m%d).rdb
```

### Backup Qdrant
```bash
docker exec crm-worker curl -X POST http://localhost:6333/collections/bharat_crm_knowledge/snapshots
```

### Clear Redis Cache
```bash
# Flush specific database
docker exec crm-redis redis-cli -n 1 FLUSHDB

# View Redis memory
docker exec crm-redis redis-cli INFO memory
```

### Database Migrations
```bash
# Run on any app server
docker exec crm-app-1 npx prisma migrate deploy
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.stateless.yml logs app-1

# Check health
docker inspect crm-app-1 | jq '.[0].State.Health'
```

### Connection Issues
```bash
# Test internal network
docker exec crm-app-1 ping redis
docker exec crm-app-1 ping worker
```

### High Memory Usage
```bash
# Check container stats
docker stats crm-app-1 crm-app-2 crm-worker crm-redis

# Restart specific service
docker-compose -f docker-compose.stateless.yml restart app-1
```

## Production Checklist

- [ ] Configure real DATABASE_URL for DigitalOcean Managed PostgreSQL
- [ ] Set up S3/Spaces credentials for file storage
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set strong JWT secrets (minimum 64 characters)
- [ ] Configure external services (WhatsApp, Google OAuth)
- [ ] Set up monitoring and alerting
- [ ] Configure backup schedules
- [ ] Test health checks
- [ ] Verify all environment variables
