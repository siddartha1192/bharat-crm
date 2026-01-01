#!/bin/bash

# Bharat CRM - Database and Files Restoration Script
# This script automates the restoration process from backups

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/opt/bharat-crm/backups"
COMPOSE_FILE="/opt/bharat-crm/docker-compose.prod.yml"
TMP_DIR="/tmp/bharat-crm-restore"

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"

    # Check if running as root or with sudo
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. This is acceptable but not recommended."
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found: $(docker compose version)"

    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    print_success "Backup directory found: $BACKUP_DIR"
}

list_backups() {
    print_header "Available Backups"

    echo -e "${BLUE}Database Backups:${NC}"
    db_backups=($(ls -t $BACKUP_DIR/db_*.sql.gz 2>/dev/null))
    if [ ${#db_backups[@]} -eq 0 ]; then
        print_warning "No database backups found"
        DB_BACKUP=""
    else
        for i in "${!db_backups[@]}"; do
            echo "  [$((i+1))] $(basename ${db_backups[$i]})"
        done
        DB_BACKUP="${db_backups[0]}"
    fi

    echo -e "\n${BLUE}Files Backups:${NC}"
    files_backups=($(ls -t $BACKUP_DIR/files_*.tar.gz 2>/dev/null))
    if [ ${#files_backups[@]} -eq 0 ]; then
        print_warning "No files backups found"
        FILES_BACKUP=""
    else
        for i in "${!files_backups[@]}"; do
            echo "  [$((i+1))] $(basename ${files_backups[$i]})"
        done
        FILES_BACKUP="${files_backups[0]}"
    fi

    echo ""
}

select_backups() {
    print_header "Backup Selection"

    # Database backup selection
    if [ -n "$DB_BACKUP" ]; then
        echo -e "${BLUE}Selected database backup:${NC} $(basename $DB_BACKUP)"
        read -p "Use this backup? (Y/n): " confirm
        if [[ $confirm =~ ^[Nn]$ ]]; then
            echo "Enter the number of the backup to use:"
            read backup_num
            DB_BACKUP="${db_backups[$((backup_num-1))]}"
        fi
    fi

    # Files backup selection
    if [ -n "$FILES_BACKUP" ]; then
        echo -e "${BLUE}Selected files backup:${NC} $(basename $FILES_BACKUP)"
        read -p "Use this backup? (Y/n): " confirm
        if [[ $confirm =~ ^[Nn]$ ]]; then
            echo "Enter the number of the backup to use:"
            read backup_num
            FILES_BACKUP="${files_backups[$((backup_num-1))]}"
        fi
    fi

    echo ""
    print_info "Database backup: $(basename $DB_BACKUP)"
    print_info "Files backup: $(basename $FILES_BACKUP)"
    echo ""

    read -p "Proceed with restoration? (yes/no): " confirm
    if [[ ! $confirm =~ ^[Yy][Ee][Ss]$ ]]; then
        print_warning "Restoration cancelled by user"
        exit 0
    fi
}

start_database() {
    print_header "Starting Database Container"

    # Stop all services first
    print_info "Stopping all services..."
    cd /opt/bharat-crm
    docker compose -f $COMPOSE_FILE down

    # Start only postgres
    print_info "Starting PostgreSQL..."
    docker compose -f $COMPOSE_FILE up -d postgres

    # Wait for database to be ready
    print_info "Waiting for database to be ready..."
    for i in {1..30}; do
        if docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres &> /dev/null; then
            print_success "Database is ready"
            return 0
        fi
        sleep 2
        echo -n "."
    done

    print_error "Database failed to start"
    exit 1
}

restore_database() {
    if [ -z "$DB_BACKUP" ]; then
        print_warning "No database backup to restore"
        return 0
    fi

    print_header "Restoring Database"

    print_info "Copying backup to container..."
    docker cp "$DB_BACKUP" bharat-crm-postgres:/tmp/backup.sql.gz

    print_info "Restoring database from backup..."
    docker compose -f $COMPOSE_FILE exec -T postgres bash -c "
        gunzip -c /tmp/backup.sql.gz | psql -U postgres -d bharat_crm
    " 2>&1 | grep -v "ERROR.*already exists" || true

    print_info "Cleaning up temporary files..."
    docker compose -f $COMPOSE_FILE exec -T postgres rm /tmp/backup.sql.gz

    print_success "Database restored successfully"

    # Verify restoration
    print_info "Verifying database restoration..."
    table_count=$(docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d bharat_crm -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    if [ "$table_count" -gt 0 ]; then
        print_success "Found $table_count tables in database"
    else
        print_warning "No tables found in database"
    fi
}

restore_files() {
    if [ -z "$FILES_BACKUP" ]; then
        print_warning "No files backup to restore"
        return 0
    fi

    print_header "Restoring Files"

    # Create temporary directory
    print_info "Creating temporary directory..."
    rm -rf $TMP_DIR
    mkdir -p $TMP_DIR

    # Extract backup
    print_info "Extracting files backup..."
    tar -xzf "$FILES_BACKUP" -C $TMP_DIR

    # Get volume paths
    print_info "Finding Docker volume paths..."

    # Create volumes if they don't exist
    docker volume create bharat-crm_backend_uploads &> /dev/null || true
    docker volume create bharat-crm_backend_knowledge &> /dev/null || true
    docker volume create bharat-crm_backend_conversations &> /dev/null || true

    uploads_path=$(docker volume inspect bharat-crm_backend_uploads --format '{{ .Mountpoint }}')
    knowledge_path=$(docker volume inspect bharat-crm_backend_knowledge --format '{{ .Mountpoint }}')
    conversations_path=$(docker volume inspect bharat-crm_backend_conversations --format '{{ .Mountpoint }}')

    # Copy files to volumes
    print_info "Copying uploads to volume..."
    if [ -d "$TMP_DIR/backend/uploads" ]; then
        sudo cp -r $TMP_DIR/backend/uploads/* $uploads_path/ 2>/dev/null || true
        print_success "Uploads restored"
    else
        print_warning "No uploads directory found in backup"
    fi

    print_info "Copying knowledge base to volume..."
    if [ -d "$TMP_DIR/backend/knowledge_base" ]; then
        sudo cp -r $TMP_DIR/backend/knowledge_base/* $knowledge_path/ 2>/dev/null || true
        print_success "Knowledge base restored"
    else
        print_warning "No knowledge_base directory found in backup"
    fi

    print_info "Copying conversations to volume..."
    if [ -d "$TMP_DIR/backend/conversations" ]; then
        sudo cp -r $TMP_DIR/backend/conversations/* $conversations_path/ 2>/dev/null || true
        print_success "Conversations restored"
    else
        print_warning "No conversations directory found in backup"
    fi

    # Fix permissions
    print_info "Fixing file permissions..."
    sudo chown -R 1000:1000 $uploads_path 2>/dev/null || true
    sudo chown -R 1000:1000 $knowledge_path 2>/dev/null || true
    sudo chown -R 1000:1000 $conversations_path 2>/dev/null || true

    # Cleanup
    print_info "Cleaning up temporary files..."
    rm -rf $TMP_DIR

    print_success "Files restored successfully"
}

start_all_services() {
    print_header "Starting All Services"

    cd /opt/bharat-crm

    print_info "Building containers..."
    docker compose -f $COMPOSE_FILE build

    print_info "Starting all services..."
    docker compose -f $COMPOSE_FILE up -d

    print_success "All services started"
}

verify_restoration() {
    print_header "Verification"

    print_info "Checking container status..."
    docker compose -f $COMPOSE_FILE ps

    echo ""
    print_info "Waiting for services to be healthy..."
    sleep 10

    # Check backend health
    print_info "Checking backend health..."
    if curl -f http://localhost:3001/api/health &> /dev/null; then
        print_success "Backend is responding"
    else
        print_warning "Backend health check failed (this may be normal if migrations are running)"
    fi

    # Check database
    print_info "Checking database connection..."
    if docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "Database is accessible"
    else
        print_warning "Database health check failed"
    fi

    echo ""
    print_success "Restoration completed!"
    echo ""
    print_info "Next steps:"
    echo "  1. Access the application at http://localhost or your domain"
    echo "  2. Verify data by logging in and checking customers/leads"
    echo "  3. Check logs: docker compose -f $COMPOSE_FILE logs -f"
    echo "  4. Update WhatsApp webhook URL if needed"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   Bharat CRM Restoration Script       ║"
    echo "║   Restore Database and Files           ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"

    check_requirements
    list_backups
    select_backups
    start_database
    restore_database
    restore_files
    start_all_services
    verify_restoration
}

# Run main function
main
