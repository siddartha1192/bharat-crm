# Docker Build Troubleshooting Guide

## Common Build Errors and Solutions

### 1. Prisma Generate Error (WASM Module Not Found)

**Error:**
```
Error: Cannot find module '/app/node_modules/@prisma/client/runtime/query_engine_bg.postgresql.wasm-base64.js'
```

**Cause:** Prisma has compatibility issues with Alpine Linux images.

**Solution:** We've switched to Debian-based image (node:18-slim)

**Files Updated:**
- `backend/Dockerfile` - Now uses `node:18-slim` instead of `node:18-alpine`

**If you still want Alpine (smaller image):**
Use `backend/Dockerfile.alpine` instead:
```bash
# In docker-compose.prod.yml, change:
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.alpine  # Use Alpine version
```

---

### 2. Build Context Too Large

**Error:**
```
Sending build context to Docker daemon 2.5GB
```

**Solution:** Check your .dockerignore files

```bash
# Verify .dockerignore is working
cd backend
cat .dockerignore

# Should exclude:
# - node_modules
# - uploads/*
# - .git
# - *.log
```

**Quick Fix:**
```bash
# Clean up before building
rm -rf backend/node_modules
rm -rf node_modules
docker system prune -a
```

---

### 3. npm install Fails with ERESOLVE

**Error:**
```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
```

**Solution:** We use `--legacy-peer-deps` flag

Already configured in Dockerfile:
```dockerfile
RUN npm ci --only=production --legacy-peer-deps
```

If it still fails:
```bash
# Update package-lock.json locally first
cd backend
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "Update package-lock.json"

# Then rebuild Docker image
docker compose -f docker-compose.prod.yml build --no-cache
```

---

### 4. Out of Memory During Build

**Error:**
```
killed
```

**Solution:** Increase Docker memory limit

**On Linux:**
```bash
# Increase available memory
docker run --memory=4g --memory-swap=8g ...
```

**On Docker Desktop (Mac/Windows):**
- Docker Desktop → Settings → Resources
- Increase Memory to at least 4GB
- Increase Swap to at least 2GB

**Or build with less parallelism:**
```bash
docker compose -f docker-compose.prod.yml build --parallel 1
```

---

### 5. Permission Denied Errors

**Error:**
```
EACCES: permission denied, mkdir '/app/uploads'
```

**Solution:** Fix file permissions

```bash
# On host
sudo chown -R $USER:$USER .
chmod -R 755 backend/uploads
chmod -R 755 backend/knowledge_base

# Or in Dockerfile, add:
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
```

---

### 6. SSL Certificate Errors During npm install

**Error:**
```
certificate has expired
```

**Solution:** Update CA certificates

```bash
# In Dockerfile (already included):
RUN apt-get update && apt-get install -y ca-certificates
```

---

### 7. Network Timeout During Build

**Error:**
```
Error: connect ETIMEDOUT
```

**Solution:** Increase timeout or use different registry

```bash
# Build with increased timeout
docker compose -f docker-compose.prod.yml build --build-arg NPM_CONFIG_FETCH_TIMEOUT=300000

# Or use a different npm registry
# Add to Dockerfile before npm install:
RUN npm config set registry https://registry.npmjs.org/
```

---

### 8. Port Already in Use

**Error:**
```
Bind for 0.0.0.0:3001 failed: port is already allocated
```

**Solution:** Kill process using the port

```bash
# Find what's using the port
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3002:3001"  # Map to different host port
```

---

### 9. Database Migration Fails

**Error:**
```
Can't reach database server
```

**Solution:** Ensure database is ready before migrations

```bash
# Verify postgres is healthy
docker compose -f docker-compose.prod.yml ps

# Wait for database to be ready
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres

# Manually run migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

### 10. Frontend Build Fails

**Error:**
```
JavaScript heap out of memory
```

**Solution:** Increase Node memory for build

Update frontend Dockerfile:
```dockerfile
# Set Node options before build
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build
```

---

## Clean Build Process

If you're experiencing persistent issues, do a complete clean build:

```bash
# 1. Stop all containers
docker compose -f docker-compose.prod.yml down -v

# 2. Remove all images
docker compose -f docker-compose.prod.yml down --rmi all

# 3. Clean Docker system
docker system prune -a --volumes
# Warning: This removes ALL unused Docker data

# 4. Clean local node_modules
rm -rf node_modules backend/node_modules

# 5. Rebuild from scratch
docker compose -f docker-compose.prod.yml build --no-cache

# 6. Start services
docker compose -f docker-compose.prod.yml up -d
```

---

## Debugging Build Issues

### View Build Logs in Detail
```bash
# Build with verbose output
docker compose -f docker-compose.prod.yml build --progress=plain --no-cache
```

### Build Individual Services
```bash
# Build only backend
docker compose -f docker-compose.prod.yml build backend

# Build only frontend
docker compose -f docker-compose.prod.yml build frontend
```

### Test Build Locally First
```bash
# Test backend Dockerfile
cd backend
docker build -t bharat-crm-backend:test .

# Test frontend Dockerfile
cd ..
docker build -t bharat-crm-frontend:test .
```

### Check Image Size
```bash
# List images
docker images | grep bharat-crm

# Expected sizes:
# backend: 600-800 MB (Debian) or 400-500 MB (Alpine)
# frontend: 40-60 MB
# postgres: 200-250 MB
# qdrant: 150-200 MB
```

---

## Performance Optimization

### Multi-stage Build (Already Implemented)
Frontend uses multi-stage build to minimize final image size.

### Layer Caching
Order matters! Put things that change least at the top:
```dockerfile
# Good order (current):
COPY package*.json ./      # Changes rarely
RUN npm ci                  # Uses cache if package*.json unchanged
COPY . .                    # Changes often
```

### Use .dockerignore
Reduces build context and speeds up builds.

---

## Platform-Specific Issues

### Apple Silicon (M1/M2/M3) Macs

**Issue:** Architecture mismatch

**Solution:** Build for linux/amd64
```bash
# Add platform to docker-compose.prod.yml
services:
  backend:
    platform: linux/amd64
    build: ...
```

Or use Docker buildx:
```bash
docker buildx build --platform linux/amd64 -t bharat-crm-backend .
```

### Windows

**Issue:** Line ending issues

**Solution:** Configure Git
```bash
git config --global core.autocrlf input
```

---

## Getting Help

### Check Build Logs
```bash
# View last build output
docker compose -f docker-compose.prod.yml logs --tail=100

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f
```

### Inspect Failed Container
```bash
# If container starts but crashes
docker compose -f docker-compose.prod.yml up backend

# See exit code
docker compose -f docker-compose.prod.yml ps
```

### Interactive Debugging
```bash
# Start container with shell
docker compose -f docker-compose.prod.yml run --rm backend sh

# Test commands manually
npm list
npx prisma --version
node --version
```

---

## Best Practices

1. ✅ **Always use .dockerignore**
2. ✅ **Build locally before deploying**
3. ✅ **Use specific image versions** (node:18-slim, not node:18)
4. ✅ **Keep layers minimal**
5. ✅ **Use multi-stage builds for frontend**
6. ✅ **Clean up apt cache** (already done)
7. ✅ **Don't run as root** (use USER node in production)
8. ✅ **Pin dependency versions**

---

## Quick Reference

### Rebuild Everything
```bash
docker compose -f docker-compose.prod.yml build --no-cache
```

### Check What's Running
```bash
docker compose -f docker-compose.prod.yml ps
```

### View Resource Usage
```bash
docker stats
```

### Clean Up Space
```bash
docker system prune -a
```

---

**Still having issues?**

Check the main deployment guides:
- [Hetzner Deployment](./02-HETZNER-DEPLOYMENT.md)
- [DigitalOcean Deployment](./03-DIGITALOCEAN-DEPLOYMENT.md)
- [Quick Reference](./05-QUICK-REFERENCE.md)
