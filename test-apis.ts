import { config } from "dotenv";
config();
import { signToken } from "./src/lib/auth";

async function main() {
  const token = await signToken({
    userId: "cmodz0sb20000ycu80qipo0zo",
    email: "test@example.com",
    role: "STUDENT"
  });
  console.log("TOKEN:", token);
}
main().catch(console.error).finally(() => process.exit(0));
