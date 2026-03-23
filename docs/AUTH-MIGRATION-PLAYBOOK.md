# Auth Migration Playbook
## Supabase → Azure AD SSO & Supabase Pro vs Firebase Contingency

---

## WHEN TO USE THIS DOCUMENT

This playbook covers three scenarios:
1. **Scenario A**: Leadership asks for Azure AD SSO integration (most likely)
2. **Scenario B**: Upgrading to Supabase Pro for production SLAs
3. **Scenario C**: Full migration from Supabase to Firebase (contingency)

---

## SCENARIO A: Adding Azure AD SSO to Supabase

### Why This Will Come Up

Nerdio is an Azure-first company. IT/Security will likely say: "Our employees already have Azure AD accounts. Why are we using magic links instead of SSO?" This is a fair question. The good news: **Supabase supports SAML SSO on their Pro plan**, so we can add Azure AD without rearchitecting.

### What Changes

```
BEFORE (Magic Link Only):
User → enters email → receives magic link → clicks → authenticated

AFTER (Azure AD SSO + Magic Link fallback):
Internal user → clicks "Sign in with Microsoft" → Azure AD → redirect back → authenticated
External user → enters email → magic link flow (unchanged)
```

### Prerequisites

- Supabase Pro plan ($25/month) — SAML SSO is not available on free tier
- Azure AD admin access to register an Enterprise Application
- A verified domain (nerdio.net)

### Step 1: Configure Azure AD Enterprise Application

In Azure Portal → Azure Active Directory → Enterprise Applications → New Application:

```
Name:              VE Tools Portal
Application type:  Non-gallery application
SSO Method:        SAML
```

SAML Configuration:
```
Identifier (Entity ID):     https://<your-project>.supabase.co/auth/v1/sso/saml/metadata
Reply URL (ACS):            https://<your-project>.supabase.co/auth/v1/sso/saml/acs
Sign on URL:                https://ve-tools.vercel.app/login
Logout URL:                 https://<your-project>.supabase.co/auth/v1/logout
```

User Attributes & Claims:
```
email:      user.mail
first_name: user.givenname
last_name:  user.surname
```

Download: Federation Metadata XML (you'll need this for Supabase)

### Step 2: Configure Supabase SAML SSO

Using the Supabase Management API or CLI:

```bash
# Create SSO provider via Supabase Management API
curl -X POST "https://api.supabase.com/v1/projects/<project-ref>/config/auth/sso/providers" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "saml",
    "metadata_url": "https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml",
    "domains": ["nerdio.net"],
    "attribute_mapping": {
      "keys": {
        "email": { "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" },
        "first_name": { "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" },
        "last_name": { "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname" }
      }
    }
  }'
```

### Step 3: Update Login Page

The login form gets a "Sign in with Microsoft" button above the magic link form:

```typescript
// app/login/login-form.tsx — Updated section

const handleSSOLogin = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithSSO({
    domain: "nerdio.net",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (data?.url) {
    window.location.href = data.url; // Redirects to Microsoft login
  }
};

// In the JSX, add before the magic link form:
<button onClick={handleSSOLogin}
  className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-lg text-sm font-semibold mb-4"
  style={{ background: "#ffffff", color: "#333333", border: "1px solid #ddd" }}>
  <MicrosoftLogo /> {/* Microsoft logo SVG */}
  Sign in with Microsoft
</button>

<div className="divider">
  <span>or use email</span>
</div>

{/* Existing magic link form stays as fallback for external users */}
```

### Step 4: Handle SSO Users in Profile Creation

The `handle_new_user()` trigger in Supabase already handles this. SSO users get created in auth.users automatically, which triggers our profile creation. The key difference:

- SSO users arrive with `raw_app_meta_data.provider = "sso:saml"`
- Their email is verified by Azure AD, so no magic link needed
- We can auto-assign roles based on Azure AD groups if desired

### What Stays the Same

- The proxy architecture (unchanged)
- Per-user tool access (unchanged)
- Admin panel (unchanged)
- Database schema (unchanged)
- All other routes and components (unchanged)

### What Changes

| Component | Change |
|-----------|--------|
| Login page | Add "Sign in with Microsoft" button |
| `login-form.tsx` | Add `signInWithSSO` handler |
| Supabase config | Add SAML provider |
| Azure AD | Register Enterprise Application |
| Cost | Supabase free → Pro ($25/month) |

### Effort Estimate: 1-2 days

---

## SCENARIO B: Supabase Pro Upgrade

### When to Upgrade

Upgrade from free tier to Pro ($25/month) when any of these are true:
- More than 50,000 monthly active users (unlikely short-term)
- Need SAML SSO (Scenario A)
- Need custom SMTP for magic link emails (branded @nerdio.net sender)
- Need 99.9% uptime SLA
- Need more than 500MB database storage
- Need more than 4 emails/hour (free tier limit)
- Need daily backups / point-in-time recovery

### What You Get on Pro

| Feature | Free | Pro ($25/mo) |
|---------|------|-------------|
| Monthly active users | 50,000 | 100,000 |
| Database size | 500MB | 8GB |
| Storage | 1GB | 100GB |
| Bandwidth | 2GB | 250GB |
| Auth emails | 4/hour | Custom SMTP (unlimited) |
| SAML SSO | ❌ | ✅ |
| Daily backups | ❌ | ✅ 7 days |
| SLA | None | 99.9% |
| Support | Community | Email |

### Custom SMTP Setup (Critical for Magic Links)

On free tier, Supabase sends magic link emails from their default domain. These often land in spam for corporate inboxes.

On Pro, configure custom SMTP in Supabase Dashboard → Authentication → SMTP Settings:

```
Host:     smtp.sendgrid.net (or smtp.resend.com)
Port:     587
Username: apikey
Password: <your-sendgrid-api-key>
Sender:   ve-tools@nerdio.net (or noreply@nerdio.net)
```

Requires: DNS records (SPF, DKIM, DMARC) for the nerdio.net sender domain.

---

## SCENARIO C: Full Migration to Firebase

### When This Would Happen

- Supabase has a major outage or pricing change that's unacceptable
- Company mandate to use Google Cloud instead of Supabase
- Need features Supabase doesn't offer

### Effort Estimate: 3-5 days

This is a larger migration. Here's every file that changes:

### Architecture Comparison

| Concern | Supabase (Current) | Firebase |
|---------|-------------------|----------|
| Auth | `@supabase/ssr` magic link OTP | Firebase Auth email link |
| Database | Supabase Postgres + RLS | Firestore + Security Rules |
| Admin API | Supabase service role client | Firebase Admin SDK |
| Session | Supabase JWT in cookies | Firebase ID token in cookies |
| Hosting | Vercel (unchanged) | Vercel (unchanged) |
| Proxy | Same architecture | Same architecture |

### Step-by-Step Migration

#### 1. Install Firebase Dependencies

```bash
npm uninstall @supabase/ssr @supabase/supabase-js
npm install firebase firebase-admin
```

#### 2. Firebase Project Setup

```
Firebase Console → Create Project → "ve-tools"
→ Authentication → Sign-in methods → Enable "Email link (passwordless)"
→ Firestore → Create database
→ Project Settings → Service Accounts → Generate private key
```

#### 3. Replace Environment Variables

```env
# Remove:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# Add:
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ve-tools.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ve-tools
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# These stay the same:
NEXT_PUBLIC_SITE_URL=...
TOOL_URL_TCO_CALCULATOR=...
PROXY_SECRET=...
```

#### 4. Replace lib/supabase/client.ts → lib/firebase/client.ts

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
```

#### 5. Replace lib/supabase/server.ts → lib/firebase/admin.ts

```typescript
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

#### 6. Replace Magic Link Flow

```typescript
// app/login/actions.ts — Firebase version

"use server";

import { adminAuth } from "@/lib/firebase/admin";

export async function sendMagicLink(email: string) {
  try {
    const link = await adminAuth.generateSignInWithEmailLink(email, {
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      handleCodeInApp: true,
    });

    // Send the link via your email service (SendGrid, Resend, etc.)
    // Firebase doesn't send emails from the server SDK — you need
    // to use the client SDK's sendSignInLinkToEmail() or send manually.

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
```

Client-side alternative (simpler):
```typescript
// In login-form.tsx
import { getAuth, sendSignInLinkToEmail } from "firebase/auth";

const handleSubmit = async () => {
  const auth = getAuth();
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/auth/callback`,
    handleCodeInApp: true,
  });
  // Save email to localStorage for callback verification
  window.localStorage.setItem("emailForSignIn", email);
};
```

#### 7. Replace Auth Callback

```typescript
// app/auth/callback/page.tsx — Firebase version (client component)
"use client";

import { useEffect } from "react";
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem("emailForSignIn") || prompt("Confirm your email:");
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem("emailForSignIn");
            // Get ID token and set as cookie for server-side auth
            const token = await result.user.getIdToken();
            await fetch("/api/auth/session", {
              method: "POST",
              body: JSON.stringify({ token }),
            });
            router.push("/dashboard");
          })
          .catch(() => router.push("/login?error=auth_failed"));
      }
    }
  }, []);

  return <div>Signing in...</div>;
}
```

#### 8. Replace Session Management (Middleware)

Firebase doesn't have cookie-based sessions built in like Supabase. You need a session cookie approach:

```typescript
// app/api/auth/session/route.ts
import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = await request.json();

  // Create session cookie (5 days)
  const expiresIn = 5 * 24 * 60 * 60 * 1000;
  const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

  cookies().set("session", sessionCookie, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ success: true });
}
```

```typescript
// middleware.ts — Firebase version
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const path = request.nextUrl.pathname;

  if (path === "/login" || path.startsWith("/auth")) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Note: Can't verify Firebase session cookie in Edge middleware.
  // Verification happens in server components/API routes instead.
  return NextResponse.next();
}
```

#### 9. Replace Database Queries

Supabase (current):
```typescript
const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
```

Firebase:
```typescript
const doc = await adminDb.collection("profiles").doc(userId).get();
const data = doc.exists ? doc.data() : null;
```

#### 10. Replace Proxy Route Auth Check

```typescript
// In app/api/proxy/[...path]/route.ts — Firebase version

import { adminAuth } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

async function validateAndGetProfile() {
  const session = cookies().get("session")?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const profileDoc = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileDoc.exists) return null;

    return {
      user: { id: decoded.uid, email: decoded.email },
      profile: profileDoc.data(),
    };
  } catch {
    return null;
  }
}
```

#### 11. Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles
    match /profiles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role in ['super_admin', 'admin'];
    }

    // Access logs
    match /tool_access_log/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role in ['super_admin', 'admin'];
    }
  }
}
```

### Files That Change in Firebase Migration

| File | Action |
|------|--------|
| `package.json` | Replace supabase deps with firebase + firebase-admin |
| `.env.local` | Replace Supabase vars with Firebase vars |
| `lib/supabase/client.ts` | **Delete** → replace with `lib/firebase/client.ts` |
| `lib/supabase/server.ts` | **Delete** → replace with `lib/firebase/admin.ts` |
| `middleware.ts` | Rewrite for Firebase session cookie |
| `app/login/actions.ts` | Rewrite for Firebase email link |
| `app/login/login-form.tsx` | Update auth calls |
| `app/auth/callback/route.ts` | **Delete** → replace with `app/auth/callback/page.tsx` (client component) |
| `app/api/proxy/[...path]/route.ts` | Replace auth validation with Firebase |
| `app/api/admin/users/route.ts` | Replace Supabase queries with Firestore |
| `app/api/admin/invite/route.ts` | Replace Supabase invite with Firebase |
| `app/dashboard/page.tsx` | Replace Supabase session check with Firebase |
| `app/admin/page.tsx` | Replace Supabase queries with Firestore |
| `supabase/schema.sql` | **Delete** → replace with Firestore rules + seed script |

### Files That Do NOT Change

| File | Why |
|------|-----|
| `lib/tools.ts` | No auth dependency |
| `lib/access.ts` | No auth dependency |
| `components/icons.tsx` | Pure UI |
| `components/sidebar.tsx` | Only imports from `lib/access` |
| `components/tool-card.tsx` | Pure UI |
| `components/tool-embed.tsx` | Pure UI |
| `app/globals.css` | Pure styles |
| `app/layout.tsx` | No auth dependency |
| `tailwind.config.ts` | No auth dependency |
| `next.config.js` | No auth dependency |
| `tool-side-middleware-template.ts` | Uses proxy secret, not auth provider |

### Firebase Pricing Comparison

| Feature | Supabase Pro | Firebase (Blaze) |
|---------|-------------|-----------------|
| Auth | Included | Free (all auth methods) |
| Database | 8GB Postgres ($25/mo) | Firestore: $0.06/100K reads |
| Storage | 100GB ($25/mo) | $0.026/GB |
| Email links | Custom SMTP needed | Built-in email sending |
| SSO/SAML | Included on Pro | Requires Identity Platform ($0.0055/MAU) |
| Monthly cost (our scale) | ~$25/mo | ~$0-5/mo |
| Vendor | Independent company | Google |

---

## DECISION FRAMEWORK

```
Leadership asks "can we use Azure AD?"
├── YES, and Supabase is working well
│   └── Scenario A: Add SAML SSO to Supabase Pro ($25/mo, 1-2 days)
│
├── YES, and we need to move off Supabase entirely
│   └── Scenario C: Migrate to Firebase (3-5 days)
│       └── Then add Google Identity Platform for SAML
│
└── NO, just upgrade for reliability
    └── Scenario B: Supabase Free → Pro ($25/mo, 30 min)
```

### Recommendation

**Start with Supabase free tier (current plan). When the first of these triggers hits, upgrade to Supabase Pro and add Azure AD SSO (Scenario A + B combined):**

- IT/Security review requests SSO
- Magic link emails start hitting spam consistently
- Team grows beyond 20 active users
- Production SLA becomes a requirement

**Keep Firebase as a documented contingency, not a planned migration.** Only migrate if Supabase becomes untenable (major pricing change, acquisition, prolonged outages).
