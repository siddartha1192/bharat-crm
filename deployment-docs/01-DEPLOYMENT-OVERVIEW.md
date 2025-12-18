# Bharat CRM - Complete Deployment Guide

## Overview
This guide covers deploying Bharat CRM using Docker containers to production servers.

## Architecture

```
                          ┌─────────────────┐
                          │   Load Balancer │
                          │   (Optional)    │
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │  Nginx Reverse  │
                          │     Proxy       │
                          │   (Port 80/443) │
                          └────┬────────┬───┘
                               │        │
                    ┌──────────▼─┐  ┌──▼──────────┐
                    │  Frontend  │  │   Backend   │
                    │  (Nginx)   │  │  (Node.js)  │
                    │  Port 80   │  │  Port 3001  │
                    └────────────┘  └──┬──────┬───┘
                                       │      │
                              ┌────────▼─┐  ┌▼─────────┐
                              │PostgreSQL│  │  Qdrant  │
                              │ Database │  │  Vector  │
                              │          │  │    DB    │
                              └──────────┘  └──────────┘
```

## Components

### 1. Frontend Container
- **Technology**: React + Vite
- **Web Server**: Nginx
- **Port**: 80 (internal)
- **Purpose**: Serves static React application

### 2. Backend Container
- **Technology**: Node.js + Express
- **Port**: 3001 (internal)
- **Purpose**: REST API, Business logic, Integrations

### 3. PostgreSQL Container
- **Technology**: PostgreSQL 15
- **Port**: 5432 (internal)
- **Purpose**: Main application database

### 4. Qdrant Container
- **Technology**: Qdrant Vector Database
- **Port**: 6333 (internal)
- **Purpose**: AI vector embeddings and semantic search

### 5. Nginx Reverse Proxy
- **Technology**: Nginx
- **Ports**: 80, 443 (public)
- **Purpose**: SSL termination, Load balancing, Security

## Deployment Options

### Option 1: Single Server Deployment
- **Best for**: Small to medium workloads
- **Server Requirements**:
  - 4 CPU cores
  - 8GB RAM
  - 50GB SSD storage
  - Ubuntu 22.04 LTS
- **Cost**: ~$20-40/month
- **Providers**: Hetzner, DigitalOcean, AWS, etc.

### Option 2: Multi-Server with Load Balancer
- **Best for**: High availability and scalability
- **Server Requirements**:
  - Load Balancer: 2 CPU, 4GB RAM
  - App Servers (2+): 4 CPU, 8GB RAM each
  - Database Server: 4 CPU, 16GB RAM
- **Cost**: ~$100-200/month
- **Providers**: Hetzner Cloud, DigitalOcean, AWS

## Prerequisites

### 1. Domain Name
- Register a domain name (e.g., yourcompany.com)
- Point DNS A records to your server IP
- Ensure DNS propagation is complete

### 2. SSL Certificate
- We'll use Let's Encrypt (free)
- Automatically configured with Certbot

### 3. Required Accounts
- OpenAI API key (for AI features)
- WhatsApp Business API credentials
- Google OAuth credentials
- SMTP email account

### 4. Server Access
- SSH access with sudo privileges
- Public IP address
- Firewall ports open: 22, 80, 443

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to Git
- Use strong passwords (minimum 32 characters)
- Rotate secrets regularly

### 2. SSL/TLS
- Always use HTTPS in production
- Enable HSTS headers
- Use strong cipher suites

### 3. Firewall
- Only open necessary ports
- Use UFW or cloud firewall
- Implement rate limiting

### 4. Database
- Use strong database passwords
- Restrict network access
- Regular backups
- Enable SSL connections

### 5. Application
- Keep Docker images updated
- Monitor logs
- Implement monitoring and alerting
- Regular security updates

## Monitoring & Maintenance

### 1. Health Checks
- All services include health check endpoints
- Configure uptime monitoring (e.g., UptimeRobot)

### 2. Logging
- Logs stored in `/var/log/nginx/`
- Container logs: `docker-compose logs -f`
- Rotate logs regularly

### 3. Backups
- Database: Daily automated backups
- Uploads: Regular file backups
- Configuration: Version control

### 4. Updates
- Monitor for security patches
- Test updates in staging first
- Plan maintenance windows

## Cost Estimates

### Hetzner Cloud (Germany)
- **Single Server (CX31)**: €12.90/month (~$14)
  - 4 vCPUs, 8GB RAM, 80GB SSD
- **High Availability**: €50-70/month (~$55-75)
  - Load Balancer + 2x CX31 servers

### DigitalOcean (USA)
- **Single Droplet**: $48/month
  - 4 vCPUs, 8GB RAM, 160GB SSD
- **High Availability**: $150-200/month
  - Load Balancer + 2x Droplets + Database

## Next Steps

Choose your deployment path:
1. **[Hetzner Deployment Guide](./02-HETZNER-DEPLOYMENT.md)** - Recommended for cost-effectiveness
2. **[DigitalOcean Deployment Guide](./03-DIGITALOCEAN-DEPLOYMENT.md)** - Recommended for ease of use
3. **[Load Balancer Setup](./04-LOAD-BALANCER-SETUP.md)** - For high availability

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify services: `docker-compose ps`
- Restart services: `docker-compose restart`

---

**Next**: Proceed to your chosen deployment guide.
