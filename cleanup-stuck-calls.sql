-- Cleanup script to fix stuck active calls
-- This will mark all stuck calls as 'completed' so new calls can be processed

-- First, let's see what calls are stuck (for debugging)
SELECT
  id,
  "phoneNumber",
  "twilioStatus",
  "createdAt",
  "startedAt",
  "endedAt"
FROM "CallLog"
WHERE "twilioStatus" IN ('queued', 'ringing', 'in-progress')
ORDER BY "createdAt" DESC;

-- Update stuck calls older than 5 minutes to 'failed'
UPDATE "CallLog"
SET
  "twilioStatus" = 'failed',
  "callOutcome" = 'failed',
  "endedAt" = NOW(),
  "updatedAt" = NOW()
WHERE
  "twilioStatus" IN ('queued', 'ringing', 'in-progress')
  AND "createdAt" < NOW() - INTERVAL '5 minutes';

-- Verify the update
SELECT
  "twilioStatus",
  COUNT(*) as count
FROM "CallLog"
GROUP BY "twilioStatus"
ORDER BY count DESC;
