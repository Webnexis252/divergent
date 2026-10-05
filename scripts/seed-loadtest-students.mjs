/**
 * Creates N load-test students enrolled in one course and writes
 * loadtests/accounts.csv for loadtests/exam-day.k6.js. Staging only: the
 * db-guard refuses any remote database you haven't named in CONFIRM_DATABASE.
 *
 *   DATABASE_URL=<staging url> CONFIRM_DATABASE=<printed identity> \
 *   LOADTEST_COURSE_ID=... LOADTEST_STUDENTS=1000 LOADTEST_PASSWORD=... \
 *   node scripts/seed-loadtest-students.mjs
 *
 * Re-running is safe: existing accounts and enrollments are kept.
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { assertWritableDatabase } from './lib/db-guard.mjs';

const courseId = process.env.LOADTEST_COURSE_ID;
const count = Number(process.env.LOADTEST_STUDENTS || 100);
const password = process.env.LOADTEST_PASSWORD;

assertWritableDatabase(process.env.DATABASE_URL, 'create load-test students');
if (!courseId) throw new Error('LOADTEST_COURSE_ID is required');
if (!password || password.length < 12) throw new Error('LOADTEST_PASSWORD (12+ characters) is required');

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);
const pad = (n) => String(n).padStart(String(count).length, '0');
const students = Array.from({ length: count }, (_, i) => ({
  email: `loadtest+${pad(i + 1)}@example.test`,
  name: `Load Test ${pad(i + 1)}`,
  role: 'STUDENT',
  passwordHash,
}));

for (let i = 0; i < students.length; i += 500) {
  await prisma.user.createMany({ data: students.slice(i, i + 500), skipDuplicates: true });
}
const users = await prisma.user.findMany({
  where: { email: { in: students.map((s) => s.email) } },
  select: { id: true },
});
for (let i = 0; i < users.length; i += 1000) {
  await prisma.enrollment.createMany({
    data: users.slice(i, i + 1000).map((u) => ({ userId: u.id, courseId, status: 'ACTIVE' })),
    skipDuplicates: true,
  });
}

mkdirSync('loadtests', { recursive: true });
writeFileSync('loadtests/accounts.csv', students.map((s) => `${s.email},${password}`).join('\n') + '\n');
console.log(`Ready: ${users.length} students enrolled in ${courseId}; accounts in loadtests/accounts.csv`);
await prisma.$disconnect();
