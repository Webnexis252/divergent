const http = require('http');
const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    console.log("No admin found");
    return;
  }
  
  // Create a dummy token for this user, wait we can't easily mock auth.
  // I will just use Prisma to find the exact course and see what's wrong with it.
  const course = await prisma.course.findFirst();
  console.log('Course ID:', course.id);
  await prisma.$disconnect();
}
test();
