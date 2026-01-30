# Environment Configuration Guide

## Overview

This guide explains how to configure environment variables for the stateless CRM architecture. All services share a common `.env` file that Docker Compose loads automatically.

## Quick Setup

```bash
# 1. Copy the example file
cp docs/stateless-architecture/.env.stateless.example .env

# 2. Generate secure keys
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# 3. Edit remaining values
nano .env
```

## DigitalOcean Managed Database

### Getting Connection String

1. Go to **DigitalOcean Dashboard** → **Databases**
2. Select your PostgreSQL cluster
3. Click **Connection Details**
4. Choose **Connection String** format
5. Copy the string

### Configuration

```env
DATABASE_URL=postgresql://doadmin:PASSWORD@cluster-do-user-xxxxx.db.ondigitalocean.com:25060/bharat_crm?sslmode=require
```

### Connection Pool Settings

DigitalOcean managed databases have connection limits:

| Plan | Max Connections |
|------|-----------------|
| Basic ($15/mo) | 25 |
| General Purpose ($60/mo) | 97 |
| Memory Optimized ($80/mo) | 195 |

**Recommended Prisma configuration** (add to `schema.prisma`):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  // relationMode = "prisma" // if needed
}
```

## DigitalOcean Spaces (S3)

### Creating a Space

1. Go to **DigitalOcean Dashboard** → **Spaces**
2. Click **Create a Space**
3. Choose region (e.g., `nyc3`)
4. Set permissions to **Private**
5. Create the Space

### Getting API Keys

1. Go to **DigitalOcean Dashboard** → **API** → **Spaces Keys**
2. Click **Generate New Key**
3. Copy both Access Key and Secret Key

### Configuration

```env
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET=your-space-name
S3_ACCESS_KEY=DO00XXXXXXXXXXXXXXXXX
S3_SECRET_KEY=your-secret-key-here
S3_REGION=nyc3
```

### CORS Configuration

Add CORS policy to your Space:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://yourdomain.com"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Redis Configuration

### Docker Compose (Default)

For the built-in Redis container:

```env
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
```

### DigitalOcean Managed Redis (Production)

1. Create a Redis cluster in DigitalOcean
2. Get connection details from dashboard

```env
REDIS_URL=rediss://default:PASSWORD@redis-cluster-do-user-xxxxx.db.ondigitalocean.com:25061
REDIS_HOST=redis-cluster-do-user-xxxxx.db.ondigitalocean.com
REDIS_PORT=25061
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

## JWT Configuration

### Generating Secure Secrets

```bash
# Generate 64-byte hex string (recommended)
openssl rand -hex 64

# Alternative: Generate base64 string
openssl rand -base64 48
```

### Configuration

```env
JWT_SECRET=<64-byte-hex-string>
JWT_REFRESH_SECRET=<different-64-byte-hex-string>
JWT_EXPIRES_IN=7d
```

**Security Requirements:**
- Minimum 32 characters
- Use different values for JWT_SECRET and JWT_REFRESH_SECRET
- Never reuse across environments

## Encryption Key

The `ENCRYPTION_KEY` encrypts sensitive data like OAuth tokens. **This key must never change after initial deployment** or you'll lose access to encrypted data.

### Generating

```bash
openssl rand -hex 32
```

### Configuration

```env
ENCRYPTION_KEY=c339720bb406f8471db0f09283adaa16aa6959b66fada2a8d3a120f455f41a9f
```

### Backup

Store this key securely:
1. Password manager
2. DigitalOcean Secrets (if using App Platform)
3. Encrypted backup file

## External Service Credentials

### OpenAI

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get from: https://platform.openai.com/api-keys

### WhatsApp Business API

```env
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-custom-token
```

Get from: Meta Business Suite → WhatsApp → API Setup

### Google OAuth

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/auth/callback
```

Get from: Google Cloud Console → APIs & Services → Credentials

### Twilio

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

Get from: Twilio Console → Account Info

## Email Configuration

### Gmail (App Password)

1. Enable 2FA on your Google account
2. Generate App Password: Google Account → Security → App Passwords

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=Your Company <your-email@gmail.com>
```

### SendGrid

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=SG.xxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Amazon SES

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=AKIAIOSFODNN7EXAMPLE
EMAIL_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EMAIL_FROM=noreply@yourdomain.com
```

## Application URLs

```env
# Your public domain
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api

# For local development
# FRONTEND_URL=http://localhost:3000
# BACKEND_URL=http://localhost:3001
```

## Environment-Specific Settings

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### Staging

```env
NODE_ENV=staging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Production

```env
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
```

## Security Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:
```
.env
.env.local
.env.production
*.pem
*.key
```

### 2. Rotate Credentials Regularly

Schedule rotation for:
- API keys (quarterly)
- JWT secrets (annually)
- Database passwords (quarterly)

### 3. Use Different Keys Per Environment

| Environment | JWT_SECRET | DATABASE_URL |
|-------------|------------|--------------|
| Development | dev-secret-xxx | localhost:5432 |
| Staging | staging-secret-xxx | staging-db.xxx |
| Production | prod-secret-xxx | prod-db.xxx |

### 4. Validate Before Deployment

```bash
# Check for required variables
./scripts/validate-env.sh
```

## Variable Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | Access token signing | `<64-char-hex>` |
| `JWT_REFRESH_SECRET` | Refresh token signing | `<64-char-hex>` |
| `REDIS_URL` | Redis connection | `redis://redis:6379` |
| `ENCRYPTION_KEY` | Data encryption | `<32-char-hex>` |
| `OPENAI_API_KEY` | OpenAI API access | `sk-...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | App server port |
| `NODE_ENV` | development | Environment name |
| `LOG_LEVEL` | info | Logging verbosity |
| `JWT_EXPIRES_IN` | 7d | Token expiration |
| `CAMPAIGN_BATCH_SIZE` | 100 | Emails per batch |

## Troubleshooting

### "DATABASE_URL is not set"

```bash
# Check if .env file exists
ls -la .env

# Check if variable is loaded
docker-compose config | grep DATABASE_URL
```

### "Invalid JWT secret"

```bash
# Check secret length
echo -n "$JWT_SECRET" | wc -c
# Should be at least 64 characters
```

### "Redis connection refused"

```bash
# Check Redis container
docker ps | grep redis

# Test connection
docker exec crm-redis redis-cli ping
```
