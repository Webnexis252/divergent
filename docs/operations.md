# Operations guide

How to switch on and run the reliability and engagement features. Everything
below is off or inert until configured, so deploying the code changes nothing
by itself.

## 0. Launch checklist

1. **Vercel plan**: Hobby is for non-commercial projects only; a paid client LMS needs Pro.
2. **Environment variables** for Production in Vercel: at minimum `JWT_SECRET` (48+ random
   characters), `CRON_SECRET`, `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`,
   `NEXT_PUBLIC_APP_URL`, live payment keys (`RAZORPAY_KEY_ID` must not start with
   `rzp_test_`; `CASHFREE_ENVIRONMENT=PRODUCTION`) and `EMAIL_*`.
3. **Check them** after each deploy. The server logs problems at start-up as `[CONFIG]` lines,
   and you can ask for the list (names only, never values):

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/health/config
   ```

   `"ready": true` means no errors remain; warnings are listed too.
4. **Supabase**: confirm daily backups and point-in-time recovery on your plan
   (Project Settings → Database → Backups), and test a restore once.
5. **Uptime monitoring**: point UptimeRobot (or similar) at `GET /api/health`.
6. **Click through a preview deployment** as a student, a teacher and an admin before
   promoting it.

## Sign-in sessions

Sign-in tokens last 7 days but can now be cancelled early (`src/lib/session-revocation.ts`,
stored in Upstash Redis):

- **Logout** cancels that device's token on the server, not just the cookie.
- **Changing your password** signs out every other device; an **admin resetting** a
  student's or teacher's password signs that person out everywhere.
- Takes effect within 30 seconds on every server. If Redis is unreachable, tokens keep
  working rather than signing everyone out.

Tokens issued before this change have no id, so logging out can't cancel them
individually; a password change still does.

## 1. Database migrations

Applied to production on 2026-10-05. For reference, this is how they went in.
Two migrations were waiting. Run them against production through the **session
pooler** (port 5432, not the 6543 transaction pooler), with `DIRECT_URL` set to
that URL:

```bash
# 1. Production already has everything in the baseline (it came from `db push`).
#    Record it as applied. This does not run any SQL against your tables.
npx prisma migrate resolve --applied 20261005110000_baseline_db_push_drift

# 2. Create the three new tables (UserPreference, WeeklyReportDelivery, LiveClassReminder)
npx prisma migrate deploy
```

The second migration only adds new tables; no existing table changes. Until it
runs, only weekly reports and class reminders fail, and they stay off by default.

With the baseline in place, `npx prisma migrate deploy` builds a complete
database from empty, which is what staging, CI and disaster recovery need.

## 2. Staging environment

The local `.env` points at production. Before load tests, end-to-end tests or
risky changes, set up a separate staging database:

1. Create a second Supabase project (Singapore region, like production).
2. Point a Vercel **Preview** environment at it (`DATABASE_URL`, `DIRECT_URL`,
   `JWT_SECRET` different from production, test payment keys).
3. Build the schema: `DATABASE_URL=<staging> npx prisma migrate deploy`.
4. Add demo data: `DATABASE_URL=<staging> CONFIRM_DATABASE=<printed id> node prisma/seed.mjs`.

Seed scripts, load-test seeding and the integration tests refuse any remote
database unless `CONFIRM_DATABASE` names it (`scripts/lib/db-guard.mjs`), and
the integration tests refuse a test database that is the production one.

## 3. Razorpay webhook

Razorpay Dashboard → Webhooks → Add:

- URL: `https://<domain>/api/payments/razorpay/webhook`
- Events: `payment.captured`, `order.paid`
- Secret: generate one and set it as `RAZORPAY_WEBHOOK_SECRET` in Vercel

Payments are then confirmed by Razorpay's servers even when the student closes
the tab right after paying, instead of waiting for the nightly reconciliation.

## 4. Background job queue (Upstash QStash)

Set `APP_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` and
`QSTASH_NEXT_SIGNING_KEY` (Upstash console → QStash). Course notifications,
weekly reports and class reminders then run as retried jobs, one batch per
step, through `POST /api/jobs/<name>`. Without QStash they run after the
response as before, with no retries.

## 5. WhatsApp class reminders

1. In Interakt, create a **Utility** template and get it approved, with three
   body variables: `{{1}}` first name, `{{2}}` class title, `{{3}}` start time.
   For example: "Hi {{1}}, your live class *{{2}}* starts at {{3}}. Join from your dashboard."
2. Set `INTERAKT_CLASS_REMINDER_TEMPLATE_NAME` to the template name.
3. Call `GET /api/cron/class-reminders` every 5 minutes with
   `Authorization: Bearer <CRON_SECRET>`. Use a QStash schedule (cron `*/5 * * * *`,
   header `Upstash-Forward-Authorization: Bearer <CRON_SECRET>`) or a Vercel Pro
   cron. It's not in `vercel.json` because Vercel Hobby rejects crons that run
   more than once a day.

Students with a phone number and an active enrollment get one message per
class, 5–15 minutes before it starts.

## 6. Weekly progress emails

Sent Sunday 7 pm IST (`vercel.json` cron) to students with an active
enrollment, with an unsubscribe link.

1. Move `EMAIL_HOST` to a bulk email provider (Amazon SES, Postmark, Resend…).
   Gmail SMTP stops at roughly 2,000 messages a day.
2. Set `WEEKLY_REPORTS_ENABLED=true`.

## 7. Error tracking (Sentry)

Create a Next.js project at sentry.io and set `SENTRY_DSN` and
`NEXT_PUBLIC_SENTRY_DSN` (same value). Optional: `SENTRY_TRACES_SAMPLE_RATE` /
`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (e.g. `0.05`) for performance traces.
Cookies, headers, query strings and request bodies are never sent.

## 8. Tests

| Command | What it covers | Needs |
| --- | --- | --- |
| `npm test` | Unit tests | nothing |
| `npm run test:integration` | Payments, reminders, reports, analytics SQL on real Postgres | `TEST_DATABASE_URL` of a disposable DB built with `prisma migrate deploy` |
| `npm run test:e2e` | Browser tests, desktop and mobile | Public tests: `E2E_BASE_URL`. Signed-in and exam tests: staging URL, `E2E_NOT_PRODUCTION=yes`, `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD`, `E2E_COURSE_SLUG`, `E2E_TEST_ID` |

## 9. Exam-day load test

Against **staging only**:

```bash
DATABASE_URL=<staging> CONFIRM_DATABASE=<id> LOADTEST_COURSE_ID=<course> \
LOADTEST_STUDENTS=1000 LOADTEST_PASSWORD=<12+ chars> node scripts/seed-loadtest-students.mjs

k6 run loadtests/exam-day.k6.js -e BASE_URL=<staging url> -e COURSE_ID=<course> \
  -e TEST_ID=<published test> -e STUDENTS=1000 -e NOT_PRODUCTION=yes
```

The run fails if more than 1% of requests error or the 95th-percentile submit
takes over 3 seconds. Raise `STUDENTS` until it fails to find the ceiling.

## 10. Brand colours

`node scripts/codemods/brand-colors-to-tokens.mjs` lists hard-coded brand hex
colours in class names; `--write` replaces them with the `globals.css` tokens
(same colours, nothing changes visually).
