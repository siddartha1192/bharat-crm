# Stateless CRM Architecture Overview

## Executive Summary

This document outlines the enterprise-grade stateless architecture for Bharat CRM, designed for horizontal scalability, high availability, and seamless deployment on DigitalOcean infrastructure.

## Architecture Components

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                    DIGITALOCEAN CLOUD                        │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌──────────────┐              ┌─────────────────────────────────────────────────────────────────────┐
│   CLIENTS    │              │                         LOAD BALANCER                               │
│              │   HTTPS      │                    (Nginx - Droplet/LB)                             │
│  Web Browser ├─────────────►│  • SSL Termination (Let's Encrypt)                                 │
│  Mobile App  │              │  • Health Checks                                                   │
│  API Clients │              │  • Sticky Sessions (IP Hash for WebSocket)                         │
└──────────────┘              │  • Rate Limiting                                                   │
                              └───────────────────────────────┬─────────────────────────────────────┘
                                                              │
                              ┌────────────────────────────────┼────────────────────────────────────┐
                              │                                │                                    │
                              ▼                                ▼                                    ▼
               ┌──────────────────────────┐    ┌──────────────────────────┐           ┌────────────────────┐
               │      APP SERVER 1        │    │      APP SERVER 2        │           │   WORKER SERVER    │
               │     (Stateless)          │    │     (Stateless)          │           │                    │
               │                          │    │                          │           │  • Cron Jobs       │
               │  • Express.js API        │    │  • Express.js API        │           │  • Campaign Send   │
               │  • Socket.IO (Redis)     │    │  • Socket.IO (Redis)     │           │  • Lead Reminders  │
               │  • JWT Auth              │    │  • JWT Auth              │           │  • Call Scheduler  │
               │  • Prisma ORM            │    │  • Prisma ORM            │           │  • Trial Checker   │
               │  • No Local State        │    │  • No Local State        │           │  • Vector Ingestion│
               │                          │    │                          │           │  • Qdrant Client   │
               │  Port: 3001              │    │  Port: 3001              │           │                    │
               └────────────┬─────────────┘    └────────────┬─────────────┘           └─────────┬──────────┘
                            │                               │                                   │
                            └───────────────────────────────┼───────────────────────────────────┘
                                                            │
          ┌─────────────────────────────────────────────────┼─────────────────────────────────────────────────┐
          │                                                 │                                                 │
          ▼                                                 ▼                                                 ▼
┌───────────────────────┐              ┌───────────────────────────────────┐              ┌───────────────────────┐
│        REDIS          │              │     DIGITALOCEAN MANAGED          │              │       QDRANT          │
│    (Session/Cache)    │              │         POSTGRESQL                │              │   (Vector Database)   │
│                       │              │                                   │              │                       │
│  • Socket.IO Adapter  │              │  • Primary Database               │              │  • AI Knowledge Base  │
│  • OAuth State        │              │  • Automatic Backups              │              │  • Semantic Search    │
│  • Rate Limiting      │              │  • Read Replicas (optional)       │              │  • RAG Retrieval      │
│  • Job Queues         │              │  • Connection Pooling             │              │                       │
│  • Distributed Locks  │              │                                   │              │  Port: 6333           │
│                       │              │                                   │              │                       │
│  Port: 6379           │              │  Port: 25060 (DO default)         │              │                       │
└───────────────────────┘              └───────────────────────────────────┘              └───────────────────────┘
          │                                                 │                                                 │
          └─────────────────────────────────────────────────┼─────────────────────────────────────────────────┘
                                                            │
                                                            ▼
                                              ┌───────────────────────────────────┐
                                              │     DIGITALOCEAN SPACES (S3)      │
                                              │        (Object Storage)           │
                                              │                                   │
                                              │  • Document Uploads               │
                                              │  • Knowledge Base Files           │
                                              │  • Media Files                    │
                                              │  • Conversation Attachments       │
                                              └───────────────────────────────────┘
```

## Component Responsibilities

### 1. Load Balancer (Nginx)
- **Role**: Single entry point for all traffic
- **Responsibilities**:
  - SSL/TLS termination with Let's Encrypt
  - Request routing to healthy app servers
  - WebSocket connection handling (sticky sessions)
  - Rate limiting and DDoS protection
  - Static file caching
  - Health check monitoring

### 2. App Servers (Stateless x2)
- **Role**: Handle all API requests
- **Responsibilities**:
  - REST API endpoints
  - WebSocket connections (via Redis adapter)
  - JWT authentication/authorization
  - Business logic execution
  - Database queries (Prisma ORM)
- **Stateless Requirements**:
  - No local file storage (use S3)
  - No in-memory state (use Redis)
  - No cron jobs (delegated to worker)
  - Session validation via database

### 3. Worker Server (Singleton)
- **Role**: Background job processing
- **Responsibilities**:
  - Campaign email/WhatsApp sending
  - Lead reminder scheduling
  - Call queue processing
  - Trial expiration checking
  - Vector database ingestion
  - Cleanup and maintenance tasks
- **Features**:
  - Distributed locking (Redis)
  - Job deduplication
  - Failure recovery
  - Health monitoring

### 4. Redis
- **Role**: Shared state and messaging
- **Responsibilities**:
  - Socket.IO adapter (cross-server messaging)
  - OAuth state storage (Google auth flow)
  - Rate limiting counters
  - Job queue management
  - Distributed locks for cron jobs
  - Session caching (optional)

### 5. PostgreSQL (DigitalOcean Managed)
- **Role**: Primary data store
- **Features**:
  - Automatic daily backups
  - Point-in-time recovery
  - Automatic failover
  - Connection pooling
  - Read replicas (for scaling reads)

### 6. Qdrant (Vector Database)
- **Role**: AI/ML vector storage
- **Responsibilities**:
  - Knowledge base embeddings
  - Semantic search
  - RAG retrieval for AI chatbot
  - Document similarity

### 7. DigitalOcean Spaces (S3-Compatible)
- **Role**: Object storage
- **Responsibilities**:
  - Document uploads
  - Knowledge base files
  - WhatsApp media
  - Conversation attachments

## Scaling Strategy

### Horizontal Scaling (App Servers)
```
Current:  LB → [App1, App2]
Scale:    LB → [App1, App2, App3, App4, ...]
```
- Add/remove app servers based on load
- No code changes required
- Zero-downtime deployments

### Vertical Scaling
| Component | Start | Scale To |
|-----------|-------|----------|
| App Server | 1GB RAM | 4GB RAM |
| Worker | 2GB RAM | 8GB RAM |
| Redis | 1GB RAM | 4GB RAM |
| Qdrant | 2GB RAM | 8GB+ RAM |

### Database Scaling (DigitalOcean)
1. Vertical: Upgrade droplet size
2. Read Replicas: Add for read-heavy workloads
3. Connection Pooling: PgBouncer (built-in)

## Network Architecture

### Internal Network (VPC)
```
┌─────────────────────────────────────────────────────────────┐
│                   DIGITALOCEAN VPC                          │
│                   (10.0.0.0/16)                             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ App Server 1│  │ App Server 2│  │   Worker    │         │
│  │ 10.0.1.10   │  │ 10.0.1.11   │  │ 10.0.1.20   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │    Redis    │  │   Qdrant    │                          │
│  │ 10.0.2.10   │  │ 10.0.2.20   │                          │
│  └─────────────┘  └─────────────┘                          │
│                                                             │
│  ┌─────────────┐                                           │
│  │ Load Balancer                                            │
│  │ Public IP   │ ←── External Traffic                      │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
               ┌───────────────────────────────┐
               │  DigitalOcean Managed DB      │
               │  (Private Network Access)     │
               └───────────────────────────────┘
```

## Data Flow

### API Request Flow
```
1. Client → HTTPS → Load Balancer
2. Load Balancer → Health Check → Select App Server
3. App Server → Validate JWT
4. App Server → Query PostgreSQL
5. App Server → Return Response
6. Load Balancer → Client
```

### WebSocket Flow
```
1. Client → WSS → Load Balancer (Sticky Session)
2. Load Balancer → App Server N
3. App Server N → Authenticate Socket
4. App Server N → Join Redis Rooms
5. Any App Server → Publish Event → Redis
6. Redis → Broadcast → All App Servers
7. App Servers → Emit to Connected Clients
```

### Background Job Flow
```
1. Cron Trigger (Worker Only)
2. Worker → Acquire Redis Lock
3. Worker → Query Database for Jobs
4. Worker → Process Job (Send Email/WhatsApp)
5. Worker → Update Database Status
6. Worker → Publish Socket Event → Redis
7. Redis → App Servers → Clients
8. Worker → Release Lock
```

## High Availability

### Failure Scenarios

| Component | Failure Impact | Recovery |
|-----------|---------------|----------|
| App Server 1 | 50% capacity | Auto-remove from LB, scale up |
| App Server 2 | 50% capacity | Auto-remove from LB, scale up |
| Worker | No background jobs | Restart, jobs resume |
| Redis | Socket.IO degraded | Restart, reconnect |
| PostgreSQL | Full outage | DO automatic failover |
| Qdrant | AI features down | Restart, data persisted |

### Health Checks
- Load Balancer: HTTP GET /api/health every 10s
- Docker: Container health checks
- Worker: Heartbeat to Redis

## Security Considerations

### Network Security
- All internal traffic within VPC
- PostgreSQL: Private network only
- Redis: No public exposure
- Qdrant: No public exposure

### Application Security
- JWT with short expiry (7 days)
- Refresh token rotation
- Session stored in database
- CORS configuration
- Helmet.js headers
- Rate limiting

### Data Security
- Encryption at rest (DO Managed DB)
- TLS in transit
- Secrets in environment variables
- Never log sensitive data

## Cost Estimation (DigitalOcean)

| Component | Spec | Monthly Cost |
|-----------|------|--------------|
| Load Balancer | Basic | $12 |
| App Server x2 | 2GB/2vCPU | $24 ($12 each) |
| Worker | 4GB/2vCPU | $24 |
| Redis | 1GB | $15 |
| Qdrant | 2GB/1vCPU | $12 |
| Managed PostgreSQL | Basic | $15 |
| Spaces | 250GB | $5 |
| **Total** | | **~$107/month** |

## Next Steps

1. Review `02-DOCKER-COMPOSE.md` for deployment configuration
2. Review `03-NGINX-CONFIG.md` for load balancer setup
3. Review `04-WORKER-CONFIG.md` for worker service setup
4. Review `05-ENVIRONMENT-GUIDE.md` for configuration
5. Review `06-MIGRATION-GUIDE.md` for code changes required
6. Review `07-DEPLOYMENT-CHECKLIST.md` for go-live steps
