# Microsoft Azure AD OAuth — Complete Setup Guide

## Overview

This adds a "Sign in with Microsoft" button to the VE Tools portal. Users click it → redirected to Microsoft login → authenticated → back to dashboard. No emails, no rate limits, instant login.

Two paths:
- **Path A (You have Azure Portal access):** Do it yourself in 15 minutes
- **Path B (Need IT help):** Send IT the exact request below, they configure Azure, you wire it up

---

## What You Need From IT

If you don't have admin access to Azure AD / Microsoft Entra ID, send this exact message to your IT team:

---

**Subject: App Registration Request — VE Tools Portal (Internal)**

Hi IT team,

I need an Azure AD App Registration for an internal Value Engineering tools portal. Here are the details:

**App Registration Details:**
- **App Name:** VE Tools Portal
- **Supported account types:** Accounts in this organizational directory only (Single tenant — Nerdio employees only)
- **Platform:** Web
- **Redirect URI:** `https://<SUPABASE_PROJECT_ID>.supabase.co/auth/v1/callback`

> To get the exact redirect URI: I'll provide this once I confirm it from our Supabase dashboard. It will look like `https://xxxxxxxx.supabase.co/auth/v1/callback`

**What I need back from you:**
1. **Application (client) ID** — from the app overview page
2. **Directory (tenant) ID** — from the app overview page  
3. **Client Secret value** — from Certificates & secrets → New client secret (24 month expiry is fine)

**API Permissions needed:**
- `openid` (Sign users in) — usually added by default
- `profile` (View users' basic profile)
- `email` (View users' email address)
- `User.Read` (Sign in and read user profile) — usually added by default

All of these are **delegated permissions** under Microsoft Graph, and they should all be in the default set when creating the app registration.

**Optional but helpful:**
- If you can restrict this app to specific Azure AD groups (e.g., the Value Engineering team, Sales), that adds an extra layer of access control on the Microsoft side.

This is an internal tool only — no customer-facing access. Let me know if you need any additional information.

Thanks,
Mohammed

---

## Values You'll Receive From IT

Once IT creates the app registration, they'll give you three values:

```
Application (client) ID:   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Client Secret (value):     xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**IMPORTANT:** The client secret "Value" (not the "Secret ID"). They only see it once when creating it.

---

## Your Supabase Callback URL

IT needs the exact redirect URI. Get it from:

1. Go to **Supabase Dashboard → Authentication → Sign In / Providers**
2. Scroll to **Azure (Microsoft)** 
3. Expand it — you'll see **Callback URL (for OAuth)**
4. It looks like: `https://xxxxxxxx.supabase.co/auth/v1/callback`
5. Send this exact URL to IT for the redirect URI

---

## Step-by-Step Configuration

### Step 1: Configure Supabase (2 minutes)

1. Go to **Supabase Dashboard → Authentication → Sign In / Providers**
2. Find **Azure (Microsoft)** → toggle it **ON**
3. Fill in:

| Field | Value |
|-------|-------|
| **Azure Client ID** | paste Application (client) ID from IT |
| **Azure Secret** | paste Client Secret value from IT |
| **Azure Tenant URL** | `https://login.microsoftonline.com/YOUR_TENANT_ID` |

Replace `YOUR_TENANT_ID` with the actual Directory (tenant) ID.

4. Click **Save**

### Step 2: Update Login Form (already done if you used the code below)

The login form needs a "Sign in with Microsoft" button that calls `supabase.auth.signInWithOAuth({ provider: "azure" })`.

See the **Code Changes** section below for the exact file.

### Step 3: Test

1. Go to your portal login page
2. Click "Sign in with Microsoft"
3. Microsoft login page appears
4. Sign in with your @getnerdio.com account
5. Redirected back to the portal → dashboard loads

---

## If You Have Azure Portal Access (Path A)

### A1: Create App Registration

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search **"App registrations"** in the top search bar → click it
3. Click **+ New registration**
4. Fill in:
   - **Name:** `VE Tools Portal`
   - **Supported account types:** "Accounts in this organizational directory only" (single tenant)
   - **Redirect URI:** Platform = **Web**, URI = your Supabase callback URL (from section above)
5. Click **Register**

### A2: Copy IDs

On the app overview page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

### A3: Create Client Secret

1. Left sidebar → **Certificates & secrets**
2. Click **+ New client secret**
3. Description: `VE Tools`
4. Expires: **24 months**
5. Click **Add**
6. **COPY THE "Value" COLUMN IMMEDIATELY** — you won't see it again
   - NOT the "Secret ID" column — the "Value" column

### A4: Verify API Permissions

1. Left sidebar → **API permissions**
2. You should see these (usually added by default):
   - `Microsoft Graph → User.Read` (Delegated)
3. If not present, click **+ Add a permission** → Microsoft Graph → Delegated → search `User.Read` → Add
4. Optionally add: `openid`, `profile`, `email` (under OpenID permissions)
5. Click **Grant admin consent for [Your Org]** if available

### A5: Configure Supabase

Follow Step 1 from the section above.

---

## Code Changes

### File: `app/login/login-form.tsx`

This adds the Microsoft OAuth button. Replace the entire file:

```typescript
"use client";

import { useState, useEffect } from "react";
import { sendMagicLink } from "./actions";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [sending, setSending] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check URL for error params (from failed OAuth or magic link)
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) setError(errorParam);
  }, []);

  const handleMicrosoftLogin = async () => {
    setSigningIn(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setSigningIn(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    const result = await sendMagicLink(email);
    setSending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setPhase("sent");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-5"
      style={{ background: "linear-gradient(155deg, #03171e 0%, #042838 45%, #0b3d52 100%)" }}>
      <div className="absolute inset-0 animate-grid-drift"
        style={{ backgroundImage: "linear-gradient(rgba(30,157,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(30,157,184,0.035) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <div className="absolute w-[500px] h-[500px] rounded-full animate-glow-pulse pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(30,157,184,0.1) 0%, transparent 70%)", top: "40%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="w-full max-w-[430px] relative z-10 rounded-[18px] p-[34px_30px_26px]"
        style={{
          background: "rgba(4,40,56,0.88)", backdropFilter: "blur(28px)",
          border: "1px solid rgba(148,207,217,0.1)",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>

        {/* Brand */}
        <div className="flex items-center gap-3.5 mb-[30px] pb-[22px]" style={{ borderBottom: "1px solid rgba(148,207,217,0.07)" }}>
          <img src="https://getnerdio.com/wp-content/uploads/2026/01/nerdio-logo-square.png" alt="Nerdio"
            width={52} height={52} className="rounded-[11px] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <div className="text-[22px] font-bold text-white" style={{ letterSpacing: "-0.03em", lineHeight: 1 }}>nerdio</div>
            <div className="text-[10px] font-semibold text-nerdio-teal mt-1" style={{ letterSpacing: "0.08em" }}>VALUE ENGINEERING TOOLS</div>
          </div>
        </div>

        {phase === "form" && (
          <div className="animate-fade-slide-in">
            <h1 className="text-[21px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>Sign in</h1>
            <p className="text-[13.5px] text-nerdio-muted leading-relaxed mb-[22px]">
              Sign in with your Microsoft work account or use a magic link.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-[13px] font-medium"
                style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "#ff4d6a" }}>
                {error}
              </div>
            )}

            {/* Microsoft OAuth */}
            <button onClick={handleMicrosoftLogin} disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 py-[13px] px-5 rounded-[9px] text-[14px] font-semibold font-poppins transition-all mb-5"
              style={{ background: "#ffffff", color: "#333", border: "none", cursor: signingIn ? "wait" : "pointer", opacity: signingIn ? 0.7 : 1 }}>
              {signingIn ? (
                <span className="inline-block w-[18px] h-[18px] rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.15)", borderTopColor: "#333" }} />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                  Sign in with Microsoft
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <span className="flex-1 h-px" style={{ background: "rgba(148,207,217,0.08)" }} />
              <span className="text-[10px] font-semibold text-nerdio-muted uppercase" style={{ letterSpacing: "0.05em" }}>or use email</span>
              <span className="flex-1 h-px" style={{ background: "rgba(148,207,217,0.08)" }} />
            </div>

            {/* Magic Link */}
            <form onSubmit={handleMagicLink}>
              <label className="block text-[11.5px] font-medium text-nerdio-teal-light mb-1.5" style={{ letterSpacing: "0.02em" }}>Email address</label>
              <div className="relative mb-3.5">
                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-nerdio-muted pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 9L2 4"/></svg>
                </span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nerdio.net" required
                  className="w-full py-3 pl-[42px] pr-3.5 rounded-[9px] text-white text-[13.5px] font-poppins transition-all"
                  style={{ background: "rgba(3,23,30,0.55)", border: "1px solid rgba(148,207,217,0.12)" }} />
              </div>
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-[12px] px-5 rounded-[9px] text-[13px] font-semibold font-poppins transition-opacity"
                style={{ background: "transparent", color: "#94cfd9", border: "1px solid rgba(148,207,217,0.2)", opacity: sending ? 0.65 : 1, cursor: sending ? "wait" : "pointer" }}>
                {sending ? (
                  <span className="inline-block w-[18px] h-[18px] rounded-full animate-spin" style={{ border: "2px solid rgba(148,207,217,0.3)", borderTopColor: "#94cfd9" }} />
                ) : (
                  <>Send Magic Link <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
                )}
              </button>
            </form>
          </div>
        )}

        {phase === "sent" && (
          <div className="text-center animate-fade-slide-in">
            <div className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center mx-auto mb-[18px] text-nerdio-teal"
              style={{ background: "rgba(30,157,184,0.08)", border: "1px solid rgba(30,157,184,0.15)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 9L2 4"/></svg>
            </div>
            <h2 className="text-[21px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>Check your inbox</h2>
            <p className="text-[13.5px] text-nerdio-muted leading-relaxed mb-3">
              We sent a sign-in link to<br/><strong className="text-nerdio-teal">{email}</strong>
            </p>
            <p className="text-[12px] text-nerdio-muted mb-6 leading-relaxed">Click the link in the email to sign in securely.<br/>Link expires in 10 minutes.</p>
            <button onClick={() => { setPhase("form"); setError(null); }}
              className="inline-flex items-center gap-1.5 py-[9px] px-4 rounded-[7px] text-[12.5px] font-medium font-poppins text-nerdio-muted transition-colors hover:text-white"
              style={{ background: "transparent", border: "1px solid rgba(148,207,217,0.12)" }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-[26px] pt-[18px] text-[10.5px]"
          style={{ borderTop: "1px solid rgba(148,207,217,0.06)", color: "rgba(107,138,153,0.45)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span>Secured by Microsoft + Supabase · Zero URL exposure</span>
        </div>
      </div>
    </div>
  );
}
```

### File: `app/auth/callback/route.ts`

This handles both OAuth and magic link callbacks:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles")
          .update({ last_login: new Date().toISOString(), status: "active" })
          .eq("id", user.id);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const errorParam = searchParams.get("error_description") || searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=no_code_received`);
}
```

---

## Environment Variables

No new env vars needed for Microsoft OAuth — it's all configured in the Supabase dashboard. The existing env vars stay the same.

---

## What Happens Under the Hood

```
User clicks "Sign in with Microsoft"
  ↓
Browser → Supabase auth endpoint → Microsoft login page
  ↓
User signs in with @getnerdio.com credentials
  ↓
Microsoft → redirects to Supabase callback URL
  ↓
Supabase exchanges token, creates/updates user in auth.users
  ↓
Supabase → redirects to your /auth/callback?code=xxx
  ↓
Your callback exchanges code for session cookies
  ↓
Redirect to /dashboard → middleware sees valid session → page loads
```

---

## Auto Profile Creation

When a Microsoft user signs in for the first time, Supabase creates a row in `auth.users`. Our database trigger (`handle_new_user`) automatically creates a profile in the `profiles` table with:
- `role: 'viewer'` (default)
- `tool_access: []` (empty — no tools until admin grants)

An admin then needs to update their role and grant tool access via the admin panel or SQL.

---

## Restricting to Nerdio Only

By choosing "Single tenant" in the Azure app registration, ONLY users with @getnerdio.com (or whatever your Azure AD tenant covers) can sign in. External users trying Microsoft OAuth will get an error from Microsoft itself — it never even reaches your app.

---

## Checklist

```
□ Get Supabase callback URL from Authentication → Sign In / Providers → Azure
□ Send IT the app registration request (or create it yourself in Azure Portal)
□ Receive: Client ID, Tenant ID, Client Secret
□ Configure in Supabase: Authentication → Sign In / Providers → Azure (Microsoft)
□ Update login-form.tsx with Microsoft OAuth button (code above)
□ Update auth/callback/route.ts (code above)
□ Push and deploy
□ Test: click "Sign in with Microsoft" → Microsoft login → dashboard loads
□ Promote first users to appropriate roles in admin panel
```
