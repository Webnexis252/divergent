/**
 * Prisma seed script for Divergent Classes LMS (plain JS — no ts-node needed)
 * Run: node prisma/seed.mjs
 *
 * Creates:
 *  - 1 SUPER_ADMIN, 1 ADMIN
 *  - 3 MENTORs
 *  - 10 STUDENTs
 *  - 4 Courses (2 published)
 *  - Enrollments, Doubt Tickets, Assignments, InstituteSettings
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
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@divergent.edu' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@divergent.edu',
      passwordHash: await bcrypt.hash('SuperAdmin@123', 10),
      role: 'SUPER_ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@divergent.edu' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@divergent.edu',
      passwordHash: await bcrypt.hash('Admin@1234', 10),
      role: 'ADMIN',
    },
  });

  const mentorList = [
    { name: 'Rahul Sharma', email: 'rahul@divergent.edu' },
    { name: 'Priya Patel',  email: 'priya@divergent.edu' },
    { name: 'Arjun Mehta',  email: 'arjun@divergent.edu' },
  ];
  const mentorPw = await bcrypt.hash('Mentor@123', 10);
  const mentors = await Promise.all(
    mentorList.map((m) =>
      prisma.user.upsert({
        where: { email: m.email },
        update: {},
        create: { name: m.name, email: m.email, passwordHash: mentorPw, role: 'MENTOR' },
      })
    )
  );

  const studentList = [
    'ananya@student.edu', 'vikram@student.edu', 'sneha@student.edu',
    'rohan@student.edu',  'divya@student.edu',  'kiran@student.edu',
    'pooja@student.edu',  'nikhil@student.edu', 'aisha@student.edu',
    'sanjay@student.edu',
  ];
  const studentNames = [
    'Ananya Singh', 'Vikram Nair', 'Sneha Gupta', 'Rohan Joshi',
    'Divya Reddy',  'Kiran Malhotra', 'Pooja Iyer', 'Nikhil Verma',
    'Aisha Khan',   'Sanjay Tiwari',
  ];
  const studentPw = await bcrypt.hash('Student@123', 10);
  const students = await Promise.all(
    studentList.map((email, i) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: studentNames[i],
          email,
          passwordHash: studentPw,
          role: 'STUDENT',
          xpPoints: (i + 1) * 55,
          streakCount: i % 7,
        },
      })
    )
  );

  console.log(`  ✔ Users: 2 admins, ${mentors.length} mentors, ${students.length} students`);

  // ── 3. Courses ─────────────────────────────────────────────────────────
  const courseData = [
    { title: 'Full-Stack Web Development', slug: 'full-stack-web-dev', description: 'Master React, Next.js, Node.js & PostgreSQL from zero to production.', price: 12999, isPublished: true, teacherId: mentors[0].id },
    { title: 'Data Structures & Algorithms', slug: 'dsa-masterclass', description: 'Crack coding interviews with 200+ problems solved step by step.', price: 8999, isPublished: true, teacherId: mentors[1].id },
    { title: 'UI/UX Design Fundamentals', slug: 'ui-ux-design', description: 'Design beautiful products with Figma, user research, and design systems.', price: 6999, isPublished: false, teacherId: mentors[2].id },
    { title: 'DevOps & Cloud Essentials', slug: 'devops-cloud', description: 'Docker, Kubernetes, CI/CD pipelines, and AWS basics.', price: 9999, isPublished: false, teacherId: mentors[0].id },
  ];
  const courses = await Promise.all(
    courseData.map((c) =>
      prisma.course.upsert({ where: { slug: c.slug }, update: {}, create: c })
    )
  );
  console.log(`  ✔ Courses: ${courses.length} created`);

  // ── 4. Enrollments ─────────────────────────────────────────────────────
  const pairs = [
    ...students.slice(0, 7).map((s, i) => ({ userId: s.id, courseId: courses[0].id, progressPercent: (i + 1) * 12 })),
    ...students.slice(2, 9).map((s, i) => ({ userId: s.id, courseId: courses[1].id, progressPercent: (i + 1) * 9 })),
    ...students.slice(0, 3).map((s)    => ({ userId: s.id, courseId: courses[2].id, progressPercent: 0 })),
  ];
  for (const p of pairs) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: p.userId, courseId: p.courseId } },
      update: {},
      create: { userId: p.userId, courseId: p.courseId, status: 'ACTIVE', progressPercent: p.progressPercent },
    });
  }
  console.log(`  ✔ Enrollments: ${pairs.length}`);

  // ── 5. Doubt Tickets ───────────────────────────────────────────────────
  const doubts = [
    { studentId: students[0].id, subject: 'How does useEffect cleanup work?', body: 'I am confused about when the cleanup function runs in useEffect.', priority: 'HIGH', status: 'OPEN' },
    { studentId: students[1].id, mentorId: mentors[0].id, subject: 'BFS vs DFS — when to use which?', body: 'Can someone explain with examples?', priority: 'MEDIUM', status: 'ASSIGNED' },
    { studentId: students[2].id, mentorId: mentors[1].id, subject: 'CSS Grid vs Flexbox layout', body: 'When should I choose Grid over Flexbox?', priority: 'LOW', status: 'RESOLVED' },
    { studentId: students[3].id, subject: 'JWT vs Session Authentication', body: 'What are the pros and cons of each approach?', priority: 'HIGH', status: 'OPEN' },
    { studentId: students[4].id, subject: 'BST deletion 3 cases', body: 'The deletion operation in BST is confusing.', priority: 'MEDIUM', status: 'OPEN' },
  ];
  for (const d of doubts) {
    try { await prisma.doubtTicket.create({ data: d }); } catch (_) { /* skip duplicates */ }
  }
  console.log(`  ✔ Doubt tickets: ${doubts.length}`);

  // ── 6. Assignments ─────────────────────────────────────────────────────
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const fiveDays    = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await prisma.assignment.createMany({
    skipDuplicates: true,
    data: [
      { courseId: courses[0].id, title: 'Build a REST API with Next.js', description: 'Create a fully functional REST API for a todo app.', points: 100, status: 'ACTIVE', deadline: weekFromNow },
      { courseId: courses[1].id, title: 'Implement QuickSort', description: 'Implement QuickSort and analyse its time complexity.', points: 50, status: 'ACTIVE', deadline: fiveDays },
      { courseId: courses[0].id, title: 'Deploy to Vercel', description: 'Deploy your Next.js project and submit the live URL.', points: 75, status: 'ACTIVE' },
    ],
  });
  console.log('  ✔ Assignments: 3');

  // ── 7. Live Classes ────────────────────────────────────────────────────
  await prisma.liveClass.createMany({
    skipDuplicates: true,
    data: [
      { courseId: courses[0].id, title: 'React Hooks Deep Dive', description: 'Live session on useState, useEffect, and custom hooks.', startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), duration: 90, meetingUrl: 'https://meet.google.com/abc-def-ghi' },
      { courseId: courses[1].id, title: 'Graph Algorithms Walkthrough', description: 'Solving graph problems live — BFS, DFS, Dijkstra.', startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), duration: 120, meetingUrl: 'https://meet.google.com/xyz-lmn-opq' },
    ],
  });
  console.log('  ✔ Live classes: 2');

  // ── Done ───────────────────────────────────────────────────────────────
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
