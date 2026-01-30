# Worker Server Configuration

## Overview

The Worker Server is a dedicated service that handles all background jobs and hosts the Qdrant vector database. Unlike the stateless app servers, the worker is a singleton that runs scheduled tasks.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKER CONTAINER                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        SUPERVISOR                                     │  │
│  │                    (Process Manager)                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                           │                                                 │
│            ┌──────────────┼──────────────┐                                 │
│            │                             │                                 │
│            ▼                             ▼                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐                     │
│  │     QDRANT           │    │   NODE.JS WORKER     │                     │
│  │  (Vector Database)   │    │                      │                     │
│  │                      │    │  ├─ Campaign Cron    │                     │
│  │  Port: 6333 (HTTP)   │    │  ├─ Reminder Cron    │                     │
│  │  Port: 6334 (gRPC)   │    │  ├─ Call Scheduler   │                     │
│  │                      │    │  └─ Trial Checker    │                     │
│  │  Storage: /qdrant    │    │                      │                     │
│  │                      │    │  Port: 3002          │                     │
│  └──────────────────────┘    └──────────────────────┘                     │
│                                        │                                   │
│                                        ▼                                   │
│                              ┌────────────────────┐                       │
│                              │  REDIS CONNECTION   │                       │
│                              │  (Distributed Locks)│                       │
│                              └────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Dockerfile

Located at: `docs/stateless-architecture/backend/Dockerfile.worker`

Key features:
- Multi-stage build for minimal image size
- Embeds Qdrant binary from official image
- Uses supervisor for multi-process management
- Non-root user for security

## Scheduled Jobs

### Campaign Scheduler
```javascript
cron.schedule('* * * * *', async () => { ... });
```
- **Frequency**: Every minute
- **Purpose**: Process scheduled email/WhatsApp campaigns
- **Lock**: `campaign-scheduler`

### Lead Reminder Scheduler
```javascript
cron.schedule('*/60 * * * *', async () => { ... });
```
- **Frequency**: Every hour (configurable)
- **Purpose**: Send follow-up reminders for leads
- **Lock**: `lead-reminder-scheduler`
- **Config**: `LEAD_REMINDER_INTERVAL`

### Call Scheduler
```javascript
cron.schedule('*/30 * * * * *', async () => { ... });
```
- **Frequency**: Every 30 seconds (configurable)
- **Purpose**: Process call queue, respect business hours
- **Lock**: `call-scheduler`
- **Config**: `CALL_SCHEDULER_INTERVAL`

### Trial Expiration Checker
```javascript
cron.schedule('0 * * * *', async () => { ... });
```
- **Frequency**: Every hour
- **Purpose**: Suspend expired trial tenants
- **Lock**: `trial-expiration`

## Distributed Locking

The worker uses Redis for distributed locking to prevent duplicate job execution:

```javascript
async function acquireLock(lockName) {
  const lockKey = `lock:${lockName}`;
  const result = await redis.set(lockKey, value, {
    NX: true,  // Only set if not exists
    PX: 60000, // Expire after 60 seconds
  });
  return result === 'OK';
}
```

### Lock Keys
| Lock Name | TTL | Purpose |
|-----------|-----|---------|
| `lock:campaign-scheduler` | 60s | Campaign processing |
| `lock:lead-reminder-scheduler` | 60s | Reminder sending |
| `lock:call-scheduler` | 60s | Call queue processing |
| `lock:trial-expiration` | 60s | Trial checking |
| `lock:call-cleanup` | 60s | Daily call cleanup |

## Health Checks

### Endpoint
```bash
curl http://worker:3002/health
```

### Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "redis": "connected",
    "qdrant": "healthy",
    "database": "connected"
  },
  "jobs": {
    "campaign": false,
    "leadReminder": false,
    "callScheduler": false
  }
}
```

### Metrics Endpoint
```bash
curl http://worker:3002/metrics
```

### Response
```json
{
  "jobsProcessed": {
    "campaigns": 120,
    "reminders": 24,
    "calls": 2880
  },
  "lastRun": {
    "campaign": "2024-01-15T10:30:00.000Z",
    "reminder": "2024-01-15T10:00:00.000Z",
    "call": "2024-01-15T10:29:30.000Z"
  },
  "uptime": 3600
}
```

## Supervisor Configuration

Located at: `docs/stateless-architecture/backend/supervisord.worker.conf`

### Process Priority
1. **Qdrant** (priority: 100) - Starts first
2. **Worker** (priority: 200) - Starts after Qdrant

### Log Locations
| Process | stdout | stderr |
|---------|--------|--------|
| Qdrant | `/var/log/supervisor/qdrant.log` | `/var/log/supervisor/qdrant-error.log` |
| Worker | `/var/log/supervisor/worker.log` | `/var/log/supervisor/worker-error.log` |

### Managing Processes
```bash
# View process status
docker exec crm-worker supervisorctl status

# Restart worker process
docker exec crm-worker supervisorctl restart worker

# Restart Qdrant
docker exec crm-worker supervisorctl restart qdrant

# View logs
docker exec crm-worker tail -f /var/log/supervisor/worker.log
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3002 | Worker HTTP port |
| `IS_WORKER` | true | Enable worker mode |
| `REDIS_URL` | redis://redis:6379 | Redis connection |
| `QDRANT_URL` | http://localhost:6333 | Qdrant connection |
| `CAMPAIGN_BATCH_SIZE` | 100 | Emails per batch |
| `CAMPAIGN_BATCH_DELAY` | 5000 | Delay between batches (ms) |
| `CALL_SCHEDULER_INTERVAL` | 30 | Call check interval (seconds) |
| `LEAD_REMINDER_INTERVAL` | 60 | Reminder check interval (minutes) |

## Qdrant Configuration

### Default Settings
```yaml
service:
  host: 0.0.0.0
  http_port: 6333
  grpc_port: 6334

storage:
  storage_path: /qdrant/storage

log_level: INFO
```

### Collection Settings
| Setting | Value |
|---------|-------|
| Collection | `bharat_crm_knowledge` |
| Dimension | 1536 (text-embedding-3-small) |
| Distance | Cosine |

### Qdrant API Examples
```bash
# List collections
curl http://worker:6333/collections

# Collection info
curl http://worker:6333/collections/bharat_crm_knowledge

# Create snapshot
curl -X POST http://worker:6333/collections/bharat_crm_knowledge/snapshots
```

## Scaling Considerations

### Why Only One Worker?

The worker is designed as a singleton because:
1. Cron jobs should run exactly once
2. Qdrant is stateful (vector storage)
3. Distributed locking adds complexity

### High Availability Options

1. **Active-Passive**: Run a standby worker that takes over on failure
2. **Redis Sentinel**: Ensure Redis is highly available
3. **Container Restart**: Configure Docker restart policy

### If You Need Multiple Workers

For extreme scale, you can run multiple workers with:
1. **Job Queues**: Use BullMQ or similar for job distribution
2. **Separate Qdrant**: Run Qdrant in its own container
3. **External Locking**: Use Redlock for multi-node locking

## Troubleshooting

### Worker Not Processing Jobs
```bash
# Check if lock is stuck
docker exec crm-redis redis-cli KEYS "lock:*"

# Clear stuck lock
docker exec crm-redis redis-cli DEL "lock:campaign-scheduler"
```

### Qdrant Not Starting
```bash
# Check Qdrant logs
docker exec crm-worker cat /var/log/supervisor/qdrant-error.log

# Verify storage permissions
docker exec crm-worker ls -la /qdrant/storage
```

### High Memory Usage
```bash
# Check process memory
docker exec crm-worker supervisorctl status

# Qdrant memory (collections info)
curl http://worker:6333/collections
```

### Graceful Shutdown
The worker handles SIGTERM gracefully:
1. Stops accepting new jobs
2. Waits for running jobs (5 seconds)
3. Closes Redis connections
4. Exits cleanly

```bash
# Graceful stop
docker-compose -f docker-compose.stateless.yml stop worker

# Force stop (not recommended)
docker kill crm-worker
```
