#!/bin/bash

# Setup script for Manual Links feature
# This script ensures all dependencies, migrations, and configurations are properly applied

set -e  # Exit on error

echo "========================================="
echo "Setting up Manual Links Feature"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in Docker or host
if [ -f /.dockerenv ]; then
    echo -e "${BLUE}Detected Docker environment${NC}"
    IS_DOCKER=true
else
    echo -e "${BLUE}Detected host environment${NC}"
    IS_DOCKER=false
fi

# Step 1: Install dependencies
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
if [ "$IS_DOCKER" = true ]; then
    cd /app && npm install
else
    docker-compose exec bharat-crm-backend npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Run migrations
echo -e "${YELLOW}Step 2: Running database migrations...${NC}"
if [ "$IS_DOCKER" = true ]; then
    cd /app && npx prisma migrate deploy
else
    docker-compose exec bharat-crm-backend npx prisma migrate deploy
fi
echo -e "${GREEN}✓ Migrations applied${NC}"
echo ""

# Step 3: Generate Prisma client
echo -e "${YELLOW}Step 3: Generating Prisma client...${NC}"
if [ "$IS_DOCKER" = true ]; then
    cd /app && npx prisma generate
else
    docker-compose exec bharat-crm-backend npx prisma generate
fi
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""

# Step 4: Restart server (only if not in Docker)
if [ "$IS_DOCKER" = false ]; then
    echo -e "${YELLOW}Step 4: Restarting backend container...${NC}"
    docker-compose restart bharat-crm-backend
    echo -e "${GREEN}✓ Backend container restarted${NC}"
    echo ""
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ Manual Links Feature Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Available endpoints:"
echo "  • GET    /l/:shortCode                     - Redirect short link"
echo "  • GET    /api/links/manual                 - List manual links"
echo "  • POST   /api/links/create-short-link      - Create manual link"
echo "  • PUT    /api/links/manual/:linkId         - Update manual link"
echo "  • DELETE /api/links/manual/:linkId         - Delete manual link"
echo "  • GET    /api/links/qr/:linkId             - Generate QR code"
echo "  • GET    /api/links/manual-analytics       - Get analytics"
echo ""
echo "UTM Templates:"
echo "  • GET    /api/utm-templates                - List templates"
echo "  • POST   /api/utm-templates                - Create template"
echo "  • PUT    /api/utm-templates/:id            - Update template"
echo "  • DELETE /api/utm-templates/:id            - Delete template"
echo ""
echo -e "${BLUE}Test the short link redirect:${NC}"
echo "  curl http://localhost:3001/l/YOUR_SHORT_CODE"
echo ""
echo -e "${BLUE}Test the QR code generation:${NC}"
echo "  curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:3001/api/links/qr/YOUR_LINK_ID"
echo ""
