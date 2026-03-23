"use client";

import { useState, useEffect } from "react";
import { sendMagicLink } from "./actions";
import { createClient } from "@/lib/supabase/client";

// Set NEXT_PUBLIC_ENABLE_MICROSOFT=true in Vercel when Azure AD is configured
const MICROSOFT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MICROSOFT === "true";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [sending, setSending] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
              {MICROSOFT_ENABLED
                ? "Sign in with your Microsoft work account or use a magic link."
                : "Enter your work email for a secure magic link — no passwords needed."}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-[13px] font-medium"
                style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "#ff4d6a" }}>
                {error}
              </div>
            )}

            {/* Microsoft OAuth — only shows when NEXT_PUBLIC_ENABLE_MICROSOFT=true */}
            {MICROSOFT_ENABLED && (
              <>
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
                <div className="flex items-center gap-3 mb-5">
                  <span className="flex-1 h-px" style={{ background: "rgba(148,207,217,0.08)" }} />
                  <span className="text-[10px] font-semibold text-nerdio-muted uppercase" style={{ letterSpacing: "0.05em" }}>or use email</span>
                  <span className="flex-1 h-px" style={{ background: "rgba(148,207,217,0.08)" }} />
                </div>
              </>
            )}

            {/* Magic Link */}
            <form onSubmit={handleMagicLink}>
              <label className="block text-[11.5px] font-medium text-nerdio-teal-light mb-1.5" style={{ letterSpacing: "0.02em" }}>Email address</label>
              <div className="relative mb-3.5">
                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-nerdio-muted pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 9L2 4"/></svg>
                </span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nerdio.net" required autoFocus
                  className="w-full py-3 pl-[42px] pr-3.5 rounded-[9px] text-white text-[13.5px] font-poppins transition-all"
                  style={{ background: "rgba(3,23,30,0.55)", border: "1px solid rgba(148,207,217,0.12)" }} />
              </div>
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-[13px] px-5 rounded-[9px] text-[14px] font-semibold font-poppins transition-opacity"
                style={{
                  background: MICROSOFT_ENABLED ? "transparent" : "#cdff4e",
                  color: MICROSOFT_ENABLED ? "#94cfd9" : "#042838",
                  border: MICROSOFT_ENABLED ? "1px solid rgba(148,207,217,0.2)" : "none",
                  opacity: sending ? 0.65 : 1, cursor: sending ? "wait" : "pointer",
                }}>
                {sending ? (
                  <span className="inline-block w-[18px] h-[18px] rounded-full animate-spin"
                    style={{ border: "2px solid rgba(4,40,56,0.3)", borderTopColor: MICROSOFT_ENABLED ? "#94cfd9" : "#042838" }} />
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
            <p className="text-[13.5px] text-nerdio-muted leading-relaxed mb-3">We sent a sign-in link to<br/><strong className="text-nerdio-teal">{email}</strong></p>
            <p className="text-[12px] text-nerdio-muted mb-6 leading-relaxed">Click the link in the email to sign in securely.<br/>Link expires in 10 minutes.</p>
            <button onClick={() => { setPhase("form"); setError(null); }}
              className="inline-flex items-center gap-1.5 py-[9px] px-4 rounded-[7px] text-[12.5px] font-medium font-poppins text-nerdio-muted transition-colors hover:text-white"
              style={{ background: "transparent", border: "1px solid rgba(148,207,217,0.12)" }}>
              ← Back to sign in
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-[26px] pt-[18px] text-[10.5px]"
          style={{ borderTop: "1px solid rgba(148,207,217,0.06)", color: "rgba(107,138,153,0.45)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span>{MICROSOFT_ENABLED ? "Secured by Microsoft + Supabase" : "Secured by Supabase Auth"} · Zero URL exposure</span>
        </div>
      </div>
    </div>
  );
}
