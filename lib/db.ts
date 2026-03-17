import { neon, NeonQueryFunction } from "@neondatabase/serverless"

// Create SQL client - neon() returns a tagged template function
export const sql = neon(process.env.DATABASE_URL!)

/**
 * Creates a fresh SQL client for each request
 * This ensures environment variables are properly loaded at runtime on Vercel
 */
export function createSQLClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return neon(databaseUrl)
}

/**
 * Execute multiple queries as an atomic transaction using Neon's transaction() helper.
 * The callback receives the same SQL tagged template function that runs within the transaction.
 */
export async function withTransaction<T>(
  callback: (sql: NeonQueryFunction<false, false>) => Promise<T>
): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  const sql = neon(databaseUrl, { fullResults: false })
  // @ts-expect-error - neon transaction helper exists but types may not expose it
  return sql.transaction(callback)
}
