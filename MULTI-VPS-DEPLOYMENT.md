# Multi-VPS Stateless Deployment Guide

## Architecture Overview

```
                                    INTERNET
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER: 139.59.11.54                              │
│                      (Nginx + Frontend)                                     │
│                        Ports: 80, 443                                       │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│      APP SERVER 1             │ │      APP SERVER 2             │
│      IP: 64.227.150.92        │ │      IP: 143.110.242.240      │
│         Port: 3001            │ │         Port: 3001            │
│      (Stateless Backend)      │ │      (Stateless Backend)      │
└───────────────┬───────────────┘ └───────────────┬───────────────┘
                │                                 │
                └─────────────┬───────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│     REDIS     │   │     WORKER      │   │  DIGITALOCEAN           │
│ 64.227.140.115│   │ 143.110.240.152 │   │  Managed PostgreSQL     │
│  Port: 6379   │   │  Port: 3002     │   │  Port: 25060            │
│  Sessions,    │   │  Cron Jobs,     │   │                         │
│  Socket.IO    │   │  Qdrant (6333)  │   │  DIGITALOCEAN Spaces    │
└───────────────┘   └─────────────────┘   │  (S3 File Storage)      │
                                          └─────────────────────────┘
```

---

## Server Summary

| VPS | Role | IP Address | Ports | Docker Compose File |
|-----|------|------------|-------|---------------------|
| **Load Balancer** | Nginx + Frontend | 139.59.11.54 | 80, 443 (public) | `docker-compose.loadbalancer.yml` |
| **App Server 1** | Node.js Backend | 64.227.150.92 | 3001 (internal) | `docker-compose.appserver.yml` |
| **App Server 2** | Node.js Backend | 143.110.242.240 | 3001 (internal) | `docker-compose.appserver.yml` |
| **Worker** | Background Jobs + Qdrant | 143.110.240.152 | 3002, 6333 (internal) | `docker-compose.worker.yml` |
| **Redis** | Session Store | 64.227.140.115 | 6379 (internal) | `docker-compose.redis.yml` |

---

## IP Address Reference

```
Load Balancer (Nginx):  139.59.11.54    ← Main domain points here
App Server 1:           64.227.150.92
App Server 2:           143.110.242.240
Worker + Qdrant:        143.110.240.152
Redis:                  64.227.140.115
```

---

## Prerequisites

- [ ] 5 VPS accounts (Ubuntu 22.04 LTS recommended)
- [ ] DigitalOcean account (for managed PostgreSQL and Spaces)
- [ ] Domain name pointing to Load Balancer IP (139.59.11.54)
- [ ] SSH access to all 5 VPSes
- [ ] Clone this repository on each VPS

---

# PART 1: DIGITALOCEAN SETUP

> **[DIGITALOCEAN]** - Done in browser at https://cloud.digitalocean.com

### 1.1: Create PostgreSQL Database

1. Go to **Create** → **Databases**
2. Configure:
   - **Engine**: PostgreSQL 15
   - **Plan**: Basic ($15/month)
   - **Region**: Closest to your VPSes (e.g., BLR for India)
   - **Name**: `crm-database`
3. Click **Create Database Cluster**
4. Save the **Connection String**

### 1.2: Add VPS IPs to Trusted Sources

**IMPORTANT**: Add these IPs to trusted sources:

1. Go to **Databases** → **crm-database** → **Settings**
2. Under **Trusted Sources**, add:
   - `64.227.150.92` (App Server 1)
   - `143.110.242.240` (App Server 2)
   - `143.110.240.152` (Worker)
3. Click **Save**

### 1.3: Create DigitalOcean Space (Optional - for file storage)

1. Go to **Create** → **Spaces Object Storage**
2. Configure:
   - **Region**: Same as database
   - **Name**: `crm-files`
3. Go to **API** → **Spaces Keys** → Generate new key
4. Save **Access Key** and **Secret Key**

---

# PART 2: DNS SETUP

> **[DOMAIN]** - At your domain registrar

Point your domain to the **Load Balancer (139.59.11.54)**:

```
Type: A    Name: @      Value: 139.59.11.54
Type: A    Name: www    Value: 139.59.11.54
```

---

# PART 3: REDIS SERVER (64.227.140.115)

> **[REDIS VPS]** - SSH into 64.227.140.115

### 3.1: Connect to Redis VPS

```bash
ssh root@64.227.140.115
```

### 3.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 3.3: Clone Repository

```bash
cd /root
git clone https://github.com/siddartha1192/bharat-crm.git
cd bharat-crm
```

### 3.4: Start Redis

```bash
docker compose -f docker-compose.redis.yml up -d
```

### 3.5: Configure Firewall

```bash
apt install -y ufw

# Allow SSH
ufw allow 22

# Allow Redis ONLY from app servers and worker
ufw allow from 64.227.150.92 to any port 6379    # App 1
ufw allow from 143.110.242.240 to any port 6379  # App 2
ufw allow from 143.110.240.152 to any port 6379  # Worker

# Enable firewall
ufw --force enable
```

### 3.6: Verify Redis

```bash
docker exec crm-redis redis-cli ping
# Should return: PONG
```

### 3.7: Note Your Redis URL

```
REDIS_URL=redis://64.227.140.115:6379
```

---

# PART 4: WORKER SERVER (143.110.240.152)

> **[WORKER VPS]** - SSH into 143.110.240.152

### 4.1: Connect to Worker VPS

```bash
ssh root@143.110.240.152
```

### 4.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 4.3: Clone Repository

```bash
cd /root
git clone https://github.com/siddartha1192/bharat-crm.git
cd bharat-crm
```

### 4.4: Create Environment File

```bash
cat > .env << 'EOF'
# =============================================================================
# WORKER SERVER ENVIRONMENT (143.110.240.152)
# =============================================================================

# PostgreSQL Connection (DigitalOcean Managed)
# Get this from DigitalOcean Dashboard → Databases → Connection Details
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@your-db-cluster.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# Redis Connection
REDIS_URL=redis://64.227.140.115:6379

# JWT Secrets (use same values across all servers)
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

# WhatsApp (optional)
WHATSAPP_API_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id

# Gmail (optional)
GMAIL_USER=your-email@gmail.com
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token

# S3/AWS Storage (REQUIRED for stateless architecture)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1
S3_CDN_URL=https://your-cdn-url.com

# Application
FRONTEND_URL=https://your-domain.com
COMPANY_NAME=Your Company Name
OWNER_EMAIL=admin@your-domain.com

# Worker Settings
CAMPAIGN_BATCH_SIZE=100
CAMPAIGN_BATCH_DELAY=5000
EOF
```

### 4.5: Edit Environment File

```bash
nano .env
# Fill in all the values from your DigitalOcean setup
# Save with Ctrl+X, Y, Enter
```

### 4.6: Start Worker + Qdrant

```bash
docker compose -f docker-compose.worker.yml up -d --build
```

### 4.7: Configure Firewall

```bash
apt install -y ufw
ufw allow 22

# Allow Qdrant access from App servers
ufw allow from 64.227.150.92 to any port 6333    # App 1
ufw allow from 143.110.242.240 to any port 6333  # App 2

ufw --force enable
```

### 4.8: Verify Worker

```bash
docker logs crm-worker
curl http://localhost:3002/health
curl http://localhost:6333/health   # Qdrant health
```

---

# PART 5: APP SERVER 1 (64.227.150.92)

> **[APP 1 VPS]** - SSH into 64.227.150.92

### 5.1: Connect to App Server 1

```bash
ssh root@64.227.150.92
```

### 5.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 5.3: Clone Repository

```bash
cd /root
git clone https://github.com/siddartha1192/bharat-crm.git
cd bharat-crm
```

### 5.4: Create Environment File

```bash
cat > .env << 'EOF'
# =============================================================================
# APP SERVER 1 ENVIRONMENT (64.227.150.92)
# =============================================================================

# Instance ID (IMPORTANT: use app-1 for this server)
APP_INSTANCE_ID=app-1

# PostgreSQL Connection (DigitalOcean Managed)
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@your-db-cluster.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# Redis Connection
REDIS_URL=redis://64.227.140.115:6379

# Qdrant Connection (Worker VPS)
QDRANT_URL=http://143.110.240.152:6333

# JWT Secrets (use same values across all servers)
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
ENABLE_AI_FEATURE=true

# WhatsApp
WHATSAPP_API_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/google/callback
GOOGLE_AUTH_REDIRECT_URI=https://your-domain.com/api/auth/google/callback

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# S3/AWS Storage (REQUIRED for stateless architecture)
# Use AWS S3 or DigitalOcean Spaces
S3_ENDPOINT=https://s3.amazonaws.com           # AWS S3
# S3_ENDPOINT=https://blr1.digitaloceanspaces.com  # DigitalOcean Spaces
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1                            # or blr1 for DigitalOcean
S3_CDN_URL=https://your-cdn-url.com            # optional CDN URL

# Application
FRONTEND_URL=https://your-domain.com
COMPANY_NAME=Your Company Name
OWNER_EMAIL=admin@your-domain.com
EOF
```

### 5.5: Edit Environment File

```bash
nano .env
# Fill in all values - use SAME secrets as Worker
# Save with Ctrl+X, Y, Enter
```

### 5.6: Start App Server

```bash
docker compose -f docker-compose.appserver.yml up -d --build
```

### 5.7: Configure Firewall

```bash
apt install -y ufw
ufw allow 22

# Allow traffic from Load Balancer only
ufw allow from 139.59.11.54 to any port 3001

ufw --force enable
```

### 5.8: Verify App Server

```bash
docker logs crm-app
curl http://localhost:3001/api/health
```

---

# PART 6: APP SERVER 2 (143.110.242.240)

> **[APP 2 VPS]** - SSH into 143.110.242.240

### 6.1: Connect to App Server 2

```bash
ssh root@143.110.242.240
```

### 6.2: Repeat Steps from Part 5

Do exactly the same as App Server 1, **EXCEPT** change this in `.env`:

```bash
APP_INSTANCE_ID=app-2
```

### Quick Commands for App Server 2:

```bash
# Install Docker
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Clone and setup
cd /root
git clone https://github.com/siddartha1192/bharat-crm.git
cd bharat-crm

# Create .env (copy from App 1, change APP_INSTANCE_ID=app-2)
nano .env

# Start
docker compose -f docker-compose.appserver.yml up -d --build

# Firewall
apt install -y ufw
ufw allow 22
ufw allow from 139.59.11.54 to any port 3001
ufw --force enable
```

---

# PART 7: LOAD BALANCER (139.59.11.54)

> **[LOAD BALANCER VPS]** - SSH into 139.59.11.54

### 7.1: Connect to Load Balancer

```bash
ssh root@139.59.11.54
```

### 7.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 7.3: Clone Repository

```bash
cd /root
git clone https://github.com/siddartha1192/bharat-crm.git
cd bharat-crm
```

### 7.4: Create SSL Directory and Self-Signed Certificate

```bash
mkdir -p nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=IN/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### 7.5: Create Environment File for Frontend

```bash
cat > .env << 'EOF'
VITE_API_URL=https://your-domain.com
EOF
```

### 7.6: Start Nginx + Frontend

```bash
docker compose -f docker-compose.loadbalancer.yml up -d --build
```

### 7.7: Configure Firewall

```bash
apt install -y ufw
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

### 7.8: Get Real SSL Certificate (Let's Encrypt)

```bash
# Stop nginx temporarily
docker compose -f docker-compose.loadbalancer.yml stop nginx

# Get Let's Encrypt certificate
docker run -it --rm \
  -v $(pwd)/certbot_conf:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d your-domain.com -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email

# Copy certificates
cp certbot_conf/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp certbot_conf/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Restart nginx
docker compose -f docker-compose.loadbalancer.yml up -d
```

---

# PART 8: DATABASE MIGRATION

> **[APP 1 VPS]** - Run migrations from App Server 1 (64.227.150.92)

### 8.1: SSH into App Server 1

```bash
ssh root@64.227.150.92
```

### 8.2: Run Prisma Migrations

```bash
cd /root/bharat-crm
docker exec -it crm-app npx prisma migrate deploy
```

---

# PART 9: VERIFICATION

### 9.1: Check Each Server

**Redis (64.227.140.115)**:
```bash
docker exec crm-redis redis-cli ping
# Expected: PONG
```

**Worker (143.110.240.152)**:
```bash
curl http://localhost:3002/health
# Expected: {"status":"ok",...}

curl http://localhost:6333/health
# Expected: Qdrant health response
```

**App 1 (64.227.150.92)**:
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","instance":"app-1",...}
```

**App 2 (143.110.242.240)**:
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","instance":"app-2",...}
```

**Load Balancer (139.59.11.54)**:
```bash
curl -k https://localhost/api/health
# Should return response from app-1 or app-2 (load balanced)
```

### 9.2: Test from Browser

Open `https://your-domain.com` - you should see the CRM login page.

---

# PART 10: COMMON COMMANDS

## Redis (64.227.140.115)

```bash
cd /root/bharat-crm
docker compose -f docker-compose.redis.yml logs -f           # View logs
docker compose -f docker-compose.redis.yml restart           # Restart
docker exec crm-redis redis-cli INFO                         # Redis info
```

## Worker (143.110.240.152)

```bash
cd /root/bharat-crm
docker compose -f docker-compose.worker.yml logs -f          # View logs
docker compose -f docker-compose.worker.yml restart          # Restart
docker compose -f docker-compose.worker.yml up -d --build    # Rebuild
```

## App Servers (64.227.150.92 & 143.110.242.240)

```bash
cd /root/bharat-crm
docker compose -f docker-compose.appserver.yml logs -f       # View logs
docker compose -f docker-compose.appserver.yml restart       # Restart
docker compose -f docker-compose.appserver.yml up -d --build # Rebuild
```

## Load Balancer (139.59.11.54)

```bash
cd /root/bharat-crm
docker compose -f docker-compose.loadbalancer.yml logs -f        # View logs
docker compose -f docker-compose.loadbalancer.yml restart        # Restart
docker compose -f docker-compose.loadbalancer.yml up -d --build  # Rebuild
```

---

# PART 11: UPDATE APPLICATION

When you need to update the code:

### On App Servers (64.227.150.92 & 143.110.242.240):

```bash
cd /root/bharat-crm
git pull origin main
docker compose -f docker-compose.appserver.yml up -d --build
```

### On Worker (143.110.240.152):

```bash
cd /root/bharat-crm
git pull origin main
docker compose -f docker-compose.worker.yml up -d --build
```

### On Load Balancer (139.59.11.54):

```bash
cd /root/bharat-crm
git pull origin main
docker compose -f docker-compose.loadbalancer.yml up -d --build
```

---

# Firewall Rules Summary

| Server | IP | Open Ports | Allow From |
|--------|-----|------------|------------|
| **Load Balancer** | 139.59.11.54 | 22, 80, 443 | Public (internet) |
| **App 1** | 64.227.150.92 | 22, 3001 | 139.59.11.54 (Load Balancer) |
| **App 2** | 143.110.242.240 | 22, 3001 | 139.59.11.54 (Load Balancer) |
| **Worker** | 143.110.240.152 | 22, 6333 | 64.227.150.92, 143.110.242.240 |
| **Redis** | 64.227.140.115 | 22, 6379 | 64.227.150.92, 143.110.242.240, 143.110.240.152 |

---

# Docker Compose Files Reference

| File | Server | Description |
|------|--------|-------------|
| `docker-compose.loadbalancer.yml` | 139.59.11.54 | Nginx + Frontend + Certbot |
| `docker-compose.appserver.yml` | 64.227.150.92, 143.110.242.240 | Backend API (stateless) |
| `docker-compose.worker.yml` | 143.110.240.152 | Background jobs + Qdrant |
| `docker-compose.redis.yml` | 64.227.140.115 | Redis server |
| `docker-compose.postgres.yml` | (optional) | Self-hosted PostgreSQL |
| `nginx/nginx.multi-vps.conf` | 139.59.11.54 | Nginx config with server IPs |

---

# Network Diagram Summary

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ LOAD BALANCER (139.59.11.54)       your-domain.com:443          │
│ - Receives all public traffic                                   │
│ - SSL termination                                               │
│ - Load balances to App 1 & App 2                                │
│ - Serves React frontend                                         │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐     ┌─────────────────────┐
│ APP 1               │     │ APP 2               │
│ 64.227.150.92:3001  │     │ 143.110.242.240:3001│
│ - API requests      │     │ - API requests      │
│ - WebSocket         │     │ - WebSocket         │
└─────────┬───────────┘     └─────────┬───────────┘
          │                           │
          └─────────┬─────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────────┐ ┌─────────────┐ ┌─────────────────┐
│   REDIS    │ │   WORKER    │ │  DigitalOcean   │
│ 64.227.    │ │ 143.110.    │ │  PostgreSQL +   │
│ 140.115    │ │ 240.152     │ │  Spaces (S3)    │
│ :6379      │ │ :3002,:6333 │ │                 │
└────────────┘ └─────────────┘ └─────────────────┘
```

---

# Estimated Monthly Costs

| Server | Specification | Cost |
|--------|--------------|------|
| Load Balancer (139.59.11.54) | 2GB RAM | ~$5-8/month |
| App 1 (64.227.150.92) | 2GB RAM | ~$5-8/month |
| App 2 (143.110.242.240) | 2GB RAM | ~$5-8/month |
| Worker (143.110.240.152) | 4GB RAM | ~$10-15/month |
| Redis (64.227.140.115) | 1GB RAM | ~$4-6/month |
| DigitalOcean PostgreSQL | Basic | $15/month |
| DigitalOcean Spaces | 250GB | $5/month |
| **Total** | | **~$50-65/month** |

---

# Deployment Checklist

- [ ] **Part 1**: DigitalOcean database created
- [ ] **Part 1**: VPS IPs (64.227.150.92, 143.110.242.240, 143.110.240.152) added to trusted sources
- [ ] **Part 1**: DigitalOcean Space created (optional)
- [ ] **Part 2**: DNS pointing to 139.59.11.54
- [ ] **Part 3**: Redis running on 64.227.140.115
- [ ] **Part 4**: Worker running on 143.110.240.152
- [ ] **Part 5**: App Server 1 running on 64.227.150.92
- [ ] **Part 6**: App Server 2 running on 143.110.242.240
- [ ] **Part 7**: Load Balancer running on 139.59.11.54
- [ ] **Part 7**: SSL certificate installed
- [ ] **Part 8**: Database migrations completed
- [ ] **Part 9**: All health checks passing
- [ ] **Part 9**: Website accessible in browser

---

# Troubleshooting

### Nginx "host not found in upstream" error

This error occurs when nginx starts before backend containers are ready. The `nginx.multi-vps.conf` uses static IPs, so this shouldn't happen. Check:

```bash
# On Load Balancer
curl http://64.227.150.92:3001/api/health   # Can reach App 1?
curl http://143.110.242.240:3001/api/health  # Can reach App 2?
```

### Cannot connect to Redis

Check firewall rules on Redis server:
```bash
# On Redis server (64.227.140.115)
ufw status
# Should show port 6379 allowed from app server IPs
```

### Cannot connect to PostgreSQL

1. Check if your VPS IPs are in DigitalOcean trusted sources
2. Test connection from app server:
```bash
docker exec -it crm-app npx prisma db pull
```

### WebSocket not working

Ensure your domain has proper SSL and nginx is configured for WebSocket upgrade:
```bash
# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://your-domain.com/socket.io/
```
