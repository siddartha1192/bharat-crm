# Deploying Bharat CRM on Hetzner Cloud

## Why Hetzner?
- **Cost-effective**: Best price-performance ratio
- **Location**: Data centers in Germany, Finland, USA
- **Performance**: Excellent network and hardware
- **Support**: Good customer support

## Step 1: Create Hetzner Account

1. Go to [https://www.hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Sign up for an account
3. Verify your email
4. Add payment method (credit card or PayPal)

## Step 2: Create a Cloud Server

### Using Hetzner Console

1. **Login to Cloud Console**:
   - Visit [https://console.hetzner.cloud/](https://console.hetzner.cloud/)
   - Click "New Project" → Name it "Bharat CRM"

2. **Create Server**:
   ```
   Click "Add Server" button

   Location: Choose closest to your users
   - Falkenstein, Germany (eu-central)
   - Helsinki, Finland (eu-north)
   - Ashburn, USA (us-east)

   Image: Ubuntu 22.04

   Type: Select based on needs
   - CX31 (Recommended): €12.90/month
     * 2 vCPUs
     * 8 GB RAM
     * 80 GB SSD
   - CX41 (High Performance): €25.80/month
     * 4 vCPUs
     * 16 GB RAM
     * 160 GB SSD

   SSH Keys: Add your public SSH key
   - Or create one: ssh-keygen -t ed25519

   Volumes: Skip for now (optional backup storage)

   Firewall: Create new firewall
   - Inbound Rules:
     * TCP 22 (SSH)
     * TCP 80 (HTTP)
     * TCP 443 (HTTPS)

   Backups: Enable (recommended)
   - Adds 20% to server cost

   Name: bharat-crm-prod

   Click "Create & Buy Now"
   ```

3. **Note Your Server IP**:
   - Copy the IPv4 address shown
   - Example: `95.217.123.456`

## Step 3: Configure DNS

1. **Go to your domain registrar** (Namecheap, GoDaddy, etc.)
2. **Add A records**:
   ```
   Type: A
   Host: @
   Value: YOUR_SERVER_IP
   TTL: 300

   Type: A
   Host: www
   Value: YOUR_SERVER_IP
   TTL: 300
   ```
3. **Wait for DNS propagation** (5-30 minutes)
4. **Verify**: `dig your-domain.com +short`

## Step 4: Connect to Your Server

```bash
# Connect via SSH
ssh root@YOUR_SERVER_IP

# Update system packages
apt update && apt upgrade -y

# Set hostname
hostnamectl set-hostname bharat-crm
```

## Step 5: Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version

# Install additional tools
apt install -y git curl wget htop nano ufw fail2ban
```

## Step 6: Configure Firewall

```bash
# Configure UFW firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Enable firewall
ufw --force enable

# Check status
ufw status
```

## Step 7: Clone Your Repository

```bash
# Create application directory
mkdir -p /opt/bharat-crm
cd /opt/bharat-crm

# Clone repository (replace with your repo URL)
git clone https://github.com/your-username/bharat-crm.git .

# Or upload files via SCP
# From your local machine:
# scp -r ./bharat-crm root@YOUR_SERVER_IP:/opt/bharat-crm
```

## Step 8: Configure Environment Variables

```bash
# Navigate to application directory
cd /opt/bharat-crm

# Create production environment file
cp .env.production.example .env.production

# Edit environment file
nano .env.production

# Fill in all required values:
# - DOMAIN=your-domain.com
# - POSTGRES_PASSWORD=strong-password
# - JWT_SECRET=long-random-string
# - OpenAI API key
# - WhatsApp credentials
# - Google OAuth credentials
# - SMTP settings

# Copy to backend directory
cp .env.production backend/.env
```

## Step 9: Build and Start Services

```bash
# Build Docker images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check if services are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                     STATUS              PORTS
# bharat-crm-postgres      running             5432/tcp
# bharat-crm-qdrant        running             6333/tcp, 6334/tcp
# bharat-crm-backend       running             3001/tcp
# bharat-crm-frontend      running             80/tcp
# bharat-crm-nginx         running             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

## Step 10: Setup SSL Certificate

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Enter your email when prompted
# Agree to terms of service
# Choose: Redirect HTTP to HTTPS

# Test automatic renewal
certbot renew --dry-run

# Setup auto-renewal (already configured by certbot)
systemctl status certbot.timer
```

## Step 11: Run Database Migrations

```bash
# Access backend container
docker compose -f docker-compose.prod.yml exec backend sh

# Run Prisma migrations
npx prisma migrate deploy

# Optional: Seed initial data
node scripts/seed.js

# Exit container
exit
```

## Step 12: Create Admin User

```bash
# Access PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d bharat_crm

# Create admin user (replace with your details)
INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@your-domain.com',
  '$2b$10$YourHashedPasswordHere',  -- Use bcrypt to hash
  'Admin User',
  'ADMIN',
  true,
  NOW(),
  NOW()
);

# Exit PostgreSQL
\q
```

## Step 13: Configure Backups

```bash
# Create backup script
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
  -C /opt/bharat-crm backend/uploads backend/knowledge_base backend/conversations

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make script executable
chmod +x /opt/bharat-crm/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/bharat-crm/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

## Step 14: Setup Monitoring

```bash
# Install monitoring tools
docker run -d \
  --name=cadvisor \
  --restart=always \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  gcr.io/cadvisor/cadvisor:latest

# Setup log rotation
cat > /etc/logrotate.d/bharat-crm << EOF
/opt/bharat-crm/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

## Step 15: Verify Deployment

```bash
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Test backend API
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# Test frontend
curl http://localhost
# Should return HTML

# Test from outside
curl https://your-domain.com
```

## Step 16: Performance Optimization

```bash
# Optimize PostgreSQL for production
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d bharat_crm

# Run these SQL commands:
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

# Restart PostgreSQL
docker compose -f docker-compose.prod.yml restart postgres
```

## Maintenance Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f [service_name]

# Restart a service
docker compose -f docker-compose.prod.yml restart [service_name]

# Update application
cd /opt/bharat-crm
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check disk usage
df -h
docker system df

# Clean up old images
docker system prune -a

# Backup database manually
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres bharat_crm > backup.sql
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Restart all services
docker compose -f docker-compose.prod.yml restart
```

### Can't connect to database
```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify connection
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm -c "SELECT 1"
```

### SSL certificate issues
```bash
# Renew certificate manually
certbot renew

# Check certificate status
certbot certificates

# Test Nginx configuration
nginx -t
```

## Cost Management

### Hetzner Pricing (as of 2024)
- **CX31**: €12.90/month ($14)
- **Backups**: +20% (€2.58/month)
- **IPv4**: Included
- **Traffic**: 20TB included
- **Total**: ~€15.50/month ($17)

### Optional Add-ons
- **Volumes**: €0.05/GB/month (for extra storage)
- **Snapshots**: €0.012/GB/month (for backups)
- **Load Balancer**: €5.49/month

## Scaling Options

### Vertical Scaling (Bigger Server)
```bash
# Resize server in Hetzner Console
# Power off server
# Change server type
# Power on server

# No data migration needed!
```

### Horizontal Scaling (More Servers)
See [Load Balancer Setup Guide](./04-LOAD-BALANCER-SETUP.md)

## Support

**Hetzner Support**:
- Email: support@hetzner.com
- Phone: +49 9831 505-0
- Docs: https://docs.hetzner.com/

**Emergency Contacts**:
- 24/7 Support available
- Response time: Usually < 30 minutes

---

**Next**: Your application should now be running! Visit https://your-domain.com

For high availability setup, see [Load Balancer Guide](./04-LOAD-BALANCER-SETUP.md)
