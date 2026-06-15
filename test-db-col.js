const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const q = await prisma.testQuestion.findFirst();
    if (!q) {
      console.log("No question found");
      return;
    }
    const updated = await prisma.testQuestion.update({
      where: { id: q.id },
      data: {
        explanationImageUrl: null
      }
    });
    console.log("Success");
  } catch (e) {
    console.error("Prisma error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
