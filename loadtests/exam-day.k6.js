/**
 * Exam-day load test: many students start the same test, load its questions,
 * then submit within the same couple of minutes (the deadline rush).
 *
 * NEVER point this at production. It signs in as real accounts and writes
 * TestAttempt rows. Run it against a staging deployment with its own database
 * (see loadtests/README.md).
 *
 *   k6 run loadtests/exam-day.k6.js \
 *     -e BASE_URL=https://staging.example.com \
 *     -e COURSE_ID=... -e TEST_ID=... \
 *     -e ACCOUNTS_FILE=./loadtests/accounts.csv \
 *     -e STUDENTS=500 \
 *     -e NOT_PRODUCTION=yes
 */
import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '');
const COURSE_ID = __ENV.COURSE_ID;
const TEST_ID = __ENV.TEST_ID;
const STUDENTS = Number(__ENV.STUDENTS || 100);
// Spread of submit times, in seconds: smaller = sharper deadline spike
const SUBMIT_SPREAD_SECS = Number(__ENV.SUBMIT_SPREAD_SECS || 60);

if (__ENV.NOT_PRODUCTION !== 'yes') {
  fail('Refusing to run: set NOT_PRODUCTION=yes to confirm BASE_URL is a staging deployment with its own database.');
}
if (!BASE_URL || !COURSE_ID || !TEST_ID) fail('BASE_URL, COURSE_ID and TEST_ID are required.');

// accounts.csv: one "email,password" line per seeded student (no header)
const accounts = new SharedArray('accounts', () =>
  open(__ENV.ACCOUNTS_FILE || './accounts.csv')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, password] = line.split(',');
      return { email, password };
    }),
);

export const options = {
  scenarios: {
    exam: {
      executor: 'per-vu-iterations',
      vus: STUDENTS,
      iterations: 1,
      maxDuration: '15m',
    },
  },
  thresholds: {
    // The run fails if more than 1% of requests error or submits get slow
    http_req_failed: ['rate<0.01'],
    'http_req_duration{step:submit}': ['p(95)<3000'],
    'http_req_duration{step:start}': ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

const json = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const account = accounts[(exec.vu.idInTest - 1) % accounts.length];
  if (!account) fail('Not enough accounts in ACCOUNTS_FILE');

  const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(account), { ...json, tags: { step: 'login' } });
  if (!check(login, { 'logged in': (r) => r.status === 200 })) return;

  // Everyone opens the exam within the first ~30s
  sleep(Math.random() * 30);
  const testUrl = `${BASE_URL}/api/courses/${COURSE_ID}/tests/${TEST_ID}`;
  // The exam page first loads the test details, then starting returns the questions
  http.get(testUrl, { tags: { step: 'details' } });
  const start = http.post(`${testUrl}/start`, '{}', { ...json, tags: { step: 'start' } });
  if (!check(start, { 'exam started': (r) => r.status === 200 || r.status === 201 })) return;
  const list = start.json('data.questions') || [];

  // Answer with the first option where there are options, "1" otherwise
  const answers = {};
  for (const q of Array.isArray(list) ? list : []) {
    const firstOption = q.options && q.options[0] && (q.options[0].id || q.options[0]);
    answers[q.id] = firstOption ? String(firstOption) : '1';
  }

  // Then everyone submits close to the deadline
  sleep(30 + Math.random() * SUBMIT_SPREAD_SECS);
  const submit = http.post(
    `${testUrl}/submit`,
    JSON.stringify({ answers, timeSpentSecs: 1800 }),
    { ...json, tags: { step: 'submit' } },
  );
  check(submit, { 'submitted': (r) => r.status === 200 || r.status === 201 });
}
