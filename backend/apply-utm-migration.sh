#!/bin/bash

echo "============================================"
echo "Bharat CRM - UTM Tracking Migration Script"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will apply the UTM tracking system migration to your database.${NC}"
echo ""

# Check if we're in the backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}Error: Please run this script from the backend directory${NC}"
    echo "Usage: cd backend && bash apply-utm-migration.sh"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with DATABASE_URL configured"
    exit 1
fi

echo -e "${GREEN}Step 1: Checking database connection...${NC}"
npx prisma db execute --stdin < /dev/null 2>&1 > /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Could not verify database connection${NC}"
    echo -e "${YELLOW}Please ensure your database is running and DATABASE_URL is correct in .env${NC}"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 1
    fi
fi

echo -e "${GREEN}Step 2: Applying UTM tracking migration...${NC}"
echo ""

# Apply the migration using Prisma
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Migration applied successfully!${NC}"
    echo ""

    echo -e "${GREEN}Step 3: Regenerating Prisma Client...${NC}"
    npx prisma generate

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Prisma Client regenerated successfully!${NC}"
        echo ""
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN}Migration Complete!${NC}"
        echo -e "${GREEN}============================================${NC}"
        echo ""
        echo "The following features are now available:"
        echo "  • UTM tagging for email campaigns"
        echo "  • UTM tagging for WhatsApp campaigns"
        echo "  • Platform-specific UTM parameters"
        echo "  • Short link generation and tracking"
        echo "  • Click analytics and conversion tracking"
        echo "  • Manual link creation for YouTube/social media"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Restart your backend server"
        echo "  2. Access the campaign settings to configure UTM parameters"
        echo "  3. View analytics at /api/links/analytics/:campaignId"
        echo ""
    else
        echo -e "${RED}Error: Failed to regenerate Prisma Client${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${RED}Error: Migration failed${NC}"
    echo ""
    echo "Common issues:"
    echo "  • Database is not running"
    echo "  • DATABASE_URL in .env is incorrect"
    echo "  • Database user lacks necessary permissions"
    echo ""
    echo "Please check your database connection and try again"
    exit 1
fi
