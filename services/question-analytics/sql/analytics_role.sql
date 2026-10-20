-- A database user for the question-analytics job that can read only the
-- tables it needs and write only its own. Run once in the Supabase SQL editor
-- (or psql) AFTER the 20261010090000_add_question_stats migration, with a
-- strong password in place of the placeholder.
--
-- Through Supabase's pooler the username becomes question_analytics.<project-ref>:
--   postgresql://question_analytics.<project-ref>:<password>@<pooler-host>:6543/postgres

CREATE ROLE question_analytics LOGIN PASSWORD 'change-me';

GRANT USAGE ON SCHEMA public TO question_analytics;

-- Reads: the tests, their questions, attempts, and users' roles (to leave out teachers' previews)
GRANT SELECT ON "CourseTest", "TestQuestion", "TestAttempt" TO question_analytics;
GRANT SELECT (id, role) ON "User" TO question_analytics;

-- Writes: its own table only. SELECT because DELETE ... WHERE reads the rows it deletes.
GRANT SELECT, INSERT, DELETE ON "QuestionStat" TO question_analytics;

-- A runaway query can't hold connections for long
ALTER ROLE question_analytics SET statement_timeout = '60s';
