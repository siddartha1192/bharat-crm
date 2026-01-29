# Migration Guide: Converting to Stateless Architecture

## Overview

This guide documents all code changes required to convert the CRM application from a single-server deployment to a stateless, horizontally-scalable architecture.

## Summary of Changes

| Area | Current (Stateful) | Target (Stateless) |
|------|-------------------|-------------------|
| Sessions | Database (OK) | Database (no change) |
| OAuth State | In-memory Map | Redis |
| File Storage | Local filesystem | S3/Spaces |
| Socket.IO | Single server | Redis adapter |
| Cron Jobs | In server process | Dedicated worker |
| Conversations | JSON files | Database |

## 1. Move OAuth State to Redis

### Current Code (`backend/services/auth.js`)

```javascript
// PROBLEM: In-memory storage doesn't work with multiple servers
const pendingGoogleAuths = new Map();

// Cleanup interval
setInterval(() => {
  for (const [key, value] of pendingGoogleAuths.entries()) {
    if (value.expiresAt < Date.now()) {
      pendingGoogleAuths.delete(key);
    }
  }
}, 10 * 60 * 1000);
```

### New Code

```javascript
// backend/services/auth.js

const { createClient } = require('redis');

class AuthService {
  constructor() {
    this.redis = null;
  }

  async initRedis() {
    if (!this.redis) {
      this.redis = createClient({ url: process.env.REDIS_URL });
      await this.redis.connect();
    }
  }

  // Store OAuth state in Redis with TTL
  async storeOAuthState(state, data) {
    await this.initRedis();
    const key = `oauth:state:${state}`;
    await this.redis.set(key, JSON.stringify(data), {
      EX: 600, // 10 minute expiry
    });
  }

  // Retrieve and delete OAuth state
  async getOAuthState(state) {
    await this.initRedis();
    const key = `oauth:state:${state}`;
    const data = await this.redis.get(key);
    if (data) {
      await this.redis.del(key); // One-time use
      return JSON.parse(data);
    }
    return null;
  }

  // ... rest of auth service
}
```

### Usage in Routes

```javascript
// Before
pendingGoogleAuths.set(state, { userId, tenantId, expiresAt: Date.now() + 600000 });

// After
await authService.storeOAuthState(state, { userId, tenantId });
```

## 2. Add Socket.IO Redis Adapter

### Current Code (`backend/server.js`)

```javascript
// PROBLEM: Socket events only reach clients connected to same server
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL }
});
```

### New Code

```javascript
// backend/server.js

const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

async function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Only use Redis adapter in production with multiple servers
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket.IO] Redis adapter configured');
  }

  return io;
}
```

### Install Dependency

```bash
npm install @socket.io/redis-adapter
```

## 3. Remove Cron Jobs from App Server

### Current Code (`backend/server.js`)

```javascript
// PROBLEM: Multiple servers = multiple cron executions
campaignScheduler.initialize(io);
campaignScheduler.start();

leadReminderScheduler.start();

callScheduler.initialize(io);
callScheduler.start();
callScheduler.startCleanup();

cron.schedule('0 * * * *', async () => checkExpiredTrials());
```

### New Code

```javascript
// backend/server.js

// Conditionally start schedulers based on IS_WORKER flag
if (process.env.IS_WORKER === 'true') {
  console.log('[Server] Running as WORKER - starting schedulers');

  campaignScheduler.initialize(io);
  campaignScheduler.start();

  leadReminderScheduler.start();

  callScheduler.initialize(io);
  callScheduler.start();
  callScheduler.startCleanup();

  cron.schedule('0 * * * *', async () => checkExpiredTrials());
  checkExpiredTrials();
} else {
  console.log('[Server] Running as APP SERVER - schedulers disabled');
}
```

## 4. Move File Storage to S3/Spaces

### Create S3 Service

```javascript
// backend/services/storage.js

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class StorageService {
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'nyc3',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: false,
    });
    this.bucket = process.env.S3_BUCKET;
  }

  async uploadFile(key, body, contentType) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'private',
    });
    await this.client.send(command);
    return `${process.env.S3_CDN_URL || process.env.S3_ENDPOINT}/${this.bucket}/${key}`;
  }

  async getSignedDownloadUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }
}

module.exports = new StorageService();
```

### Update Upload Middleware

```javascript
// backend/middleware/upload.js

const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: false,
});

// S3 storage for documents
const documentStorage = multerS3({
  s3: s3Client,
  bucket: process.env.S3_BUCKET,
  acl: 'private',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    const key = `documents/${req.body.entityType}/${req.body.entityId}/${baseName}_${uniqueId}${ext}`;
    cb(null, key);
  },
});

// Use S3 in production, local in development
const useS3 = process.env.NODE_ENV === 'production' && process.env.S3_ENDPOINT;

const uploadDocument = multer({
  storage: useS3 ? documentStorage : multer.diskStorage({
    destination: './uploads/documents',
    filename: (req, file, cb) => {
      const uniqueId = uuidv4();
      cb(null, `${uniqueId}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = { uploadDocument };
```

### Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer-s3
```

## 5. Move Conversation Storage to Database

### Current Code (`backend/services/conversationStorage.js`)

```javascript
// PROBLEM: File-based storage doesn't work across servers
class ConversationStorageService {
  baseDir = './conversations';

  getFilePath(userId, contactPhone) {
    return `${this.baseDir}/${userId}/${cleanPhone}.json`;
  }

  async loadConversation() {
    return JSON.parse(fs.readFileSync(filePath));
  }
}
```

### New Prisma Schema Addition

```prisma
// backend/prisma/schema.prisma

model ConversationHistory {
  id           String   @id @default(uuid())
  userId       String
  contactPhone String
  messages     Json     @default("[]")
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id])

  @@unique([userId, contactPhone])
  @@index([userId])
  @@index([contactPhone])
}
```

### New Service

```javascript
// backend/services/conversationStorage.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ConversationStorageService {
  async loadConversation(userId, contactPhone) {
    const record = await prisma.conversationHistory.findUnique({
      where: {
        userId_contactPhone: { userId, contactPhone },
      },
    });
    return record?.messages || [];
  }

  async saveMessage(userId, contactPhone, message) {
    await prisma.conversationHistory.upsert({
      where: {
        userId_contactPhone: { userId, contactPhone },
      },
      create: {
        userId,
        contactPhone,
        messages: [message],
      },
      update: {
        messages: {
          push: message,
        },
        updatedAt: new Date(),
      },
    });
  }

  async clearConversation(userId, contactPhone) {
    await prisma.conversationHistory.delete({
      where: {
        userId_contactPhone: { userId, contactPhone },
      },
    }).catch(() => {}); // Ignore if doesn't exist
  }
}

module.exports = new ConversationStorageService();
```

### Migration Script

```javascript
// backend/scripts/migrate-conversations.js

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONVERSATIONS_DIR = './conversations';

async function migrateConversations() {
  const userDirs = fs.readdirSync(CONVERSATIONS_DIR);

  for (const userId of userDirs) {
    const userPath = path.join(CONVERSATIONS_DIR, userId);
    if (!fs.statSync(userPath).isDirectory()) continue;

    const files = fs.readdirSync(userPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const contactPhone = file.replace('.json', '');
      const filePath = path.join(userPath, file);
      const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      await prisma.conversationHistory.upsert({
        where: {
          userId_contactPhone: { userId, contactPhone },
        },
        create: {
          userId,
          contactPhone,
          messages,
        },
        update: {
          messages,
        },
      });

      console.log(`Migrated: ${userId}/${contactPhone}`);
    }
  }

  console.log('Migration complete!');
}

migrateConversations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## 6. Add Health Check Endpoint

### New Code

```javascript
// backend/routes/health.js

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    instance: process.env.APP_INSTANCE_ID || 'unknown',
    uptime: process.uptime(),
    checks: {},
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  // Redis check (if configured)
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const client = createClient({ url: process.env.REDIS_URL });
      await client.connect();
      await client.ping();
      await client.quit();
      health.checks.redis = 'ok';
    } catch (error) {
      health.checks.redis = 'error';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

## 7. Prisma Client Singleton

### New Code

```javascript
// backend/lib/prisma.js

const { PrismaClient } = require('@prisma/client');

// Singleton pattern to prevent multiple connections
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
```

### Update All Services

```javascript
// Before (in each service)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// After
const prisma = require('../lib/prisma');
```

## Migration Checklist

### Phase 1: Preparation
- [ ] Create Prisma singleton (`lib/prisma.js`)
- [ ] Update all services to use singleton
- [ ] Add health check endpoint
- [ ] Run database migration for ConversationHistory

### Phase 2: Storage Migration
- [ ] Install S3 dependencies
- [ ] Create storage service
- [ ] Update upload middleware
- [ ] Migrate existing files to S3
- [ ] Update document routes

### Phase 3: State Migration
- [ ] Install Redis adapter dependencies
- [ ] Update Socket.IO configuration
- [ ] Move OAuth state to Redis
- [ ] Add IS_WORKER flag checks

### Phase 4: Worker Setup
- [ ] Create worker.js entry point
- [ ] Create Worker Dockerfile
- [ ] Configure supervisor
- [ ] Test distributed locking

### Phase 5: Deployment
- [ ] Build new Docker images
- [ ] Deploy Docker Compose
- [ ] Run data migrations
- [ ] Verify health checks
- [ ] Monitor logs

## Rollback Plan

If issues occur:

1. **Stop new deployment**
   ```bash
   docker-compose -f docker-compose.stateless.yml down
   ```

2. **Start original deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Restore data if needed**
   - Database: Use DigitalOcean backup
   - Files: Sync from S3 back to local

## Testing Checklist

- [ ] Login/logout across multiple app servers
- [ ] WebSocket events broadcast to all clients
- [ ] File uploads stored in S3
- [ ] File downloads work with signed URLs
- [ ] Campaigns send exactly once
- [ ] Reminders send exactly once
- [ ] Health checks pass on all servers
