/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.fgizpokcubuaatgeguzt:aa8Isr5QgdcOldMg@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});
async function main() {
  const user = await prisma.user.findFirst();
  console.log("DB connected successfully, found user:", user?.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
