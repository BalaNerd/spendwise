# SpendWise

A premium financial insights platform for professionals. Data-driven spending analysis, subscription intelligence, and calm, non-judgmental insights.

**Tech stack:** Next.js (App Router), Tailwind CSS, Framer Motion, Recharts, Node.js + Express, Supabase (PostgreSQL, Auth, RLS).

---

## Features

- **Landing page** — SaaS-style hero, value proposition, feature highlights
- **Authentication** — Supabase Auth (sign up, sign in)
- **Dashboard** — Monthly expense overview, category distribution, subscription summary, smart insights
- **Subscription Intelligence** — Active subscriptions, monthly/yearly costs, last activity, low-value identification
- **Insights** — Behavior-based insights: weekday vs weekend spending, recurring costs, trends
- **Profile & Settings** — Currency, monthly budget, insight level, CSV export

---

## Project Structure

```
spendwise/
├── frontend/          # Next.js 14 (App Router)
│   └── src/
│       ├── app/       # Pages & layouts
│       ├── components/
│       └── lib/       # API client, Supabase, utils
├── backend/           # Express REST API
│   └── src/
│       ├── routes/    # API endpoints
│       ├── middleware/
│       └── utils/
├── supabase/
│   └── migrations/    # SQL schema + RLS
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → New query
3. Copy and run `supabase/migrations/001_initial_schema.sql`
4. In **Project Settings** → API, note:
   - Project URL
   - `anon` public key

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm install
npm run dev
```

API runs at `http://localhost:4000`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Run full stack

From project root:

```bash
npm run install:all
npm run dev
```

Starts both backend (4000) and frontend (3000).

> **Note:** If `npm install` fails with `ENOTCACHED`, run `npm cache clean --force` or check your npm cache settings.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/users/me` | Current user profile |
| PATCH | `/api/users/me` | Update profile |
| GET | `/api/expenses` | List expenses (query: `month`, `limit`) |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| GET | `/api/subscriptions` | List subscriptions |
| POST | `/api/subscriptions` | Create subscription |
| GET | `/api/summaries/:month` | Monthly summary (YYYY-MM) |
| GET | `/api/insights` | Smart insights |
| GET | `/api/export/expenses` | Export expenses CSV |

All endpoints except `/api/health` require `Authorization: Bearer <supabase_jwt>`.

---

## Database Schema

- **users** — Profile (currency, budget, insight_level)
- **expense_categories** — User-defined categories
- **expenses** — Individual transactions
- **subscriptions** — Recurring services
- **monthly_summaries** — Aggregated data (computed on demand)
- **insights** — Generated insights

Row Level Security (RLS) is enabled on all tables so users only access their own data.

---

## Deployment

- **Frontend:** Deploy to Vercel. Set env vars in project settings.
- **Backend:** Deploy to Railway, Render, or similar. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `PORT`.
- **CORS:** Ensure backend allows your frontend origin.

---

## License

MIT
