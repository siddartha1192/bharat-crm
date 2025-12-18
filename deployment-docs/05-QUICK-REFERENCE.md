# Quick Reference Guide

## Docker Commands

### Start Services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Stop Services
```bash
docker compose -f docker-compose.prod.yml down
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 50 lines
docker compose -f docker-compose.prod.yml logs --tail=50
```

### Restart Service
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Check Service Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Execute Command in Container
```bash
docker compose -f docker-compose.prod.yml exec backend sh
```

### Rebuild and Restart
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Database Operations

### Access PostgreSQL
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm
```

### Run Migrations
```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Create Database Backup
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres bharat_crm | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database
```bash
gunzip < backup_20240101.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d bharat_crm
```

## Monitoring

### Check Resource Usage
```bash
docker stats
htop
df -h
```

### Check Disk Usage
```bash
du -sh /opt/bharat-crm/*
docker system df
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove everything unused
docker system prune -a
```

## SSL Certificate

### Renew Certificate
```bash
certbot renew
```

### Check Certificate Expiry
```bash
certbot certificates
```

### Test Auto-Renewal
```bash
certbot renew --dry-run
```

## Firewall

### Check Firewall Status
```bash
ufw status
```

### Open Port
```bash
ufw allow 8080/tcp
```

### Close Port
```bash
ufw delete allow 8080/tcp
```

## Git Operations

### Pull Latest Changes
```bash
cd /opt/bharat-crm
git pull origin main
```

### Check Current Version
```bash
git log -1 --oneline
```

### View Changes
```bash
git diff HEAD origin/main
```

## Application Updates

### Full Update Process
```bash
cd /opt/bharat-crm
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs [service]

# Check configuration
docker compose -f docker-compose.prod.yml config

# Rebuild from scratch
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm -c "SELECT 1"

# Check environment variables
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

### Out of Memory
```bash
# Check memory usage
free -h
docker stats

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Out of Disk Space
```bash
# Check usage
df -h
du -sh /var/lib/docker/*

# Clean up Docker
docker system prune -a

# Remove old logs
sudo journalctl --vacuum-time=7d

# Clean apt cache
sudo apt-get clean
```

## Environment Variables

### Location
```bash
/opt/bharat-crm/.env.production
/opt/bharat-crm/backend/.env
```

### Reload After Changes
```bash
docker compose -f docker-compose.prod.yml restart
```

## Backup Locations

### Manual Backups
```bash
/opt/bharat-crm/backups/
```

### Automated Backup Script
```bash
/opt/bharat-crm/backup.sh
```

### Verify Backup
```bash
ls -lh /opt/bharat-crm/backups/
```

## Common Issues

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :3001

# Kill process
sudo kill -9 [PID]
```

### Permission Denied
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/bharat-crm
```

### Container Keeps Restarting
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs --tail=100

# Check health
docker compose -f docker-compose.prod.yml ps
```

## Performance Tuning

### PostgreSQL
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm

ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';

\q

docker compose -f docker-compose.prod.yml restart postgres
```

### Nginx Cache
```bash
# Clear Nginx cache
docker compose -f docker-compose.prod.yml exec nginx \
  sh -c "rm -rf /var/cache/nginx/*"
```

## Security

### Update Passwords
```bash
# Update .env files
nano /opt/bharat-crm/.env.production

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Check Open Ports
```bash
sudo netstat -tulpn | grep LISTEN
```

### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

## Useful Commands

### Get Container IP
```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' [container_name]
```

### Copy Files from Container
```bash
docker cp [container_name]:/path/in/container /path/on/host
```

### Run One-off Command
```bash
docker compose -f docker-compose.prod.yml run --rm backend npm install
```

## Health Checks

### Backend Health
```bash
curl http://localhost:3001/health
```

### Frontend Health
```bash
curl http://localhost
```

### Database Health
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

## Load Balancer (if configured)

### Check Backend Health
```bash
curl http://app-server-ip/health
```

### Test Load Distribution
```bash
for i in {1..10}; do curl https://your-domain.com/api/health; done
```

## Contact & Support

**Emergency Commands**:
```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Restart everything
docker compose -f docker-compose.prod.yml up -d

# Nuclear option (rebuild everything)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Monitoring Services

### Check Service Status
```bash
systemctl status docker
systemctl status ufw
systemctl status fail2ban
```

### Restart Services
```bash
sudo systemctl restart docker
```

## Log Files

```bash
# Application logs
docker compose -f docker-compose.prod.yml logs

# Nginx logs
docker compose -f docker-compose.prod.yml exec nginx cat /var/log/nginx/access.log

# System logs
sudo journalctl -xe
```

---

**Pro Tip**: Create aliases in `~/.bashrc` for frequently used commands:

```bash
alias dc='docker compose -f /opt/bharat-crm/docker-compose.prod.yml'
alias dcup='dc up -d'
alias dcdown='dc down'
alias dclogs='dc logs -f'
alias dcps='dc ps'
```

Then reload: `source ~/.bashrc`

Now you can use: `dcup`, `dclogs backend`, etc.
