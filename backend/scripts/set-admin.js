#!/usr/bin/env node

/**
 * Script to set a user as ADMIN
 * Usage: node backend/scripts/set-admin.js <email>
 * Example: node backend/scripts/set-admin.js admin@example.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAdmin(email) {
  try {
    if (!email) {
      console.error('❌ Error: Please provide an email address');
      console.log('Usage: node backend/scripts/set-admin.js <email>');
      console.log('Example: node backend/scripts/set-admin.js admin@example.com');
      process.exit(1);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`❌ Error: User with email "${email}" not found`);
      console.log('\nPlease make sure:');
      console.log('1. The user has signed up in the application');
      console.log('2. The email address is correct');
      process.exit(1);
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        isActive: true // Also activate the user
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    console.log('✅ Success! User has been promoted to ADMIN');
    console.log('\nUser Details:');
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`👤 Name: ${updatedUser.name}`);
    console.log(`🛡️  Role: ${updatedUser.role}`);
    console.log(`✓ Status: ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
    console.log('\nThis user can now:');
    console.log('• Access Settings → User Management');
    console.log('• Change roles for other users');
    console.log('• Activate/deactivate users');
    console.log('• Manage all system settings');
  } catch (error) {
    console.error('❌ Error setting admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
setAdmin(email);
