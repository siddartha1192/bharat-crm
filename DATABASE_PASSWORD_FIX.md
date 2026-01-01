# Fix Database Password Authentication Error (P1000)

## The Problem

You're seeing: `Error: P1000: Authentication failed against database server at 'postgres'`

This means the password in your `.env.production` file doesn't match the password set in your PostgreSQL database.

---

## Quick Fix (Choose One Method)

### **Method 1: Automated Fix (Recommended)**

```bash
# SSH to your server, then:
cd /opt/bharat-crm
git pull origin claude/db-recovery-backup-bD82c
sudo bash fix-database-password.sh
```

This script will:
- ✅ Detect the password mismatch
- ✅ Fix the configuration automatically
- ✅ Restart services
- ✅ Verify everything works

---

### **Method 2: Manual Fix**

#### Option A: Update .env.production to match the database

1. **Find the correct database password:**

The password was set when you first created the database. Check:
- Your old server's `.env.production` or `.env` file
- Your backup notes
- Your password manager

2. **Update .env.production:**

```bash
cd /opt/bharat-crm
nano .env.production
```

Update these lines:
```env
POSTGRES_PASSWORD=your_actual_database_password
DATABASE_URL=postgresql://postgres:your_actual_database_password@postgres:5432/bharat_crm
```

3. **Restart backend:**

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

#### Option B: Reset the database password to match .env.production

1. **Check what password is in .env.production:**

```bash
grep POSTGRES_PASSWORD /opt/bharat-crm/.env.production
```

2. **Reset the PostgreSQL password:**

```bash
cd /opt/bharat-crm

# Get the password from .env.production
ENV_PASS=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d= -f2 | tr -d '"' | tr -d "'")

# Reset the database password
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$ENV_PASS';"
```

3. **Update DATABASE_URL to match:**

```bash
nano .env.production
```

Ensure this line matches:
```env
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/bharat_crm
```

Or use the explicit password:
```env
DATABASE_URL=postgresql://postgres:your_password@postgres:5432/bharat_crm
```

4. **Restart services:**

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## Verification

After applying the fix:

### 1. Test database connection
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm -c "SELECT COUNT(*) FROM users;"
```

Should show a number (your user count), not an error.

### 2. Check backend logs
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=20
```

Look for:
- ✅ "Server is running on port 3001"
- ✅ "Database connected successfully"
- ❌ NO "P1000" or "Authentication failed" errors

### 3. Test backend health
```bash
curl http://localhost:3001/api/health
```

Should return: `{"status":"ok"}` or similar

### 4. Test login
Open your browser and try logging in at: `https://climcrm.com`

---

## Understanding the Issue

### What Happened?

When you restored the database backup:
1. The PostgreSQL container was created with a password (from `.env.production` or default)
2. The database backup was restored (which contains data, NOT the password)
3. Your `.env.production` has a different password than what the container expects
4. Backend tries to connect → Authentication fails

### The Solution

You need to make sure **both** match:
- `POSTGRES_PASSWORD` in `.env.production`
- `DATABASE_URL` in `.env.production`
- The actual password set in PostgreSQL

---

## Common Scenarios

### Scenario 1: Using old .env.production from old server

**Problem:** Old server had password "abc123", new server has password "xyz789"

**Fix:** Copy the entire `.env.production` from old server to new server

```bash
# On old server
scp /opt/bharat-crm/.env.production user@new-server:/opt/bharat-crm/.env.production.old

# On new server - compare
diff /opt/bharat-crm/.env.production /opt/bharat-crm/.env.production.old

# Use the old one
cp /opt/bharat-crm/.env.production.old /opt/bharat-crm/.env.production
```

### Scenario 2: Created new .env.production with different password

**Problem:** Made a new `.env.production` with a generated password, but database has the old password

**Fix:** Either:
- Reset database password to the new one (Option B above)
- Or update `.env.production` with the old password (Option A above)

### Scenario 3: DATABASE_URL has different password than POSTGRES_PASSWORD

**Problem:** Inconsistent configuration

**Fix:**
```bash
# Make them match
nano /opt/bharat-crm/.env.production

# Ensure consistency:
POSTGRES_PASSWORD=my_secure_password_123
DATABASE_URL=postgresql://postgres:my_secure_password_123@postgres:5432/bharat_crm
```

---

## Still Not Working?

### Debug Steps:

1. **Check what environment variables the backend container sees:**

```bash
docker compose -f docker-compose.prod.yml exec backend env | grep -E "(DATABASE_URL|POSTGRES)"
```

2. **Try connecting manually:**

```bash
# Try to connect to database from backend container
docker compose -f docker-compose.prod.yml exec backend sh -c '
  apt-get update && apt-get install -y postgresql-client
  psql "$DATABASE_URL" -c "SELECT 1;"
'
```

3. **Check if password has special characters:**

If your password has special characters like `$`, `@`, `&`, etc., they need to be URL-encoded in `DATABASE_URL`:

```
@ → %40
$ → %24
& → %26
# → %23
```

Example:
```env
# If password is: my$ecure@Pass
DATABASE_URL=postgresql://postgres:my%24ecure%40Pass@postgres:5432/bharat_crm
```

4. **Rebuild backend container:**

Sometimes environment variables get cached:

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## Quick Reference

### Test database password:
```bash
PGPASSWORD='your_password' docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d bharat_crm -c "SELECT 1;"
```

### Reset database password:
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'new_password';"
```

### View backend environment (without sensitive values):
```bash
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE_URL | sed 's/:[^@]*@/:***@/'
```

### Restart just the backend:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## Prevention

To avoid this in the future:

1. **Keep .env.production backed up:**
```bash
cp .env.production .env.production.backup
```

2. **Document your passwords** in a secure password manager

3. **Use the same .env.production** when migrating servers

4. **Test database connection** after restoration:
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d bharat_crm -c "SELECT 1;"
```

---

**Run the automated fix script for the easiest solution!**

```bash
sudo bash fix-database-password.sh
```
