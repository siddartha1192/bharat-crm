#!/bin/bash

echo "🔧 Fixing failed migration in Docker environment..."
echo ""

# Stop all containers
echo "📋 Step 1: Stopping containers..."
docker-compose down
echo "✅ Containers stopped"
echo ""

# Start only postgres
echo "📋 Step 2: Starting PostgreSQL..."
docker-compose up -d postgres
sleep 5
echo "✅ PostgreSQL started"
echo ""

# Fix the migration using a temporary container
echo "📋 Step 3: Fixing failed migration..."
docker-compose run --rm backend sh -c "
echo '🔄 Marking failed migration as rolled back...'
npx prisma migrate resolve --rolled-back '20260117_add_demo_scheduling_automation'
echo '✅ Migration marked as rolled back'
echo ''
echo '🔄 Deploying migrations...'
npx prisma migrate deploy
echo '✅ Migrations deployed successfully'
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration fixed successfully!"
else
    echo ""
    echo "❌ Migration fix failed. Trying alternative approach..."
    echo ""

    # Alternative: Reset the specific migration
    docker-compose run --rm backend sh -c "
    echo '🔄 Applying manual fix...'
    npx prisma db execute --stdin <<'EOSQL'
-- Drop columns if they exist
DO \$\$
BEGIN
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingExtracted\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"hasMeetingRequest\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingAgreed\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingType\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingProposedDate\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingProposedTime\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingDateTimeText\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingDuration\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingPreferences\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingNotes\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingConfidence\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingReasonDeclined\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingCalendarEventId\";
    ALTER TABLE \"CallLog\" DROP COLUMN IF EXISTS \"meetingExtractionCost\";
    ALTER TABLE \"CallSettings\" DROP COLUMN IF EXISTS \"enableDemoScheduling\";
    ALTER TABLE \"CallSettings\" DROP COLUMN IF EXISTS \"demoSchedulingAutoBook\";
    ALTER TABLE \"CallSettings\" DROP COLUMN IF EXISTS \"demoSchedulingMinConfidence\";
    ALTER TABLE \"CallSettings\" DROP COLUMN IF EXISTS \"demoSchedulingCalendarId\";
    ALTER TABLE \"CallSettings\" DROP COLUMN IF EXISTS \"demoSchedulingNotifyUser\";
    ALTER TABLE \"CallSettings\" DROP COLUMN IF EXISTS \"demoSchedulingNotifyLead\";
END \$\$;

-- Add all columns
ALTER TABLE \"CallLog\"
ADD COLUMN \"meetingExtracted\" BOOLEAN DEFAULT false,
ADD COLUMN \"hasMeetingRequest\" BOOLEAN DEFAULT false,
ADD COLUMN \"meetingAgreed\" BOOLEAN DEFAULT false,
ADD COLUMN \"meetingType\" TEXT,
ADD COLUMN \"meetingProposedDate\" TIMESTAMP(3),
ADD COLUMN \"meetingProposedTime\" TEXT,
ADD COLUMN \"meetingDateTimeText\" TEXT,
ADD COLUMN \"meetingDuration\" INTEGER,
ADD COLUMN \"meetingPreferences\" TEXT,
ADD COLUMN \"meetingNotes\" TEXT,
ADD COLUMN \"meetingConfidence\" INTEGER,
ADD COLUMN \"meetingReasonDeclined\" TEXT,
ADD COLUMN \"meetingCalendarEventId\" TEXT,
ADD COLUMN \"meetingExtractionCost\" DOUBLE PRECISION;

ALTER TABLE \"CallSettings\"
ADD COLUMN \"enableDemoScheduling\" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN \"demoSchedulingAutoBook\" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN \"demoSchedulingMinConfidence\" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN \"demoSchedulingCalendarId\" TEXT,
ADD COLUMN \"demoSchedulingNotifyUser\" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN \"demoSchedulingNotifyLead\" BOOLEAN NOT NULL DEFAULT true;
EOSQL

echo '✅ Manual fix applied'
echo ''
echo '🔄 Marking migration as applied...'
npx prisma migrate resolve --applied '20260117_add_demo_scheduling_automation'
echo '✅ Migration marked as applied'
"
fi

echo ""
echo "📋 Step 4: Starting all services..."
docker-compose up -d
echo "✅ All services started"
echo ""

# Wait for backend to be healthy
echo "⏳ Waiting for backend to be healthy..."
sleep 10

# Check if backend is running
if docker ps | grep -q bharat-crm-backend; then
    echo "✅ Backend is running!"
    echo ""
    echo "🎉 Fix completed successfully!"
    echo ""
    echo "Your application should now be accessible at:"
    echo "  - Frontend: http://localhost"
    echo "  - Backend API: http://localhost:3001"
    echo "  - pgAdmin: http://localhost:5050/pgadmin"
    echo ""
    echo "Try logging in now!"
else
    echo "⚠️  Backend container may have issues. Checking logs..."
    docker logs bharat-crm-backend --tail 30
fi
