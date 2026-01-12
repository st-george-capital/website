const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function syncUsers() {
  try {
    console.log('🔄 Syncing users from users.json...\n');

    // Read the users.json file
    const usersFilePath = path.join(__dirname, '..', 'users.json');
    
    if (!fs.existsSync(usersFilePath)) {
      console.error('❌ users.json file not found!');
      console.log('Please create a users.json file in the root directory.');
      process.exit(1);
    }

    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const users = usersData.users;

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in users.json');
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s) to sync\n`);

    // Process each user
    for (const userData of users) {
      const { email, password, name, role = 'admin' } = userData;

      if (!email || !password) {
        console.log(`⚠️  Skipping user: missing email or password`);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { email },
          data: {
            name: name || email,
            passwordHash: hashedPassword,
            role,
          },
        });
        console.log(`✅ Updated: ${email} (${name || email})`);
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            email,
            name: name || email,
            passwordHash: hashedPassword,
            role,
          },
        });
        console.log(`✨ Created: ${email} (${name || email})`);
      }
    }

    console.log('\n✅ User sync complete!');
    console.log('\nYou can now login with any of the users in users.json');
    
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncUsers();

