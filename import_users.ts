import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
  const fileContent = fs.readFileSync('/Users/vedansh/Downloads/lmsproto/Learner_Enrollments (5).csv', 'utf-8');
  const records: any[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Loaded ${records.length} records from CSV.`);

  // To avoid duplicate queries, cache courses by title
  const coursesCache = new Map<string, string>(); // title -> id
  const courses = await prisma.course.findMany({ select: { id: true, title: true }});
  for (const c of courses) {
    coursesCache.set(c.title.trim().toLowerCase(), c.id);
  }

  // Find all existing users
  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true, phone: true }
  });
  
  const emailToId = new Map<string, string>();
  const takenPhones = new Set<string>();
  
  for (const u of existingUsers) {
    if (u.email) emailToId.set(u.email, u.id);
    if (u.phone) takenPhones.add(u.phone);
  }

  const usersToCreate = [];
  const processedEmails = new Set<string>();

  for (const record of records) {
    const email = record['Learner Details']?.trim().toLowerCase();
    if (!email) continue;
    
    if (emailToId.has(email) || processedEmails.has(email)) continue;
    
    const name = record['Name']?.trim() || null;
    let phone = record['Mobile']?.trim() || null;
    if (phone === 'NA' || phone === '') phone = null;
    if (phone && takenPhones.has(phone)) phone = null;
    if (phone) takenPhones.add(phone);
    
    usersToCreate.push({ email, name, phone, role: 'STUDENT' });
    processedEmails.add(email);
  }

  if (usersToCreate.length > 0) {
    console.log(`Creating ${usersToCreate.length} new users...`);
    await prisma.user.createMany({ data: usersToCreate, skipDuplicates: true });
    console.log('Created new users.');
  } else {
    console.log('No new users to create.');
  }

  // Refresh users to get IDs
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of allUsers) {
    if (u.email) emailToId.set(u.email, u.id);
  }

  // Pre-fetch all enrollments
  const existingEnrollments = await prisma.enrollment.findMany({
    select: { userId: true, courseId: true }
  });
  const enrollmentsSet = new Set<string>();
  for (const e of existingEnrollments) {
    enrollmentsSet.add(`${e.userId}-${e.courseId}`);
  }

  const enrollmentsToCreate = [];
  const processedEnrollments = new Set<string>();

  for (const record of records) {
    const email = record['Learner Details']?.trim().toLowerCase();
    const productTitle = record['Product title']?.trim();
    if (!email || !productTitle) continue;

    const userId = emailToId.get(email);
    const courseId = coursesCache.get(productTitle.toLowerCase());

    if (!userId || !courseId) continue;

    const key = `${userId}-${courseId}`;
    if (enrollmentsSet.has(key) || processedEnrollments.has(key)) continue;

    enrollmentsToCreate.push({
      userId,
      courseId,
      status: 'ACTIVE'
    });
    processedEnrollments.add(key);
  }

  if (enrollmentsToCreate.length > 0) {
    console.log(`Creating ${enrollmentsToCreate.length} new enrollments...`);
    await prisma.enrollment.createMany({ data: enrollmentsToCreate, skipDuplicates: true });
    console.log('Created new enrollments.');
  } else {
    console.log('No new enrollments to create.');
  }

  console.log("Import completed successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
