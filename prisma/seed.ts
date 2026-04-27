/**
 * Prisma seed script for Divergent Classes LMS
 * Run: node --loader ts-node/esm prisma/seed.ts
 *   or: npx ts-node prisma/seed.ts
 *
 * Creates:
 *  - 1 SUPER_ADMIN
 *  - 1 ADMIN
 *  - 3 MENTORs
 *  - 10 STUDENTs
 *  - 4 Courses (2 published, 2 drafts)
 *  - Enrollments linking students to courses
 *  - Some DoubtTickets
 *  - InstituteSettings
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database…');

  // ── 1. Institute Settings ──────────────────────────────────────────────
  await prisma.instituteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Divergent Classes',
      primaryColor: '#38c1ff',
      contactEmail: 'admin@divergent.edu',
    },
  });
  console.log('  ✔ Institute settings');

  // ── 2. Users ───────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@divergent.edu' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@divergent.edu',
      passwordHash: await hash('SuperAdmin@123'),
      role: 'SUPER_ADMIN',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@divergent.edu' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@divergent.edu',
      passwordHash: await hash('Admin@1234'),
      role: 'ADMIN',
    },
  });

  const mentorData = [
    { name: 'Rahul Sharma',  email: 'rahul@divergent.edu',  pw: 'Mentor@123' },
    { name: 'Priya Patel',   email: 'priya@divergent.edu',  pw: 'Mentor@123' },
    { name: 'Arjun Mehta',   email: 'arjun@divergent.edu',  pw: 'Mentor@123' },
  ];

  const mentors = await Promise.all(
    mentorData.map((m) =>
      prisma.user.upsert({
        where: { email: m.email },
        update: {},
        create: {
          name: m.name,
          email: m.email,
          passwordHash: bcrypt.hashSync(m.pw, 10),
          role: 'MENTOR',
        },
      })
    )
  );

  const studentData = [
    { name: 'Ananya Singh',   email: 'ananya@student.edu' },
    { name: 'Vikram Nair',    email: 'vikram@student.edu' },
    { name: 'Sneha Gupta',    email: 'sneha@student.edu' },
    { name: 'Rohan Joshi',    email: 'rohan@student.edu' },
    { name: 'Divya Reddy',    email: 'divya@student.edu' },
    { name: 'Kiran Malhotra', email: 'kiran@student.edu' },
    { name: 'Pooja Iyer',     email: 'pooja@student.edu' },
    { name: 'Nikhil Verma',   email: 'nikhil@student.edu' },
    { name: 'Aisha Khan',     email: 'aisha@student.edu' },
    { name: 'Sanjay Tiwari',  email: 'sanjay@student.edu' },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: {
          name: s.name,
          email: s.email,
          passwordHash: bcrypt.hashSync('Student@123', 10),
          role: 'STUDENT',
          xpPoints: Math.floor(Math.random() * 800),
          streakCount: Math.floor(Math.random() * 15),
        },
      })
    )
  );

  console.log(`  ✔ Users: 1 super-admin, 1 admin, ${mentors.length} mentors, ${students.length} students`);

  // ── 3. Courses ─────────────────────────────────────────────────────────
  const courseData = [
    {
      title: 'Full-Stack Web Development',
      slug: 'full-stack-web-dev',
      description: 'Master React, Next.js, Node.js, and PostgreSQL — from zero to production.',
      price: 12999,
      isPublished: true,
      teacherId: mentors[0].id,
    },
    {
      title: 'Data Structures & Algorithms',
      slug: 'dsa-masterclass',
      description: 'Crack coding interviews with 200+ problems solved step by step.',
      price: 8999,
      isPublished: true,
      teacherId: mentors[1].id,
    },
    {
      title: 'UI/UX Design Fundamentals',
      slug: 'ui-ux-design',
      description: 'Design beautiful products with Figma, user research, and design systems.',
      price: 6999,
      isPublished: false,
      teacherId: mentors[2].id,
    },
    {
      title: 'DevOps & Cloud Essentials',
      slug: 'devops-cloud',
      description: 'Docker, Kubernetes, CI/CD pipelines, and AWS fundamentals.',
      price: 9999,
      isPublished: false,
      teacherId: mentors[0].id,
    },
  ];

  const courses = await Promise.all(
    courseData.map((c) =>
      prisma.course.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      })
    )
  );

  console.log(`  ✔ Courses: ${courses.length} created`);

  // ── 4. Enrollments ─────────────────────────────────────────────────────
  const enrollmentPairs: Array<{ userId: string; courseId: string; progress: number }> = [
    // Students enrolled in course 0
    ...students.slice(0, 7).map((s, i) => ({ userId: s.id, courseId: courses[0].id, progress: (i + 1) * 12 })),
    // Students enrolled in course 1
    ...students.slice(2, 9).map((s, i) => ({ userId: s.id, courseId: courses[1].id, progress: (i + 1) * 8 })),
    // A few in course 2
    ...students.slice(0, 3).map((s) => ({ userId: s.id, courseId: courses[2].id, progress: 0 })),
  ];

  for (const ep of enrollmentPairs) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: ep.userId, courseId: ep.courseId } },
      update: {},
      create: { userId: ep.userId, courseId: ep.courseId, status: 'ACTIVE', progressPercent: ep.progress },
    });
  }

  console.log(`  ✔ Enrollments: ${enrollmentPairs.length} created`);

  // ── 5. Doubt Tickets ───────────────────────────────────────────────────
  const doubtData = [
    { studentId: students[0].id, subject: 'How does useEffect cleanup work?', body: 'I am confused about when the cleanup function runs in useEffect...', priority: 'HIGH' as const, status: 'OPEN' as const },
    { studentId: students[1].id, subject: 'Difference between BFS and DFS?', body: 'Can someone explain when to use BFS vs DFS with examples?', priority: 'MEDIUM' as const, status: 'ASSIGNED' as const, mentorId: mentors[0].id },
    { studentId: students[2].id, subject: 'CSS Grid vs Flexbox', body: 'When should I choose Grid over Flexbox for layout?', priority: 'LOW' as const, status: 'RESOLVED' as const, mentorId: mentors[1].id },
    { studentId: students[3].id, subject: 'JWT vs Session Authentication', body: 'What are the pros and cons of JWT vs server-side sessions?', priority: 'HIGH' as const, status: 'OPEN' as const },
    { studentId: students[4].id, subject: 'Binary Search Tree deletion', body: 'The deletion operation in BST is confusing, especially the 3 cases.', priority: 'MEDIUM' as const, status: 'OPEN' as const },
  ];

  for (const d of doubtData) {
    await prisma.doubtTicket.create({ data: d }).catch(() => {/* ignore duplicates */});
  }

  console.log(`  ✔ Doubt tickets: ${doubtData.length} created`);

  // ── 6. Assignments ─────────────────────────────────────────────────────
  await prisma.assignment.createMany({
    data: [
      { courseId: courses[0].id, title: 'Build a REST API with Next.js', description: 'Create a fully functional REST API for a todo app.', points: 100, status: 'ACTIVE', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { courseId: courses[1].id, title: 'Implement QuickSort', description: 'Implement QuickSort and analyse its time complexity.', points: 50, status: 'ACTIVE', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { courseId: courses[0].id, title: 'Deploy to Vercel', description: 'Deploy your Next.js project and submit the live URL.', points: 75, status: 'ACTIVE' },
    ],
    skipDuplicates: true,
  });

  console.log('  ✔ Assignments: 3 created');

  console.log('\n✅  Seed complete!\n');
  console.log('──────────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  SUPER_ADMIN  →  superadmin@divergent.edu  /  SuperAdmin@123');
  console.log('  ADMIN        →  admin@divergent.edu        /  Admin@1234');
  console.log('  MENTOR       →  rahul@divergent.edu        /  Mentor@123');
  console.log('  STUDENT      →  ananya@student.edu         /  Student@123');
  console.log('──────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
