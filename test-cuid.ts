import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findFirst({
    select: { id: true }
  });
  console.log("Course ID in DB:", course?.id);
  
  import('zod').then(zod => {
    const isCuid = zod.z.string().cuid().safeParse(course?.id).success;
    console.log("Is Cuid1 valid?:", isCuid);
    const isCuid2 = zod.z.string().cuid2().safeParse(course?.id).success;
    console.log("Is Cuid2 valid?:", isCuid2);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
