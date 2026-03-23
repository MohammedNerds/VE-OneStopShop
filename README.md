# VE-OneStopShop — Nerdio Value Engineering Tools Portal

Secure portal for Nerdio VE tools with magic link auth, per-user tool access control, and reverse proxy that hides all tool deployment URLs from users.

## Architecture

```
Browser                          ve-tools (this repo)              Tool Deploys
┌─────────────┐    ┌──────────────────────────────────┐    ┌──────────────────┐
│ User sees:  │    │ /api/proxy/tco-calculator         │    │ viccal.vercel.app│
│ /api/proxy/ │───→│  1. Validate Supabase session     │───→│ (rejects direct  │
│ tco-calc... │    │  2. Check tool_access array       │    │  browser access)  │
│             │←───│  3. Fetch from real URL            │←───│                  │
│ (no real    │    │  4. Rewrite links, return response │    │                  │
│  URLs ever) │    └──────────────────────────────────┘    └──────────────────┘
└─────────────┘    Tool URLs in SERVER-ONLY env vars
                   (no NEXT_PUBLIC_ prefix)
```

## Step-by-Step Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Vercel account
- VSCode with the workspace open

### Step 1: Clone and Install

```bash
git clone https://github.com/MohammedNerds/VE-OneStopShop.git
cd VE-OneStopShop
npm install
```

### Step 2: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name: `ve-tools`
4. Region: Pick closest to your users (e.g., `us-east-1`)
5. Set a database password (save it securely)
6. Wait for project to provision (~2 minutes)

### Step 3: Run Database Schema

1. In Supabase Dashboard → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this repo
3. Copy the entire contents and paste into the SQL editor
4. Click **Run**
5. You should see "Success. No rows returned" for each statement

### Step 4: Configure Supabase Auth

1. In Supabase Dashboard → **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (change to production URL later)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
2. In **Authentication** → **Email Templates** → **Magic Link**:
   - Customize with Nerdio branding if desired
   - The default template works fine for development

### Step 5: Set Up Environment Variables

1. Copy the example env file:
```bash
cp .env.local.example .env.local
```

2. Fill in the values from Supabase Dashboard → **Settings** → **API**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co      # From "Project URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                    # From "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJ...                        # From "service_role" (secret!)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Set tool URLs (server-only — no NEXT_PUBLIC_!):
```env
TOOL_URL_TCO_CALCULATOR=http://localhost:3001    # If running viccal locally
TOOL_URL_REVERSE_TIMELINE=http://localhost:3002   # If running timeline locally
```

4. Generate a proxy secret:
```bash
openssl rand -hex 32
```
Paste the output as `PROXY_SECRET=<output>`

### Step 6: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the login page.

### Step 7: Create Your Admin Account

1. Enter your email (`mohammed.irfan@nerdio.net`) on the login page
2. Click "Send Magic Link"
3. Check your email and click the link
4. You'll be redirected to the dashboard

5. Now promote yourself to super_admin. In Supabase → **SQL Editor**:
```sql
UPDATE public.profiles
SET role = 'super_admin',
    tool_access = ARRAY[
      'tco-calculator',
      'reverse-timeline',
      'business-case-builder',
      'competitive-intel',
      'deal-accelerator',
      'roi-analyzer'
    ]
WHERE email = 'mohammed.irfan@nerdio.net';
```

6. Refresh the dashboard — you should now see the admin panel in the sidebar.

### Step 8: Set Up Tool-Side Middleware (viccal)

1. Copy `tool-side-middleware-template.ts` into the viccal repo:
```bash
cp tool-side-middleware-template.ts ../tco-calc-dev/middleware.ts
```

2. Add the same `PROXY_SECRET` to viccal's `.env.local`

3. Test direct access: visit `http://localhost:3001` directly — you should get a 403 JSON response.

4. Test proxy access: go to the ve-tools dashboard and click TCO Calculator — it should load through the proxy.

### Step 9: Deploy to Vercel

#### Deploy ve-tools (this repo):

```bash
cd VE-OneStopShop
vercel
```

Set environment variables in Vercel Dashboard → Project → Settings → Environment Variables:
- All the vars from `.env.local`
- Change `NEXT_PUBLIC_SITE_URL` to `https://ve-tools.vercel.app`
- Change `TOOL_URL_TCO_CALCULATOR` to the real viccal deployment URL

#### Deploy viccal:

```bash
cd ../tco-calc-dev
vercel
```

Add `PROXY_SECRET` to viccal's Vercel env vars.

#### Update Supabase redirect URLs:

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://ve-tools.vercel.app`
- **Redirect URLs**: Add `https://ve-tools.vercel.app/auth/callback`

### Step 10: Invite Team Members

1. Log in to ve-tools as super_admin
2. Go to Users & Access → Click "Invite User"
3. Enter email, select role, toggle which tools they can access
4. Click "Send Invite" — they'll receive a magic link email

---

## File Structure

```
VE-OneStopShop/
├── app/
│   ├── globals.css                     # Tailwind + Nerdio custom styles
│   ├── layout.tsx                      # Root layout with Poppins font
│   ├── page.tsx                        # Redirects to /dashboard
│   ├── login/
│   │   ├── page.tsx                    # Server: checks session
│   │   ├── login-form.tsx              # Client: magic link form UI
│   │   └── actions.ts                  # Server actions: sendMagicLink, signOut
│   ├── dashboard/
│   │   ├── page.tsx                    # Server: fetches user profile
│   │   └── dashboard-client.tsx        # Client: tool grid, launch handler
│   ├── admin/
│   │   ├── page.tsx                    # Server: verifies admin, fetches users
│   │   └── admin-client.tsx            # Client: user mgmt, access matrix
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts               # Magic link callback handler
│   └── api/
│       ├── proxy/
│       │   └── [...path]/
│       │       └── route.ts           # ★ THE SECURE PROXY ★
│       └── admin/
│           ├── users/
│           │   └── route.ts           # GET/PATCH/DELETE users
│           └── invite/
│               └── route.ts           # POST invite via magic link
│       └── health/
│           └── route.ts               # Admin health check endpoint
├── components/
│   ├── icons.tsx                       # All SVG icons
│   ├── sidebar.tsx                     # Navigation + user card
│   ├── tool-card.tsx                   # Tool display card
│   └── tool-embed.tsx                  # iframe via proxy
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser Supabase client
│   │   └── server.ts                  # Server Supabase client
│   ├── tools.ts                       # Tool catalog (NO URLs)
│   └── access.ts                      # Roles, permissions, helpers
├── supabase/
│   └── schema.sql                     # Database setup SQL
├── docs/
│   ├── AUTH-MIGRATION-PLAYBOOK.md     # Azure AD, Supabase Pro, Firebase paths
│   └── ADDING-NEW-TOOLS.md           # Complete guide + troubleshooting
├── scripts/
│   └── add-tool.mjs                  # Interactive wizard: npm run add-tool
├── middleware.ts                       # Auth gate for all routes
├── tool-side-middleware-template.ts    # Copy into each tool repo
├── tool-side-vercel-config-template.json  # Copy into each tool repo
├── .env.local.example                 # Template for env vars
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## Key Concepts

### Per-User Tool Access

Unlike role-based-only access, each user has an individual `tool_access` array in their profile. Admins grant specific tools to specific users through the admin panel. Admins and Super Admins automatically see all tools.

### Proxy Security Layers

1. **URL Obfuscation**: Browser only sees `/api/proxy/[toolId]`
2. **Session Validation**: Supabase JWT checked on every request
3. **Per-User Access Check**: `tool_access` array verified before proxying
4. **Tool-Side Secret**: Tools reject requests without `x-proxy-secret` header
5. **Audit Trail**: Every access attempt logged with user, tool, IP, timestamp

### Adding a New Tool

**Quick way** — run the wizard:
```bash
npm run add-tool
```
It walks you through every step and outputs the code to copy-paste.

**Manual way** — just 3 things:

1. Add entry to `TOOL_CATALOG` in `lib/tools.ts` (the tool ID drives everything)
2. Set env var `TOOL_URL_<ID>` in `.env.local` and Vercel (convention: `my-tool` → `TOOL_URL_MY_TOOL`)
3. Drop `tool-side-middleware-template.ts` + `tool-side-vercel-config-template.json` into the tool's repo

Then grant access to users in the admin panel. See `docs/ADDING-NEW-TOOLS.md` for the full guide with troubleshooting.
