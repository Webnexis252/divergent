import prisma from "./src/lib/prisma";
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  console.log(users);
}
main().catch(console.error).finally(() => process.exit(0));
