# CORS Fix Deployment Instructions

## Problem
The API was returning duplicate `Access-Control-Allow-Origin: *, *` headers because both nginx and Express were adding CORS headers.

## Solution Applied
1. ✅ Removed CORS headers from production nginx config (`./nginx/nginx.conf`)
2. ✅ Improved Express CORS configuration for better control (`backend/server.js`)

## Deployment Steps

### Step 1: Update Production Nginx Configuration

Your production nginx (the external reverse proxy, not the Docker container) needs to reload the updated configuration.

**Option A: If using systemd (Ubuntu/Debian)**
```bash
# Copy the updated config to nginx config directory (if needed)
sudo cp nginx/nginx.conf /etc/nginx/sites-available/bharatcrm
# or wherever your nginx config is located

# Test the configuration
sudo nginx -t

# If test passes, reload nginx (no downtime)
sudo systemctl reload nginx
# OR
sudo nginx -s reload
```

**Option B: If nginx is in a separate container**
```bash
# Restart the nginx container
docker restart <nginx-container-name>
```

### Step 2: Rebuild and Restart Backend Container

The backend CORS configuration has been improved. Rebuild the backend:

```bash
# Pull latest changes
git pull origin claude/inbound-forms-landing-pages-cmfFQ

# Rebuild and restart backend
docker-compose up -d --build backend

# Or restart all services
docker-compose down
docker-compose up -d --build
```

### Step 3: Clear Browser Cache

After deployment, clear your browser cache or test in incognito mode to ensure you're not seeing cached responses.

## Verification

Test the form embed again:
```bash
# Check if the API returns proper CORS headers (should see only ONE Access-Control-Allow-Origin header)
curl -I https://climcrm.com/api/forms/public/slug/lead-capture
```

Open your `test-form-embed.html` in a browser - it should now work without CORS errors.

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
