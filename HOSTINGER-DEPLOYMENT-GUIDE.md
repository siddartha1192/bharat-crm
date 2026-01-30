# Hostinger VPS + DigitalOcean Database Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    HOSTINGER VPS                         │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐   │
│  │  Nginx  │──│ Frontend │  │Backend │──│  Qdrant  │   │
│  │ :80/443 │  │  (React) │  │ :3001  │  │ (Vector) │   │
│  └────┬────┘  └──────────┘  └───┬────┘  └──────────┘   │
│       │                         │                        │
└───────┼─────────────────────────┼────────────────────────┘
        │                         │
        ▼                         ▼
   Internet              DigitalOcean Managed
   (Users)               PostgreSQL Database
```

---

## PART 1: DIGITALOCEAN DATABASE SETUP

### Step 1.1: Create Managed PostgreSQL Database

1. Go to [DigitalOcean](https://cloud.digitalocean.com)
2. Click **Create** > **Databases**
3. Choose:
   - **Engine**: PostgreSQL 15
   - **Cluster Plan**: Basic ($15/month) or higher
   - **Datacenter**: Choose closest to your Hostinger VPS
   - **Name**: `crm-database`
4. Click **Create Database Cluster**
5. Wait for provisioning (takes ~5 minutes)

### Step 1.2: Get Connection String

1. Go to **Databases** > **crm-database**
2. Click **Connection Details**
3. Select **Connection String** format
4. Copy the connection string (looks like):
   ```
   postgresql://doadmin:XXXX@db-postgresql-xxx-do-user-xxx-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```
5. **SAVE THIS** - you'll need it for `.env`

### Step 1.3: Add Hostinger IP to Trusted Sources

1. In DigitalOcean, go to **Databases** > **crm-database**
2. Click **Settings** tab
3. Under **Trusted Sources**, click **Edit**
4. Add your Hostinger VPS IP address
5. Click **Save**

> **IMPORTANT**: Without this step, your backend cannot connect to the database!

---

## PART 2: HOSTINGER VPS SETUP

### Step 2.1: Get a Hostinger VPS

1. Go to [Hostinger VPS](https://www.hostinger.com/vps-hosting)
2. Choose a plan (KVM 2 or higher recommended - 4GB RAM minimum)
3. Select **Ubuntu 22.04** as the OS
4. Complete purchase

### Step 2.2: Point Domain to Hostinger

1. Get your Hostinger VPS IP from the Hostinger dashboard
2. Go to your domain registrar (Hostinger, GoDaddy, Namecheap, etc.)
3. Update DNS A records:
   ```
   Type: A    Name: @      Value: YOUR_HOSTINGER_IP
   Type: A    Name: www    Value: YOUR_HOSTINGER_IP
   ```
4. Wait for DNS propagation (5-30 minutes)

### Step 2.3: SSH into Hostinger VPS

```bash
# From your local machine
ssh root@YOUR_HOSTINGER_IP

# If prompted about fingerprint, type 'yes'
```

### Step 2.4: Install Docker on Hostinger

Run these commands on your Hostinger VPS:

```bash
# Update system
apt update && apt upgrade -y

# Install required packages
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

# Verify installation
docker --version
docker-compose --version
```

---

## PART 3: DEPLOY THE APPLICATION

### Step 3.1: Clone the Repository

```bash
# On Hostinger VPS
cd /root
git clone https://github.com/YOUR_USERNAME/bharat-crm.git
cd bharat-crm
```

### Step 3.2: Create Environment File

```bash
# Copy the example file
cp .env.hostinger.example .env

# Edit with nano (or vim)
nano .env
```

### Step 3.3: Fill in Environment Variables

Edit the `.env` file with your actual values:

```bash
# ============================================================
# REQUIRED CHANGES - Replace these with your actual values
# ============================================================

# Your domain
DOMAIN=yourdomain.com
SSL_EMAIL=your-email@example.com
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com

# DigitalOcean Database URL (from Step 1.2)
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@YOUR_HOST:25060/defaultdb?sslmode=require

# Generate these with: openssl rand -hex 32
JWT_SECRET=paste-output-here
JWT_REFRESH_SECRET=paste-another-output-here
ENCRYPTION_KEY=paste-32-char-key-here

# Your OpenAI API key
OPENAI_API_KEY=sk-your-key-here

# WhatsApp (from Meta Business)
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=any-random-string

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/callback
GOOGLE_AUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# Company info
COMPANY_NAME=Your Company
OWNER_EMAIL=owner@yourdomain.com
```

Save the file: `Ctrl+X`, then `Y`, then `Enter`

### Step 3.4: Generate Security Keys

```bash
# Run these commands and paste the output into .env

# For JWT_SECRET
openssl rand -hex 32

# For JWT_REFRESH_SECRET
openssl rand -hex 32

# For ENCRYPTION_KEY (must be exactly 32 characters)
openssl rand -hex 16
```

---

## PART 4: SSL CERTIFICATE SETUP

### Step 4.1: Create Self-Signed Certificate (Temporary)

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (for initial startup)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Step 4.2: Start Services (First Time)

```bash
# Build and start all services
docker-compose -f docker-compose.hostinger.yml up -d --build

# Check if services are running
docker-compose -f docker-compose.hostinger.yml ps

# View logs if something is wrong
docker-compose -f docker-compose.hostinger.yml logs -f
```

### Step 4.3: Get Let's Encrypt Certificate (Production)

```bash
# Stop nginx temporarily
docker-compose -f docker-compose.hostinger.yml stop nginx

# Get certificate (replace with your domain and email)
docker run -it --rm \
  -v $(pwd)/certbot_data:/var/www/certbot \
  -v $(pwd)/certbot_conf:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email

# Copy certificates to nginx/ssl
cp /root/bharat-crm/certbot_conf/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /root/bharat-crm/certbot_conf/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Start nginx again
docker-compose -f docker-compose.hostinger.yml up -d nginx
```

---

## PART 5: VERIFY DEPLOYMENT

### Step 5.1: Check All Services

```bash
# Check container status
docker-compose -f docker-compose.hostinger.yml ps

# Expected output - all should show "Up":
# NAME            STATUS
# crm-backend     Up (healthy)
# crm-frontend    Up
# crm-nginx       Up
# crm-qdrant      Up
```

### Step 5.2: Check Backend Logs

```bash
# View backend logs
docker-compose -f docker-compose.hostinger.yml logs backend

# Look for:
# - "Database connection successful"
# - "Server running on port 3001"
# - "Prisma migrations applied"
```

### Step 5.3: Test the Application

1. Open browser: `https://yourdomain.com`
2. You should see the login page
3. Create an account and test features

### Step 5.4: Check Database Connection

```bash
# Connect to backend container
docker exec -it crm-backend sh

# Inside container, test database
npx prisma db pull
# Should complete without errors

# Exit container
exit
```

---

## PART 6: COMMON COMMANDS

### View Logs

```bash
# All logs
docker-compose -f docker-compose.hostinger.yml logs -f

# Specific service
docker-compose -f docker-compose.hostinger.yml logs -f backend
docker-compose -f docker-compose.hostinger.yml logs -f frontend
docker-compose -f docker-compose.hostinger.yml logs -f nginx
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.hostinger.yml restart

# Restart specific service
docker-compose -f docker-compose.hostinger.yml restart backend
```

### Update Application

```bash
# Pull latest code
cd /root/bharat-crm
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.hostinger.yml down
docker-compose -f docker-compose.hostinger.yml up -d --build
```

### Stop Everything

```bash
docker-compose -f docker-compose.hostinger.yml down
```

### View Resource Usage

```bash
docker stats
```

---

## PART 7: TROUBLESHOOTING

### Problem: Backend can't connect to database

**Solution**: Add Hostinger IP to DigitalOcean trusted sources (Step 1.3)

```bash
# Check backend logs for connection errors
docker-compose -f docker-compose.hostinger.yml logs backend | grep -i error
```

### Problem: SSL certificate errors

**Solution**: Regenerate certificates

```bash
# Remove old certs
rm -rf nginx/ssl/*

# Generate new self-signed (temporary)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=yourdomain.com"

# Restart nginx
docker-compose -f docker-compose.hostinger.yml restart nginx
```

### Problem: Site not loading

**Solution**: Check nginx and DNS

```bash
# Check nginx logs
docker-compose -f docker-compose.hostinger.yml logs nginx

# Check if DNS is pointing to your IP
dig yourdomain.com
```

### Problem: Out of disk space

**Solution**: Clean Docker

```bash
# Remove unused images and containers
docker system prune -a

# Check disk usage
df -h
```

---

## PART 8: FIREWALL CONFIGURATION

```bash
# Install UFW if not present
apt install -y ufw

# Allow SSH (important - don't lock yourself out!)
ufw allow 22

# Allow HTTP and HTTPS
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## QUICK REFERENCE - IP/URL LOCATIONS

| What | Where to Update |
|------|-----------------|
| Hostinger VPS IP | DNS A records at your domain registrar |
| DigitalOcean DB Host | `.env` file → `DATABASE_URL` |
| Your Domain | `.env` file → `DOMAIN`, `FRONTEND_URL`, `VITE_API_URL` |
| Google OAuth Callbacks | Google Cloud Console + `.env` file |
| WhatsApp Webhook URL | Meta Business Suite → `https://yourdomain.com/api/webhooks/whatsapp` |

---

## MONTHLY COSTS (Estimate)

| Service | Cost |
|---------|------|
| Hostinger VPS (KVM 2) | ~$12-15/month |
| DigitalOcean PostgreSQL (Basic) | $15/month |
| Domain | ~$10-15/year |
| **Total** | **~$27-30/month** |

---

## SUPPORT

If you encounter issues:
1. Check logs: `docker-compose -f docker-compose.hostinger.yml logs -f`
2. Verify `.env` values are correct
3. Ensure DigitalOcean trusted sources include your Hostinger IP
4. Verify DNS is pointing to correct IP
