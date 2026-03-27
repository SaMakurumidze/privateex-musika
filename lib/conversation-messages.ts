import type { NeonQueryFunction } from "@neondatabase/serverless"

/** Two-way thread between an investor and admins (separate from announcement `investor_messages`). */
export async function ensureConversationMessagesTable(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id SERIAL PRIMARY KEY,
      investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
      sender_type VARCHAR(16) NOT NULL,
      admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      read_by_investor_at TIMESTAMP,
      read_by_admin_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT conversation_sender_type_chk CHECK (sender_type IN ('investor', 'admin'))
    )
  `
}
