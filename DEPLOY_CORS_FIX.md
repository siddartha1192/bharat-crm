# CORS Fix Deployment Instructions

## Problem
The API was returning duplicate `Access-Control-Allow-Origin: *, *` headers because both nginx and Express were adding CORS headers.

## Solution Applied
1. ✅ Removed CORS headers from ALL nginx configs:
   - `nginx/nginx.conf` - Docker frontend container config
   - `nginx/nginx.conf.ssl` - Production SSL config (THIS IS THE ONE YOU'RE USING)
   - `nginx/nginx.conf.dev` - Development config
2. ✅ Improved Express CORS configuration for better control (`backend/server.js`)

## Deployment Steps

### IMPORTANT: Which Nginx Config Are You Using?

Since you're accessing https://climcrm.com, you're using **`nginx/nginx.conf.ssl`**

Check your production server to see how nginx is configured. The fix has been applied to ALL nginx configs.

### Step 1: Find Which Nginx Is Running

First, identify which nginx instance is serving https://climcrm.com:

```bash
# Check if nginx is running as a Docker container
docker ps | grep nginx

# Check if nginx is running as a systemd service
sudo systemctl status nginx

# Find nginx config being used
sudo nginx -T | grep "configuration file"
```

### Step 2: Update and Reload Production Nginx Configuration

**SCENARIO A: Nginx is Running in Docker Compose**

If you have an external nginx container (not the frontend container), you need to:

```bash
# Pull latest changes
git pull origin claude/inbound-forms-landing-pages-cmfFQ

# Check your docker-compose.yml for nginx service
# Look for a service that mounts nginx/nginx.conf.ssl

# Restart the nginx container (replace 'nginx' with actual container name)
docker-compose restart nginx
# OR
docker restart <nginx-container-name>
```

**SCENARIO B: Nginx is Running as System Service (Most Likely for SSL)**

If nginx is running on the host machine (outside Docker):

```bash
# Pull latest changes
git pull origin claude/inbound-forms-landing-pages-cmfFQ

# Copy the updated SSL config to your nginx directory
sudo cp nginx/nginx.conf.ssl /etc/nginx/nginx.conf
# OR if using sites-available/sites-enabled:
sudo cp nginx/nginx.conf.ssl /etc/nginx/sites-available/bharatcrm
sudo ln -sf /etc/nginx/sites-available/bharatcrm /etc/nginx/sites-enabled/

# Test the configuration
sudo nginx -t

# If test passes, reload nginx (zero downtime)
sudo nginx -s reload
# OR
sudo systemctl reload nginx
```

**SCENARIO C: Reverse Proxy in Front of Docker**

If you have nginx running on host AND Docker containers:

```bash
# Pull latest changes
git pull origin claude/inbound-forms-landing-pages-cmfFQ

# Update host nginx (reverse proxy)
sudo cp nginx/nginx.conf.ssl /etc/nginx/sites-available/bharatcrm
sudo nginx -t
sudo nginx -s reload

# Also restart backend to get new CORS config
docker-compose restart backend
```

### Step 3: Rebuild and Restart Backend Container

The backend CORS configuration has been improved. Rebuild the backend:

```bash
# If not already pulled
git pull origin claude/inbound-forms-landing-pages-cmfFQ

# Rebuild and restart backend
docker-compose up -d --build backend

# Or restart all services
docker-compose down
docker-compose up -d --build
```

### Step 4: Clear Browser Cache

After deployment, clear your browser cache or test in incognito mode to ensure you're not seeing cached responses.

## Verification

Test the form embed to verify CORS is fixed:

```bash
# Check CORS headers - should see only ONE Access-Control-Allow-Origin header
curl -I https://climcrm.com/api/forms/public/slug/lead-capture

# Expected output should include:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: *  (only ONE, not "*, *")
```

Open your `test-form-embed.html` in a browser - it should now work without CORS errors.

## Troubleshooting

### Still Seeing Duplicate CORS Headers?

1. **Verify nginx was reloaded:**
   ```bash
   # Check nginx error logs
   sudo tail -f /var/log/nginx/error.log

   # Verify nginx config is correct
   sudo nginx -T | grep -A 20 "location /api"
   # Should NOT see any add_header Access-Control lines
   ```

2. **Check which nginx config is actually loaded:**
   ```bash
   sudo nginx -T | head -20
   # Look for "configuration file:" line
   ```

3. **Verify backend is running new code:**
   ```bash
   docker-compose logs backend | tail -30
   # Should see container restart timestamp

   # Check backend CORS config
   docker exec bharat-crm-backend cat server.js | grep -A 5 "app.use(cors"
   ```

4. **Still not working? Hard restart everything:**
   ```bash
   # Reload nginx (host)
   sudo systemctl restart nginx

   # Restart all Docker containers
   docker-compose down
   docker-compose up -d --build

   # Clear browser cache completely or use incognito
   ```

## What Was Changed

### nginx/nginx.conf (Production Nginx)
- **Removed** lines 124-126: `add_header 'Access-Control-Allow-Origin' '*' always;`
- Now nginx passes through CORS headers from backend without adding its own

### backend/server.js
- **Changed** from simple `cors()` to explicit configuration
- Now explicitly sets: origin, methods, allowedHeaders, credentials
- Ensures consistent CORS header format

## Rollback (if needed)

If you need to rollback:
```bash
git checkout HEAD~1 nginx/nginx.conf backend/server.js
sudo nginx -s reload
docker-compose restart backend
```
