import { PrismaClient } from '@prisma/client';

// Usage: node scripts/make-admin.mjs <email> [name]
// Makes the user with this email a SUPER_ADMIN, creating the account (with no
// password, for Google sign-in) if it doesn't exist yet.
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const name = process.argv[3];
  if (!email) {
    console.error('Usage: node scripts/make-admin.mjs <email> [name]');
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email,
      name: name || email.split('@')[0],
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
