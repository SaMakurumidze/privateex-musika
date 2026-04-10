# PrivateEx Platform: Current Architecture and Database Schema

Last updated from codebase state on 2026-04-02.

## 1) Current Platform Architecture

### Application topology

- **Frontend + Backend in one Next.js app**
  - App Router pages and API routes live together under `app/`.
  - Server-side rendering and server actions are used for authenticated dashboards.
- **Database**
  - **Neon Postgres** via `@neondatabase/serverless`.
  - Accessed through `createSQLClient()` in `lib/db.ts`.
- **Auth models**
  - **Investor auth**: cookie session (`session`) resolved in `lib/auth.ts`.
  - **Admin auth**: cookie session (`admin_session`, `admin_role`) resolved in `lib/admin-auth.ts`.
- **Audit/event tracking**
  - Client activity tracker in `components/activity-tracker.tsx`.
  - Tracking endpoint at `app/api/audit/track/route.ts`.
  - Storage table `activity_audit_logs`.

### Main runtime components

- **Investor web surface**
  - Dashboard and investor workflows under `app/dashboard/*`.
  - Purchase flow UI in `components/investment-modal.tsx`.
- **Admin web surface**
  - Admin dashboard and operations under `app/admin/dashboard/*`.
  - Sidebar/navigation in `components/admin/admin-sidebar.tsx`.
- **API surface**
  - Investor APIs under `app/api/*`.
  - Admin APIs under `app/api/admin/*`.

### Core functional flows

- **Registration + login**
  - Registration: `app/api/auth/register/route.ts`.
  - Login/reset/verify flows under `app/api/auth/*`.
- **Purchase flow**
  - Validation + wallet charge + portfolio + certificate + accounting audit in `app/api/purchase/route.ts`.
- **Messaging**
  - Announcement-style messages: `investor_messages`.
  - Two-way thread messages: `conversation_messages`.
- **Audit logs**
  - Page views, time spent, feature interactions tracked via `/api/audit/track`.
  - Queried in admin page: `app/admin/dashboard/audit-logs/page.tsx`.

---

## 2) Database Schema and Tables

This section is derived from the SQL currently executed by the codebase.

- **Explicit schema** = table/columns directly defined with `CREATE TABLE` in code.
- **Inferred schema** = columns referenced by `SELECT/INSERT/UPDATE/JOIN` in code (for tables not fully created in this repo).

## 2.1 Explicitly created tables (exact DDL in code)

### `conversation_messages` (explicit)

Defined in `lib/conversation-messages.ts`.

- `id SERIAL PRIMARY KEY`
- `investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE`
- `sender_type VARCHAR(16) NOT NULL` with check `IN ('investor', 'admin')`
- `admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`
- `subject VARCHAR(255)`
- `body TEXT NOT NULL`
- `read_by_investor_at TIMESTAMP`
- `read_by_admin_at TIMESTAMP`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`

### `investor_messages` (explicit)

Defined in:
- `app/api/auth/register/route.ts`
- `app/api/messages/unread-count/route.ts`
- `app/api/admin/messages/send/route.ts`

- `id SERIAL PRIMARY KEY`
- `investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE`
- `subject VARCHAR(255) NOT NULL`
- `body TEXT NOT NULL`
- `is_read BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`

### `purchase_charge_audit` (explicit)

Defined in:
- `app/api/purchase/route.ts`
- `app/api/admin/accounting/export/route.ts`

- `id SERIAL PRIMARY KEY`
- `transaction_id VARCHAR(120) NOT NULL UNIQUE`
- `investor_id INTEGER NOT NULL REFERENCES investors(id) ON DELETE CASCADE`
- `investor_name VARCHAR(255) NOT NULL`
- `investor_email VARCHAR(255)`
- `company_id VARCHAR(40) NOT NULL`
- `company_name VARCHAR(255) NOT NULL`
- `shares_purchased NUMERIC(18, 6) NOT NULL`
- `price_per_share NUMERIC(18, 6) NOT NULL`
- `subtotal NUMERIC(18, 2) NOT NULL`
- `service_fee NUMERIC(18, 2) NOT NULL`
- `tax NUMERIC(18, 2) NOT NULL`
- `total_amount NUMERIC(18, 2) NOT NULL`
- `payment_method VARCHAR(40) NOT NULL DEFAULT 'Wallet'`
- `charged_at TIMESTAMP NOT NULL DEFAULT NOW()`

### `activity_audit_logs` (explicit)

Defined in `lib/audit-log.ts`.

- `id BIGSERIAL PRIMARY KEY`
- `actor_type VARCHAR(20) NOT NULL`
- `actor_id INTEGER NOT NULL`
- `actor_name VARCHAR(255) NOT NULL`
- `actor_email VARCHAR(255) NOT NULL`
- `actor_role VARCHAR(120)`
- `event_type VARCHAR(40) NOT NULL`
- `page_path VARCHAR(512) NOT NULL`
- `feature_name VARCHAR(255)`
- `duration_seconds INTEGER`
- `interaction_meta JSONB`
- `ip_address VARCHAR(120) NOT NULL`
- `user_agent TEXT NOT NULL`
- `browser_name VARCHAR(80) NOT NULL`
- `browser_version VARCHAR(80) NOT NULL`
- `os_name VARCHAR(120) NOT NULL`
- `device_type VARCHAR(40) NOT NULL`
- `created_at TIMESTAMP NOT NULL DEFAULT NOW()`

Indexes:
- `idx_activity_audit_logs_created_at (created_at DESC)`
- `idx_activity_audit_logs_actor (actor_type, actor_id, created_at DESC)`
- `idx_activity_audit_logs_event_type (event_type, created_at DESC)`

---

## 2.2 Inferred core tables (from active SQL usage)

These tables are used heavily but not fully created in this repo. Column lists below are precise to what code references today.

### `investors` (inferred)

Referenced in auth, profile, purchase, admin analytics, messaging.

Observed columns:
- `id`
- `full_name`
- `email`
- `password`
- `role`
- `address`
- `id_passport`
- `country`
- `phone`
- `profile_picture_url`
- `is_locked`
- `created_at`
- `force_password_change`
- `email_verified`
- `email_verification_token`
- `token_expires`
- `reset_token`
- `reset_token_expires`

Notes:
- Code applies migration-style guards for:
  - `email_verified`
  - `email_verification_token`
  - `token_expires`
  - `reset_token`
  - `reset_token_expires`
- ID/passport uniqueness is enforced at runtime (and expected via DB unique constraint handling).

### `users` (admin users) (inferred)

Observed columns:
- `id`
- `name`
- `email`
- `password`
- `role`
- `created_at`

Used by admin auth/session and admin seed route.

### `wallets` (inferred)

Observed columns:
- `id`
- `investor_id`
- `balance`
- `created_at`
- `updated_at`

### `companies` (inferred)

Observed columns:
- `id`
- `company_id`
- `company_name`
- `price_per_share`
- `available_shares`
- `total_shares`
- `logo_url`
- `sector`
- `description`
- `funding_round`
- `security_type`
- `return_rate`
- `company_info_url`
- `status`
- `listing_status`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`
- `registration_number`
- `country_of_incorporation`
- `share_class`

### `directors` (inferred)

Observed columns:
- `id`
- `full_name`
- `email`
- `phone`
- `position`
- `company_id`
- `created_at`

### `portfolio` (inferred)

Observed columns:
- `id`
- `user_id`
- `transaction_id`
- `company_name`
- `company_id`
- `shares_purchased`
- `price_per_share`
- `payment_method`
- `status`
- `purchase_date`

### `certificates` (inferred)

Observed columns:
- `certificate_number`
- `transaction_id`
- `investor_id`
- `shareholder_name`
- `shareholder_id_passport`
- `company_id`
- `company_name`
- `company_registration_number`
- `country_of_incorporation`
- `share_class`
- `shares_issued`
- `price_per_share`
- `total_amount`
- `status`
- `pdf_url`
- `issued_at`
- `investor_email` (joined alias from investors in one query; not a physical certificate column)

---

## 2.3 Relationships (as implemented)

- `wallets.investor_id -> investors.id`
- `investor_messages.investor_id -> investors.id`
- `conversation_messages.investor_id -> investors.id`
- `conversation_messages.admin_user_id -> users.id`
- `portfolio.user_id -> investors.id` (join usage)
- `portfolio.company_id -> companies.company_id` (join usage)
- `certificates.investor_id -> investors.id`
- `certificates.transaction_id -> portfolio.transaction_id` (join usage)
- `purchase_charge_audit.investor_id -> investors.id`

---

## 3) Audit Log Coverage (current behavior)

Captured events:
- `page_view` (on route change)
- `page_time` (seconds on page when hidden/unload/unmount)
- `feature_interaction` (click interaction with detected UI control/feature)

Captured context:
- Actor identity (`investor` or `admin`)
- IP address
- User-agent-derived browser/version
- OS + device type
- Page path
- Optional feature name and interaction metadata

Admin visibility:
- Audit logs page under `/admin/dashboard/audit-logs`
- Includes investors and admins except `superadmin@privateex.com`

---

## 4) Important Notes for Future Mobile/API Expansion

- Current auth is cookie-session based for web.
- Data model already supports shared Neon access patterns from multiple clients.
- If adding mobile with JWT, keep table ownership clear:
  - Reuse `investors`
  - Add token/session tables only if needed
  - Preserve existing web auth until migration is complete.

