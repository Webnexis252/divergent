import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.liveClass.findMany({
    include: { course: true }
  });
  console.log("All live classes:", classes.map(c => ({
    id: c.id,
    title: c.title,
    startTime: c.startTime,
    duration: c.duration,
    isEnded: c.isEnded,
    courseTitle: c.course.title
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
