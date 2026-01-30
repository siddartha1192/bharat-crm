# Hostinger VPS - Stateless Enterprise Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              HOSTINGER VPS                                    │
│                         (Docker runs here)                                    │
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
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │   DIGITALOCEAN        │         │   DIGITALOCEAN        │
        │   Managed PostgreSQL  │         │   Spaces (S3)         │
        │   (No Docker needed)  │         │   (No Docker needed)  │
        │   Port 25060 (SSL)    │         │   File Storage        │
        └───────────────────────┘         └───────────────────────┘
```

---

## Server Legend

Throughout this guide, look for these indicators:

| Icon | Location | Description |
|------|----------|-------------|
| **[DIGITALOCEAN]** | DigitalOcean Web Console | Browser-based setup at cloud.digitalocean.com |
| **[HOSTINGER]** | Hostinger VPS Terminal | SSH commands run on your VPS |
| **[LOCAL]** | Your Computer | Actions on your local machine |
| **[DOMAIN]** | Domain Registrar | DNS settings (GoDaddy, Namecheap, etc.) |

---

## Why This Architecture?

| Feature | Benefit |
|---------|---------|
| **2 App Servers** | High availability - if one fails, the other handles traffic |
| **Load Balancer** | Distributes traffic evenly, SSL termination |
| **Worker Server** | Background jobs run once (not duplicated) |
| **Redis** | Shared session state across app servers |
| **Managed DB** | Automatic backups, no maintenance overhead |
| **S3 Storage (Spaces)** | Stateless file storage - no local files on app servers |

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Hostinger VPS account with KVM 4+ plan (8GB RAM recommended)
- [ ] DigitalOcean account (for database and file storage)
- [ ] Domain name pointed to Hostinger IP
- [ ] SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- [ ] Text editor for editing configuration files

---

# PART 1: DIGITALOCEAN DATABASE SETUP

> **[DIGITALOCEAN]** - All steps in this section are done in your browser at https://cloud.digitalocean.com

### Step 1.1: Create Managed PostgreSQL Database

**[DIGITALOCEAN]** In your browser:

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

**[DIGITALOCEAN]** In your browser:

1. Go to **Databases** → **crm-database**
2. Click **Connection Details**
3. Copy the **Connection String** (looks like):
   ```
   postgresql://doadmin:XXXX@db-postgresql-xxx-do-user-xxx-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```
4. **SAVE THIS** - paste it somewhere safe, you need it for `.env` file later

### Step 1.3: Configure Trusted Sources (IMPORTANT!)

**[DIGITALOCEAN]** In your browser:

1. Go to **Databases** → **crm-database** → **Settings**
2. Under **Trusted Sources**, click **Edit**
3. **Add your Hostinger VPS IP address** (you'll get this from Hostinger panel)
4. Click **Save**

> **WARNING**: Without this step, your app cannot connect to the database!

---

# PART 1B: DIGITALOCEAN SPACES SETUP (S3 Storage)

> **[DIGITALOCEAN]** - All steps in this section are done in your browser at https://cloud.digitalocean.com

### Step 1B.1: Create a Space

**[DIGITALOCEAN]** In your browser:

1. Go to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **Create** → **Spaces Object Storage**
3. Configure:
   - **Datacenter**: Choose same region as your database (e.g., `fra1` for Frankfurt)
   - **CDN**: Enable (recommended for faster file delivery)
   - **Allow file listing**: Disable (security)
   - **Name**: `crm-files` (or your preferred name)
4. Click **Create a Space**

### Step 1B.2: Create API Keys

**[DIGITALOCEAN]** In your browser:

1. Go to **API** → **Spaces Keys** (in left sidebar)
2. Click **Generate New Key**
3. Enter a name: `crm-spaces-key`
4. **SAVE BOTH VALUES IMMEDIATELY** - they will only be shown once:
   - **Access Key**: (looks like: `DO00XXXXXXXXXXXX`)
   - **Secret Key**: (looks like: `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

### Step 1B.3: Note Your Space Details

**[DIGITALOCEAN]** Your Space URL will be:
```
https://crm-files.fra1.digitaloceanspaces.com
```

The S3 endpoint for your region:
```
https://fra1.digitaloceanspaces.com
```

**Common regions:**
| Region | Endpoint |
|--------|----------|
| Frankfurt | `fra1.digitaloceanspaces.com` |
| New York | `nyc3.digitaloceanspaces.com` |
| San Francisco | `sfo3.digitaloceanspaces.com` |
| Singapore | `sgp1.digitaloceanspaces.com` |
| Amsterdam | `ams3.digitaloceanspaces.com` |

---

# PART 2: DOMAIN DNS SETUP

> **[DOMAIN]** - These steps are done at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)

### Step 2.1: Get Your Hostinger VPS IP

**[LOCAL]** Log into Hostinger panel and find your VPS IP address, or check your VPS order confirmation email.

### Step 2.2: Point Domain to Hostinger

**[DOMAIN]** At your domain registrar (GoDaddy, Namecheap, etc.):

1. Go to DNS Management for your domain
2. Add/Update these DNS records:

```
Type: A    Name: @      Value: YOUR_HOSTINGER_IP    TTL: 300
Type: A    Name: www    Value: YOUR_HOSTINGER_IP    TTL: 300
```

**Example:**
```
Type: A    Name: @      Value: 185.123.45.67    TTL: 300
Type: A    Name: www    Value: 185.123.45.67    TTL: 300
```

3. Wait 5-30 minutes for DNS propagation

**[LOCAL]** Verify DNS propagation:
```bash
# On your local computer, run:
nslookup yourdomain.com
# Should return your Hostinger IP
```

---

# PART 3: HOSTINGER VPS SETUP

> **[HOSTINGER]** - All steps from here are done on your Hostinger VPS via SSH

### Step 3.1: Connect to Your VPS

**[LOCAL]** Open your terminal and SSH into your VPS:

```bash
ssh root@YOUR_HOSTINGER_IP
```

Example:
```bash
ssh root@185.123.45.67
```

Enter your root password when prompted.

### Step 3.2: Update System

**[HOSTINGER]** Run these commands on your VPS:

```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y
```

### Step 3.3: Install Docker

**[HOSTINGER]** Run these commands on your VPS:

```bash
# Install prerequisites
apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update and install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 3.4: Verify Docker Installation

**[HOSTINGER]** Run these commands on your VPS:

```bash
# Check Docker version
docker --version
# Expected: Docker version 24.x.x or higher

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version v2.x.x or higher
```

---

# PART 4: DEPLOY THE APPLICATION

> **[HOSTINGER]** - All steps in this section are done on your Hostinger VPS

### Step 4.1: Clone Repository

**[HOSTINGER]** Run on your VPS:

```bash
# Go to root directory
cd /root

# Clone the repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/bharat-crm.git

# Enter the project directory
cd bharat-crm
```

### Step 4.2: Create Environment File

**[HOSTINGER]** Run on your VPS:

```bash
# Copy example file
cp .env.stateless.example .env

# Edit with nano (or vim if you prefer)
nano .env
```

### Step 4.3: Fill in Environment Variables

**[HOSTINGER]** Edit the `.env` file with your values:

```bash
# ===========================================
# DOMAIN (Replace with your actual domain)
# ===========================================
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com

# ===========================================
# DIGITALOCEAN DATABASE (From Part 1, Step 1.2)
# ===========================================
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@YOUR_HOST:25060/defaultdb?sslmode=require

# ===========================================
# SECURITY KEYS (Generate with commands in Step 4.4)
# ===========================================
JWT_SECRET=paste-generated-value-here
JWT_REFRESH_SECRET=paste-generated-value-here
ENCRYPTION_KEY=paste-generated-value-here

# ===========================================
# OPENAI (Required for AI features)
# Get from: https://platform.openai.com/api-keys
# ===========================================
OPENAI_API_KEY=sk-your-openai-key

# ===========================================
# WHATSAPP (From Meta Business Suite)
# Get from: https://developers.facebook.com/
# ===========================================
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any-random-string-you-create

# ===========================================
# GOOGLE OAUTH (From Google Cloud Console)
# Get from: https://console.cloud.google.com/
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
# DIGITALOCEAN SPACES (From Part 1B)
# ===========================================
S3_ENDPOINT=https://fra1.digitaloceanspaces.com
S3_ACCESS_KEY=your-spaces-access-key
S3_SECRET_KEY=your-spaces-secret-key
S3_BUCKET=crm-files
S3_REGION=fra1

# ===========================================
# COMPANY INFO
# ===========================================
COMPANY_NAME=Your Company Name
OWNER_EMAIL=admin@yourdomain.com
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 4.4: Generate Security Keys

**[HOSTINGER]** Run on your VPS to generate secure keys:

```bash
# Generate JWT_SECRET (copy output to .env)
echo "JWT_SECRET=$(openssl rand -hex 32)"

# Generate JWT_REFRESH_SECRET (copy output to .env)
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"

# Generate ENCRYPTION_KEY (copy output to .env)
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

**[HOSTINGER]** Now edit .env again and paste the generated values:

```bash
nano .env
# Paste the generated values for JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
# Save with Ctrl+X, Y, Enter
```

---

# PART 5: SSL CERTIFICATE SETUP

> **[HOSTINGER]** - All steps in this section are done on your Hostinger VPS

### Step 5.1: Create SSL Directory

**[HOSTINGER]** Run on your VPS:

```bash
# Create SSL directory
mkdir -p nginx/ssl
```

### Step 5.2: Create Self-Signed Certificate (For Initial Testing)

**[HOSTINGER]** Run on your VPS (replace `yourdomain.com` with your actual domain):

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Step 5.3: Build and Start All Services

**[HOSTINGER]** Run on your VPS:

```bash
# Build and start all containers (this takes 5-10 minutes on first run)
docker-compose -f docker-compose.stateless.yml up -d --build
```

### Step 5.4: Verify All Containers Started

**[HOSTINGER]** Run on your VPS:

```bash
# Check container status
docker-compose -f docker-compose.stateless.yml ps
```

**Expected output:**
```
NAME            STATUS              PORTS
crm-app-1       Up (healthy)        3001/tcp
crm-app-2       Up (healthy)        3001/tcp
crm-frontend    Up (healthy)        80/tcp
crm-nginx       Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
crm-redis       Up (healthy)        6379/tcp
crm-worker      Up (healthy)        3002/tcp, 6333/tcp
```

### Step 5.5: Get Real SSL Certificate (Production)

**[HOSTINGER]** Once the initial deployment works, get a real SSL certificate:

```bash
# Stop nginx temporarily
docker-compose -f docker-compose.stateless.yml stop nginx

# Get Let's Encrypt certificate (replace yourdomain.com and email)
docker run -it --rm \
  -v $(pwd)/certbot_data:/var/www/certbot \
  -v $(pwd)/certbot_conf:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email

# Copy certificates to nginx directory
cp certbot_conf/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp certbot_conf/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Start nginx again
docker-compose -f docker-compose.stateless.yml up -d nginx
```

---

# PART 6: VERIFY DEPLOYMENT

> **[HOSTINGER]** - Commands run on your Hostinger VPS
> **[LOCAL]** - Tests from your local computer

### Step 6.1: Check Container Health

**[HOSTINGER]** Run on your VPS:

```bash
docker-compose -f docker-compose.stateless.yml ps
```

All containers should show "Up (healthy)".

### Step 6.2: Check Service Endpoints

**[HOSTINGER]** Run on your VPS:

```bash
# Check nginx health
curl -k https://localhost/nginx-health

# Check backend health (through load balancer)
curl -k https://localhost/api/health

# Check worker health
docker exec crm-worker wget -qO- http://localhost:3002/health
```

### Step 6.3: Test From Your Browser

**[LOCAL]** On your computer, open a browser and go to:

```
https://yourdomain.com
```

You should see the CRM login page.

### Step 6.4: Test Load Balancing

**[HOSTINGER]** Run on your VPS:

```bash
# Make 10 requests and check which app server responds
for i in {1..10}; do
  curl -sk https://localhost/api/health | grep instance
done
```

You should see responses from both `app-1` and `app-2`.

### Step 6.5: View Logs

**[HOSTINGER]** Run on your VPS:

```bash
# View all logs (live)
docker-compose -f docker-compose.stateless.yml logs -f

# View specific service logs
docker-compose -f docker-compose.stateless.yml logs -f app-1
docker-compose -f docker-compose.stateless.yml logs -f app-2
docker-compose -f docker-compose.stateless.yml logs -f worker
docker-compose -f docker-compose.stateless.yml logs -f nginx

# Press Ctrl+C to stop viewing logs
```

---

# PART 7: FIREWALL CONFIGURATION

> **[HOSTINGER]** - All commands run on your Hostinger VPS

### Step 7.1: Install and Configure Firewall

**[HOSTINGER]** Run on your VPS:

```bash
# Install UFW firewall
apt install -y ufw

# IMPORTANT: Allow SSH first (so you don't lock yourself out!)
ufw allow 22

# Allow HTTP and HTTPS
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable

# Type 'y' when prompted

# Verify firewall status
ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22                         ALLOW       Anywhere
80                         ALLOW       Anywhere
443                        ALLOW       Anywhere
```

---

# PART 8: DATABASE MIGRATION

> **[HOSTINGER]** - Run on your Hostinger VPS after first deployment

### Step 8.1: Run Prisma Migrations

**[HOSTINGER]** Run on your VPS:

```bash
# Run database migrations
docker exec -it crm-app-1 npx prisma migrate deploy
```

### Step 8.2: Create First Admin User (Optional)

**[HOSTINGER]** Run on your VPS:

```bash
# Access the app container
docker exec -it crm-app-1 sh

# Inside the container, run the seed script (if available)
node scripts/createAdmin.js

# Exit the container
exit
```

---

# PART 9: COMMON COMMANDS REFERENCE

> **[HOSTINGER]** - All commands run on your Hostinger VPS

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.stateless.yml restart

# Restart specific service
docker-compose -f docker-compose.stateless.yml restart app-1
docker-compose -f docker-compose.stateless.yml restart app-2
docker-compose -f docker-compose.stateless.yml restart worker
docker-compose -f docker-compose.stateless.yml restart nginx
```

### Update Application

```bash
# Navigate to project directory
cd /root/bharat-crm

# Pull latest code
git pull origin main

# Rebuild and restart services (zero-downtime)
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
# Press Ctrl+C to exit
```

### Access Redis CLI

```bash
docker exec -it crm-redis redis-cli

# Inside Redis CLI:
> KEYS *
> INFO
> exit
```

### View Container Logs

```bash
# All containers
docker-compose -f docker-compose.stateless.yml logs -f

# Last 100 lines of a specific service
docker-compose -f docker-compose.stateless.yml logs --tail=100 app-1
```

### Run Database Migrations

```bash
docker exec -it crm-app-1 npx prisma migrate deploy
```

### Backup Redis Data

```bash
docker run --rm -v bharat-crm_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .
```

### Backup Qdrant Data

```bash
docker run --rm -v bharat-crm_qdrant_data:/data -v $(pwd):/backup alpine tar czf /backup/qdrant-backup.tar.gz -C /data .
```

---

# PART 10: MONITORING & MAINTENANCE

> **[HOSTINGER]** - All commands run on your Hostinger VPS

### Check Worker Job Status

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

Docker handles log rotation automatically with configured limits:
- App servers: 10MB max, 5 files
- Worker: 20MB max, 5 files
- Nginx: 10MB max, 5 files

### Backup Strategy

| Component | Backup Method |
|-----------|--------------|
| **Database** | DigitalOcean automatic daily backups |
| **File Storage** | DigitalOcean Spaces 3x replication |
| **Redis** | Volume backup (see commands above) |
| **Qdrant** | Volume backup (see commands above) |

---

# PART 11: TROUBLESHOOTING

> **[HOSTINGER]** - All diagnostic commands run on your Hostinger VPS

### Problem: App can't connect to database

**[DIGITALOCEAN]** Check trusted sources:
1. Go to DigitalOcean → Databases → crm-database → Settings
2. Verify your Hostinger VPS IP is in Trusted Sources

**[HOSTINGER]** Check logs:
```bash
docker-compose -f docker-compose.stateless.yml logs app-1 | grep -i error
```

### Problem: Load balancer returning 502

**[HOSTINGER]** Check app server health:
```bash
# View app server logs
docker-compose -f docker-compose.stateless.yml logs app-1 app-2

# Check health status
docker-compose -f docker-compose.stateless.yml ps
```

Wait for health checks to pass (can take 30-60 seconds after startup).

### Problem: WebSocket connections failing

**[HOSTINGER]** Check nginx and Redis:
```bash
# Check nginx logs
docker-compose -f docker-compose.stateless.yml logs nginx

# Check Redis is running
docker exec crm-redis redis-cli ping
# Should return: PONG
```

### Problem: Worker jobs not running

**[HOSTINGER]** Check worker status:
```bash
# Check worker logs
docker-compose -f docker-compose.stateless.yml logs worker

# Check Redis for locks
docker exec crm-redis redis-cli KEYS "lock:*"
```

### Problem: Out of memory

**[HOSTINGER]** Check and free memory:
```bash
# Check container memory usage
docker stats --no-stream

# Free up unused Docker resources
docker system prune -a
```

### Problem: File uploads failing (S3/Spaces)

**[HOSTINGER]** Check S3 configuration:
```bash
# Check if S3 env vars are set
docker exec crm-app-1 env | grep S3

# Test S3 connection
docker exec crm-app-1 node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle: false
});
client.send(new ListBucketsCommand({})).then(r => console.log('Connected!', r.Buckets)).catch(e => console.error('Error:', e.message));
"
```

**[DIGITALOCEAN]** Check Spaces:
- Verify bucket name matches S3_BUCKET in .env
- Verify region matches S3_ENDPOINT
- Verify API keys are correct

### Problem: SSL Certificate Issues

**[HOSTINGER]** Renew certificate:
```bash
# Stop nginx
docker-compose -f docker-compose.stateless.yml stop nginx

# Renew certificate
docker run -it --rm \
  -v $(pwd)/certbot_conf:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot renew

# Copy new certificates
cp certbot_conf/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp certbot_conf/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Start nginx
docker-compose -f docker-compose.stateless.yml up -d nginx
```

---

# PART 12: SCALING (Future)

> **[HOSTINGER]** - All commands run on your Hostinger VPS

### Add More App Servers

**[HOSTINGER]** Edit docker-compose.stateless.yml:
```bash
nano docker-compose.stateless.yml
# Add app-3, app-4 services similar to app-1 and app-2
```

**[HOSTINGER]** Update nginx config:
```bash
nano nginx/nginx.stateless.conf
```

Add new servers:
```nginx
upstream app_servers {
    least_conn;
    server app-1:3001;
    server app-2:3001;
    server app-3:3001;  # New server
    server app-4:3001;  # New server
}
```

**[HOSTINGER]** Rebuild:
```bash
docker-compose -f docker-compose.stateless.yml up -d --build
```

---

# Quick Reference

| What | Where to Configure |
|------|-------------------|
| **Hostinger VPS IP** | [DOMAIN] DNS A records |
| **Database Connection** | [DIGITALOCEAN] Database → Connection Details → [HOSTINGER] `.env` |
| **S3/Spaces Storage** | [DIGITALOCEAN] Spaces → API Keys → [HOSTINGER] `.env` |
| **Domain Settings** | [HOSTINGER] `.env` → `DOMAIN`, `FRONTEND_URL`, `VITE_API_URL` |
| **Google OAuth** | [LOCAL] Google Cloud Console → [HOSTINGER] `.env` |
| **WhatsApp Webhook** | [LOCAL] Meta Business Suite → `https://yourdomain.com/api/webhooks/whatsapp` |
| **SSL Certificate** | [HOSTINGER] Let's Encrypt commands |

---

# Estimated Monthly Costs

| Service | Specification | Cost |
|---------|--------------|------|
| Hostinger VPS KVM 4 | 8GB RAM, 4 vCPUs | ~$15-20/month |
| DigitalOcean PostgreSQL | Basic, 1GB RAM | $15/month |
| DigitalOcean Spaces | 250GB storage + 1TB transfer | $5/month |
| **Total** | | **~$35-40/month** |

> **Note**: Spaces includes 250GB storage and 1TB outbound transfer. Additional usage is $0.02/GB storage and $0.01/GB transfer.

---

# Deployment Checklist

Use this checklist to track your progress:

- [ ] **Part 1**: Created DigitalOcean PostgreSQL database
- [ ] **Part 1**: Saved database connection string
- [ ] **Part 1**: Added Hostinger IP to trusted sources
- [ ] **Part 1B**: Created DigitalOcean Space
- [ ] **Part 1B**: Saved Spaces API keys
- [ ] **Part 2**: Updated DNS A records for domain
- [ ] **Part 2**: Verified DNS propagation
- [ ] **Part 3**: SSH'd into Hostinger VPS
- [ ] **Part 3**: Installed Docker and Docker Compose
- [ ] **Part 4**: Cloned repository
- [ ] **Part 4**: Created and configured .env file
- [ ] **Part 4**: Generated security keys
- [ ] **Part 5**: Created SSL certificates
- [ ] **Part 5**: Started all Docker containers
- [ ] **Part 5**: Got Let's Encrypt certificate (production)
- [ ] **Part 6**: Verified all containers are healthy
- [ ] **Part 6**: Tested website in browser
- [ ] **Part 7**: Configured firewall
- [ ] **Part 8**: Ran database migrations
