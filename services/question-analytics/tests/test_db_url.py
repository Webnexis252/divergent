from question_analytics.db import libpq_url


def test_prisma_only_parameters_are_dropped():
    url = "postgresql://u:p@host.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3&pool_timeout=20&sslmode=require"
    assert libpq_url(url) == "postgresql://u:p@host.pooler.supabase.com:6543/postgres?sslmode=require"


def test_plain_urls_are_unchanged():
    assert libpq_url("postgresql://u:p@localhost:5432/lms") == "postgresql://u:p@localhost:5432/lms"
