# Adding a New Tool — Complete Guide

## Quick Summary

Adding a new tool requires exactly **3 things**:

1. **One code edit** → Add entry to `TOOL_CATALOG` in `lib/tools.ts`
2. **One env var** → Set `TOOL_URL_YOUR_TOOL=https://...` in Vercel
3. **One middleware file** → Drop `tool-side-middleware-template.ts` into the tool repo

Then grant access to users in the admin panel. That's it.

---

## The Convention That Makes This Simple

The proxy auto-resolves tool IDs to env vars using a naming convention:

```
Tool ID:     "my-awesome-tool"
             ↓ uppercase, hyphens become underscores, prefix with TOOL_URL_
Env var:     TOOL_URL_MY_AWESOME_TOOL
```

You **never** need to edit the proxy route, the middleware, or any access control code.
The `getToolUrl()` function in `lib/tools.ts` does this conversion automatically.

---

## Step-by-Step Walkthrough

### Scenario: Adding a "Deal Scorecard" tool

#### Step 1: Build and Deploy the Tool

Build your tool as a standalone Next.js (or any framework) app in its own repo.

```bash
# Create the tool repo
mkdir deal-scorecard && cd deal-scorecard
npx create-next-app@14 . --typescript --tailwind

# ... build your tool ...

# Deploy to Vercel
vercel
# Note the deployment URL: https://ve-deal-scorecard.vercel.app
```

#### Step 2: Add Tool-Side Middleware (Blocks Direct Access)

Copy the middleware template into the tool repo root:

```bash
cp /path/to/VE-OneStopShop/tool-side-middleware-template.ts ./middleware.ts
```

Add the proxy secret to the tool's `.env.local`:
```env
PROXY_SECRET=same-secret-as-ve-tools
```

And to the tool's Vercel project env vars.

**Test it:** Visit `https://ve-deal-scorecard.vercel.app` directly in your browser.
You should see:
```json
{
  "error": "Direct access not allowed.",
  "message": "This tool is only accessible through the VE Tools portal.",
  "portal": "https://ve-tools.vercel.app"
}
```

#### Step 3: Add to Tool Catalog

Open `lib/tools.ts` in the VE-OneStopShop repo. Add one entry to `TOOL_CATALOG`:

```typescript
// Add this to the TOOL_CATALOG array in lib/tools.ts
{
  id: "deal-scorecard",           // ← this drives the env var name
  name: "Deal Scorecard",
  description: "Score and prioritize deals based on qualification criteria, competitive positioning, and close probability.",
  icon: "chart",                  // ← use an existing icon key (see list below)
  status: "live",                 // ← "live" | "coming_soon" | "planned"
  version: "1.0.0",
  category: "pipeline",
},
```

**Available icon keys:** `calculator`, `clock`, `briefcase`, `shield`, `rocket`, `chart`

Need a new icon? Add it to `components/icons.tsx` — add the SVG component, then add the key to the `ICON_MAP` at the bottom of that file.

#### Step 4: Set the Environment Variable

**Local development** — in `.env.local`:
```env
TOOL_URL_DEAL_SCORECARD=http://localhost:3003
```

**Production** — in Vercel Dashboard → VE-OneStopShop project → Settings → Environment Variables:
```
TOOL_URL_DEAL_SCORECARD = https://ve-deal-scorecard.vercel.app
```

The naming convention: tool ID `deal-scorecard` → env var `TOOL_URL_DEAL_SCORECARD`

#### Step 5: Deploy VE-OneStopShop

```bash
cd VE-OneStopShop
git add lib/tools.ts
git commit -m "feat: add Deal Scorecard tool"
git push   # Vercel auto-deploys
```

#### Step 6: Verify with Health Check

After deploy, hit the health check endpoint as an admin:

```
GET https://ve-tools.vercel.app/api/health
```

You should see:
```json
{
  "status": "healthy",
  "checks": {
    "tools": {
      "ok": true,
      "total": 7,
      "live": 3,
      "missing_env_vars": []
    }
  }
}
```

If the env var is missing, you'll see:
```json
{
  "status": "issues_found",
  "checks": {
    "tools": {
      "ok": false,
      "missing_env_vars": ["deal-scorecard → TOOL_URL_DEAL_SCORECARD"]
    }
  }
}
```

#### Step 7: Grant Access to Users

1. Log into VE-Tools as admin
2. Go to **Users & Access**
3. Click **"manage →"** next to each user who should have access
4. Toggle the **Deal Scorecard** checkbox ON
5. Changes save immediately

Or grant to all users via SQL:
```sql
UPDATE public.profiles
SET tool_access = array_append(tool_access, 'deal-scorecard')
WHERE role IN ('ve', 'ae', 'se') AND status = 'active';
```

#### Done!

Users who have been granted access will see "Deal Scorecard" on their dashboard. Clicking it loads the tool through `/api/proxy/deal-scorecard` — the real URL stays hidden.

---

## What If My Tool Isn't Next.js?

The proxy works with **any web application** — React (CRA/Vite), Vue, Svelte, plain HTML, even a Python/Flask app. The proxy just fetches the HTML and assets and passes them through.

### React (Vite) Tool

The only difference is how you handle the tool-side middleware.
Since Vite doesn't have Next.js middleware, use Vercel's `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/verify-proxy", "destination": "/api/verify" }
  ]
}
```

And add a Vercel serverless function `api/verify.ts` that checks the proxy secret:

```typescript
// api/verify.ts (Vercel serverless function in Vite project)
export default function handler(req, res) {
  if (req.headers['x-proxy-secret'] !== process.env.PROXY_SECRET) {
    return res.status(403).json({ error: 'Direct access not allowed' });
  }
  res.status(200).json({ ok: true });
}
```

For Vite specifically, you also need to set the `base` in `vite.config.ts` if you're using path-based proxy. But since the VE-Tools proxy injects a `<base>` tag in the HTML, most cases work automatically.

### Plain HTML / Static Site

If your tool is just HTML/CSS/JS files hosted on Vercel:
- The proxy handles them fine (HTML, JS, CSS all pass through)
- No middleware possible on static sites, so direct access protection relies on Vercel's `vercel.json` headers + an edge middleware function

### Python / Flask / Django

Deploy on Vercel as a serverless function or on a different platform. The proxy fetches via HTTP regardless of what framework serves it. The tool-side protection is simply checking the `x-proxy-secret` header in your framework's middleware.

---

## Adding a Custom Icon for a New Tool

If none of the existing 6 icons fit your tool:

1. Open `components/icons.tsx`
2. Add your SVG component:

```typescript
export function DatabaseIcon({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
```

3. Add to the `ICON_MAP` at the bottom of the same file:

```typescript
const ICON_MAP: Record<string, React.FC<IconProps>> = {
  calculator: CalculatorIcon,
  clock: ClockIcon,
  briefcase: BriefcaseIcon,
  shield: ShieldIcon,
  rocket: RocketIcon,
  chart: ChartIcon,
  database: DatabaseIcon,    // ← add here
};
```

4. Now you can use `icon: "database"` in your tool catalog entry.

---

## Checklist: Adding a Tool

Copy this checklist and check off each item:

```
TOOL NAME: ________________________
TOOL ID:   ________________________  (lowercase, hyphens, e.g., "deal-scorecard")
REPO:      ________________________
DEPLOY URL: _______________________

□ Tool repo created and deployed to Vercel
□ tool-side-middleware-template.ts copied to tool repo as middleware.ts
□ PROXY_SECRET added to tool's Vercel env vars
□ Tool entry added to TOOL_CATALOG in lib/tools.ts
□ Icon exists in components/icons.tsx (or new one added to ICON_MAP)
□ TOOL_URL_<ID> added to ve-tools .env.local (local dev)
□ TOOL_URL_<ID> added to ve-tools Vercel env vars (production)
□ VE-OneStopShop deployed (git push or vercel deploy)
□ Health check passes: GET /api/health shows no missing env vars
□ Direct access to tool URL returns 403
□ Tool loads through proxy on dashboard
□ User access granted in admin panel
□ Tool-side URL rewriting verified (check browser console for 404s)
```

---

## Changing a Tool's Status

When a "coming_soon" tool goes live:

1. Edit `lib/tools.ts` — change `status: "coming_soon"` to `status: "live"` and add a `version`
2. Set the `TOOL_URL_*` env var (it wasn't needed before since coming_soon tools don't proxy)
3. Deploy
4. Grant access to users in admin panel

```typescript
// Before
{
  id: "business-case-builder",
  status: "coming_soon",
  version: null,
  ...
}

// After
{
  id: "business-case-builder",
  status: "live",
  version: "1.0.0",
  ...
}
```

---

## Removing a Tool

1. Remove (or set `status: "planned"`) the entry in `lib/tools.ts`
2. Remove the `TOOL_URL_*` env var from Vercel
3. Deploy
4. Optional: clean up user access arrays in Supabase:
```sql
UPDATE public.profiles
SET tool_access = array_remove(tool_access, 'old-tool-id');
```

---

## Troubleshooting New Tools

### "Tool loads but shows a blank white page"

The proxy's URL rewriting didn't catch all the internal paths. Check the browser console — you'll likely see 404s for JS/CSS files.

**Fix options (try in order):**

1. The proxy already injects `<base href="/api/proxy/tool-id/">` which handles most cases. If it's still broken, the tool may use absolute URLs in its build output.

2. In the tool's `next.config.js`, set:
   ```javascript
   module.exports = { basePath: '' }  // ensure it's empty, not something else
   ```

3. If the tool uses dynamic `import()` or `next/dynamic`, these generate chunk URLs that may not go through the proxy. In the tool's `next.config.js`:
   ```javascript
   module.exports = { assetPrefix: '' }
   ```

4. Nuclear option: add the tool's specific paths to the proxy's rewrite regex in `app/api/proxy/[...path]/route.ts`.

### "Tool loads but API calls fail"

The tool is making client-side `fetch()` calls to its own API routes (e.g., `/api/data`). These resolve to `ve-tools.vercel.app/api/data` instead of going through the proxy.

**Fix:** The proxy rewrites `fetch("/` to `fetch("/api/proxy/tool-id/`, but this only works for inline scripts. If the tool's bundled JS has fetch calls, they won't be caught.

**Better fix:** Have the tool detect it's running inside a proxy and prefix its API calls:
```typescript
// In the tool's code
const BASE = typeof window !== 'undefined' && window.location.pathname.startsWith('/api/proxy/')
  ? window.location.pathname.split('/').slice(0, 4).join('/')
  : '';

fetch(`${BASE}/api/data`)
```

### "Access denied even though I granted the tool"

Check three things:
1. The tool ID in `TOOL_CATALOG` matches exactly what's in the user's `tool_access` array
2. The user's profile `status` is `"active"` (not `"invited"` or `"disabled"`)
3. The user refreshed their browser after you granted access (the dashboard fetches the profile on page load)

### "Direct access to the tool URL still works"

The tool-side middleware isn't deployed or `PROXY_SECRET` doesn't match.
- Verify `middleware.ts` exists in the tool's root
- Verify `PROXY_SECRET` in the tool's Vercel env vars matches the one in ve-tools
- Redeploy the tool after adding the middleware

---

## Future: Automating Tool Registration

If the number of tools grows beyond 10, consider moving the `TOOL_CATALOG` from a hardcoded array to a Supabase table:

```sql
CREATE TABLE public.tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'chart',
  status TEXT DEFAULT 'planned',
  version TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Then the dashboard fetches tools from the database instead of the hardcoded array, and adding a tool becomes a database insert (no code deploy needed). The proxy would also query this table to validate tool IDs.

This is overkill for 6-10 tools but makes sense at 15+.
