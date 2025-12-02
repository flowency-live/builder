/**
 * Postgres Database Client
 * Vercel Postgres integration for session management
 */

import { sql } from '@vercel/postgres';

export { sql };

/**
 * Initialize database schema
 * Run this once during deployment to create tables
 */
export async function initializeDatabase() {
  try {
    // Check if sessions table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sessions'
      );
    `;

    if (!result.rows[0].exists) {
      console.log('Database tables not found. Please run the schema.sql file manually.');
      console.log('You can do this in the Vercel Postgres dashboard or using the Vercel CLI.');
    }

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1 as health_check`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
