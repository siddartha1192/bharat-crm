-- Rename Task.assignee to Task.assignedTo for consistency across all models
-- All models (Lead, Contact, Deal, Task) now use 'assignedTo' field

-- Rename the column
ALTER TABLE "Task" RENAME COLUMN "assignee" TO "assignedTo";

-- Drop old index
DROP INDEX IF EXISTS "Task_assignee_idx";

-- Create new index on assignedTo
CREATE INDEX IF NOT EXISTS "Task_assignedTo_idx" ON "Task"("assignedTo");
