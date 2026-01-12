const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const teamMembers = [
  {
    name: 'Zack Willson',
    title: 'Co-President: Quant Trading Head',
    division: 'Quant Trading',
    program: 'Engineering Science (Math Stats Finance)',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/zack-willson/',
    headshot: '/images/exec-team/Zack Willson.png',
    isExecutive: true,
    order: 1,
  },
  {
    name: 'Kabir Dhillon',
    title: 'Co-President: Macro & Equity Head',
    division: 'Equity & Macro',
    program: 'Engineering Science (Math Stats Finance)',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/kabirdhillon22/',
    headshot: '/images/exec-team/Kabir Dhillon.jpg',
    isExecutive: true,
    order: 2,
  },
  {
    name: 'Michael Nguyen',
    title: 'Co-President: Quant Research Head',
    division: 'Quant Research',
    program: 'Electrical Engineering',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/michael-ngx/',
    headshot: '/images/exec-team/Michael Nguyen.jpg',
    isExecutive: true,
    order: 3,
  },
  {
    name: 'Lukas Bos',
    title: 'Head of Equity Research',
    division: 'Equity & Macro',
    program: 'Engineering Science (Math Stats Finance)',
    year: '3rd Year',
    linkedin: 'https://www.linkedin.com/in/lukasbos/',
    headshot: '/images/exec-team/Lukas Bos.jpg',
    isExecutive: true,
    order: 4,
  },
  {
    name: 'Aaryan Nagpal',
    title: 'Co-President: Quant Trading Head',
    division: 'Quant Trading',
    program: 'Engineering Science (Math Stats Finance)',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/aaryan-nagpal/',
    headshot: '/images/exec-team/Aaryan Nagpal.jpeg',
    isExecutive: true,
    order: 5,
  },
  {
    name: 'Mayumi Yagui Zakimi',
    title: 'Vice President of Marketing & Consumer Sector Lead',
    division: 'Equity & Macro',
    program: 'Rotman Commerce',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/mayumiyagui/',
    headshot: '/images/exec-team/Mayumi Yagui Zakimi.jpg',
    isExecutive: true,
    order: 6,
  },
  {
    name: 'Carter Buck',
    title: 'Vice President of Finance',
    division: 'Operations',
    program: 'Engineering Science (Math Stats Finance)',
    year: '3rd Year',
    linkedin: 'https://www.linkedin.com/in/carter-buck/',
    headshot: '/images/exec-team/Carter Buck.jpeg',
    isExecutive: true,
    order: 7,
  },
  {
    name: 'Kaitlyn Wells',
    title: 'Vice President of Legal Affairs',
    division: 'Operations',
    program: 'Engineering Science (Biomedical Engineering)',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/katiewells11/',
    headshot: '/images/exec-team/Kaitlyn Wells.jpg',
    isExecutive: true,
    order: 8,
  },
  {
    name: 'Aditya Iyer',
    title: 'Emerging Markets Sector Lead',
    division: 'Equity & Macro',
    program: 'Engineering Science (Math Stats Finance)',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/aditya-iyer-9b3879200/',
    headshot: '/images/exec-team/Aditya Iyer.jpg',
    isExecutive: true,
    order: 9,
  },
  {
    name: 'James Li',
    title: 'Financial Optimization and Modelling Lead',
    division: 'Quant Trading',
    program: 'Engineering Science (Math Stats Finance)',
    year: '4th Year',
    linkedin: 'https://www.linkedin.com/in/lijames663/',
    headshot: '/images/exec-team/James Li.jpeg',
    isExecutive: true,
    order: 10,
  },
  {
    name: 'Ryan Ma',
    title: 'Industrials & Materials Sector Lead',
    division: 'Equity & Macro',
    program: 'Engineering Science (Math Stats Finance)',
    year: '3rd Year',
    linkedin: 'https://www.linkedin.com/in/ryan-ma-4a1359217/',
    headshot: '/images/exec-team/Ryan Ma.jpeg',
    isExecutive: true,
    order: 11,
  },
  {
    name: 'Matthew Braho',
    title: 'Technology Sector Lead',
    division: 'Equity & Macro',
    program: 'Engineering Science (Math Stats Finance)',
    year: '3rd Year',
    linkedin: 'https://www.linkedin.com/in/matthew-braho-a29615275/',
    headshot: '/images/exec-team/Matthew Braho.jpeg',
    isExecutive: true,
    order: 12,
  },
  {
    name: 'Jason Wang',
    title: 'Quantitative Strategies Lead',
    division: 'Quant Trading',
    program: 'Electrical Engineering',
    year: '3rd Year',
    linkedin: 'https://www.linkedin.com/in/jason-jh-wang/',
    headshot: '/images/exec-team/Jason Wang.jpg',
    isExecutive: true,
    order: 13,
  },
  {
    name: 'Jim Wang',
    title: 'Artificial Intelligence Lead',
    division: 'Quant Research',
    program: 'Engineering Science (Machine Intelligence)',
    year: '3rd Year',
    linkedin: 'https://www.linkedin.com/in/ji-jim-wang-b48a90215/',
    headshot: '/images/exec-team/Jim Wang.jpeg',
    isExecutive: true,
    order: 14,
  },
];

async function main() {
  console.log('Seeding team members...');

  // Delete existing team members first
  await prisma.teamMember.deleteMany({});
  console.log('Cleared existing team members\n');

  // Create all team members
  for (const member of teamMembers) {
    const result = await prisma.teamMember.create({
      data: member,
    });
    console.log(`✓ ${result.name} - ${result.title}`);
  }

  console.log('\n✅ Successfully seeded', teamMembers.length, 'team members!');
}

main()
  .catch((e) => {
    console.error('Error seeding team:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

