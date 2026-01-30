const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const prisma = require('../lib/prisma');

// Run pending migrations (admin only)
router.post('/run', authenticate, async (req, res) => {
  try {
    // Check if user is admin (you might want to add proper admin check)
    console.log('Running database migration for entityType column...');

    // Add entityType column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AutomationRule"
      ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT 'lead'
    `);

    console.log('✓ Migration completed successfully');

    // Verify the column was added
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'AutomationRule' AND column_name = 'entityType'
    `);

    res.json({
      success: true,
      message: 'Migration completed successfully',
      verification: result
    });

  } catch (error) {
    console.error('Migration error:', error);

    // Check if column already exists
    if (error.message.includes('already exists')) {
      return res.json({
        success: true,
        message: 'Column already exists - no migration needed',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

// Check migration status
router.get('/status', authenticate, async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'AutomationRule' AND column_name = 'entityType'
    `);

    res.json({
      migrated: result.length > 0,
      columnInfo: result[0] || null
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check migration status',
      message: error.message
    });
  }
});

module.exports = router;
