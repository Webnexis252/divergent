/**
 * Stops scripts that write test or demo data from running against the wrong
 * database. The local .env points at production, so "it ran against whatever
 * DATABASE_URL was" is how demo accounts with known passwords end up live.
 *
 * Local databases (localhost / 127.0.0.1) are always allowed. Anything else
 * needs CONFIRM_DATABASE set to that database's identity, which the error
 * message prints: the Supabase project ref, or host:port/database.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** A stable name for the database a connection string points at. */
export function databaseIdentity(connectionString) {
  const url = new URL(connectionString);
  if (url.hostname.endsWith('.supabase.com') || url.hostname.endsWith('.supabase.co')) {
    // Pooler usernames are "postgres.<project-ref>"; direct hosts are db.<project-ref>.supabase.co
    const fromUser = decodeURIComponent(url.username).split('.').slice(1).join('.');
    const fromHost = url.hostname.startsWith('db.') ? url.hostname.split('.')[1] : '';
    return `supabase:${fromUser || fromHost || url.hostname}`;
  }
  return `${url.hostname}:${url.port || '5432'}${url.pathname}`;
}

export function isLocalDatabase(connectionString) {
  return LOCAL_HOSTS.has(new URL(connectionString).hostname);
}

/**
 * Throws unless `connectionString` is local, or CONFIRM_DATABASE names it.
 * @param {string | undefined} connectionString
 * @param {string} purpose what the script is about to do, for the error message
 */
export function assertWritableDatabase(connectionString, purpose) {
  if (!connectionString) throw new Error(`[db-guard] No database URL set; refusing to ${purpose}.`);
  if (isLocalDatabase(connectionString)) return;
  const identity = databaseIdentity(connectionString);
  if (process.env.CONFIRM_DATABASE === identity) return;
  throw new Error(
    `[db-guard] Refusing to ${purpose} on ${identity}.\n` +
      `If this really is a staging or throwaway database (never production), re-run with CONFIRM_DATABASE=${identity}`,
  );
}

/** Throws if two connection strings point at the same database. */
export function assertDifferentDatabases(testUrl, appUrl, purpose) {
  if (testUrl && appUrl && databaseIdentity(testUrl) === databaseIdentity(appUrl)) {
    throw new Error(
      `[db-guard] Refusing to ${purpose}: the test database is the same as DATABASE_URL (${databaseIdentity(appUrl)}).`,
    );
  }
}
