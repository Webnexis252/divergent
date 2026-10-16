/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
async function main() {
  const user = await prisma.user.findFirst();
  console.log("DB connected successfully, found user:", user?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
