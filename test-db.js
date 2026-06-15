const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const q = await prisma.testQuestion.findFirst({
    orderBy: { id: 'desc' }
  });
  console.log("Last question ID:", q.id);
  console.log("Question type:", q.type);
  
  // Try to update it with the same data the frontend is probably sending
  try {
    const nextQuestion = await prisma.testQuestion.update({
      where: { id: q.id },
      data: {
        points: 4,
        negativeMarks: 1,
        type: "SCQ",
        options: ["Option 1"],
        correctAnswer: ["Option 1"],
        explanationImageUrl: null
      }
    });
    console.log("Update success!");
  } catch (e) {
    console.error("Prisma error:", e);
  }
}
run();
