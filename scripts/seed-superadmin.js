/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'owner@divergentclasses.com';
  const password = process.argv[3] || 'SuperSecret123!';
  const name = process.argv[4] || 'Institute Owner';

  console.log(`\n👑 Bootstrapping SUPER_ADMIN account...`);
  console.log(`Email: ${email}`);
  console.log(`Name: ${name}`);

  // Check if exists
  const existing = await prisma.user.findUnique({ where: { email } });
  
  if (existing) {
    console.log(`\n⚠️ User ${email} already exists. Upgrading to SUPER_ADMIN...`);
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' }
    });
    console.log(`✅ ${email} is now a SUPER_ADMIN.`);
  } else {
    // Create new
    const passwordHash = bcrypt.hashSync(password, 10);
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'SUPER_ADMIN'
      }
    });
    console.log(`✅ Successfully created SUPER_ADMIN: ${email} (Password: ${password})`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
