# Deploying Bharat CRM on DigitalOcean

## Why DigitalOcean?
- **Easy to use**: Intuitive interface
- **Good documentation**: Extensive tutorials
- **Global presence**: 15+ data centers worldwide
- **Managed services**: Database, Load Balancers, Kubernetes
- **Marketplace**: One-click apps

## Step 1: Create DigitalOcean Account

1. Go to [https://www.digitalocean.com/](https://www.digitalocean.com/)
2. Sign up for an account
3. Get $200 credit for 60 days (new users)
4. Verify your email
5. Add payment method

## Step 2: Create a Droplet (Server)

### Using DigitalOcean Console

1. **Login to Control Panel**:
   - Visit [https://cloud.digitalocean.com/](https://cloud.digitalocean.com/)
   - Click "Create" → "Droplets"

2. **Choose Configuration**:

   **Region**: Choose closest to your users
   ```
   - New York (USA East Coast)
   - San Francisco (USA West Coast)
   - London (Europe)
   - Frankfurt (Europe)
   - Singapore (Asia)
   - Bangalore (India) - Recommended for Indian users
   ```

   **Image**: Ubuntu 22.04 (LTS) x64

   **Droplet Size**:
   ```
   Basic Plan - Recommended for start:
   - 4 GB RAM / 2 vCPUs
   - 80 GB SSD
   - 4 TB Transfer
   - $48/month

   CPU-Optimized (High Performance):
   - 8 GB RAM / 4 vCPUs
   - 100 GB SSD
   - 5 TB Transfer
   - $84/month
   ```

   **Additional Options**:
   - ✓ Enable IPv6
   - ✓ Enable Monitoring (free)
   - ✓ Enable Backups (+$9.60/month, 20% of droplet cost)

   **Authentication**:
   - Select "SSH keys" (recommended)
   - Or use "Password" (less secure)

   **Hostname**: `bharat-crm-prod`

   **Tags**: `production`, `crm`

3. **Click "Create Droplet"**

4. **Note Your Droplet IP**:
   - Copy the IPv4 address
   - Example: `159.89.123.456`

## Step 3: Configure Domain and DNS

### Option A: Using DigitalOcean DNS (Recommended)

1. **Add Domain to DigitalOcean**:
   ```
   Networking → Domains → Add Domain
   Enter: your-domain.com
   ```

2. **Create DNS Records**:
   ```
   Type: A
   Hostname: @
   Will Direct To: Select your droplet
   TTL: 30 seconds

   Type: A
   Hostname: www
   Will Direct To: Select your droplet
   TTL: 30 seconds
   ```

3. **Update Nameservers at Registrar**:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```

### Option B: Using External DNS
- Point A records to your droplet IP
- Follow Step 3 from Hetzner guide

## Step 4: Connect to Your Droplet

```bash
# Connect via SSH
ssh root@YOUR_DROPLET_IP

# Or from DigitalOcean Console → Access → Launch Droplet Console

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Kolkata  # Or your timezone

# Set hostname
hostnamectl set-hostname bharat-crm
```

## Step 5: Initial Server Setup

```bash
# Create non-root user (recommended)
adduser deploy
usermod -aG sudo deploy

# Copy SSH keys to new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Switch to deploy user
su - deploy

# From now on, use: ssh deploy@YOUR_DROPLET_IP
```

## Step 6: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes
exit
ssh deploy@YOUR_DROPLET_IP

# Verify Docker installation
docker --version

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker compose version
```

## Step 7: Configure Cloud Firewall

### Using DigitalOcean Cloud Firewall (Recommended)

1. **Go to**: Networking → Firewalls → Create Firewall

2. **Inbound Rules**:
   ```
   Type        Protocol    Port    Sources
   SSH         TCP         22      All IPv4, All IPv6
   HTTP        TCP         80      All IPv4, All IPv6
   HTTPS       TCP         443     All IPv4, All IPv6
   ```

3. **Outbound Rules**:
   ```
   Type        Protocol    Port    Destinations
   All TCP     TCP         All     All IPv4, All IPv6
   All UDP     UDP         All     All IPv4, All IPv6
   ```

4. **Apply to Droplet**: Select your droplet

### Alternative: UFW Firewall

```bash
# Configure UFW (if not using Cloud Firewall)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

## Step 8: Clone and Configure Application

```bash
# Create application directory
sudo mkdir -p /opt/bharat-crm
sudo chown deploy:deploy /opt/bharat-crm
cd /opt/bharat-crm

# Clone repository
git clone https://github.com/your-username/bharat-crm.git .

# Or use SCP from local machine:
# scp -r ./bharat-crm deploy@YOUR_DROPLET_IP:/opt/bharat-crm

# Create environment file
cp .env.production.example .env.production

# Edit environment variables
nano .env.production

# IMPORTANT: Update these values:
# - DOMAIN=your-domain.com
# - POSTGRES_PASSWORD=strong-random-password
# - JWT_SECRET=long-random-string-min-32-chars
# - JWT_REFRESH_SECRET=another-long-random-string
# - OPENAI_API_KEY=your-openai-key
# - All other API credentials

# Copy to backend
cp .env.production backend/.env
```

## Step 9: Deploy Application

```bash
# Navigate to application directory
cd /opt/bharat-crm

# Build Docker images
docker compose -f docker-compose.prod.yml build

# Start services in background
docker compose -f docker-compose.prod.yml up -d

# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Wait for all services to be healthy
# Press Ctrl+C to stop viewing logs
```

## Step 10: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --agree-tos \
  --no-eff-email \
  --email your-email@example.com

# Update nginx configuration
sudo nano nginx/nginx.conf

# Update these lines with your domain:
# server_name your-domain.com www.your-domain.com;
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

# Restart nginx
docker compose -f docker-compose.prod.yml up -d nginx

# Setup auto-renewal
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab
```

## Step 11: Initialize Database

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec backend sh

# Inside container:
npx prisma migrate deploy
npx prisma generate

# Exit container
exit
```

## Step 12: Create Admin User

```bash
# Access backend container
docker compose -f docker-compose.prod.yml exec backend node

# In Node REPL, run:
const bcrypt = require('bcrypt');
bcrypt.hash('YourSecurePassword', 10).then(hash => console.log(hash));

# Copy the hash output, then exit:
.exit

# Access PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm

# Create admin user (replace values):
INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@your-domain.com',
  '$2b$10$PASTE_YOUR_HASH_HERE',
  'Admin User',
  'ADMIN',
  true,
  NOW(),
  NOW()
);

# Exit PostgreSQL
\q
```

## Step 13: Setup Automated Backups

### Option A: DigitalOcean Managed Database (Easier, Costs More)

1. **Create Managed Database**:
   ```
   Databases → Create Database Cluster
   - PostgreSQL 15
   - Basic node: $15/month
   - Daily backups included
   ```

2. **Update docker-compose.prod.yml**:
   ```yaml
   # Remove postgres service
   # Update DATABASE_URL with managed database connection string
   ```

### Option B: Custom Backup Script (Free)

```bash
# Create backup script
sudo tee /opt/bharat-crm/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/bharat-crm/backups"
DATE=$(date +%Y%m%d_%H%M%S)
SPACE_NAME="your-space-name"  # If using DigitalOcean Spaces

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose -f /opt/bharat-crm/docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres bharat_crm | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  -C /opt/bharat-crm backend/uploads backend/knowledge_base

# Optional: Upload to DigitalOcean Spaces
# s3cmd put $BACKUP_DIR/*.gz s3://$SPACE_NAME/backups/

# Keep last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
sudo chmod +x /opt/bharat-crm/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/bharat-crm/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

## Step 14: Setup Monitoring

### Using DigitalOcean Monitoring (Built-in)

1. **Enable Monitoring**:
   - Already enabled if you checked the box during droplet creation
   - Go to: Droplet → Monitoring

2. **Setup Alerts**:
   ```
   Monitoring → Alerts → Create Alert Policy

   Alert: CPU Usage
   Condition: Above 90% for 5 minutes
   Notification: Email

   Alert: Disk Usage
   Condition: Above 85%
   Notification: Email
   ```

### Install Uptime Monitoring

```bash
# Install Netdata (optional but recommended)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access at: http://YOUR_DROPLET_IP:19999
# Setup firewall rule or use SSH tunnel:
# ssh -L 19999:localhost:19999 deploy@YOUR_DROPLET_IP
```

## Step 15: Verify Deployment

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Test backend API
curl http://localhost:3001/health

# Test from outside
curl https://your-domain.com

# Check logs
docker compose -f docker-compose.prod.yml logs --tail=50

# Monitor resource usage
docker stats
```

## Step 16: Performance Tuning

```bash
# Optimize Docker
sudo nano /etc/docker/daemon.json

# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}

# Restart Docker
sudo systemctl restart docker

# Tune PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d bharat_crm

# Run optimization queries:
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';

# Restart PostgreSQL
docker compose -f docker-compose.prod.yml restart postgres
```

## Maintenance Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Update application
cd /opt/bharat-crm
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check resource usage
docker stats
htop
df -h

# Clean up
docker system prune -a
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Rebuild images
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Out of Memory
```bash
# Check memory
free -h
docker stats

# Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Slow Performance
```bash
# Check system resources
htop
iotop

# Check Docker logs size
du -sh /var/lib/docker/

# Prune old data
docker system prune -a
```

## Cost Management

### DigitalOcean Pricing (as of 2024)
- **Basic Droplet (4GB)**: $48/month
- **Backups**: +$9.60/month (20%)
- **Monitoring**: Free
- **Bandwidth**: 4TB included
- **Total**: ~$58/month

### Cost Optimization Tips
1. **Use Managed Database**: $15/month (saves backup hassle)
2. **Enable Backups**: Worth it for peace of mind
3. **Use Spaces**: $5/month for 250GB (file storage)
4. **Reserved Instances**: 1-year commitment saves ~10%

## Scaling Options

### Vertical Scaling
```bash
# Resize droplet in console
# Power Off → Resize → Choose new size → Power On
# No data migration needed!
```

### Horizontal Scaling
See [Load Balancer Setup Guide](./04-LOAD-BALANCER-SETUP.md)

## Support Resources

**DigitalOcean Support**:
- **Tickets**: cloud.digitalocean.com/support/tickets
- **Community**: digitalocean.com/community
- **Docs**: docs.digitalocean.com
- **Tutorials**: digitalocean.com/community/tutorials

**Response Times**:
- Free Plan: 24-72 hours
- Premium Support: < 4 hours ($100-500/month)

---

**Next**: Your application should be running at https://your-domain.com

For high availability setup, see [Load Balancer Guide](./04-LOAD-BALANCER-SETUP.md)
