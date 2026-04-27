import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'vedanshsahay_23ec224@dtu.ac.in';
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email,
      name: 'Vedansh Sahay',
      role: 'SUPER_ADMIN'
    }
  });

  console.log(`Successfully set user ${user.email} as ${user.role}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
