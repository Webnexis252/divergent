import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'STUDENT' } })
  console.log("USER:", user)
}
run()
