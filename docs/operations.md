# Operations guide

How to switch on and run the reliability and engagement features. Everything
below is off or inert until configured, so deploying the code changes nothing
by itself.

## 1. Database migrations (do these first)

Two migrations are waiting. Run them against production through the **session
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
