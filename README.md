# WhiskerLog 🐾

A production-ready pet behavior and health pattern tracking web app for cat owners. Log daily food, water, mood, energy, and litter activity — and let WhiskerLog's anomaly detection flag early signs of trouble.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (pet photos) |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| Deployment | Vercel |

---

## Folder Structure

```
CloudProjectApp/
├── app/
│   ├── (auth)/                  # Login / Signup pages
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                   # Protected app pages
│   │   ├── layout.tsx           # Sidebar + auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── pets/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── logs/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   └── alerts/page.tsx
│   ├── api/
│   │   ├── pets/route.ts        # GET list, POST create
│   │   ├── pets/[id]/route.ts   # GET, PATCH, DELETE (soft)
│   │   ├── logs/route.ts        # GET paginated, POST create
│   │   ├── logs/[id]/route.ts   # GET, PATCH, DELETE
│   │   ├── alerts/route.ts      # GET with filters
│   │   ├── alerts/[id]/route.ts # PATCH (resolve), DELETE
│   │   └── anomaly-detection/route.ts  # POST trigger
│   ├── auth/callback/route.ts   # Supabase OAuth callback
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Root redirect
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── shared/                  # Sidebar, PageHeader, etc.
│   ├── auth/                    # LoginForm, SignupForm
│   ├── pets/                    # PetCard, PetForm
│   ├── logs/                    # LogForm, LogCard
│   ├── dashboard/               # MetricsChart, TrendCard, etc.
│   └── alerts/                  # AlertCard
├── hooks/
│   ├── usePets.ts
│   ├── useLogs.ts
│   └── useAlerts.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   ├── anomaly-detection.ts     # 6 health rules
│   ├── utils.ts                 # Shared helpers
│   └── validations/
│       ├── pet.ts
│       └── log.ts
├── supabase/
│   ├── schema.sql               # Run this in Supabase SQL Editor
│   └── seed.sql
├── types/
│   ├── database.ts              # Generated Supabase types
│   └── index.ts                 # Convenience aliases
├── middleware.ts                # Auth route protection
└── ...config files
```

---

## Getting Started

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** from **Settings → API**.

### 2. Run the Database Schema

1. In the Supabase dashboard, open the **SQL Editor**.
2. Paste the contents of `supabase/schema.sql` and click **Run**.
3. *(Optional)* Run `supabase/seed.sql` for sample data.

### 3. Create the Storage Bucket

In the Supabase dashboard:
1. Go to **Storage → New Bucket**.
2. Name it `pet-photos`.
3. Set it to **Public**.
4. Add an RLS policy to allow authenticated users to upload:

```sql
-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload pet photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pet-photos');

-- Allow public reads
CREATE POLICY "Public read access for pet photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pet-photos');
```

### 4. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository in [vercel.com](https://vercel.com).
3. Add the same environment variables under **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL, e.g. `https://whiskerlog.vercel.app`)
4. Deploy.

### Configure Supabase Auth Redirect URLs

In **Supabase → Authentication → URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Anomaly Detection Rules

WhiskerLog checks the last 7 days of logs after every save and creates alerts when:

| Rule | Condition | Severity |
|---|---|---|
| High water intake | >20% above 7-day average | medium |
| High water intake | >50% above 7-day average | high |
| Low water intake | >20% below 7-day average | medium |
| Low water intake | >50% below 7-day average | high |
| Low food intake | >30% below 7-day average | medium |
| Sustained low energy | energy ≤ 2 for 3+ consecutive days | high |
| Sustained negative mood | anxious/lethargic/irritable for 3+ consecutive days | medium |
| Litter inactivity | 0 urinations recorded | high |
| Excessive litter | >2.5× average urinations | medium |

Duplicate alerts (same type within 7 days) are suppressed automatically.

---

## Key Features

- **🐱 Pet Profiles** — Name, breed, birth date, weight, photo. Soft-archive pets without losing history.
- **📋 Daily Logs** — Food (g), water (ml), mood (5 states), energy (1–5), litter count, notes.
- **📊 Dashboard** — 7-day and 30-day trend cards, dual-axis line chart, recent alerts panel.
- **🔔 Alerts** — Auto-generated, severity-tagged, resolvable. Filter by active/resolved.
- **🌙 Dark Mode** — Medical-aesthetic zinc/teal dark theme throughout.
- **🔒 Auth** — Email/password via Supabase Auth. Row-level security on all data.
