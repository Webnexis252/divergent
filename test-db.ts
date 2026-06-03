import prisma from "./src/lib/prisma";
async function main() {
  console.log("Connecting...");
  const user = await prisma.user.findFirst();
  console.log("Success:", user?.id);
}
main().catch(console.error).finally(() => process.exit(0));
