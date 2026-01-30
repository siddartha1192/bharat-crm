# Hostinger VPS - Stateless Enterprise Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              HOSTINGER VPS                                    │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    NGINX (Load Balancer)                             │   │
│   │                      Port 80 / 443                                   │   │
│   │   - SSL Termination  - Rate Limiting  - Health Checks               │   │
│   └────────────────────────────┬────────────────────────────────────────┘   │
│                                │                                             │
│          ┌─────────────────────┼─────────────────────┐                      │
│          │                     │                     │                      │
│          ▼                     ▼                     ▼                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │   APP-1      │     │   APP-2      │     │   FRONTEND   │               │
│   │  (Stateless) │     │  (Stateless) │     │   (React)    │               │
│   │  Port 3001   │     │  Port 3001   │     │   Port 80    │               │
│   └──────┬───────┘     └──────┬───────┘     └──────────────┘               │
│          │                    │                                             │
│          └────────────┬───────┘                                             │
│                       │                                                     │
│          ┌────────────┴────────────┐                                       │
│          │                         │                                       │
│          ▼                         ▼                                       │
│   ┌──────────────┐         ┌──────────────┐                                │
│   │    REDIS     │         │   WORKER     │                                │
│   │              │         │              │                                │
│   │ - Sessions   │         │ - Cron Jobs  │                                │
│   │ - Socket.IO  │         │ - Campaigns  │                                │
│   │ - Locks      │         │ - Qdrant DB  │                                │
│   │   Port 6379  │         │   Port 3002  │                                │
│   └──────────────┘         └──────────────┘                                │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │   DIGITALOCEAN        │
                          │   Managed PostgreSQL  │
                          │                       │
                          │   Port 25060 (SSL)    │
                          └───────────────────────┘
```

## Why This Architecture?

| Feature | Benefit |
|---------|---------|
| **2 App Servers** | High availability - if one fails, the other handles traffic |
| **Load Balancer** | Distributes traffic evenly, SSL termination |
| **Worker Server** | Background jobs run once (not duplicated) |
| **Redis** | Shared session state across app servers |
| **Managed DB** | Automatic backups, no maintenance overhead |

---

## PART 1: DIGITALOCEAN DATABASE SETUP

### Step 1.1: Create Managed PostgreSQL Database

1. Go to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **Create** → **Databases**
3. Configure:
   - **Engine**: PostgreSQL 15
   - **Plan**: Basic ($15/month) - 1GB RAM, 10GB storage
   - **Datacenter**: Choose closest to your Hostinger VPS (e.g., Frankfurt, Singapore)
   - **Name**: `crm-database`
4. Click **Create Database Cluster**
5. Wait ~5 minutes for provisioning

### Step 1.2: Save Connection String

1. Go to **Databases** → **crm-database**
2. Click **Connection Details**
3. Copy the **Connection String** (looks like):
   ```
   postgresql://doadmin:XXXX@db-postgresql-xxx-do-user-xxx-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```
4. **SAVE THIS** - you need it for `.env`

### Step 1.3: Configure Trusted Sources (IMPORTANT!)

1. In DigitalOcean, go to **Databases** → **crm-database** → **Settings**
2. Under **Trusted Sources**, click **Edit**
3. **Add your Hostinger VPS IP address**
4. Click **Save**

> Without this, your app cannot connect to the database!

---

## PART 2: HOSTINGER VPS SETUP

### Step 2.1: Requirements

- **VPS Plan**: KVM 4 or higher recommended (8GB RAM, 4 vCPUs)
- **OS**: Ubuntu 22.04 LTS
- **Minimum RAM**: 4GB (8GB recommended for production)

### Step 2.2: Point Domain to Hostinger

Update DNS A records at your domain registrar:
```
Type: A    Name: @      Value: YOUR_HOSTINGER_IP
Type: A    Name: www    Value: YOUR_HOSTINGER_IP
```

Wait 5-30 minutes for DNS propagation.

### Step 2.3: SSH into Hostinger VPS

```bash
ssh root@YOUR_HOSTINGER_IP
```

### Step 2.4: Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install prerequisites
apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

---

## PART 3: DEPLOY THE APPLICATION

### Step 3.1: Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/bharat-crm.git
cd bharat-crm
```

### Step 3.2: Create Environment File

```bash
# Copy example file
cp .env.hostinger.example .env

# Edit with your values
nano .env
```

### Step 3.3: Fill in Environment Variables

Edit `.env` with these required values:

```bash
# ===========================================
# DOMAIN (Replace with your actual domain)
# ===========================================
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com

# ===========================================
# DIGITALOCEAN DATABASE (From Step 1.2)
# ===========================================
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@YOUR_HOST:25060/defaultdb?sslmode=require

# ===========================================
# SECURITY KEYS (Generate with commands below)
# ===========================================
JWT_SECRET=<run: openssl rand -hex 32>
JWT_REFRESH_SECRET=<run: openssl rand -hex 32>
ENCRYPTION_KEY=<run: openssl rand -hex 16>

# ===========================================
# OPENAI (Required for AI features)
# ===========================================
OPENAI_API_KEY=sk-your-openai-key

# ===========================================
# WHATSAPP (From Meta Business Suite)
# ===========================================
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any-random-string

# ===========================================
# GOOGLE OAUTH (From Google Cloud Console)
# ===========================================
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/callback
GOOGLE_AUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# ===========================================
# GMAIL
# ===========================================
GMAIL_USER=your-email@gmail.com
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# ===========================================
# COMPANY
# ===========================================
COMPANY_NAME=Your Company Name
OWNER_EMAIL=admin@yourdomain.com
```

### Step 3.4: Generate Security Keys

```bash
# Generate and copy these into your .env file

# JWT_SECRET
echo "JWT_SECRET=$(openssl rand -hex 32)"

# JWT_REFRESH_SECRET
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"

# ENCRYPTION_KEY (must be 32 chars)
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

---

## PART 4: SSL CERTIFICATE SETUP

### Step 4.1: Create Self-Signed Certificate (Initial Setup)

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Step 4.2: Build and Start Services

```bash
# Build and start all containers
docker-compose -f docker-compose.stateless.yml up -d --build

# This will take 5-10 minutes on first run
```

### Step 4.3: Get Let's Encrypt Certificate (Production)

After the initial deployment works:

```bash
# Stop nginx temporarily
docker-compose -f docker-compose.stateless.yml stop nginx

# Get real SSL certificate
docker run -it --rm \
  -v $(pwd)/certbot_data:/var/www/certbot \
  -v $(pwd)/certbot_conf:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email

# Copy certificates
cp certbot_conf/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp certbot_conf/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Start nginx
docker-compose -f docker-compose.stateless.yml up -d nginx
```

---

## PART 5: VERIFY DEPLOYMENT

### Step 5.1: Check All Containers

```bash
docker-compose -f docker-compose.stateless.yml ps
```

Expected output:
```
NAME            STATUS              PORTS
crm-app-1       Up (healthy)        3001/tcp
crm-app-2       Up (healthy)        3001/tcp
crm-frontend    Up (healthy)        80/tcp
crm-nginx       Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
crm-redis       Up (healthy)        6379/tcp
crm-worker      Up (healthy)        3002/tcp, 6333/tcp
crm-certbot     Up
```

### Step 5.2: Check Service Health

```bash
# Check nginx health
curl -k https://localhost/nginx-health

# Check backend health (through load balancer)
curl -k https://localhost/api/health

# Check worker health
docker exec crm-worker wget -qO- http://localhost:3002/health
```

### Step 5.3: View Logs

```bash
# All logs
docker-compose -f docker-compose.stateless.yml logs -f

# Specific service
docker-compose -f docker-compose.stateless.yml logs -f app-1
docker-compose -f docker-compose.stateless.yml logs -f app-2
docker-compose -f docker-compose.stateless.yml logs -f worker
docker-compose -f docker-compose.stateless.yml logs -f nginx
```

### Step 5.4: Test Load Balancing

```bash
# Make multiple requests and check which app server responds
for i in {1..10}; do
  curl -sk https://localhost/api/health | grep instance
done
```

You should see responses from both `app-1` and `app-2`.

---

## PART 6: COMMON COMMANDS

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.stateless.yml restart

# Restart specific service
docker-compose -f docker-compose.stateless.yml restart app-1
docker-compose -f docker-compose.stateless.yml restart worker
```

### Update Application

```bash
cd /root/bharat-crm

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime)
docker-compose -f docker-compose.stateless.yml up -d --build --no-deps app-1
docker-compose -f docker-compose.stateless.yml up -d --build --no-deps app-2
docker-compose -f docker-compose.stateless.yml up -d --build --no-deps worker
docker-compose -f docker-compose.stateless.yml up -d --build --no-deps frontend
```

### Stop Everything

```bash
docker-compose -f docker-compose.stateless.yml down
```

### View Resource Usage

```bash
docker stats
```

### Access Redis CLI

```bash
docker exec -it crm-redis redis-cli
> KEYS *
> INFO
```

### Run Database Migrations

```bash
docker exec -it crm-app-1 npx prisma migrate deploy
```

---

## PART 7: MONITORING & MAINTENANCE

### Worker Job Metrics

```bash
# Check worker metrics
docker exec crm-worker wget -qO- http://localhost:3002/metrics
```

### Check Qdrant Vector Database

```bash
# Health check
docker exec crm-worker wget -qO- http://localhost:6333/health

# Collections info
docker exec crm-worker wget -qO- http://localhost:6333/collections
```

### Log Rotation

Docker handles log rotation automatically with the configured limits:
- App servers: 10MB max, 5 files
- Worker: 20MB max, 5 files
- Nginx: 10MB max, 5 files

### Backup Strategy

1. **Database**: DigitalOcean provides automatic daily backups
2. **Redis**: Data persists in `redis_data` volume
3. **Qdrant**: Data persists in `qdrant_data` volume

Manual backup:
```bash
# Backup volumes
docker run --rm -v bharat-crm_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .
docker run --rm -v bharat-crm_qdrant_data:/data -v $(pwd):/backup alpine tar czf /backup/qdrant-backup.tar.gz -C /data .
```

---

## PART 8: FIREWALL CONFIGURATION

```bash
# Install UFW
apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
ufw allow 22

# Allow HTTP and HTTPS
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable

# Verify
ufw status
```

---

## PART 9: TROUBLESHOOTING

### Problem: App can't connect to database

**Solution**: Ensure Hostinger IP is in DigitalOcean trusted sources

```bash
# Check backend logs for connection errors
docker-compose -f docker-compose.stateless.yml logs app-1 | grep -i error
```

### Problem: Load balancer returning 502

**Solution**: App servers may not be healthy yet

```bash
# Check app server health
docker-compose -f docker-compose.stateless.yml logs app-1 app-2

# Wait for health checks to pass
docker-compose -f docker-compose.stateless.yml ps
```

### Problem: WebSocket connections failing

**Solution**: Check nginx and Redis

```bash
# Check nginx logs
docker-compose -f docker-compose.stateless.yml logs nginx

# Check Redis is running
docker exec crm-redis redis-cli ping
```

### Problem: Worker jobs not running

**Solution**: Check worker logs and Redis locks

```bash
# Check worker logs
docker-compose -f docker-compose.stateless.yml logs worker

# Check Redis for locks
docker exec crm-redis redis-cli KEYS "lock:*"
```

### Problem: Out of memory

**Solution**: Check resource usage

```bash
# Check container memory usage
docker stats --no-stream

# Free up memory
docker system prune -a
```

---

## PART 10: SCALING (Future)

When you need more capacity, you can:

### Add More App Servers

Edit `docker-compose.stateless.yml` to add `app-3`, `app-4`, etc.

Then update `nginx/nginx.stateless.conf`:
```nginx
upstream app_servers {
    least_conn;
    server app-1:3001;
    server app-2:3001;
    server app-3:3001;  # Add new server
    server app-4:3001;  # Add new server
}
```

Rebuild:
```bash
docker-compose -f docker-compose.stateless.yml up -d --build
```

---

## Quick Reference

| What | Where |
|------|-------|
| **Hostinger VPS IP** | DNS A records |
| **DigitalOcean DB Host** | `.env` → `DATABASE_URL` |
| **Your Domain** | `.env` → `DOMAIN`, `FRONTEND_URL`, `VITE_API_URL` |
| **Google OAuth Callbacks** | Google Cloud Console + `.env` |
| **WhatsApp Webhook** | Meta Business Suite → `https://yourdomain.com/api/webhooks/whatsapp` |

---

## Estimated Monthly Costs

| Service | Specification | Cost |
|---------|--------------|------|
| Hostinger VPS KVM 4 | 8GB RAM, 4 vCPUs | ~$15-20/month |
| DigitalOcean PostgreSQL | Basic, 1GB RAM | $15/month |
| **Total** | | **~$30-35/month** |
