"use client";

import { useState, useEffect } from "react";
import { sendMagicLink } from "./actions";
import Image from "next/image";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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

      {/* Animated grid background */}
      <div className="absolute inset-0 animate-grid-drift"
        style={{
          backgroundImage: "linear-gradient(rgba(30,157,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(30,157,184,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }} />

      {/* Glow effects */}
      <div className="absolute w-[500px] h-[500px] rounded-full animate-glow-pulse pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(30,157,184,0.1) 0%, transparent 70%)",
          top: "40%", left: "50%", transform: "translate(-50%, -50%)",
        }} />

      {/* Login card */}
      <div
        className="w-full max-w-[430px] relative z-10 rounded-[18px] p-[34px_30px_26px]"
        style={{
          background: "rgba(4,40,56,0.88)",
          backdropFilter: "blur(28px)",
          border: "1px solid rgba(148,207,217,0.1)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3.5 mb-[30px] pb-[22px]"
          style={{ borderBottom: "1px solid rgba(148,207,217,0.07)" }}>
          <img
            src="https://getnerdio.com/wp-content/uploads/2026/01/nerdio-logo-square.png"
            alt="Nerdio"
            width={52} height={52}
            className="rounded-[11px] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <div className="text-[22px] font-bold text-white" style={{ letterSpacing: "-0.03em", lineHeight: 1 }}>
              nerdio
            </div>
            <div className="text-[10px] font-semibold text-nerdio-teal mt-1" style={{ letterSpacing: "0.08em" }}>
              VALUE ENGINEERING TOOLS
            </div>
          </div>
        </div>

        {phase === "form" && (
          <div className="animate-fade-slide-in">
            <h1 className="text-[21px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
              Sign in
            </h1>
            <p className="text-[13.5px] text-nerdio-muted leading-relaxed mb-[22px]">
              Enter your work email for a secure magic link — no passwords needed.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-[13px] font-medium"
                style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "#ff4d6a" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="block text-[11.5px] font-medium text-nerdio-teal-light mb-1.5"
                style={{ letterSpacing: "0.02em" }}>
                Email address
              </label>
              <div className="relative mb-3.5">
                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-nerdio-muted pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 9L2 4" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@nerdio.net"
                  required
                  autoFocus
                  className="w-full py-3 pl-[42px] pr-3.5 rounded-[9px] text-white text-[13.5px] font-poppins transition-all"
                  style={{
                    background: "rgba(3,23,30,0.55)",
                    border: "1px solid rgba(148,207,217,0.12)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-[13px] px-5 rounded-[9px] text-[14px] font-semibold font-poppins transition-opacity"
                style={{
                  background: "#cdff4e",
                  color: "#042838",
                  border: "none",
                  opacity: sending ? 0.65 : 1,
                  cursor: sending ? "wait" : "pointer",
                }}
              >
                {sending ? (
                  <span className="inline-block w-[18px] h-[18px] rounded-full animate-spin"
                    style={{ border: "2px solid rgba(4,40,56,0.3)", borderTopColor: "#042838" }} />
                ) : (
                  <>
                    Send Magic Link
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {phase === "sent" && (
          <div className="text-center animate-fade-slide-in">
            <div className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center mx-auto mb-[18px] text-nerdio-teal"
              style={{ background: "rgba(30,157,184,0.08)", border: "1px solid rgba(30,157,184,0.15)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 9L2 4" />
              </svg>
            </div>
            <h2 className="text-[21px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
              Check your inbox
            </h2>
            <p className="text-[13.5px] text-nerdio-muted leading-relaxed mb-3">
              We sent a sign-in link to<br />
              <strong className="text-nerdio-teal">{email}</strong>
            </p>
            <p className="text-[12px] text-nerdio-muted mb-6 leading-relaxed">
              Click the link in the email to sign in securely.<br />
              Link expires in 10 minutes.
            </p>
            <button
              onClick={() => { setPhase("form"); setError(null); }}
              className="inline-flex items-center gap-1.5 py-[9px] px-4 rounded-[7px] text-[12.5px] font-medium font-poppins text-nerdio-muted transition-colors hover:text-white"
              style={{ background: "transparent", border: "1px solid rgba(148,207,217,0.12)" }}
            >
              ← Back to sign in
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-[26px] pt-[18px] text-[10.5px]"
          style={{ borderTop: "1px solid rgba(148,207,217,0.06)", color: "rgba(107,138,153,0.45)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2.5" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>Supabase Auth · Proxied tool delivery · Zero URL exposure</span>
        </div>
      </div>
    </div>
  );
}
