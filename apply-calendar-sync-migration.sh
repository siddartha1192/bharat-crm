#!/bin/bash

echo "========================================="
echo "  Calendar Sync Migration Script"
echo "========================================="
echo ""

# Check if database is running
echo "1. Checking database connection..."
docker exec bharat-crm-postgres-1 pg_isready -U postgres > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Database not running or not accessible via Docker"
    echo ""
    echo "Please ensure the database is running:"
    echo "  docker-compose up -d"
    echo ""
    echo "Or apply the migration manually:"
    echo "  psql -U postgres -d bharat_crm -f backend/prisma/migrations/add_calendar_sync_fields.sql"
    exit 1
fi

echo "✅ Database is running"
echo ""

# Apply the migration
echo "2. Applying calendar sync migration..."
docker exec -i bharat-crm-postgres-1 psql -U postgres -d bharat_crm < backend/prisma/migrations/add_calendar_sync_fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully"
    echo ""
    echo "New fields added:"
    echo "  CalendarEvent:"
    echo "    - syncStatus (local_only, synced, error)"
    echo "    - lastSyncError (error message if sync failed)"
    echo ""
    echo "  User:"
    echo "    - calendarWebhookChannelId"
    echo "    - calendarWebhookResourceId"
    echo "    - calendarWebhookExpiration"
    echo ""
    echo "========================================="
    echo "✅ Calendar sync is now ready to use!"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Restart the backend server"
    echo "2. Connect Google Calendar in Settings"
    echo "3. Create/update/delete events - they will auto-sync!"
    echo "4. Run manual sync: POST /api/calendar/sync"
    echo "5. (Optional) Enable webhooks: POST /api/calendar/watch"
    echo ""
    echo "📖 See CALENDAR_SYNC_ENTERPRISE_GUIDE.md for full documentation"
else
    echo "❌ Migration failed"
    echo "Please check the error messages above"
    exit 1
fi
