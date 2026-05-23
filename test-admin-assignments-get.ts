import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const where = {};
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        submissions: { select: { id: true, score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log("Success:", assignments.length);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
