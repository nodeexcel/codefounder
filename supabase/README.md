# Supabase setup — profiles

Run the migrations in your Supabase project (in order):

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste and run `migrations/001_create_profiles.sql`
3. Paste and run `migrations/002_agent_wizard_sessions.sql`

## Auth settings (required for instant signup redirect)

**Authentication → Providers → Email** → disable **Confirm email** (or users must confirm before accessing `/dashboard`).

## Table: `profiles`

| Column       | Type        |
|-------------|-------------|
| id          | uuid (PK, references `auth.users`) |
| username    | text (unique) |
| full_name   | text        |
| email       | text        |
| created_at  | timestamptz |

Row Level Security: users can only read/insert/update their own row.
