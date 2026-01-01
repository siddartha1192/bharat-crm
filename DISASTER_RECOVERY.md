# Bharat CRM - Disaster Recovery Guide

This guide provides step-by-step instructions to restore your Bharat CRM system on a new server using backup files.

## Prerequisites

### What You Need
- Backup files from your old server:
  - `db_YYYYMMDD_HHMMSS.sql.gz` (PostgreSQL database backup)
  - `files_YYYYMMDD_HHMMSS.tar.gz` (uploads, knowledge_base, conversations)
- A new server with:
  - Ubuntu 20.04+ or similar Linux distribution
  - Minimum 2GB RAM, 20GB disk space
  - Root or sudo access
  - Internet connectivity

### Software Requirements
- Docker Engine (24.0+)
- Docker Compose (2.0+)
- Git

---

## Step 1: Prepare the New Server

### 1.1 Install Docker and Docker Compose

```bash
# Update package index
sudo apt update

# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
```

### 1.2 Verify Installation

```bash
docker --version
docker compose version
```

---

## Step 2: Clone or Copy the Application Code

### Option A: Clone from Git Repository

```bash
# Create application directory
sudo mkdir -p /opt/bharat-crm
sudo chown $USER:$USER /opt/bharat-crm
cd /opt/bharat-crm

# Clone the repository (adjust URL to your repo)
git clone <your-repo-url> .
```

### Option B: Copy from Old Server

```bash
# On OLD server - create archive of application code
cd /opt/bharat-crm
tar -czf bharat-crm-code.tar.gz \
  --exclude=backups \
  --exclude=node_modules \
  --exclude=backend/node_modules \
  --exclude=.git \
  .

# Transfer to new server using scp
scp bharat-crm-code.tar.gz user@new-server-ip:/tmp/

# On NEW server - extract
sudo mkdir -p /opt/bharat-crm
sudo chown $USER:$USER /opt/bharat-crm
cd /opt/bharat-crm
tar -xzf /tmp/bharat-crm-code.tar.gz
```

---

## Step 3: Transfer Backup Files to New Server

### 3.1 Copy Backup Files

```bash
# From your local machine or old server
# Replace the dates with your actual backup file dates

# Copy database backup
scp /opt/bharat-crm/backups/db_20240115_123000.sql.gz user@new-server-ip:/tmp/

# Copy files backup
scp /opt/bharat-crm/backups/files_20240115_123000.tar.gz user@new-server-ip:/tmp/
```

### 3.2 Create Backup Directory on New Server

```bash
# On new server
mkdir -p /opt/bharat-crm/backups
mv /tmp/db_*.sql.gz /opt/bharat-crm/backups/
mv /tmp/files_*.tar.gz /opt/bharat-crm/backups/
```

---

## Step 4: Configure Environment Variables

### 4.1 Create Production Environment File

```bash
cd /opt/bharat-crm

# Create .env file from example (if it doesn't exist)
cp .env.example .env.production
```

### 4.2 Edit Configuration

Edit `/opt/bharat-crm/.env.production` with your production values:

```bash
nano .env.production
```

**Critical Variables to Configure:**

```env
# Database Configuration
POSTGRES_DB=bharat_crm
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>

# JWT Secrets (generate new secure keys)
JWT_SECRET=<GENERATE_STRONG_SECRET>
JWT_REFRESH_SECRET=<GENERATE_STRONG_SECRET>
ENCRYPTION_KEY=<GENERATE_32_CHAR_KEY>

# Domain and SSL
DOMAIN=your-domain.com
SSL_EMAIL=your-email@domain.com
FRONTEND_URL=https://your-domain.com

# API URLs
VITE_API_URL=https://your-domain.com/api
VITE_API_WEBHOOK_URL=https://your-domain.com/webhook

# WhatsApp Configuration (copy from old server)
WHATSAPP_API_TOKEN=<your_token>
WHATSAPP_PHONE_ID=<your_phone_id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<your_verify_token>
WHATSAPP_BUSINESS_ACCOUNT_ID=<your_account_id>

# Google OAuth (copy from old server)
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>
GOOGLE_REDIRECT_URI=https://your-domain.com/calendar/callback
GOOGLE_AUTH_REDIRECT_URI=https://your-domain.com/auth/google/callback

# Gmail Configuration (copy from old server)
GMAIL_USER=<your_gmail>
GMAIL_REFRESH_TOKEN=<your_refresh_token>
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# OpenAI Configuration (copy from old server)
OPENAI_API_KEY=<your_openai_key>

# Qdrant Vector Database (copy from old server)
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=<your_qdrant_key>

# pgAdmin
PGADMIN_EMAIL=admin@bharatcrm.com
PGADMIN_PASSWORD=<STRONG_PASSWORD>
```

**Generate Strong Secrets:**

```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate JWT_REFRESH_SECRET
openssl rand -base64 64

# Generate ENCRYPTION_KEY (32 characters)
openssl rand -hex 16
```

---

## Step 5: Restore Database Backup

### 5.1 Start Only PostgreSQL Container

```bash
cd /opt/bharat-crm

# Start only the database
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready (check logs)
docker compose -f docker-compose.prod.yml logs -f postgres

# Wait until you see: "database system is ready to accept connections"
# Press Ctrl+C to exit logs
```

### 5.2 Restore Database from Backup

```bash
# Copy backup into container
docker cp /opt/bharat-crm/backups/db_YYYYMMDD_HHMMSS.sql.gz bharat-crm-postgres:/tmp/

# Restore the database
docker compose -f docker-compose.prod.yml exec postgres bash -c "
  gunzip -c /tmp/db_YYYYMMDD_HHMMSS.sql.gz | psql -U postgres -d bharat_crm
"

# Check if restore was successful
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d bharat_crm -c "\dt"
```

**Expected Output:** You should see a list of tables (users, customers, leads, tasks, etc.)

### 5.3 Verify Database Content

```bash
# Check record counts
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d bharat_crm -c "
  SELECT 'users' as table_name, COUNT(*) FROM users
  UNION ALL
  SELECT 'customers', COUNT(*) FROM customers
  UNION ALL
  SELECT 'leads', COUNT(*) FROM leads
  UNION ALL
  SELECT 'tasks', COUNT(*) FROM tasks;
"
```

---

## Step 6: Restore Files Backup

### 6.1 Extract Files to Temporary Location

```bash
cd /opt/bharat-crm

# Create temporary extraction directory
mkdir -p /tmp/restore
cd /tmp/restore

# Extract files backup
tar -xzf /opt/bharat-crm/backups/files_YYYYMMDD_HHMMSS.tar.gz

# Verify extraction
ls -la backend/
```

### 6.2 Identify Docker Volume Paths

```bash
# Find volume mount points
docker volume inspect bharat-crm_backend_uploads | grep Mountpoint
docker volume inspect bharat-crm_backend_knowledge | grep Mountpoint
docker volume inspect bharat-crm_backend_conversations | grep Mountpoint
```

**Note the paths**, they'll typically be:
- `/var/lib/docker/volumes/bharat-crm_backend_uploads/_data`
- `/var/lib/docker/volumes/bharat-crm_backend_knowledge/_data`
- `/var/lib/docker/volumes/bharat-crm_backend_conversations/_data`

### 6.3 Copy Files to Docker Volumes

```bash
# Method 1: Direct copy to volumes (requires sudo)
sudo cp -r /tmp/restore/backend/uploads/* /var/lib/docker/volumes/bharat-crm_backend_uploads/_data/
sudo cp -r /tmp/restore/backend/knowledge_base/* /var/lib/docker/volumes/bharat-crm_backend_knowledge/_data/
sudo cp -r /tmp/restore/backend/conversations/* /var/lib/docker/volumes/bharat-crm_backend_conversations/_data/

# Fix permissions
sudo chown -R 1000:1000 /var/lib/docker/volumes/bharat-crm_backend_uploads/_data/
sudo chown -R 1000:1000 /var/lib/docker/volumes/bharat-crm_backend_knowledge/_data/
sudo chown -R 1000:1000 /var/lib/docker/volumes/bharat-crm_backend_conversations/_data/

# Cleanup
rm -rf /tmp/restore
```

**Alternative Method 2: Using Docker CP (if containers are running)**

```bash
# If backend container is running
docker cp /tmp/restore/backend/uploads/. bharat-crm-backend:/app/uploads/
docker cp /tmp/restore/backend/knowledge_base/. bharat-crm-backend:/app/knowledge_base/
docker cp /tmp/restore/backend/conversations/. bharat-crm-backend:/app/conversations/
```

---

## Step 7: Start All Services

### 7.1 Build and Start All Containers

```bash
cd /opt/bharat-crm

# Build images
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Monitor logs
docker compose -f docker-compose.prod.yml logs -f
```

### 7.2 Verify Services Status

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Should show all services as "running":
# - postgres
# - pgadmin
# - qdrant
# - backend
# - frontend
# - nginx
```

---

## Step 8: Configure SSL (If Using Custom Domain)

### 8.1 Update DNS Records

Point your domain to the new server's IP address:
- A record: `your-domain.com` → `NEW_SERVER_IP`
- A record: `www.your-domain.com` → `NEW_SERVER_IP`

### 8.2 Obtain SSL Certificate

```bash
cd /opt/bharat-crm

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Run certbot
docker compose -f docker-compose.prod.yml run --rm certbot

# Start nginx
docker compose -f docker-compose.prod.yml start nginx
```

---

## Step 9: Verification and Testing

### 9.1 Health Checks

```bash
# Check database connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Check backend API
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost
```

### 9.2 Application Testing

1. **Access the Application:**
   - Open browser: `https://your-domain.com`
   - Or local: `http://localhost`

2. **Login Test:**
   - Try logging in with existing credentials
   - Verify user authentication works

3. **Data Verification:**
   - Check if customers are visible
   - Check if leads are visible
   - Check if tasks are visible
   - Verify file uploads are accessible

4. **WhatsApp Integration:**
   - Update webhook URL in Meta Business Suite to new server
   - Test sending a message

5. **Email Integration:**
   - Test sending an email
   - Verify Gmail sync works

### 9.3 Check Logs for Errors

```bash
# Backend logs
docker compose -f docker-compose.prod.yml logs backend | grep -i error

# Database logs
docker compose -f docker-compose.prod.yml logs postgres | grep -i error

# All services
docker compose -f docker-compose.prod.yml logs --tail=100
```

---

## Step 10: Setup Automated Backups on New Server

### 10.1 Create Backup Script

```bash
cat > /opt/bharat-crm/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/bharat-crm/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose -f /opt/bharat-crm/docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres bharat_crm | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads and knowledge base
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  -C /opt/bharat-crm backend/uploads backend/knowledge_base backend/conversations 2>/dev/null

# Alternative: Backup from Docker volumes
if [ ! -f "$BACKUP_DIR/files_$DATE.tar.gz" ]; then
  sudo tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
    -C /var/lib/docker/volumes/ \
    bharat-crm_backend_uploads \
    bharat-crm_backend_knowledge \
    bharat-crm_backend_conversations
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
chmod +x /opt/bharat-crm/backup.sh
```

### 10.2 Setup Cron Job for Daily Backups

```bash
# Open crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /opt/bharat-crm/backup.sh >> /opt/bharat-crm/backup.log 2>&1
```

### 10.3 Test Backup Script

```bash
# Run manually to test
/opt/bharat-crm/backup.sh

# Verify backups were created
ls -lh /opt/bharat-crm/backups/
```

---

## Troubleshooting

### Issue: Database Restore Fails

**Solution:**
```bash
# Drop and recreate database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS bharat_crm;"
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "CREATE DATABASE bharat_crm;"

# Try restore again
docker cp /opt/bharat-crm/backups/db_YYYYMMDD_HHMMSS.sql.gz bharat-crm-postgres:/tmp/
docker compose -f docker-compose.prod.yml exec postgres bash -c "gunzip -c /tmp/db_*.sql.gz | psql -U postgres -d bharat_crm"
```

### Issue: Permission Denied on Files

**Solution:**
```bash
# Fix ownership of volume directories
sudo chown -R 1000:1000 /var/lib/docker/volumes/bharat-crm_backend_*/
```

### Issue: Backend Can't Connect to Database

**Solution:**
```bash
# Check DATABASE_URL in .env.production
# Ensure it matches: postgresql://postgres:PASSWORD@postgres:5432/bharat_crm

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### Issue: SSL Certificate Fails

**Solution:**
```bash
# Make sure DNS is propagated
nslookup your-domain.com

# Use HTTP challenge for Let's Encrypt
# Ensure port 80 is accessible

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx
```

### Issue: Old WhatsApp Messages Not Visible

**Possible Causes:**
- Database not restored correctly
- Volume mount not working

**Solution:**
```bash
# Verify data in database
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d bharat_crm -c "SELECT COUNT(*) FROM whatsapp_messages;"

# Check volume mounts
docker inspect bharat-crm-backend | grep -A 10 Mounts
```

---

## Post-Recovery Checklist

- [ ] All Docker containers running
- [ ] Database restored and accessible
- [ ] Files (uploads/knowledge_base/conversations) restored
- [ ] Application accessible via browser
- [ ] User login working
- [ ] Customer data visible
- [ ] WhatsApp webhook configured
- [ ] Email integration working
- [ ] SSL certificate installed (if applicable)
- [ ] Automated backups configured
- [ ] Test backup script working
- [ ] Firewall configured (ports 80, 443)
- [ ] Monitor logs for errors

---

## Backup Strategy Going Forward

### What to Backup
1. **Database** (critical): Daily
2. **Files** (uploads, knowledge_base, conversations): Daily
3. **Configuration** (.env files): After changes
4. **SSL certificates**: Weekly

### Backup Retention
- Daily backups: Keep 7 days
- Weekly backups: Keep 4 weeks
- Monthly backups: Keep 3 months

### Off-site Backup
Consider copying backups to cloud storage:

```bash
# Example: Sync to AWS S3
aws s3 sync /opt/bharat-crm/backups/ s3://your-bucket/bharat-crm-backups/

# Example: Sync to another server
rsync -avz /opt/bharat-crm/backups/ user@backup-server:/backups/bharat-crm/
```

---

## Emergency Contacts & Resources

- **Docker Documentation**: https://docs.docker.com
- **PostgreSQL Backup**: https://www.postgresql.org/docs/current/backup.html
- **Nginx Configuration**: https://nginx.org/en/docs/

---

## Quick Recovery Command Reference

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f [service_name]

# Restart specific service
docker compose -f docker-compose.prod.yml restart [service_name]

# Execute command in container
docker compose -f docker-compose.prod.yml exec [service_name] [command]

# Database backup (manual)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres bharat_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Database restore (manual)
gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d bharat_crm
```

---

**Last Updated:** 2026-01-01
**Version:** 1.0
