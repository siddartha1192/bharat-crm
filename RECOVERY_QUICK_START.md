# Bharat CRM - Quick Recovery Guide

**🚨 Emergency Recovery in 5 Steps**

## Quick Start (Automated)

```bash
# 1. Transfer backup files to new server
scp backups/db_*.sql.gz user@new-server:/opt/bharat-crm/backups/
scp backups/files_*.tar.gz user@new-server:/opt/bharat-crm/backups/

# 2. On new server, run the automated restore script
cd /opt/bharat-crm
sudo ./restore.sh
```

The script will:
- ✅ Detect available backups
- ✅ Restore database
- ✅ Restore files (uploads, knowledge_base, conversations)
- ✅ Start all services
- ✅ Verify restoration

---

## Manual Recovery (5 Steps)

### Step 1: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Setup Application

```bash
# Clone or copy application code to /opt/bharat-crm
sudo mkdir -p /opt/bharat-crm
cd /opt/bharat-crm

# Create .env.production with your configuration
# Copy values from old server's .env file
```

### Step 3: Start Database & Restore

```bash
# Start PostgreSQL
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for it to be ready (30 seconds)
sleep 30

# Restore database
docker cp backups/db_YYYYMMDD_HHMMSS.sql.gz bharat-crm-postgres:/tmp/
docker compose -f docker-compose.prod.yml exec postgres bash -c \
  "gunzip -c /tmp/db_*.sql.gz | psql -U postgres -d bharat_crm"
```

### Step 4: Restore Files

```bash
# Extract to temp location
mkdir -p /tmp/restore
tar -xzf backups/files_YYYYMMDD_HHMMSS.tar.gz -C /tmp/restore

# Copy to volumes (after starting backend once to create volumes)
docker compose -f docker-compose.prod.yml up -d backend
sleep 10

# Get volume paths and copy
sudo cp -r /tmp/restore/backend/uploads/* \
  /var/lib/docker/volumes/bharat-crm_backend_uploads/_data/
sudo cp -r /tmp/restore/backend/knowledge_base/* \
  /var/lib/docker/volumes/bharat-crm_backend_knowledge/_data/
sudo cp -r /tmp/restore/backend/conversations/* \
  /var/lib/docker/volumes/bharat-crm_backend_conversations/_data/

# Fix permissions
sudo chown -R 1000:1000 /var/lib/docker/volumes/bharat-crm_backend_*/_data/
```

### Step 5: Start All Services

```bash
# Build and start everything
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

## Critical Environment Variables

**Must configure in `.env.production`:**

```bash
# Database
POSTGRES_PASSWORD=<secure_password>

# Security Keys
JWT_SECRET=<generate_with: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate_with: openssl rand -base64 64>
ENCRYPTION_KEY=<generate_with: openssl rand -hex 16>

# Domain (for production)
DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com/api

# Copy from old server:
WHATSAPP_API_TOKEN=...
WHATSAPP_PHONE_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
```

---

## Verification Checklist

After restoration, verify:

```bash
# ✓ Containers running
docker compose -f docker-compose.prod.yml ps

# ✓ Database accessible
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm -c "SELECT COUNT(*) FROM users;"

# ✓ Backend responding
curl http://localhost:3001/api/health

# ✓ Frontend accessible
curl http://localhost

# ✓ Login works
# Open browser → http://localhost or https://your-domain.com

# ✓ Data visible
# Check customers, leads, tasks in UI
```

---

## Common Issues

### "Cannot connect to database"
```bash
# Check database is running
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check DATABASE_URL in .env.production
# Should be: postgresql://postgres:PASSWORD@postgres:5432/bharat_crm
```

### "Permission denied" on files
```bash
# Fix volume permissions
sudo chown -R 1000:1000 /var/lib/docker/volumes/bharat-crm_backend_*/_data/
docker compose -f docker-compose.prod.yml restart backend
```

### "Port already in use"
```bash
# Stop conflicting services
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3001
```

---

## Post-Recovery Tasks

1. **Update WhatsApp Webhook:**
   - Go to Meta Business Suite
   - Update webhook URL to: `https://your-new-domain.com/webhook`

2. **Update Google OAuth:**
   - Go to Google Cloud Console
   - Add new redirect URIs for new domain

3. **Setup SSL:**
   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot
   docker compose -f docker-compose.prod.yml restart nginx
   ```

4. **Enable Backups:**
   ```bash
   chmod +x backup.sh
   crontab -e
   # Add: 0 2 * * * /opt/bharat-crm/backup.sh
   ```

---

## Need Help?

📖 **Full Guide:** See `DISASTER_RECOVERY.md` for detailed instructions

🔧 **Backup Script:** `/opt/bharat-crm/backup.sh`

🔄 **Restore Script:** `/opt/bharat-crm/restore.sh`

📝 **Logs:** `docker compose -f docker-compose.prod.yml logs -f [service]`

---

**Recovery Time Estimate:**
- Automated (using restore.sh): **10-15 minutes**
- Manual: **30-45 minutes**
- Full setup with new domain/SSL: **1-2 hours**
