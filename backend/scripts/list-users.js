#!/usr/bin/env node

/**
 * Script to list all users and their roles
 * Usage: node backend/scripts/list-users.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROLE_COLORS = {
  ADMIN: '\x1b[31m',    // Red
  MANAGER: '\x1b[34m',  // Blue
  AGENT: '\x1b[32m',    // Green
  VIEWER: '\x1b[90m'    // Gray
};
const RESET = '\x1b[0m';

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      console.log('No users found in the database.');
      console.log('\nTo create users:');
      console.log('1. Sign up through the application at /signup');
      console.log('2. Then run this script again to see the users');
      process.exit(0);
    }

    console.log('\n📋 USER LIST\n');
    console.log('═'.repeat(80));

    users.forEach((user, index) => {
      const roleColor = ROLE_COLORS[user.role] || '';
      const statusIcon = user.isActive ? '✓' : '✗';
      const statusColor = user.isActive ? '\x1b[32m' : '\x1b[31m';
      const createdDate = new Date(user.createdAt).toLocaleDateString();
      const updatedDate = new Date(user.updatedAt).toLocaleDateString();

      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🛡️  Role: ${roleColor}${user.role}${RESET}`);
      console.log(`   ${statusColor}${statusIcon}${RESET} Status: ${user.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   📅 Created: ${createdDate}`);
      console.log(`   🔄 Last Updated: ${updatedDate}`);
      console.log(`   🆔 ID: ${user.id}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log(`\nTotal Users: ${users.length}`);
    console.log('\nRole Distribution:');
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    Object.entries(roleCounts).forEach(([role, count]) => {
      const color = ROLE_COLORS[role] || '';
      console.log(`  ${color}● ${role}${RESET}: ${count}`);
    });

    console.log('\nActive Users:', users.filter(u => u.isActive).length);
    console.log('Inactive Users:', users.filter(u => !u.isActive).length);

    console.log('\n💡 To set a user as ADMIN, run:');
    console.log('   node backend/scripts/set-admin.js <email>');
    console.log('\nExample:');
    console.log(`   node backend/scripts/set-admin.js ${users[0].email}`);

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
