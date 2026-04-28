import { SignJWT } from 'jose';
import * as dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET_VALUE = process.env.JWT_SECRET!;
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET_VALUE);
}

async function run() {
  const token = await new SignJWT({
      userId: "cmoe459w30001ycp2dap0fibi",
      email: "student@example.com",
      role: "STUDENT"
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
  
  console.log("TOKEN:", token);
}
run();
