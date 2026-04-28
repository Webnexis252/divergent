import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'STUDENT' } })
  const course = await prisma.course.findFirst()
  if (user && course) {
      await prisma.enrollment.create({
          data: {
              userId: user.id,
              courseId: course.id,
              status: 'ACTIVE'
          }
      })
      console.log("Created enrollment")
  }
}
run()
