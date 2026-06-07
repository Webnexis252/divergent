import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating XP for all students...');
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "xpPoints" = 100 + (
      SELECT COUNT(*) * 1000
      FROM "Enrollment"
      WHERE "Enrollment"."userId" = "User"."id"
    )
    WHERE "role" = 'STUDENT';
  `);
  console.log(`Updated ${result} students successfully!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
