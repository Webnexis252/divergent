# Deploying on AWS

The app is one Next.js 16 server. On AWS it can run in two ways. Both are set up in this repo:

| | **A. Amplify Hosting** | **B. Container (App Runner or ECS Fargate)** |
| --- | --- | --- |
| Config | [`amplify.yml`](../amplify.yml) | [`Dockerfile`](../Dockerfile) |
| Setup effort | Connect the Git repo, set env vars | Build an image, push to ECR, create a service |
| Next.js 16 features | AWS documents support for Next.js 12–15 only. `proxy.ts` and `after()` (below) are not covered | Everything (`next start` is the reference server) |
| Scaling | Managed, per request | You set min/max instances |
| Crons | [`infra/aws/cron-schedules.yaml`](../infra/aws/cron-schedules.yaml) for both | |

Choose A if the app already works there; it is the least work. Choose B if anything in the
"Amplify checks" list below fails, or if you want predictable warm servers on exam days.

## Region

The database (Supabase) is in **Singapore (ap-southeast-1)**. Run the app in the same region.
A page that runs five database queries one after another adds about 5 × 60 ms when the app is
in Mumbai and the database in Singapore; next to the database it adds a few ms. Put the
Upstash Redis database in Singapore too.

## Environment variables

Set these on the AWS service (Amplify: Hosting → Environment variables; App Runner / ECS:
the service's environment, with secrets taken from Secrets Manager). `.env.example` describes
each one.

**Required**

| Name | Notes |
| --- | --- |
| `APP_ENV` | `production` on the live app (`staging` elsewhere). Turns on the start-up `[CONFIG]` checks |
| `NEXT_PUBLIC_APP_ENV` | Same value; tags browser errors in Sentry |
| `NEXT_PUBLIC_APP_URL`, `APP_URL` | `https://<your domain>`, no trailing slash |
| `DATABASE_URL` | Supabase **transaction pooler** (`:6543`, `?pgbouncer=true`). The app sets the connection limit itself; see "Database connections" for containers |
| `DIRECT_URL` | Session pooler (`:5432`), used only by `prisma migrate` |
| `JWT_SECRET` | 48+ random characters. Keep the current value or everyone is signed out |
| `CRON_SECRET` | Random; the cron stack needs the same value |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits and session revocation. Without them each server instance has its own limits |
| `RAZORPAY_*` and/or `CASHFREE_*` | Live keys; `CASHFREE_ENVIRONMENT=PRODUCTION` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | Amazon SES SMTP works here (`email-smtp.ap-southeast-1.amazonaws.com`, port 587) and lifts Gmail's ~2,000/day limit |

**Optional**: `DATABASE_CONNECTION_LIMIT` (containers, see below), `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `DAILY_API_KEY`, `QSTASH_*`,
`INTERAKT_*`, `WEEKLY_REPORTS_ENABLED`, `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`,
`*_TRACES_SAMPLE_RATE`.

`NEXT_PUBLIC_*` values are compiled into the browser code, so a change to one needs a new build,
not just a restart.

## Before the first deploy

1. **Migrations.** Run them from your machine before deploying code that needs them; the build
   never touches the database:
   ```bash
   DATABASE_URL=<prod> DIRECT_URL=<prod session pooler :5432> npx prisma migrate deploy
   ```
2. **Domain-bound settings.** Once the domain is known, update:
   - Razorpay webhook: `https://<domain>/api/payments/razorpay/webhook`
   - Cashfree webhook / return URLs
   - Google OAuth: authorised redirect URI on the new domain
   - Supabase Auth → URL configuration: site URL and redirect URLs

## A. Amplify Hosting

1. Amplify console (region **ap-southeast-1**) → Create app → connect the Git repository and branch.
   Amplify picks up `amplify.yml`.
2. Add the environment variables above. Amplify passes them to the build only, so the build
   runs `scripts/write-runtime-env.mjs`, which copies the server-side ones into
   `.env.production` for the running app. **When you add a new server-side variable to the
   code, add its name to `RUNTIME_VARS` in that script**, or it will be undefined in production.
3. Deploy. In the build log, check the `[runtime-env] wrote N variables` line.
4. Hosting → Custom domains → add the domain.

**Amplify checks** (do these once on a staging branch, since AWS doesn't document them for Next.js 16):

- **Proxy (`src/proxy.ts`)**: open `/dashboard` signed out. You should be sent to the sign-in page.
- **`after()`**: these tasks run after the response is sent: XP awards (`src/lib/xp.ts`),
  sign-in filter updates (`src/lib/auth-bloom.ts`), smart notifications, teacher OTP and
  password emails, and background jobs when QStash is off. Complete a lesson and check the XP
  appears; ask a teacher OTP email to be sent and check it arrives. If either fails, Amplify is
  stopping the function before `after()` finishes: set the `QSTASH_*` variables so jobs go
  through QStash, or move to option B.
- **Long requests**: with `WEEKLY_REPORTS_ENABLED=true` and QStash off, the weekly-report cron
  sends every email inside one request. Turn QStash on before enabling weekly reports on Amplify.

## B. Container: App Runner or ECS Fargate

The image builds Next.js in standalone mode (`NEXT_OUTPUT=standalone`) and runs `node server.js`
as a non-root user on port 3000, with a health check on `/api/health`.
The build needs no database or secrets, but `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` must be passed as build args or it stops.

```bash
REGION=ap-southeast-1
ACCOUNT=<aws account id>
REPO=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/lms

aws ecr create-repository --repository-name lms --region $REGION   # once
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

docker build --platform linux/amd64 -t $REPO:$(git rev-parse --short HEAD) \
  --build-arg NEXT_PUBLIC_APP_URL=https://<domain> \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=<url> \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key> \
  --build-arg NEXT_PUBLIC_SENTRY_DSN=<dsn or empty> \
  --build-arg DEPLOYMENT_ID=$(git rev-parse --short HEAD) .
docker push $REPO:$(git rev-parse --short HEAD)
```

**App Runner**: create a service from that ECR image, port `3000`, health check HTTP
`/api/health`, and the runtime environment variables above (secrets as Secrets Manager
references). 1 vCPU / 2 GB is a reasonable start; set the minimum instances to 2 or more for exam days.

**ECS Fargate**: a service behind an Application Load Balancer with target-group health check
`/api/health`, `stopTimeout` 30 s (so in-flight requests and `after()` callbacks finish on
deploys), and target-tracking autoscaling on CPU.

Notes for running several instances:

- **Database connections.** `src/lib/prisma.ts` opens at most 3 connections per server, which suits
  serverless functions handling one request at a time. A container handles many requests at once,
  so with 3 its queries queue behind each other. Set `DATABASE_CONNECTION_LIMIT=10` and keep
  *instances × 10* under the Supabase pooler's client limit for your plan.
- **Caches.** Course pages and the admin overview are cached in each instance's memory for up to
  30 seconds. After an admin edits a course, other instances can show the old version until then.
- **`DEPLOYMENT_ID`** (build arg) stops a browser on the old version loading files from the new one
  during a rolling deploy.

## Crons (both options)

`vercel.json` crons don't run on AWS. [`infra/aws/cron-schedules.yaml`](../infra/aws/cron-schedules.yaml)
creates EventBridge Scheduler schedules (India time) that call a small Lambda, which calls
`/api/cron/<job>` with the cron secret:

| Job | When (IST) |
| --- | --- |
| rebuild-auth-bloom | daily 03:00 |
| reconcile-payments | daily 03:30 |
| weekly-reports | Sunday 19:00 (inert until `WEEKLY_REPORTS_ENABLED=true`) |
| class-reminders | every 5 minutes (inert until the Interakt template is set) |
| cleanup-doubts | daily 04:00, **off by default**: it permanently deletes resolved doubts and never ran on Vercel |

```bash
aws cloudformation deploy --region ap-southeast-1 \
  --stack-name lms-crons \
  --template-file infra/aws/cron-schedules.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AppUrl=https://<domain> CronSecret=<CRON_SECRET> AlarmEmail=<you@example.com>
```

Jobs are not retried (a retry could send emails twice); with `AlarmEmail` set, a failed run sends an
email. Each run's status and response are in CloudWatch under the stack's `CronCallerLogGroup`.
Run a job by hand from the Lambda console with the test event `{"path": "/api/cron/reconcile-payments"}`.

The nightly exam question analysis is separate: a Python Lambda that reads the database directly
instead of calling the app. It has its own stack, [`infra/aws/question-analytics.yaml`](../infra/aws/question-analytics.yaml)
(daily 02:00 IST); see [`services/question-analytics/README.md`](../services/question-analytics/README.md).

## After each deploy

```bash
curl https://<domain>/api/health                                            # {"status":"ok"}
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/health/config   # "ready": true
```

`/api/health/config` lists missing or unsafe settings by name. Then click through as a student, a
teacher and an admin, and make one small real payment.
