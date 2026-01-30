# Nginx Load Balancer Configuration

## Overview

The Nginx load balancer serves as the single entry point for all traffic to the CRM application. It provides:

- **Load Balancing**: Distributes requests across app servers
- **SSL Termination**: Handles HTTPS with Let's Encrypt certificates
- **WebSocket Support**: Sticky sessions for Socket.IO connections
- **Rate Limiting**: Protection against abuse and DDoS
- **Health Checks**: Automatic removal of unhealthy backends

## Configuration File

The main configuration is located at:
```
docs/stateless-architecture/nginx/nginx.stateless.conf
```

## Upstream Definitions

### App Servers (Round-Robin)
```nginx
upstream app_servers {
    least_conn;  # Sends to server with least connections
    keepalive 32;

    server app-1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server app-2:3001 weight=1 max_fails=3 fail_timeout=30s;
}
```

### WebSocket Servers (Sticky Sessions)
```nginx
upstream websocket_servers {
    ip_hash;  # Same client always goes to same server

    server app-1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server app-2:3001 weight=1 max_fails=3 fail_timeout=30s;
}
```

## Load Balancing Methods

| Method | Use Case | Configuration |
|--------|----------|---------------|
| `round_robin` | Default, simple distribution | (default) |
| `least_conn` | API requests | `least_conn;` |
| `ip_hash` | WebSocket/stateful | `ip_hash;` |
| `hash` | Custom key | `hash $request_uri;` |

## Rate Limiting

### API Endpoints
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
}
```
- **Rate**: 10 requests per second per IP
- **Burst**: Allows up to 20 requests in a burst
- **Memory**: 10MB zone (~160,000 IP addresses)

### Login Endpoints
```nginx
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

location /api/auth/login {
    limit_req zone=login_limit burst=5 nodelay;
}
```
- **Rate**: 5 requests per minute (brute force protection)

## SSL Configuration

### Certificate Setup with Let's Encrypt

1. **Initial Certificate Request**:
```bash
# Create webroot directory
mkdir -p nginx/certbot-webroot

# Start nginx with HTTP only first
docker-compose -f docker-compose.stateless.yml up -d nginx

# Request certificate
docker-compose -f docker-compose.stateless.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos \
    --no-eff-email
```

2. **Copy Certificates**:
```bash
# Copy from Let's Encrypt volume to nginx ssl directory
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

3. **Auto-Renewal**:
The certbot container automatically renews certificates every 12 hours.

### Self-Signed (Development)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -subj "/CN=localhost"
```

## WebSocket Configuration

```nginx
location /socket.io/ {
    proxy_pass http://websocket_servers;
    proxy_http_version 1.1;

    # WebSocket upgrade
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # Long timeouts for persistent connections
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;

    # Disable buffering
    proxy_buffering off;
}
```

**Important**: WebSocket uses `ip_hash` upstream to ensure clients stay connected to the same backend server for the duration of their session.

## Health Check Endpoint

```nginx
location /nginx-health {
    access_log off;
    return 200 "healthy\n";
}
```

Test with:
```bash
curl http://localhost/nginx-health
# Response: healthy
```

## Proxy Headers

All proxied requests include these headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Real-IP` | Client IP | Original client IP |
| `X-Forwarded-For` | Proxy chain | Full proxy chain |
| `X-Forwarded-Proto` | http/https | Original protocol |
| `X-Request-ID` | UUID | Request tracing |
| `Host` | Original host | Virtual host routing |

## Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

Enable HSTS after SSL is confirmed working:
```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
```

## Adding More App Servers

To scale horizontally, add servers to the upstream blocks:

```nginx
upstream app_servers {
    least_conn;
    keepalive 32;

    server app-1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server app-2:3001 weight=1 max_fails=3 fail_timeout=30s;
    server app-3:3001 weight=1 max_fails=3 fail_timeout=30s;  # New
    server app-4:3001 weight=1 max_fails=3 fail_timeout=30s;  # New
}
```

Then reload nginx:
```bash
docker exec crm-loadbalancer nginx -s reload
```

## Performance Tuning

### Worker Processes
```nginx
worker_processes auto;  # Matches CPU cores
worker_rlimit_nofile 65535;
```

### Connection Handling
```nginx
events {
    worker_connections 4096;  # Connections per worker
    use epoll;                # Linux-optimized
    multi_accept on;          # Accept multiple connections
}
```

### Keepalive
```nginx
keepalive_timeout 65;  # Keep connections open
upstream app_servers {
    keepalive 32;      # Connection pool to backends
}
```

### Gzip Compression
```nginx
gzip on;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types application/json text/css application/javascript;
```

## Troubleshooting

### Check Configuration
```bash
docker exec crm-loadbalancer nginx -t
```

### View Logs
```bash
# Access logs
docker exec crm-loadbalancer tail -f /var/log/nginx/access.log

# Error logs
docker exec crm-loadbalancer tail -f /var/log/nginx/error.log
```

### Reload Configuration
```bash
docker exec crm-loadbalancer nginx -s reload
```

### Check Upstream Status
```bash
# View active connections
docker exec crm-loadbalancer nginx -T | grep upstream
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | Backend down | Check app server health |
| 504 Gateway Timeout | Slow backend | Increase proxy_read_timeout |
| 429 Too Many Requests | Rate limited | Adjust limit_req settings |
| WebSocket disconnects | Wrong upstream | Verify ip_hash for WebSocket |
