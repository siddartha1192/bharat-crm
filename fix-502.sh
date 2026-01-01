#!/bin/bash

# Quick Fix Script for 502 Bad Gateway Error
# Run this on your production server: sudo bash fix-502.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Bharat CRM - 502 Error Fix Script   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

cd /opt/bharat-crm

# Step 1: Check what's running
echo -e "${YELLOW}Step 1: Checking container status...${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

# Step 2: Check backend logs
echo -e "${YELLOW}Step 2: Checking backend logs for errors...${NC}"
echo -e "${BLUE}Last 30 lines of backend logs:${NC}"
docker compose -f docker-compose.prod.yml logs backend --tail=30
echo ""

# Step 3: Check if ENCRYPTION_KEY exists
echo -e "${YELLOW}Step 3: Checking for ENCRYPTION_KEY...${NC}"
if [ -f .env.production ]; then
    if grep -q "^ENCRYPTION_KEY=" .env.production; then
        echo -e "${GREEN}✓ ENCRYPTION_KEY found${NC}"
    else
        echo -e "${RED}✗ ENCRYPTION_KEY missing - Adding it now...${NC}"
        ENCRYPTION_KEY=$(openssl rand -hex 16)
        echo "" >> .env.production
        echo "# Encryption key for sensitive data" >> .env.production
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.production
        echo -e "${GREEN}✓ ENCRYPTION_KEY added${NC}"
    fi
else
    echo -e "${RED}✗ .env.production not found!${NC}"
    exit 1
fi
echo ""

# Step 4: Check DATABASE_URL
echo -e "${YELLOW}Step 4: Checking DATABASE_URL...${NC}"
if grep -q "^DATABASE_URL=" .env.production || grep -q "^POSTGRES_PASSWORD=" .env.production; then
    echo -e "${GREEN}✓ Database configuration found${NC}"
else
    echo -e "${RED}✗ DATABASE_URL or POSTGRES_PASSWORD missing${NC}"
    echo "Please add POSTGRES_PASSWORD to .env.production"
fi
echo ""

# Step 5: Restart services
echo -e "${YELLOW}Step 5: Restarting services...${NC}"

echo "Restarting database..."
docker compose -f docker-compose.prod.yml restart postgres
sleep 5

echo "Waiting for database to be ready..."
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres &> /dev/null; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

echo "Restarting backend..."
docker compose -f docker-compose.prod.yml restart backend
sleep 5

echo "Restarting nginx..."
docker compose -f docker-compose.prod.yml restart nginx
sleep 2

echo ""

# Step 6: Verify backend is responding
echo -e "${YELLOW}Step 6: Testing backend...${NC}"
sleep 3

if curl -f http://localhost:3001/api/health &> /dev/null; then
    echo -e "${GREEN}✓ Backend is responding!${NC}"
else
    echo -e "${RED}✗ Backend still not responding${NC}"
    echo -e "${YELLOW}Checking backend logs again:${NC}"
    docker compose -f docker-compose.prod.yml logs backend --tail=20
fi
echo ""

# Step 7: Final status
echo -e "${YELLOW}Step 7: Final container status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Quick Checks                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Testing endpoints:${NC}"
echo -n "Backend health: "
if curl -f -s http://localhost:3001/api/health &> /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -n "Frontend: "
if curl -f -s http://localhost &> /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Try logging in at: https://climcrm.com"
echo "2. If still failing, run: docker compose -f docker-compose.prod.yml logs backend -f"
echo "3. Check the full troubleshooting guide: cat TROUBLESHOOT_502.md"
echo ""
