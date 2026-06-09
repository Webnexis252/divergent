import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { email: 'devanshgoelai@gmail.com' },
    data: { role: 'SUPER_ADMIN' }
  });
  await prisma.user.updateMany({
    where: { email: 'gazi@divergentclasses.com' },
    data: { role: 'ADMIN' }
  });
  console.log("Roles updated.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
