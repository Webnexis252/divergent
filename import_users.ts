import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
  const fileContent = fs.readFileSync('/Users/vedansh/Downloads/lmsproto/Learner_Enrollments (5).csv', 'utf-8');
  const records = parse(fileContent, {
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

  const usersMap = new Map(); // email -> user

  for (const record of records) {
    const email = record['Learner Details']?.trim().toLowerCase();
    const name = record['Name']?.trim() || null;
    let phone = record['Mobile']?.trim() || null;
    if (phone === 'NA' || phone === '') phone = null;
    
    const productTitle = record['Product title']?.trim();
    if (!email) continue;

    // Get or Create User
    let user = usersMap.get(email);
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Find if phone is already used by another account (Prisma will throw unique constraint error)
        if (phone) {
          const existingPhoneUser = await prisma.user.findUnique({ where: { phone } });
          if (existingPhoneUser) {
            phone = null; // Ignore duplicate phone numbers for new users
          }
        }

        user = await prisma.user.create({
          data: {
            email,
            name,
            phone,
            role: 'STUDENT'
          }
        });
        console.log(`Created new user: ${email}`);
      }
      usersMap.set(email, user);
    }

    // Find course
    if (productTitle) {
      const courseId = coursesCache.get(productTitle.toLowerCase());
      if (courseId) {
        // Enroll user
        await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: courseId
            }
          },
          update: {
            status: 'ACTIVE'
          },
          create: {
            userId: user.id,
            courseId: courseId,
            status: 'ACTIVE'
          }
        });
      } else {
        // Don't warn on every missing course to avoid noise, just the first time we see it
        // Or we can just log a warning once per missing course
      }
    }
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
