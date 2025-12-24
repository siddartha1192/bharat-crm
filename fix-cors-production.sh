#!/bin/bash
# Quick CORS Fix Deployment Script for Bharat CRM
# This script helps deploy the CORS fix to production

set -e  # Exit on error

echo "========================================="
echo "Bharat CRM - CORS Fix Deployment Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pull latest changes
echo -e "${YELLOW}Step 1: Pulling latest changes...${NC}"
git pull origin claude/inbound-forms-landing-pages-cmfFQ
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Detect nginx setup
echo -e "${YELLOW}Step 2: Detecting nginx setup...${NC}"

NGINX_SYSTEMD=false
NGINX_DOCKER=false

if systemctl is-active --quiet nginx 2>/dev/null; then
    NGINX_SYSTEMD=true
    echo -e "${GREEN}✓ Found nginx running as systemd service${NC}"
fi

if docker ps | grep -q nginx; then
    NGINX_DOCKER=true
    echo -e "${GREEN}✓ Found nginx running in Docker${NC}"
fi

if [ "$NGINX_SYSTEMD" = false ] && [ "$NGINX_DOCKER" = false ]; then
    echo -e "${RED}✗ No nginx instance found. Please check your setup.${NC}"
    exit 1
fi

echo ""

# Step 3: Update and reload nginx
echo -e "${YELLOW}Step 3: Updating nginx configuration...${NC}"

if [ "$NGINX_SYSTEMD" = true ]; then
    echo "Nginx is running as systemd service"
    echo "Copying nginx/nginx.conf.ssl to /etc/nginx/sites-available/bharatcrm"

    # Ask for confirmation
    read -p "Do you want to copy the config file? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo cp nginx/nginx.conf.ssl /etc/nginx/sites-available/bharatcrm
        sudo ln -sf /etc/nginx/sites-available/bharatcrm /etc/nginx/sites-enabled/

        echo "Testing nginx configuration..."
        if sudo nginx -t; then
            echo -e "${GREEN}✓ Nginx config is valid${NC}"
            echo "Reloading nginx..."
            sudo nginx -s reload
            echo -e "${GREEN}✓ Nginx reloaded${NC}"
        else
            echo -e "${RED}✗ Nginx config test failed. Not reloading.${NC}"
            exit 1
        fi
    fi
fi

if [ "$NGINX_DOCKER" = true ]; then
    echo "Nginx is running in Docker"
    echo "Restarting nginx container..."

    # Find nginx container name
    NGINX_CONTAINER=$(docker ps --filter "name=nginx" --format "{{.Names}}" | head -1)

    if [ -n "$NGINX_CONTAINER" ]; then
        docker restart "$NGINX_CONTAINER"
        echo -e "${GREEN}✓ Nginx container restarted: $NGINX_CONTAINER${NC}"
    else
        echo -e "${YELLOW}Could not find nginx container. Skipping...${NC}"
    fi
fi

echo ""

# Step 4: Restart backend
echo -e "${YELLOW}Step 4: Restarting backend container...${NC}"
docker-compose up -d --build backend
echo -e "${GREEN}✓ Backend rebuilt and restarted${NC}"
echo ""

# Step 5: Verification
echo -e "${YELLOW}Step 5: Verifying CORS headers...${NC}"
echo "Checking https://climcrm.com/api/forms/public/slug/lead-capture"
echo ""

CORS_HEADERS=$(curl -sI https://climcrm.com/api/forms/public/slug/lead-capture | grep -i "access-control-allow-origin" || true)

if [ -z "$CORS_HEADERS" ]; then
    echo -e "${YELLOW}⚠ Could not fetch headers. Check if the endpoint exists and form 'lead-capture' is created.${NC}"
elif echo "$CORS_HEADERS" | grep -q ", \*"; then
    echo -e "${RED}✗ Still seeing duplicate CORS headers:${NC}"
    echo "$CORS_HEADERS"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check which nginx config is actually loaded:"
    echo "   sudo nginx -T | grep -A 20 'location /api'"
    echo "2. Verify nginx was reloaded:"
    echo "   sudo systemctl status nginx"
    echo "3. Check backend logs:"
    echo "   docker-compose logs backend --tail 50"
else
    echo -e "${GREEN}✓ CORS headers look good:${NC}"
    echo "$CORS_HEADERS"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Clear your browser cache or use incognito mode"
echo "2. Test the form embed: open test-form-embed.html"
echo "3. Check the browser console for any errors"
echo ""
