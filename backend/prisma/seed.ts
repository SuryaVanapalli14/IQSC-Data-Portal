import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const commonPassword = await bcrypt.hash('123456789', 10);

  // 1. Seed IQAC Admin
  await prisma.user.upsert({
    where: { email: 'admin@mail.com' },
    update: { password: commonPassword, role: 'IQAC_ADMIN' },
    create: {
      email: 'admin@mail.com',
      password: commonPassword,
      name: 'IQAC Administrator',
      role: 'IQAC_ADMIN',
    },
  });

  // 2. Seed HODs for each Department
  const departments = [
    { code: 'CSE', name: 'Computer Science & Engineering', hodEmail: 'hod@mail.com', hodName: 'CSE HOD' }, // hod@mail.com as CSE HOD for easy login
    { code: 'ECE', name: 'Electronics & Communication Engineering', hodEmail: 'hod_ece@mail.com', hodName: 'ECE HOD' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering', hodEmail: 'hod_eee@mail.com', hodName: 'EEE HOD' },
    { code: 'MECH', name: 'Mechanical Engineering', hodEmail: 'hod_mech@mail.com', hodName: 'Mechanical HOD' },
    { code: 'CIVIL', name: 'Civil Engineering', hodEmail: 'hod_civil@mail.com', hodName: 'Civil HOD' },
    { code: 'IT', name: 'Information Technology', hodEmail: 'hod_it@mail.com', hodName: 'IT HOD' },
    { code: 'MBA', name: 'Master of Business Administration', hodEmail: 'hod_mba@mail.com', hodName: 'MBA HOD' },
    { code: 'MCA', name: 'Master of Computer Applications', hodEmail: 'hod_mca@mail.com', hodName: 'MCA HOD' }
  ];

  for (const dept of departments) {
    await prisma.user.upsert({
      where: { email: dept.hodEmail },
      update: { password: commonPassword, role: 'HOD', department: dept.code, name: dept.hodName },
      create: {
        email: dept.hodEmail,
        password: commonPassword,
        name: dept.hodName,
        role: 'HOD',
        department: dept.code
      },
    });
  }

  // 3. Seed Faculty Accounts
  const facultyUsers = [
    { email: 'cse@mail.com', name: 'CSE Faculty #1', department: 'CSE' },
    { email: 'cse2@mail.com', name: 'CSE Faculty #2', department: 'CSE' },
    { email: 'ece@mail.com', name: 'ECE Faculty #1', department: 'ECE' },
    { email: 'eee@mail.com', name: 'EEE Faculty #1', department: 'EEE' },
    { email: 'mech@mail.com', name: 'MECH Faculty #1', department: 'MECH' },
    { email: 'civil@mail.com', name: 'CIVIL Faculty #1', department: 'CIVIL' },
    { email: 'it@mail.com', name: 'IT Faculty #1', department: 'IT' },
    { email: 'mba@mail.com', name: 'MBA Faculty #1', department: 'MBA' },
    { email: 'mca@mail.com', name: 'MCA Faculty #1', department: 'MCA' },
    { email: 'faculty@mail.com', name: 'General Faculty Member', department: 'CSE' }
  ];

  for (const faculty of facultyUsers) {
    await prisma.user.upsert({
      where: { email: faculty.email },
      update: { password: commonPassword, role: 'FACULTY', department: faculty.department, name: faculty.name },
      create: {
        email: faculty.email,
        password: commonPassword,
        name: faculty.name,
        role: 'FACULTY',
        department: faculty.department
      },
    });
  }

  // 4. Seed Metrics (Academic/IQAC focused)
  const metricCount = await prisma.stationMetric.count();
  if (metricCount === 0) {
    await prisma.stationMetric.createMany({
      data: [
        { category: 'IQAC_AUDIT', name: 'SUBMISSION_RATE', value: 92, formula: 'Completed forms / Total forms', period: 'Current Semester', color: '#2563eb' },
        { category: 'IQAC_AUDIT', name: 'APPROVAL_RATE', value: 85, formula: 'Approved responses / Total responses', period: 'Current Semester', color: '#8b5cf6' },
        { category: 'IQAC_AUDIT', name: 'PENDING_REVIEW', value: 15, formula: 'Pending responses / Total responses', period: 'YTD', color: '#10b981' },
      ]
    });
  }

  console.log('✅ Hosted Demo Seeding Complete with Department HOD mapping');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
