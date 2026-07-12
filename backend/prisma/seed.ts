import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin', 10);
  const officerPassword = await bcrypt.hash('station', 10);
  const ccrbPassword = await bcrypt.hash('ccrb', 10);

  // 1. Seed Admin
  await prisma.user.upsert({
    where: { email: 'admin@mail.com' },
    update: {},
    create: {
      email: 'admin@mail.com',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  // 2. Seed Officer
  await prisma.user.upsert({
    where: { email: 'station@mail.com' },
    update: {},
    create: {
      email: 'station@mail.com',
      password: officerPassword,
      name: 'Station Officer',
      role: 'USER',
    },
  });

  const stationNames = [
    'Gunadala',
    'Machavaram',
    'Patamata',
    'Governorpet',
    'Krishnalanka',
    'Suryaraopet',
    'Ajith Singh Nagar',
    'Nunna',
    'Satyanarayanapuram',
    'Bhavanipuram',
    'Ibrahimpatnam',
    'Vijayawada I Town',
    'Vijayawada II Town',
    'Vijayawada Traffic I (T)',
    'Vijayawada Traffic II (T)',
    'Vijayawada Traffic III (T)',
    'Vijayawada Traffic IV (T)',
    'Vijayawada Traffic V (T)',
    'G. Konduru',
    'Mylavaram',
    'Reddigudem',
    'A. Konduru',
    'Gampalagudem',
    'Tiruvuru',
    'Vissannapet',
    'Nandigama',
    'Chillakallu',
    'Jaggaiahpet',
    'Penuganchiprolu',
    'Vatsavai',
    'Chandarlapadu',
    'Kanchikacherla',
    'Veerulapadu',
    'Cyber Crime',
    'Mahila UPS'
  ];

  for (const name of stationNames) {
    const email = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') + '@mail.com';
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: officerPassword,
        name,
        role: 'USER',
      },
    });
  }

  // 3. Seed CCRB
  await prisma.user.upsert({
    where: { email: 'ccrb@mail.com' },
    update: {},
    create: {
      email: 'ccrb@mail.com',
      password: ccrbPassword,
      name: 'CCRB Oversight',
      role: 'CCRB',
    },
  });

  // 4. Seed Station Metrics
  const metricCount = await prisma.stationMetric.count();
  if (metricCount === 0) {
    await prisma.stationMetric.createMany({
      data: [
        // Charge Sheets
        { category: 'CHARGE_SHEET', name: '60_DAY', value: 428, formula: 'Total filed / Target', period: 'Last 60 Days', color: '#2563eb' },
        { category: 'CHARGE_SHEET', name: '90_DAY', value: 642, formula: 'Total filed / Target', period: 'Last 90 Days', color: '#8b5cf6' },
        { category: 'CHARGE_SHEET', name: 'ITSSO', value: 606, formula: 'Internal Tracking', period: 'YTD', color: '#10b981' },
        
        // Missing Cases 2026
        { category: 'MISSING_CASES', name: '2026_MAN', value: 12, period: '2026 YTD', color: '#3b82f6' },
        { category: 'MISSING_CASES', name: '2026_BOY', value: 5, period: '2026 YTD', color: '#60a5fa' },
        { category: 'MISSING_CASES', name: '2026_WOMAN', value: 8, period: '2026 YTD', color: '#ec4899' },
        { category: 'MISSING_CASES', name: '2026_GIRL', value: 3, period: '2026 YTD', color: '#f472b6' },
        
        // Missing Cases 2025
        { category: 'MISSING_CASES', name: '2025_MAN', value: 45, period: '2025 Full Year', color: '#3b82f6' },
        { category: 'MISSING_CASES', name: '2025_BOY', value: 20, period: '2025 Full Year', color: '#60a5fa' },
        { category: 'MISSING_CASES', name: '2025_WOMAN', value: 30, period: '2025 Full Year', color: '#ec4899' },
        { category: 'MISSING_CASES', name: '2025_GIRL', value: 15, period: '2025 Full Year', color: '#f472b6' },
        
        // Accidents
        { category: 'ACCIDENTS', name: 'FATAL', value: 18, period: 'Till Date', color: '#ef4444' },
        { category: 'ACCIDENTS', name: 'NON_FATAL', value: 42, period: 'Till Date', color: '#f59e0b' },
      ]
    });
  }

  console.log('✅ Hosted Demo Seeding Complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
