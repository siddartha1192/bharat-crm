#!/bin/bash

# Database Password Fix Script for Bharat CRM
# Fixes P1000 Authentication Error

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Password Diagnostic Tool   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

cd /opt/bharat-crm

# Step 1: Check current configuration
echo -e "${YELLOW}Step 1: Checking current configuration...${NC}\n"

if [ ! -f .env.production ]; then
    echo -e "${RED}✗ .env.production not found!${NC}"
    exit 1
fi

# Extract password from .env.production (without showing it)
if grep -q "^POSTGRES_PASSWORD=" .env.production; then
    ENV_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d= -f2 | tr -d '"' | tr -d "'")
    echo -e "${GREEN}✓ POSTGRES_PASSWORD found in .env.production${NC}"
    echo -e "  Password length: ${#ENV_PASSWORD} characters"
else
    echo -e "${RED}✗ POSTGRES_PASSWORD not found in .env.production${NC}"
    ENV_PASSWORD=""
fi

# Check DATABASE_URL
if grep -q "^DATABASE_URL=" .env.production; then
    echo -e "${GREEN}✓ DATABASE_URL found in .env.production${NC}"
    DB_URL=$(grep "^DATABASE_URL=" .env.production | cut -d= -f2-)
    # Extract password from DATABASE_URL
    if [[ $DB_URL =~ postgres://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        echo -e "  User: $DB_USER"
        echo -e "  Host: $DB_HOST"
        echo -e "  Port: $DB_PORT"
        echo -e "  Database: $DB_NAME"
        echo -e "  Password length: ${#DB_PASS} characters"
    fi
else
    echo -e "${YELLOW}⚠ DATABASE_URL not found (will use individual variables)${NC}"
    DB_PASS=""
fi

echo ""

# Step 2: Test database connection with different methods
echo -e "${YELLOW}Step 2: Testing database connection...${NC}\n"

# Method 1: Test with env file password
if [ -n "$ENV_PASSWORD" ]; then
    echo -n "Testing with POSTGRES_PASSWORD from .env.production... "
    if docker compose -f docker-compose.prod.yml exec -T postgres \
       psql -U postgres -d bharat_crm -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ SUCCESS${NC}"
        PASSWORD_WORKS="env"
    else
        echo -e "${RED}✗ FAILED${NC}"
        PASSWORD_WORKS=""
    fi
fi

# Method 2: Test with DATABASE_URL password
if [ -n "$DB_PASS" ] && [ "$DB_PASS" != "$ENV_PASSWORD" ]; then
    echo -n "Testing with password from DATABASE_URL... "
    if PGPASSWORD="$DB_PASS" docker compose -f docker-compose.prod.yml exec -T postgres \
       psql -U postgres -d bharat_crm -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ SUCCESS${NC}"
        PASSWORD_WORKS="database_url"
    else
        echo -e "${RED}✗ FAILED${NC}"
    fi
fi

# Method 3: Test with no password (if database was created without password)
echo -n "Testing with no password... "
if docker compose -f docker-compose.prod.yml exec -T -e PGPASSWORD="" postgres \
   psql -U postgres -d bharat_crm -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
    PASSWORD_WORKS="none"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo ""

# Step 3: Diagnose the issue
echo -e "${YELLOW}Step 3: Diagnosis${NC}\n"

if [ -z "$PASSWORD_WORKS" ]; then
    echo -e "${RED}✗ None of the passwords work!${NC}"
    echo ""
    echo "This means the database has a password that's different from your .env.production"
    echo ""
    echo -e "${BLUE}SOLUTION: Reset the database password${NC}"
    echo ""
    read -p "Do you want to reset the PostgreSQL password? (yes/no): " RESET_CONFIRM

    if [[ $RESET_CONFIRM =~ ^[Yy][Ee][Ss]$ ]]; then
        if [ -n "$ENV_PASSWORD" ]; then
            NEW_PASSWORD="$ENV_PASSWORD"
            echo "Using password from .env.production..."
        else
            echo "Enter a new secure password for PostgreSQL:"
            read -s NEW_PASSWORD
            echo ""
        fi

        echo "Resetting PostgreSQL password..."
        docker compose -f docker-compose.prod.yml exec -T postgres \
          psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';" || true

        # Update .env.production
        if grep -q "^POSTGRES_PASSWORD=" .env.production; then
            sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env.production
        else
            echo "POSTGRES_PASSWORD=$NEW_PASSWORD" >> .env.production
        fi

        # Update or create DATABASE_URL
        if grep -q "^DATABASE_URL=" .env.production; then
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@postgres:5432/bharat_crm|" .env.production
        else
            echo "DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@postgres:5432/bharat_crm" >> .env.production
        fi

        echo -e "${GREEN}✓ Password reset complete${NC}"
        PASSWORD_WORKS="reset"
    else
        echo "Cancelled. Please manually fix the password mismatch."
        exit 1
    fi
elif [ "$PASSWORD_WORKS" = "env" ]; then
    echo -e "${GREEN}✓ POSTGRES_PASSWORD is correct${NC}"
    echo "Checking DATABASE_URL..."

    if [ -n "$DB_PASS" ] && [ "$DB_PASS" != "$ENV_PASSWORD" ]; then
        echo -e "${YELLOW}⚠ DATABASE_URL has a different password - Fixing...${NC}"
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$ENV_PASSWORD@postgres:5432/bharat_crm|" .env.production
        echo -e "${GREEN}✓ DATABASE_URL updated${NC}"
    elif [ -z "$DB_PASS" ]; then
        echo -e "${YELLOW}⚠ DATABASE_URL not set - Adding...${NC}"
        echo "DATABASE_URL=postgresql://postgres:$ENV_PASSWORD@postgres:5432/bharat_crm" >> .env.production
        echo -e "${GREEN}✓ DATABASE_URL added${NC}"
    else
        echo -e "${GREEN}✓ DATABASE_URL is correct${NC}"
    fi
elif [ "$PASSWORD_WORKS" = "database_url" ]; then
    echo -e "${GREEN}✓ DATABASE_URL password is correct${NC}"
    echo "Updating POSTGRES_PASSWORD to match..."

    if grep -q "^POSTGRES_PASSWORD=" .env.production; then
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASS/" .env.production
    else
        echo "POSTGRES_PASSWORD=$DB_PASS" >> .env.production
    fi
    echo -e "${GREEN}✓ POSTGRES_PASSWORD updated${NC}"
elif [ "$PASSWORD_WORKS" = "none" ]; then
    echo -e "${YELLOW}⚠ Database has no password set!${NC}"
    echo "This is insecure. Setting a password now..."

    if [ -n "$ENV_PASSWORD" ]; then
        NEW_PASSWORD="$ENV_PASSWORD"
    else
        NEW_PASSWORD=$(openssl rand -base64 24)
        echo "Generated password: $NEW_PASSWORD"
    fi

    docker compose -f docker-compose.prod.yml exec -T postgres \
      psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';"

    # Update .env.production
    if grep -q "^POSTGRES_PASSWORD=" .env.production; then
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env.production
    else
        echo "POSTGRES_PASSWORD=$NEW_PASSWORD" >> .env.production
    fi

    if grep -q "^DATABASE_URL=" .env.production; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@postgres:5432/bharat_crm|" .env.production
    else
        echo "DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@postgres:5432/bharat_crm" >> .env.production
    fi

    echo -e "${GREEN}✓ Password set successfully${NC}"
fi

echo ""

# Step 4: Verify configuration
echo -e "${YELLOW}Step 4: Verifying final configuration...${NC}\n"

ENV_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d= -f2 | tr -d '"' | tr -d "'")
DB_URL=$(grep "^DATABASE_URL=" .env.production | cut -d= -f2- | tr -d '"' | tr -d "'")

echo -e "POSTGRES_PASSWORD: ${GREEN}Set (${#ENV_PASSWORD} chars)${NC}"
echo -e "DATABASE_URL: ${GREEN}Set${NC}"
echo -e "  → $DB_URL"
echo ""

# Test final connection
echo -n "Testing database connection... "
if docker compose -f docker-compose.prod.yml exec -T postgres \
   psql -U postgres -d bharat_crm -c "SELECT COUNT(*) FROM users;" &> /dev/null; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
else
    echo -e "${RED}✗ FAILED - Manual intervention needed${NC}"
    exit 1
fi

echo ""

# Step 5: Restart services
echo -e "${YELLOW}Step 5: Restarting services...${NC}\n"

echo "Restarting backend..."
docker compose -f docker-compose.prod.yml restart backend
sleep 5

echo "Testing backend health..."
for i in {1..10}; do
    if curl -f -s http://localhost:3001/api/health &> /dev/null; then
        echo -e "${GREEN}✓ Backend is responding!${NC}"
        break
    fi
    sleep 2
    echo -n "."
done

echo ""

# Step 6: Final verification
echo -e "${YELLOW}Step 6: Final Status${NC}\n"

docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Fix Complete!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Try logging in at: https://climcrm.com"
echo "2. If still failing, check logs: docker compose -f docker-compose.prod.yml logs backend -f"
echo ""
