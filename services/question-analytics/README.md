# Question analytics

A nightly Python job that checks the quality of exam questions. For every test students have
submitted, it works out per question:

- **Average marks** (difficulty): the share of the marks students got, 0 to 1.
- **Separation** (discrimination): rank students by their score on the *rest* of the test, then
  subtract the bottom 27%'s average on this question from the top 27%'s. Near +1 is good; below 0
  means weaker students do better than stronger ones.
- **Answer counts**: how many students picked each option (or the most common numerical answers).

From those it flags questions that look wrong, for example *"Top students chose another answer"*,
which is the usual sign of a wrong answer key. Teachers see the results at
**Analytics → Questions** (`/dashboard/teacher/analytics/questions`).

## How it fits in

```
EventBridge Scheduler (02:00 IST)
  → AWS Lambda (this folder, Python 3.12, container image)
      reads  CourseTest, TestQuestion, TestAttempt, User(id, role)
      writes QuestionStat            ← one transaction per test
Next.js: GET /api/teacher/question-stats/[courseId] → reads QuestionStat through Prisma
```

The job never runs while a user waits for it, reads the other tables without changing them, and
writes only `QuestionStat`. If it fails or is switched off, teachers see the previous numbers and
nothing else in the LMS changes. Prisma owns the schema: the table comes from the migration
`prisma/migrations/20261010090000_add_question_stats`, and this code never creates or alters tables.

Rules worth knowing:

- Only each student's **first submitted** attempt counts. Teachers' and admins' previews don't.
- A student only counts for the questions their attempt showed (tests cut to `questionsToShow`).
- Sketch answers use the teacher's grade; ungraded ones are left out and shown as pending.
- Questions answered by fewer than `MIN_STUDENTS` (default 20) students get numbers but no flags.
- Every run recomputes everything, so it's safe to re-run, and two runs at once take turns per test.

## Keeping grading in step with the app

The LMS stores what students answered, not whether it was right, so the job re-grades every answer
with `question_analytics/grading.py`, a port of `src/lib/test-grading.ts`. Both are tested against
the same cases in `tests/fixtures/grading_cases.json` (pytest here, `src/test/lib/grading-parity.test.ts`
in the app). **If grading changes, change both files and add a case**; otherwise one suite fails.

## Run it locally

```bash
cd services/question-analytics
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest
```

Database tests run when `TEST_DATABASE_URL` points at a local, disposable Postgres that has had
`npx prisma migrate deploy` (they refuse any other host).

Against a real database, `--dry-run` only reads and prints the numbers, so it also works before the
migration is applied:

```bash
DATABASE_URL='postgresql://...' .venv/bin/python -m question_analytics --dry-run
DATABASE_URL='postgresql://...' .venv/bin/python -m question_analytics --test-id <testId>
```

The app's Prisma `DATABASE_URL` works as is; Prisma-only parameters like `pgbouncer=true` are dropped.

## Deploy on AWS

1. Apply the migration (`npx prisma migrate deploy`).
2. Create the job's database user: run [`sql/analytics_role.sql`](sql/analytics_role.sql) with a
   strong password. It can read only what the job needs (not even students' emails) and write only
   `QuestionStat`.
3. Build and push the image (arm64), in the app's AWS region:

   ```bash
   aws ecr create-repository --repository-name question-analytics
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker buildx build --platform linux/arm64 --provenance=false \
     -t <account>.dkr.ecr.<region>.amazonaws.com/question-analytics:<date> --push .
   ```

4. Deploy the schedule and Lambda with [`infra/aws/question-analytics.yaml`](../../infra/aws/question-analytics.yaml):

   ```bash
   aws cloudformation deploy --stack-name lms-question-analytics \
     --template-file infra/aws/question-analytics.yaml --capabilities CAPABILITY_IAM \
     --parameter-overrides ImageUri=<image> DatabaseUrl='<question_analytics user URL>' AlarmEmail=<you@example.com>
   ```

5. Run it once by hand (`aws lambda invoke --function-name <FunctionName output> out.json`) and open
   Analytics → Questions as a teacher.

Each run logs one JSON line per test and a summary to CloudWatch. A failed test doesn't stop the
others; the run is then marked failed, which triggers the alarm email if one is set.
