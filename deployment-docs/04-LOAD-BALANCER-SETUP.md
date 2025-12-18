# Load Balancer Setup for High Availability

## Overview

A load balancer distributes traffic across multiple servers, providing:
- **High Availability**: If one server fails, traffic routes to healthy servers
- **Scalability**: Add more servers to handle increased load
- **Zero-Downtime Deployments**: Update servers one at a time
- **Better Performance**: Distribute load evenly

## Architecture with Load Balancer

```
                     Internet
                        |
                        v
              ┌─────────────────┐
              │  Load Balancer  │
              │   (Port 443)    │
              └─────────┬───────┘
                        |
        ┌───────────────┼───────────────┐
        v               v               v
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Server 1│    │ Server 2│    │ Server 3│
   │  (App)  │    │  (App)  │    │  (App)  │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       v
              ┌─────────────────┐
              │  Database Server│
              │  (PostgreSQL +  │
              │    Qdrant)      │
              └─────────────────┘
```

## Prerequisites

- Minimum 3 servers (2 app servers + 1 database)
- Shared database server or managed database
- Domain name with DNS access
- SSL certificate (Let's Encrypt)

## Option 1: Hetzner Cloud Load Balancer

### Step 1: Create Additional Servers

```bash
# Create 2 application servers in Hetzner Console
# - Name: bharat-crm-app-1
# - Type: CX31 (4 vCPUs, 8GB RAM)
# - Same region
# - Same configuration as initial server

# Create database server
# - Name: bharat-crm-db
# - Type: CX41 (4 vCPUs, 16GB RAM)
# - Same region
```

### Step 2: Setup Shared Database

```bash
# On database server (bharat-crm-db):
ssh root@DB_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Create docker-compose.db.yml
mkdir -p /opt/bharat-crm
cd /opt/bharat-crm

cat > docker-compose.db.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: postgres
    restart: always
    environment:
      POSTGRES_DB: bharat_crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - db-network
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=2GB
      -c effective_cache_size=6GB

  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - db-network

volumes:
  postgres_data:
  qdrant_data:

networks:
  db-network:
    driver: bridge
EOF

# Create .env file
cat > .env << EOF
POSTGRES_PASSWORD=your-strong-password
EOF

# Start database services
docker compose -f docker-compose.db.yml up -d

# Configure firewall to allow app servers
ufw allow from APP1_PRIVATE_IP to any port 5432
ufw allow from APP2_PRIVATE_IP to any port 5432
ufw allow from APP1_PRIVATE_IP to any port 6333
ufw allow from APP2_PRIVATE_IP to any port 6333
```

### Step 3: Configure App Servers

```bash
# On each app server (app-1, app-2):
ssh root@APP_SERVER_IP

# Clone repository
cd /opt/bharat-crm
git clone https://github.com/your-username/bharat-crm.git .

# Create docker-compose.app.yml
cat > docker-compose.app.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@${DB_SERVER_IP}:5432/bharat_crm
      QDRANT_URL: http://${DB_SERVER_IP}:6333
      JWT_SECRET: ${JWT_SECRET}
      # Add other environment variables
    ports:
      - "3001:3001"
    networks:
      - app-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: frontend
    restart: always
    ports:
      - "80:80"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
EOF

# Configure environment
cat > .env << EOF
DB_SERVER_IP=PRIVATE_IP_OF_DB_SERVER
POSTGRES_PASSWORD=same-password-as-db-server
JWT_SECRET=your-jwt-secret
# Add other variables
EOF

# Start application
docker compose -f docker-compose.app.yml up -d
```

### Step 4: Create Load Balancer

1. **In Hetzner Console**:
   ```
   Load Balancers → Create Load Balancer

   Name: bharat-crm-lb
   Location: Same as servers
   Type: LB11 (€5.49/month)
   Algorithm: Round Robin

   Services:
   - HTTP → HTTPS Redirect
     Listen on: Port 80
     Destination: Port 443

   - HTTPS
     Listen on: Port 443
     Protocol: HTTPS
     Destination Port: 80
     Health Check: HTTP /health on port 80

   SSL Certificate:
   - Upload your Let's Encrypt certificates
   - Or use Hetzner managed certificates

   Targets:
   - Add bharat-crm-app-1
   - Add bharat-crm-app-2

   Health Checks:
   - Type: HTTP
   - Port: 80
   - Path: /health
   - Interval: 15s
   - Timeout: 10s
   - Retries: 3

   Create Load Balancer
   ```

2. **Note Load Balancer IP**: Copy the IP address

### Step 5: Update DNS

```bash
# Update A record to point to Load Balancer IP
Type: A
Host: @
Value: LOAD_BALANCER_IP
TTL: 300

Type: A
Host: www
Value: LOAD_BALANCER_IP
TTL: 300
```

### Step 6: Test Load Balancer

```bash
# Test load distribution
for i in {1..10}; do
  curl -s https://your-domain.com/api/health
  sleep 1
done

# Check load balancer metrics in Hetzner Console
# Should show balanced traffic between servers
```

## Option 2: DigitalOcean Load Balancer

### Step 1: Create Additional Droplets

```bash
# Create 2 application droplets
# - Name: bharat-crm-app-1, bharat-crm-app-2
# - Size: 4GB RAM / 2 vCPUs ($48/month each)
# - Same region
# - Enable private networking

# Create database droplet or use Managed Database
# Option A: Managed Database ($15/month)
#   - Databases → Create → PostgreSQL 15
#   - Basic node: 1 vCPU, 1GB RAM
#   - Automatic backups included

# Option B: Self-hosted database droplet
#   - Size: 8GB RAM / 4 vCPUs ($84/month)
```

### Step 2: Setup Database (if self-hosted)

```bash
# Similar to Hetzner setup above
# Configure VPC firewall rules
```

### Step 3: Configure App Droplets

```bash
# On each droplet:
# - Clone repository
# - Configure docker-compose.app.yml
# - Update DATABASE_URL to point to shared database
# - Start services

# Ensure all droplets are in same VPC
# Use private IPs for database connections
```

### Step 4: Create Load Balancer

1. **In DigitalOcean Console**:
   ```
   Networking → Load Balancers → Create Load Balancer

   Region: Same as droplets
   VPC: Select your VPC

   Forwarding Rules:
   - HTTPS → HTTP
     Port 443 → Port 80
     SSL Certificate: Upload or create new

   - HTTP → HTTPS Redirect
     Port 80 → Port 443

   Health Checks:
   - Protocol: HTTP
   - Port: 80
   - Path: /health
   - Interval: 10s
   - Timeout: 5s
   - Unhealthy threshold: 3
   - Healthy threshold: 2

   Sticky Sessions: Disabled (or enable if needed)

   Droplets:
   - Add bharat-crm-app-1
   - Add bharat-crm-app-2

   Algorithm: Round Robin

   Create Load Balancer ($12/month)
   ```

2. **Note Load Balancer IP**

### Step 5: Configure SSL

```bash
# Upload SSL certificate to Load Balancer
# Or use DigitalOcean Let's Encrypt integration

# In Load Balancer settings:
# Settings → SSL
# - Add Let's Encrypt certificate
# - Enter domain: your-domain.com
# - Auto-renew: Enabled
```

### Step 6: Update DNS

```bash
# Point domain to Load Balancer IP
# Use DigitalOcean DNS or external provider
```

## Option 3: Nginx as Load Balancer (Budget Option)

### Setup

```bash
# Create cheap server for load balancer
# - 1 vCPU, 2GB RAM ($12/month)
# - Install Nginx

# Configure /etc/nginx/nginx.conf
upstream backend_cluster {
    least_conn;
    server app1.internal:3001 max_fails=3 fail_timeout=30s;
    server app2.internal:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /api {
        proxy_pass http://backend_cluster;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        # ... other proxy settings
    }
}
```

## Load Balancing Algorithms

### Round Robin (Default)
- Distributes requests evenly
- Good for similar servers
- Simple and effective

### Least Connections
```
upstream backend {
    least_conn;
    server app1:3001;
    server app2:3001;
}
```
- Routes to server with fewest connections
- Good for long-running requests

### IP Hash
```
upstream backend {
    ip_hash;
    server app1:3001;
    server app2:3001;
}
```
- Same client always goes to same server
- Needed for sticky sessions

### Weighted
```
upstream backend {
    server app1:3001 weight=3;
    server app2:3001 weight=1;
}
```
- More powerful server gets more traffic

## Health Checks

### Backend Health Endpoint

```javascript
// In backend/server.js
app.get('/health', (req, res) => {
  // Check database connection
  prisma.$queryRaw`SELECT 1`
    .then(() => res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }))
    .catch(() => res.status(503).json({
      status: 'unhealthy'
    }));
});
```

## Session Management

### Option 1: Stateless Sessions (Recommended)
- Use JWT tokens
- No server-side session storage needed
- Works perfectly with load balancing

### Option 2: Shared Session Store
```javascript
// Use Redis for shared sessions
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

## Zero-Downtime Deployments

### Rolling Update Process

```bash
# Update app-1
ssh root@app1
cd /opt/bharat-crm
git pull
docker compose -f docker-compose.app.yml build
docker compose -f docker-compose.app.yml up -d
# Wait for health checks to pass

# Update app-2
ssh root@app2
cd /opt/bharat-crm
git pull
docker compose -f docker-compose.app.yml build
docker compose -f docker-compose.app.yml up -d

# No downtime! Load balancer continues serving from healthy servers
```

## Monitoring Load Balancer

### Hetzner Metrics
- In Console: Load Balancers → Your LB → Metrics
- View requests/second, response times, errors
- Check target health status

### DigitalOcean Monitoring
- Load Balancers → Your LB → Insights
- Request rate, connections, droplet health
- Configure alerts for health check failures

### Custom Monitoring

```bash
# Monitor with curl
watch -n 5 'curl -s https://your-domain.com/health'

# Check which server responded
curl -I https://your-domain.com | grep -i server

# Load test
ab -n 1000 -c 10 https://your-domain.com/
```

## Cost Comparison

### Hetzner Cloud
- Load Balancer: €5.49/month ($6)
- 2x App Servers (CX31): €25.80/month ($28)
- 1x DB Server (CX41): €25.80/month ($28)
- **Total**: €57/month (~$62)

### DigitalOcean
- Load Balancer: $12/month
- 2x Droplets (4GB): $96/month
- Managed Database: $15/month
- **Total**: $123/month

### Budget Option (Nginx LB)
- LB Server: $12/month
- 2x App Servers: $96/month
- 1x DB Server: $48/month
- **Total**: $156/month (more control, less automatic)

## Troubleshooting

### Server marked unhealthy
```bash
# Check health endpoint
curl http://SERVER_IP/health

# Check logs
docker compose logs backend

# Verify database connection
docker compose exec backend npx prisma db pull
```

### Uneven load distribution
```bash
# Check algorithm setting
# Verify servers have same capacity
# Check connection limits
```

### SSL certificate issues
```bash
# Verify certificate on load balancer
# Check domain matches certificate
# Ensure auto-renewal is configured
```

## Best Practices

1. **Health Checks**: Always configure robust health checks
2. **Gradual Rollout**: Update one server at a time
3. **Monitoring**: Set up alerts for failures
4. **Backups**: Regular database backups
5. **Security**: Use private networking between servers
6. **Updates**: Keep load balancer firmware updated
7. **Testing**: Test failover scenarios regularly

---

**Your application now has high availability!**

Traffic is distributed across multiple servers, providing redundancy and better performance.
