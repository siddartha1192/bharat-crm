# Multi-VPS Stateless Deployment Guide

## Architecture Overview

```
                                    INTERNET
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VPS 3: NGINX + FRONTEND                               │
│                          (Load Balancer)                                     │
│                        IP: nginx.example.com                                 │
│                          Ports: 80, 443                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│      VPS 1: APP SERVER 1      │ │      VPS 2: APP SERVER 2      │
│      IP: app1.example.com     │ │      IP: app2.example.com     │
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
│  VPS 5: REDIS │   │  VPS 4: WORKER  │   │  DIGITALOCEAN           │
│  Port: 6379   │   │  Port: 3002     │   │  Managed PostgreSQL     │
│  Sessions,    │   │  Cron Jobs,     │   │  Port: 25060            │
│  Socket.IO    │   │  Campaigns,     │   │                         │
│               │   │  Qdrant (6333)  │   │  DIGITALOCEAN Spaces    │
└───────────────┘   └─────────────────┘   │  (S3 File Storage)      │
                                          └─────────────────────────┘
```

---

## Server Summary

| VPS | Role | What Runs | Ports to Open |
|-----|------|-----------|---------------|
| **VPS 1** | App Server 1 | Node.js Backend | 3001 (internal) |
| **VPS 2** | App Server 2 | Node.js Backend | 3001 (internal) |
| **VPS 3** | Nginx + Frontend | Nginx, React App | 80, 443 (public) |
| **VPS 4** | Worker | Background Jobs, Qdrant | 3002 (internal) |
| **VPS 5** | Redis | Redis Server | 6379 (internal) |

---

## IP Address Planning

Before starting, note down the **private IPs** (if available) or **public IPs** of each VPS:

```
VPS 1 (App 1):    ___.___.___.___
VPS 2 (App 2):    ___.___.___.___
VPS 3 (Nginx):    ___.___.___.___  ← This is your main domain IP
VPS 4 (Worker):   ___.___.___.___
VPS 5 (Redis):    ___.___.___.___
```

> **Tip**: If your VPSes are in the same datacenter, use private IPs for internal communication (more secure, no bandwidth charges).

---

## Prerequisites

- [ ] 5 Hostinger VPS accounts (Ubuntu 22.04 LTS recommended)
- [ ] DigitalOcean account (for database and file storage)
- [ ] Domain name
- [ ] All VPS IPs noted down
- [ ] SSH access to all 5 VPSes

---

# PART 1: DIGITALOCEAN SETUP

> **[DIGITALOCEAN]** - Done in browser at https://cloud.digitalocean.com

### 1.1: Create PostgreSQL Database

1. Go to **Create** → **Databases**
2. Configure:
   - **Engine**: PostgreSQL 15
   - **Plan**: Basic ($15/month)
   - **Region**: Closest to your VPSes
   - **Name**: `crm-database`
3. Click **Create Database Cluster**
4. Save the **Connection String**

### 1.2: Add ALL VPS IPs to Trusted Sources

**IMPORTANT**: Add all 5 VPS IPs to trusted sources:

1. Go to **Databases** → **crm-database** → **Settings**
2. Under **Trusted Sources**, add:
   - VPS 1 IP (App 1)
   - VPS 2 IP (App 2)
   - VPS 4 IP (Worker)
3. Click **Save**

### 1.3: Create DigitalOcean Space

1. Go to **Create** → **Spaces Object Storage**
2. Configure:
   - **Region**: Same as database
   - **Name**: `crm-files`
3. Go to **API** → **Spaces Keys** → Generate new key
4. Save **Access Key** and **Secret Key**

---

# PART 2: DNS SETUP

> **[DOMAIN]** - At your domain registrar

Point your domain to **VPS 3 (Nginx)**:

```
Type: A    Name: @      Value: <VPS 3 IP>
Type: A    Name: www    Value: <VPS 3 IP>
```

---

# PART 3: VPS 5 - REDIS SERVER

> **[VPS 5]** - SSH into your Redis VPS

### 3.1: Connect to VPS 5

```bash
ssh root@<VPS_5_IP>
```

### 3.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io
```

### 3.3: Create Redis Directory

```bash
mkdir -p /root/redis
cd /root/redis
```

### 3.4: Create Docker Compose File

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: crm-redis
    restart: always
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass YOUR_REDIS_PASSWORD
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "YOUR_REDIS_PASSWORD", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
EOF
```

### 3.5: Set Redis Password

```bash
# Generate a secure password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "Your Redis Password: $REDIS_PASSWORD"
echo "SAVE THIS PASSWORD!"

# Update the docker-compose file with the password
sed -i "s|YOUR_REDIS_PASSWORD|$REDIS_PASSWORD|g" docker-compose.yml
```

### 3.6: Start Redis

```bash
docker-compose up -d
```

### 3.7: Configure Firewall

```bash
apt install -y ufw

# Allow SSH
ufw allow 22

# Allow Redis ONLY from your other VPSes (replace with actual IPs)
ufw allow from <VPS_1_IP> to any port 6379
ufw allow from <VPS_2_IP> to any port 6379
ufw allow from <VPS_4_IP> to any port 6379

# Enable firewall
ufw enable
```

### 3.8: Verify Redis

```bash
docker exec crm-redis redis-cli -a YOUR_REDIS_PASSWORD ping
# Should return: PONG
```

### 3.9: Note Your Redis URL

```
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@<VPS_5_IP>:6379
```

---

# PART 4: VPS 4 - WORKER SERVER

> **[VPS 4]** - SSH into your Worker VPS

### 4.1: Connect to VPS 4

```bash
ssh root@<VPS_4_IP>
```

### 4.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 4.3: Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/bharat-crm.git
cd bharat-crm
```

### 4.4: Create Environment File

```bash
cat > .env << 'EOF'
# Worker Server Environment
NODE_ENV=production
PORT=3002
IS_WORKER=true
APP_INSTANCE_ID=worker

# Database (from DigitalOcean)
DATABASE_URL=postgresql://doadmin:PASSWORD@HOST:25060/defaultdb?sslmode=require

# Redis (from VPS 5)
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@<VPS_5_IP>:6379

# S3/Spaces Storage
S3_ENDPOINT=https://fra1.digitaloceanspaces.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=crm-files
S3_REGION=fra1

# OpenAI
OPENAI_API_KEY=sk-your-key

# WhatsApp
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id

# Domain
FRONTEND_URL=https://yourdomain.com

# Security Keys
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Company
COMPANY_NAME=Your Company
OWNER_EMAIL=admin@yourdomain.com
EOF
```

### 4.5: Edit Environment File

```bash
nano .env
# Fill in all the values from your DigitalOcean setup and VPS 5 Redis
# Save with Ctrl+X, Y, Enter
```

### 4.6: Create Worker Docker Compose

```bash
cat > docker-compose.worker.yml << 'EOF'
version: '3.8'

services:
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: crm-worker
    restart: always
    ports:
      - "3002:3002"
    env_file:
      - .env
    volumes:
      - qdrant_data:/app/qdrant_data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"

volumes:
  qdrant_data:
EOF
```

### 4.7: Start Worker

```bash
docker-compose -f docker-compose.worker.yml up -d --build
```

### 4.8: Configure Firewall

```bash
apt install -y ufw
ufw allow 22

# Allow health checks from Nginx
ufw allow from <VPS_3_IP> to any port 3002

ufw enable
```

### 4.9: Verify Worker

```bash
docker logs crm-worker
curl http://localhost:3002/health
```

---

# PART 5: VPS 1 - APP SERVER 1

> **[VPS 1]** - SSH into your first App Server

### 5.1: Connect to VPS 1

```bash
ssh root@<VPS_1_IP>
```

### 5.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 5.3: Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/bharat-crm.git
cd bharat-crm
```

### 5.4: Create Environment File

```bash
cat > .env << 'EOF'
# App Server 1 Environment
NODE_ENV=production
PORT=3001
IS_WORKER=false
APP_INSTANCE_ID=app-1

# Database (from DigitalOcean)
DATABASE_URL=postgresql://doadmin:PASSWORD@HOST:25060/defaultdb?sslmode=require

# Redis (from VPS 5)
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@<VPS_5_IP>:6379

# S3/Spaces Storage
S3_ENDPOINT=https://fra1.digitaloceanspaces.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=crm-files
S3_REGION=fra1

# OpenAI
OPENAI_API_KEY=sk-your-key

# WhatsApp
WHATSAPP_API_TOKEN=your-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/google/callback
GOOGLE_AUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_REFRESH_TOKEN=your-token
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# Domain
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com

# Security Keys
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
ENCRYPTION_KEY=your-encryption-key

# Company
COMPANY_NAME=Your Company
OWNER_EMAIL=admin@yourdomain.com
EOF
```

### 5.5: Edit Environment File

```bash
nano .env
# Fill in all values
# Save with Ctrl+X, Y, Enter
```

### 5.6: Create App Docker Compose

```bash
cat > docker-compose.app.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: ./backend
      dockerfile: Dockerfile.stateless
    container_name: crm-app
    restart: always
    ports:
      - "3001:3001"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
EOF
```

### 5.7: Start App Server

```bash
docker-compose -f docker-compose.app.yml up -d --build
```

### 5.8: Configure Firewall

```bash
apt install -y ufw
ufw allow 22

# Allow traffic from Nginx only
ufw allow from <VPS_3_IP> to any port 3001

ufw enable
```

### 5.9: Verify App Server

```bash
docker logs crm-app
curl http://localhost:3001/api/health
```

---

# PART 6: VPS 2 - APP SERVER 2

> **[VPS 2]** - SSH into your second App Server

### 6.1: Connect to VPS 2

```bash
ssh root@<VPS_2_IP>
```

### 6.2: Repeat ALL Steps from Part 5

Do exactly the same as VPS 1, **EXCEPT**:

In the `.env` file, change:
```bash
APP_INSTANCE_ID=app-2
```

Everything else stays the same.

### Quick Commands for VPS 2:

```bash
# Install Docker
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone and setup
cd /root
git clone https://github.com/YOUR_USERNAME/bharat-crm.git
cd bharat-crm

# Copy .env from VPS 1 or create new (change APP_INSTANCE_ID=app-2)
nano .env

# Create docker-compose.app.yml (same as VPS 1)
cat > docker-compose.app.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: ./backend
      dockerfile: Dockerfile.stateless
    container_name: crm-app
    restart: always
    ports:
      - "3001:3001"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
EOF

# Start
docker-compose -f docker-compose.app.yml up -d --build

# Firewall
apt install -y ufw
ufw allow 22
ufw allow from <VPS_3_IP> to any port 3001
ufw enable
```

---

# PART 7: VPS 3 - NGINX + FRONTEND

> **[VPS 3]** - SSH into your Nginx/Frontend VPS

### 7.1: Connect to VPS 3

```bash
ssh root@<VPS_3_IP>
```

### 7.2: Install Docker

```bash
apt update && apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common git

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 7.3: Clone Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/bharat-crm.git
cd bharat-crm
```

### 7.4: Create Nginx Configuration

**IMPORTANT**: Replace `<VPS_1_IP>` and `<VPS_2_IP>` with actual IPs!

```bash
mkdir -p nginx
cat > nginx/nginx.multi-vps.conf << 'EOF'
# Upstream app servers (REPLACE WITH YOUR ACTUAL IPs!)
upstream app_servers {
    least_conn;
    server <VPS_1_IP>:3001 max_fails=3 fail_timeout=30s;
    server <VPS_2_IP>:3001 max_fails=3 fail_timeout=30s;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Frontend (React)
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API routes
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
```

### 7.5: Update Nginx Config with Your IPs

```bash
# Replace placeholders with actual IPs
nano nginx/nginx.multi-vps.conf

# Change these lines:
#   server <VPS_1_IP>:3001  → server 185.1.2.3:3001
#   server <VPS_2_IP>:3001  → server 185.4.5.6:3001
#   server_name yourdomain.com → server_name your-actual-domain.com
```

### 7.6: Create Environment File for Frontend

```bash
cat > .env << 'EOF'
VITE_API_URL=https://yourdomain.com
EOF
```

### 7.7: Create SSL Directory and Self-Signed Certificate

```bash
mkdir -p nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### 7.8: Create Docker Compose for Nginx + Frontend

```bash
cat > docker-compose.nginx.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL}
    container_name: crm-frontend
    restart: always
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    container_name: crm-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.multi-vps.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/nginx-health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
```

### 7.9: Start Nginx + Frontend

```bash
docker-compose -f docker-compose.nginx.yml up -d --build
```

### 7.10: Configure Firewall

```bash
apt install -y ufw
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 7.11: Get Real SSL Certificate

```bash
# Stop nginx
docker-compose -f docker-compose.nginx.yml stop nginx

# Get Let's Encrypt certificate
docker run -it --rm \
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
docker-compose -f docker-compose.nginx.yml up -d nginx
```

---

# PART 8: DATABASE MIGRATION

> **[VPS 1]** - Run migrations from App Server 1

### 8.1: SSH into VPS 1

```bash
ssh root@<VPS_1_IP>
```

### 8.2: Run Prisma Migrations

```bash
cd /root/bharat-crm
docker exec -it crm-app npx prisma migrate deploy
```

---

# PART 9: VERIFICATION

### 9.1: Check Each VPS

**[VPS 5 - Redis]**:
```bash
docker exec crm-redis redis-cli -a YOUR_PASSWORD ping
# Expected: PONG
```

**[VPS 4 - Worker]**:
```bash
curl http://localhost:3002/health
# Expected: {"status":"ok",...}
```

**[VPS 1 - App 1]**:
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","instance":"app-1",...}
```

**[VPS 2 - App 2]**:
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","instance":"app-2",...}
```

**[VPS 3 - Nginx]**:
```bash
curl -k https://localhost/api/health
# Should alternate between app-1 and app-2
```

### 9.2: Test from Browser

Open `https://yourdomain.com` - you should see the CRM login page.

---

# PART 10: COMMON COMMANDS

## VPS 5 (Redis)

```bash
cd /root/redis
docker-compose logs -f                    # View logs
docker-compose restart                    # Restart Redis
docker exec crm-redis redis-cli -a PASS INFO  # Redis info
```

## VPS 4 (Worker)

```bash
cd /root/bharat-crm
docker-compose -f docker-compose.worker.yml logs -f     # View logs
docker-compose -f docker-compose.worker.yml restart     # Restart
docker-compose -f docker-compose.worker.yml up -d --build  # Rebuild
```

## VPS 1 & 2 (App Servers)

```bash
cd /root/bharat-crm
docker-compose -f docker-compose.app.yml logs -f        # View logs
docker-compose -f docker-compose.app.yml restart        # Restart
docker-compose -f docker-compose.app.yml up -d --build  # Rebuild
```

## VPS 3 (Nginx + Frontend)

```bash
cd /root/bharat-crm
docker-compose -f docker-compose.nginx.yml logs -f      # View logs
docker-compose -f docker-compose.nginx.yml restart      # Restart
docker-compose -f docker-compose.nginx.yml up -d --build  # Rebuild
```

---

# PART 11: UPDATE APPLICATION

When you need to update the code:

### On VPS 1, 2, and 4 (App Servers + Worker):

```bash
cd /root/bharat-crm
git pull origin main
docker-compose -f docker-compose.app.yml up -d --build   # For VPS 1 & 2
# OR
docker-compose -f docker-compose.worker.yml up -d --build  # For VPS 4
```

### On VPS 3 (Frontend):

```bash
cd /root/bharat-crm
git pull origin main
docker-compose -f docker-compose.nginx.yml up -d --build
```

---

# Network Diagram Summary

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ VPS 3 (Nginx)          yourdomain.com:443                       │
│ - Receives all traffic                                          │
│ - SSL termination                                               │
│ - Load balances to VPS 1 & 2                                    │
│ - Serves frontend                                               │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐     ┌─────────────────────┐
│ VPS 1 (App 1)       │     │ VPS 2 (App 2)       │
│ :3001               │     │ :3001               │
│ - API requests      │     │ - API requests      │
│ - WebSocket         │     │ - WebSocket         │
└─────────┬───────────┘     └─────────┬───────────┘
          │                           │
          └─────────┬─────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐   ┌───────────┐   ┌─────────────────┐
│ VPS 5  │   │   VPS 4   │   │  DigitalOcean   │
│ Redis  │   │  Worker   │   │  PostgreSQL +   │
│ :6379  │   │   :3002   │   │  Spaces (S3)    │
└────────┘   └───────────┘   └─────────────────┘
```

---

# Estimated Monthly Costs

| VPS | Specification | Cost |
|-----|--------------|------|
| VPS 1 (App 1) | 2GB RAM | ~$5-8/month |
| VPS 2 (App 2) | 2GB RAM | ~$5-8/month |
| VPS 3 (Nginx) | 2GB RAM | ~$5-8/month |
| VPS 4 (Worker) | 4GB RAM | ~$10-15/month |
| VPS 5 (Redis) | 1GB RAM | ~$4-6/month |
| DigitalOcean PostgreSQL | Basic | $15/month |
| DigitalOcean Spaces | 250GB | $5/month |
| **Total** | | **~$50-65/month** |

---

# Deployment Checklist

- [ ] **Part 1**: DigitalOcean database created
- [ ] **Part 1**: All 5 VPS IPs added to trusted sources
- [ ] **Part 1**: DigitalOcean Space created
- [ ] **Part 2**: DNS pointing to VPS 3
- [ ] **Part 3**: VPS 5 - Redis running
- [ ] **Part 4**: VPS 4 - Worker running
- [ ] **Part 5**: VPS 1 - App Server 1 running
- [ ] **Part 6**: VPS 2 - App Server 2 running
- [ ] **Part 7**: VPS 3 - Nginx + Frontend running
- [ ] **Part 7**: SSL certificate installed
- [ ] **Part 8**: Database migrations completed
- [ ] **Part 9**: All health checks passing
- [ ] **Part 9**: Website accessible in browser
