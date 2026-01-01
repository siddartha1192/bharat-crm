# Troubleshooting 502 Bad Gateway Error

You're seeing: `POST https://climcrm.com/api/auth/login 502 (Bad Gateway)`

This means the backend container is either:
- Not running
- Crashed during startup
- Can't connect to the database
- Missing environment variables

---

## Step 1: Check Container Status

```bash
cd /opt/bharat-crm
docker compose -f docker-compose.prod.yml ps
```

**Look for:**
- Is `bharat-crm-backend` status "Up" or "Exited"?
- Is `bharat-crm-postgres` status "Up"?

---

## Step 2: Check Backend Logs (MOST IMPORTANT)

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=100
```

**Common errors to look for:**

### A. Database Connection Error
```
Error: connect ECONNREFUSED
Error: password authentication failed
```
**Fix:** Check DATABASE_URL in `.env.production`

### B. Missing Environment Variables
```
Error: JWT_SECRET is not defined
Error: ENCRYPTION_KEY is required
```
**Fix:** Add missing variables to `.env.production`

### C. Prisma Migration Error
```
Error: P1001: Can't reach database server
Error: The table `main.User` does not exist
```
**Fix:** Run database migration

### D. Port Already in Use
```
Error: listen EADDRINUSE :::3001
```
**Fix:** Kill conflicting process or change port

---

## Step 3: Check Database Connectivity

```bash
# Test if database is accessible
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Should output: "postgres:5432 - accepting connections"
```

If database is down:
```bash
docker compose -f docker-compose.prod.yml restart postgres
sleep 10
docker compose -f docker-compose.prod.yml restart backend
```

---

## Step 4: Verify Environment Variables

```bash
# Check if .env.production exists
ls -la /opt/bharat-crm/.env.production

# Check critical variables are set (without showing values)
grep -E "^(DATABASE_URL|JWT_SECRET|ENCRYPTION_KEY|POSTGRES_PASSWORD)" /opt/bharat-crm/.env.production
```

**Required variables:**
- `DATABASE_URL` or `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY` (32 characters)

If missing, add them:
```bash
nano /opt/bharat-crm/.env.production
```

Add:
```env
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
```

Generate secrets:
```bash
# JWT_SECRET
openssl rand -base64 64

# ENCRYPTION_KEY (must be exactly 32 characters)
openssl rand -hex 16
```

---

## Step 5: Common Fixes

### Fix A: Restart Backend Only

```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml logs -f backend
```

### Fix B: Rebuild and Restart Backend

```bash
docker compose -f docker-compose.prod.yml stop backend
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d backend
docker compose -f docker-compose.prod.yml logs -f backend
```

### Fix C: Restart Everything

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

### Fix D: Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma db push
docker compose -f docker-compose.prod.yml restart backend
```

---

## Step 6: Verify Backend is Responding

```bash
# Test backend health endpoint
curl http://localhost:3001/api/health

# Should return: {"status":"ok"} or similar
```

If it works locally but not through nginx:
```bash
# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx --tail=50

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Quick Diagnostic Script

Run this to get all relevant info:

```bash
cat > /tmp/diagnose.sh << 'EOF'
#!/bin/bash
echo "=== Container Status ==="
docker compose -f docker-compose.prod.yml ps

echo -e "\n=== Backend Logs (last 50 lines) ==="
docker compose -f docker-compose.prod.yml logs backend --tail=50

echo -e "\n=== Database Status ==="
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

echo -e "\n=== Environment File ==="
ls -la /opt/bharat-crm/.env.production

echo -e "\n=== Backend Health Check ==="
curl -s http://localhost:3001/api/health || echo "Backend not responding"

echo -e "\n=== Nginx Error Logs ==="
docker compose -f docker-compose.prod.yml logs nginx --tail=20 | grep -i error
EOF

chmod +x /tmp/diagnose.sh
bash /tmp/diagnose.sh
```

---

## Most Likely Issues (in order)

### 1. Missing ENCRYPTION_KEY (90% probability)

The backup restoration worked, but your `.env.production` might be missing the `ENCRYPTION_KEY` that was added recently.

**Quick Fix:**
```bash
cd /opt/bharat-crm

# Add ENCRYPTION_KEY to .env.production
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env.production

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### 2. Database Connection Issue

**Quick Fix:**
```bash
# Restart database first
docker compose -f docker-compose.prod.yml restart postgres
sleep 10

# Then restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### 3. Wrong DATABASE_URL

If you didn't update `.env.production` to use the docker-compose variables:

**Fix:**
```bash
# Edit .env.production
nano /opt/bharat-crm/.env.production

# Make sure DATABASE_URL is:
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/bharat_crm

# Or use the explicit password:
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/bharat_crm
```

---

## Expected Successful Output

After fixing, you should see:

```bash
$ docker compose -f docker-compose.prod.yml ps
NAME                    STATUS
bharat-crm-backend      Up
bharat-crm-postgres     Up (healthy)
bharat-crm-frontend     Up
bharat-crm-nginx        Up
bharat-crm-qdrant       Up

$ curl http://localhost:3001/api/health
{"status":"ok"}

$ docker compose -f docker-compose.prod.yml logs backend --tail=5
Server is running on port 3001
Database connected successfully
```

---

## Report Back

After running the diagnostics, share:
1. Output of container status (`docker compose ps`)
2. Last 50 lines of backend logs
3. Any error messages you see

This will help identify the exact issue!
