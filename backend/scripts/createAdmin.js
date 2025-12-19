/**
 * Script to create or update admin user with proper password hashing
 * Usage: node scripts/createAdmin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('\n🔐 Admin User Setup\n');

    const email = await question('Enter admin email: ');
    const name = await question('Enter admin name: ');
    const company = await question('Enter company name: ');
    const password = await question('Enter admin password: ');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // Hash the password
    console.log('\n🔄 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Update existing user
      console.log(`\n⚠️  User with email ${email} already exists. Updating password and role...\n`);

      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          name,
          company,
          role: 'ADMIN',
          isActive: true,
        },
      });

      console.log('✅ Admin user updated successfully!\n');
      console.log('User Details:');
      console.log(`  ID: ${updatedUser.id}`);
      console.log(`  Email: ${updatedUser.email}`);
      console.log(`  Name: ${updatedUser.name}`);
      console.log(`  Company: ${updatedUser.company}`);
      console.log(`  Role: ${updatedUser.role}`);
      console.log('\n✅ You can now login with your email and password!\n');
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          company,
          role: 'ADMIN',
          isActive: true,
        },
      });

      console.log('✅ Admin user created successfully!\n');
      console.log('User Details:');
      console.log(`  ID: ${newUser.id}`);
      console.log(`  Email: ${newUser.email}`);
      console.log(`  Name: ${newUser.name}`);
      console.log(`  Company: ${newUser.company}`);
      console.log(`  Role: ${newUser.role}`);
      console.log('\n✅ You can now login with your email and password!\n');
    }
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
