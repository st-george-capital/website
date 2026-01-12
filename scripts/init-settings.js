const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initSettings() {
  console.log('🔧 Initializing site settings...');

  const defaultSettings = [
    {
      key: 'charity_amount',
      value: '3000',
      description: 'Total amount raised for charity (displayed on charity page)',
    },
    {
      key: 'founded_year',
      value: '2023',
      description: 'Year SGC was founded',
    },
    {
      key: 'member_count',
      value: '80',
      description: 'Number of active members',
    },
    {
      key: 'research_projects',
      value: '50',
      description: 'Number of research projects completed',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
    console.log(`✅ Created/updated setting: ${setting.key} = ${setting.value}`);
  }

  console.log('✨ Settings initialized successfully!');
}

initSettings()
  .catch((e) => {
    console.error('❌ Error initializing settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

