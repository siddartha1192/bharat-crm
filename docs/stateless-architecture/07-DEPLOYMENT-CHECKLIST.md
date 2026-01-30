# Deployment Checklist: Stateless CRM Architecture

## Pre-Deployment Checklist

### DigitalOcean Infrastructure

- [ ] **PostgreSQL Database**
  - [ ] Create Managed PostgreSQL cluster
  - [ ] Note connection string
  - [ ] Enable connection pooling
  - [ ] Configure daily backups
  - [ ] Set up firewall rules (VPC only)

- [ ] **Spaces (S3 Storage)**
  - [ ] Create Space for file storage
  - [ ] Generate API keys
  - [ ] Configure CORS policy
  - [ ] Optional: Enable CDN

- [ ] **Droplets/Servers**
  - [ ] Create Load Balancer droplet (2GB RAM)
  - [ ] Create App Server droplet #1 (2GB RAM)
  - [ ] Create App Server droplet #2 (2GB RAM)
  - [ ] Create Worker droplet (4GB RAM)
  - [ ] Set up private networking (VPC)
  - [ ] Configure firewalls

- [ ] **Networking**
  - [ ] Create VPC (e.g., 10.0.0.0/16)
  - [ ] Assign private IPs
  - [ ] Configure domain DNS
  - [ ] Set up floating IP for LB (optional)

### SSL/TLS Certificates

- [ ] Domain pointed to Load Balancer IP
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Certificate files in place
- [ ] HTTPS redirect configured

### Environment Configuration

- [ ] Copy `.env.stateless.example` to `.env`
- [ ] Generate JWT secrets (64+ chars)
- [ ] Generate ENCRYPTION_KEY (32 chars)
- [ ] Configure DATABASE_URL
- [ ] Configure REDIS_URL
- [ ] Configure S3/Spaces credentials
- [ ] Configure OpenAI API key
- [ ] Configure WhatsApp credentials
- [ ] Configure Google OAuth
- [ ] Configure email settings
- [ ] Set FRONTEND_URL to production domain

## Deployment Steps

### Step 1: Prepare Servers

```bash
# On each server
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
```

### Step 2: Clone Repository

```bash
git clone https://github.com/your-repo/bharat-crm.git
cd bharat-crm
```

### Step 3: Configure Environment

```bash
# Copy stateless architecture files
cp docs/stateless-architecture/docker-compose.stateless.yml ./
cp docs/stateless-architecture/nginx/nginx.stateless.conf ./nginx/
cp docs/stateless-architecture/backend/Dockerfile.stateless ./backend/
cp docs/stateless-architecture/backend/Dockerfile.worker ./backend/
cp docs/stateless-architecture/backend/worker.js ./backend/
cp docs/stateless-architecture/backend/*.sh ./backend/
cp docs/stateless-architecture/backend/supervisord.worker.conf ./backend/

# Configure environment
cp docs/stateless-architecture/.env.stateless.example .env
nano .env
```

### Step 4: Build Images

```bash
# Build all images
docker-compose -f docker-compose.stateless.yml build

# Verify images
docker images | grep crm
```

### Step 5: Start Infrastructure Services

```bash
# Start Redis first
docker-compose -f docker-compose.stateless.yml up -d redis

# Verify Redis
docker exec crm-redis redis-cli ping
```

### Step 6: Run Database Migrations

```bash
# Start one app server to run migrations
docker-compose -f docker-compose.stateless.yml up -d app-1

# Check migration logs
docker logs crm-app-1

# Verify database
docker exec crm-app-1 npx prisma migrate status
```

### Step 7: Start All Services

```bash
# Start all services
docker-compose -f docker-compose.stateless.yml up -d

# Verify all running
docker-compose -f docker-compose.stateless.yml ps
```

### Step 8: Configure SSL

```bash
# Create certbot webroot
mkdir -p nginx/certbot-webroot

# Request certificate
docker-compose -f docker-compose.stateless.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos

# Copy certificates
mkdir -p nginx/ssl
docker cp crm-certbot:/etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
docker cp crm-certbot:/etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Restart nginx
docker-compose -f docker-compose.stateless.yml restart nginx
```

### Step 9: Verify Deployment

```bash
# Test health endpoints
curl https://yourdomain.com/api/health
curl https://yourdomain.com/nginx-health

# Test WebSocket
wscat -c wss://yourdomain.com/socket.io/

# Check all services
docker-compose -f docker-compose.stateless.yml ps
docker-compose -f docker-compose.stateless.yml logs --tail=50
```

## Post-Deployment Verification

### Health Checks

- [ ] `GET /api/health` returns 200 on all app servers
- [ ] `GET /nginx-health` returns 200
- [ ] Worker health check passes
- [ ] Redis ping succeeds
- [ ] Database connection works

### Functional Tests

- [ ] User login works
- [ ] User registration works
- [ ] Dashboard loads
- [ ] Real-time updates work (WebSocket)
- [ ] File upload works (S3)
- [ ] File download works (signed URLs)
- [ ] Email sending works
- [ ] WhatsApp integration works

### Cron Job Tests

- [ ] Campaign scheduler runs (check worker logs)
- [ ] Lead reminders work
- [ ] Call scheduler processes queue
- [ ] Trial expiration check runs

### Load Balancing Tests

```bash
# Hit the API multiple times, check different instances respond
for i in {1..10}; do
  curl -s https://yourdomain.com/api/health | jq '.instance'
done
```

## Monitoring Setup

### Log Aggregation

```bash
# View all logs
docker-compose -f docker-compose.stateless.yml logs -f

# View specific service
docker-compose -f docker-compose.stateless.yml logs -f app-1 app-2

# View worker jobs
docker-compose -f docker-compose.stateless.yml logs -f worker | grep -E '\[Campaign\]|\[LeadReminder\]'
```

### Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| CPU Usage | Docker stats | > 80% |
| Memory Usage | Docker stats | > 85% |
| Response Time | Nginx logs | > 2s |
| Error Rate | Nginx logs | > 1% |
| DB Connections | PostgreSQL | > 80% of max |
| Redis Memory | Redis INFO | > 80% |

### Set Up Alerts

- [ ] Configure DigitalOcean monitoring
- [ ] Set up Uptime Robot for endpoint monitoring
- [ ] Configure email alerts for errors
- [ ] Set up Slack/Discord notifications

## Backup Procedures

### Database (Automatic)

DigitalOcean Managed PostgreSQL includes daily backups. Verify:
- [ ] Backup retention period (7 days minimum)
- [ ] Point-in-time recovery enabled

### Redis Backup

```bash
# Manual backup
docker exec crm-redis redis-cli BGSAVE
docker cp crm-redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb
```

### Qdrant Backup

```bash
# Create snapshot
curl -X POST http://localhost:6333/collections/bharat_crm_knowledge/snapshots

# List snapshots
curl http://localhost:6333/collections/bharat_crm_knowledge/snapshots
```

## Scaling Operations

### Add App Server

1. Update `docker-compose.stateless.yml`:
```yaml
app-3:
  # ... same as app-1/app-2
  environment:
    - APP_INSTANCE_ID=app-3
```

2. Update Nginx upstream:
```nginx
upstream app_servers {
    server app-1:3001;
    server app-2:3001;
    server app-3:3001;  # New
}
```

3. Deploy:
```bash
docker-compose -f docker-compose.stateless.yml up -d --no-deps app-3
docker exec crm-loadbalancer nginx -s reload
```

### Remove App Server

1. Remove from Nginx upstream
2. Reload Nginx
3. Wait for connections to drain (30s)
4. Stop container:
```bash
docker-compose -f docker-compose.stateless.yml stop app-3
docker-compose -f docker-compose.stateless.yml rm app-3
```

## Rollback Procedure

### Quick Rollback

```bash
# Stop stateless deployment
docker-compose -f docker-compose.stateless.yml down

# Start original deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

1. Go to DigitalOcean Dashboard
2. Select database cluster
3. Click "Restore from backup"
4. Choose restore point
5. Wait for restore to complete

## Maintenance Tasks

### Weekly

- [ ] Review error logs
- [ ] Check disk usage
- [ ] Verify backups completed
- [ ] Review performance metrics

### Monthly

- [ ] Update Docker images
- [ ] Review and rotate API keys
- [ ] Test backup restoration
- [ ] Security patch review

### Quarterly

- [ ] Rotate JWT secrets
- [ ] Rotate database password
- [ ] Review access permissions
- [ ] Capacity planning review

## Troubleshooting Quick Reference

| Issue | Check | Solution |
|-------|-------|----------|
| 502 Bad Gateway | App server health | Restart app containers |
| WebSocket disconnects | Redis connection | Check Redis, restart apps |
| Slow responses | Database connections | Check pool, increase limit |
| File upload fails | S3 credentials | Verify credentials, permissions |
| Cron jobs not running | Worker logs | Check Redis locks, restart worker |
| Login fails | JWT secrets | Verify JWT_SECRET matches |

## Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | |
| Database Admin | |
| DigitalOcean Support | support@digitalocean.com |

## Sign-Off

| Task | Completed By | Date |
|------|--------------|------|
| Infrastructure Setup | | |
| Environment Config | | |
| Deployment | | |
| SSL Setup | | |
| Testing | | |
| Monitoring Setup | | |
| Documentation Review | | |

---

**Deployment Completed**: [ ] Yes / [ ] No

**Notes**:

