const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tests = await prisma.courseTest.findMany({ include: { questions: true }});
  for (const t of tests) {
    if (t.questions.length > 0) {
      console.log(`Test: ${t.title} (${t.id})`);
      for (const q of t.questions) {
        console.log(`  - [${q.id}] ${q.type}: ${q.prompt.substring(0,30)}...`);
      }
    }
  }
}
main();
