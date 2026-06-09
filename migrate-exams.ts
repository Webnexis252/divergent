import { PrismaClient, QuestionType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tests = await prisma.courseTest.findMany({
    include: { questions: true }
  })

  let migratedCount = 0;

  for (const test of tests) {
    if (test.questions.length === 0) continue;

    // Check if a part already exists
    const existingParts = await prisma.testPart.count({ where: { testId: test.id } })
    if (existingParts > 0) continue;

    console.log(`Migrating Test ${test.id} (${test.title})...`);

    // Create default part
    const part = await prisma.testPart.create({
      data: {
        testId: test.id,
        title: 'Part 1',
        order: 0,
      }
    })

    // Group questions by type to create sections
    const typeMap = new Map<QuestionType, any[]>()
    for (const q of test.questions) {
      if (!typeMap.has(q.type)) {
        typeMap.set(q.type, [])
      }
      typeMap.get(q.type)!.push(q)
    }

    let sectionOrder = 0;
    for (const [type, questions] of typeMap.entries()) {
      const section = await prisma.testSection.create({
        data: {
          partId: part.id,
          title: `${type} Section`,
          questionType: type,
          order: sectionOrder++
        }
      })

      // Link questions
      for (const q of questions) {
        await prisma.testQuestion.update({
          where: { id: q.id },
          data: {
            partId: part.id,
            sectionId: section.id
          }
        })
      }
    }
    migratedCount++;
  }

  console.log(`Migration complete. Migrated ${migratedCount} tests.`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
