export function databaseIdentity(connectionString: string): string;
export function isLocalDatabase(connectionString: string): boolean;
export function assertWritableDatabase(connectionString: string | undefined, purpose: string): void;
export function assertDifferentDatabases(testUrl: string | undefined, appUrl: string | undefined, purpose: string): void;
