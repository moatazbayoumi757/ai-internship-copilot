# AI Internship Application Copilot

Vite + React internship tracker with Supabase auth and per-user PostgreSQL data.

## Stack

- Frontend: Vite, React, TypeScript
- Auth and data: Supabase
- Database: Supabase PostgreSQL
- Deployment: Vercel

## What is stored in Supabase

- Internship applications
- Resume metadata
- User ownership through `user_id`

Every signed-in user sees only their own data. New accounts start with an empty dashboard.

## Supabase setup

1. Create a new Supabase project.
2. In the Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
   If the tables already exist, also run the access grants from the bottom of the file:

   ```sql
   grant usage on schema public to anon, authenticated;
   grant select, insert, update, delete on table public.applications to authenticated;
   grant select, insert, update, delete on table public.resumes to authenticated;
   ```
3. In Supabase Auth settings, enable email/password sign up and sign in.
4. Copy the frontend env example:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

5. Fill in `frontend/.env` with your project values:

   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## Run locally

1. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open the Vite URL shown in the terminal.

## Vercel deployment

1. Push the repo to GitHub.
2. Import the repository in Vercel.
3. Set the project root to `frontend`.
4. Add these environment variables in Vercel:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. Keep the included [`vercel.json`](./vercel.json) so `/auth` and `/app` routes resolve correctly on refresh.

## Data model

The schema creates:

- `applications`
- `resumes`

Both tables include `user_id`, timestamps, and row-level security policies that only allow the authenticated owner to read or write their rows.

## Features

- Sign up, log in, and log out with Supabase auth
- Protected dashboard access
- Create, edit, and delete internship applications
- Upload resume metadata and delete saved resumes
- Empty-state screens for new accounts
- Dark mode and responsive UI
- Frontend-local AI tools remain available
