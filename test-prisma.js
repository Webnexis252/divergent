const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const q = await prisma.testQuestion.findFirst();
    if (!q) {
      console.log("No question found");
      return;
    }
    console.log("Updating question", q.id);
    const updated = await prisma.testQuestion.update({
      where: { id: q.id },
      data: {
        prompt: "Updated prompt " + Math.random(),
        correctAnswer: ["Option 1"],
        options: ["Option 1", "Option 2"],
      }
    });
    console.log("Success", updated.id);
  } catch (e) {
    console.error("Prisma error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
