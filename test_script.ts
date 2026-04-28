import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    const enrollments = await prisma.enrollment.findMany({
        include: {
          course: {
            include: {
              teacherResources: {
                orderBy: { createdAt: "desc" }
              },
              chapters: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                include: {
                  lessons: {
                    where: { isPublished: true },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
      });
    console.log(enrollments)
}
test()
