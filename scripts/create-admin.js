const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@stgeorgecapital.ca';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Admin User';

  console.log(`Creating admin user with email: ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      name,
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      name,
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('\n⚠️  Please change your password after first login!');
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

