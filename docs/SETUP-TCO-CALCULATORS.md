# Wiring Up Your Two TCO Calculator Apps

## What You Have

| | Test / Staging | Production |
|--|---------------|------------|
| **Repo** | MohammedNerds/tco-calc-test | MohammedNerds/tco-calc-prod |
| **Tool ID** | `tco-calc-test` | `tco-calc-prod` |
| **Env var** | `TOOL_URL_TCO_CALC_TEST` | `TOOL_URL_TCO_CALC_PROD` |
| **Vercel URL** | `https://tco-calc-test-ten.vercel.app` | `https://tco-calc-prod-eight.vercel.app` |
| **Who sees it** | Admins only (for testing) | VE team, AEs, SEs |
| **Dashboard badge** | 🟡 STAGING | 🟢 PROD |

## Step-by-Step

### 1. Get your Vercel deployment URLs

Open each in Vercel Dashboard → Project → Settings → Domains.
Copy the `.vercel.app` URL (not any custom domain). You'll need both.

### 2. Add tool-side middleware to BOTH repos

This blocks direct browser access — users can only reach these tools through the portal proxy.

```bash
# Clone both repos if you haven't
cd ~/projects
git clone https://github.com/MohammedNerds/tco-calc-test.git
git clone https://github.com/MohammedNerds/tco-calc-prod.git
```

Copy the middleware template into each:

```bash
# From your VE-OneStopShop directory:
cp tool-side-middleware-template.ts ~/projects/tco-calc-test/middleware.ts
cp tool-side-middleware-template.ts ~/projects/tco-calc-prod/middleware.ts

# Also copy the Vercel security headers config:
cp tool-side-vercel-config-template.json ~/projects/tco-calc-test/vercel.json
cp tool-side-vercel-config-template.json ~/projects/tco-calc-prod/vercel.json
```

### 3. Set PROXY_SECRET in both tool repos

Generate one secret (if you haven't already):
```bash
openssl rand -hex 32
```

Add to **tco-calc-test/.env.local**:
```env
PROXY_SECRET=<paste-the-secret-here>
```

Add to **tco-calc-prod/.env.local**:
```env
PROXY_SECRET=<same-secret-here>
```

Also add to both Vercel projects:
- Vercel → tco-calc-test project → Settings → Environment Variables → Add `PROXY_SECRET`
- Vercel → tco-calc-prod project → Settings → Environment Variables → Add `PROXY_SECRET`

### 4. Deploy both tool repos

```bash
cd ~/projects/tco-calc-test
git add middleware.ts vercel.json
git commit -m "feat: add proxy-only middleware for VE Tools portal"
git push    # Vercel auto-deploys

cd ~/projects/tco-calc-prod
git add middleware.ts vercel.json
git commit -m "feat: add proxy-only middleware for VE Tools portal"
git push    # Vercel auto-deploys
```

### 5. Verify direct access is blocked

Open both URLs directly in your browser:
- `https://tco-calc-test-ten.vercel.app` → should return 403 JSON
- `https://tco-calc-prod-eight.vercel.app` → should return 403 JSON

If you still see the calculator, the middleware isn't deployed. Check:
- Does `middleware.ts` exist in the repo root?
- Is `PROXY_SECRET` set in Vercel env vars?
- Did you redeploy after adding both files?

### 6. Set env vars in VE-OneStopShop

**Local development** — `.env.local`:
```env
TOOL_URL_TCO_CALC_PROD=https://tco-calc-prod-eight.vercel.app
TOOL_URL_TCO_CALC_TEST=https://tco-calc-test-ten.vercel.app
PROXY_SECRET=<same-secret-as-above>
```

**Production** — Vercel Dashboard → VE-OneStopShop project → Settings → Environment Variables:
```
TOOL_URL_TCO_CALC_PROD = https://tco-calc-prod-eight.vercel.app
TOOL_URL_TCO_CALC_TEST = https://tco-calc-test-ten.vercel.app
PROXY_SECRET = <same-secret>
```

### 7. Deploy VE-OneStopShop

```bash
cd ~/projects/VE-OneStopShop
git add -A
git commit -m "feat: wire up tco-calc-prod and tco-calc-test"
git push
```

### 8. Verify with health check

After deploy, log in as admin and visit:
```
https://ve-tools.vercel.app/api/health
```

You should see:
```json
{
  "status": "healthy",
  "checks": {
    "tools": {
      "ok": true,
      "live": 2,
      "missing_env_vars": []
    }
  }
}
```

### 9. Grant access in Supabase

After your first login, promote yourself and set tool access:

```sql
-- Make yourself super_admin with access to everything
UPDATE public.profiles
SET role = 'super_admin',
    tool_access = ARRAY['tco-calc-prod','tco-calc-test','reverse-timeline','business-case-builder','competitive-intel','deal-accelerator','roi-analyzer']
WHERE email = 'mohammed.irfan@nerdio.net';

-- Give Richard admin + all tools
UPDATE public.profiles
SET role = 'admin',
    tool_access = ARRAY['tco-calc-prod','tco-calc-test','reverse-timeline','business-case-builder','competitive-intel','deal-accelerator','roi-analyzer']
WHERE email = 'richard.edwards@nerdio.net';

-- Give Mike and Toby VE role + prod calculator
UPDATE public.profiles
SET role = 've',
    tool_access = ARRAY['tco-calc-prod']
WHERE email IN ('mike.schweim@nerdio.net', 'toby.brown@nerdio.net');

-- Give AEs prod calculator only
UPDATE public.profiles
SET role = 'ae',
    tool_access = ARRAY['tco-calc-prod']
WHERE email = 'mike.atlas@nerdio.net';
```

### 10. Test the full flow

1. Log in at `https://ve-tools.vercel.app`
2. As super_admin you should see BOTH calculators:
   - **TCO Calculator** with a green 🟢 PROD badge
   - **TCO Calculator (Staging)** with a yellow 🟡 STAGING badge
3. Click the production one → should load inside the portal via `/api/proxy/tco-calc-prod`
4. Click the staging one → should load via `/api/proxy/tco-calc-test`
5. Log in as Mike Schweim (VE role) → should only see the PROD calculator
6. The staging calculator should NOT appear for non-admin users unless you explicitly grant it

---

## Access Control Summary

| User | Role | Sees tco-calc-prod? | Sees tco-calc-test? |
|------|------|-------------------|-------------------|
| Mohammed Irfan | super_admin | ✅ (auto) | ✅ (auto) |
| Richard Edwards | admin | ✅ (auto) | ✅ (auto) |
| Mike Schweim | ve | ✅ (granted) | ❌ (not granted) |
| Toby Brown | ve | ✅ (granted) | ❌ (not granted) |
| Mike Atlas | ae | ✅ (granted) | ❌ (not granted) |
| Partner viewer | viewer | ❌ | ❌ |

Admins/super_admins see ALL tools automatically. Everyone else only sees tools explicitly in their `tool_access` array.

To give Mike Schweim access to the staging calculator for testing:
```sql
UPDATE public.profiles
SET tool_access = array_append(tool_access, 'tco-calc-test')
WHERE email = 'mike.schweim@nerdio.net';
```
Or do it through the admin panel UI — click "manage →" next to his name and toggle the staging calculator on.
