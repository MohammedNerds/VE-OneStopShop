"use client";

import { useState, useMemo } from "react";
import { TOOL_CATALOG, type Tool } from "@/lib/tools";
import { type UserProfile, ROLES, isAdmin } from "@/lib/access";
import { ToolCard } from "@/components/tool-card";
import { ProxyIcon, ShieldIcon, LockIcon, EyeOffIcon } from "@/components/icons";

// ═══════════════════════════════════════════════════════════
// DEMO MODE — No auth required
// URL: /demo
// Purpose: Show the team what the portal looks like
// ═══════════════════════════════════════════════════════════

const DEMO_USERS: Record<string, UserProfile> = {
  admin: {
    id: "demo-1",
    email: "mohammed.irfan@nerdio.net",
    full_name: "Mohammed Irfan",
    role: "admin",
    tool_access: TOOL_CATALOG.map((t) => t.id),
    status: "active",
    last_login: new Date().toISOString(),
    created_at: "2026-01-01T00:00:00Z",
  },
  ve: {
    id: "demo-2",
    email: "mike.schweim@nerdio.net",
    full_name: "Mike Schweim",
    role: "ve",
    tool_access: ["tco-calc-prod", "reverse-timeline"],
    status: "active",
    last_login: new Date().toISOString(),
    created_at: "2026-01-01T00:00:00Z",
  },
  ae: {
    id: "demo-3",
    email: "mike.atlas@nerdio.net",
    full_name: "Mike Atlas",
    role: "ae",
    tool_access: ["tco-calc-prod"],
    status: "active",
    last_login: new Date().toISOString(),
    created_at: "2026-01-01T00:00:00Z",
  },
};

export default function DemoPage() {
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const user = DEMO_USERS[selectedRole];

  const myTools = useMemo(() => {
    if (isAdmin(user.role)) return TOOL_CATALOG;
    return TOOL_CATALOG.filter((t) => (user.tool_access || []).includes(t.id));
  }, [user]);

  const lockedTools = useMemo(() => {
    if (isAdmin(user.role)) return [];
    return TOOL_CATALOG.filter((t) => !(user.tool_access || []).includes(t.id));
  }, [user]);

  const liveTools = myTools.filter((t) => t.status === "live");
  const upcomingTools = myTools.filter((t) => t.status !== "live");

  const role = ROLES[user.role];

  return (
    <div className="min-h-screen font-poppins" style={{ background: "#03171e" }}>
      {/* Demo banner */}
      <div
        className="text-center py-2.5 text-[12px] font-semibold"
        style={{ background: "#cdff4e", color: "#042838" }}
      >
        DEMO MODE — This is a preview. No authentication required. Switch roles below to see different user views.
      </div>

      <div className="flex">
        {/* Simplified sidebar */}
        <nav
          className="w-[230px] flex flex-col justify-between sticky top-0 h-screen flex-shrink-0"
          style={{ background: "#042838", borderRight: "1px solid rgba(148,207,217,0.06)" }}
        >
          <div>
            <div className="flex items-center gap-2.5 px-3.5 py-[18px]" style={{ borderBottom: "1px solid rgba(148,207,217,0.05)" }}>
              <img src="https://getnerdio.com/wp-content/uploads/2026/01/nerdio-logo-square.png" alt="Nerdio"
                width={32} height={32} className="rounded-[7px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div>
                <div className="font-semibold text-[14px] text-white" style={{ letterSpacing: "-0.02em" }}>VE Tools</div>
                <div className="text-[10px] text-nerdio-muted" style={{ letterSpacing: "0.04em" }}>PORTAL</div>
              </div>
            </div>

            {/* Role switcher */}
            <div className="p-3">
              <div className="text-[10px] font-semibold text-nerdio-muted uppercase mb-2" style={{ letterSpacing: "0.05em" }}>
                Switch Role View
              </div>
              {Object.entries(DEMO_USERS).map(([key, u]) => {
                const r = ROLES[u.role];
                const active = selectedRole === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedRole(key)}
                    className="flex items-center gap-2 w-full py-2 px-2.5 rounded-lg mb-1 text-left font-poppins transition-all"
                    style={{
                      background: active ? "rgba(30,157,184,0.1)" : "transparent",
                      border: active ? "1px solid rgba(30,157,184,0.2)" : "1px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="text-[9px] font-bold px-[6px] py-[2px] rounded"
                      style={{ background: r.color, color: r.textColor }}
                    >
                      {r.label}
                    </span>
                    <span className="text-[12px] text-white truncate">{u.full_name}</span>
                  </button>
                );
              })}
            </div>

            {/* Security indicator */}
            <div
              className="mx-2.5 p-[10px_12px] flex items-center gap-2 rounded-lg text-nerdio-teal"
              style={{ background: "rgba(30,157,184,0.04)", border: "1px solid rgba(30,157,184,0.08)" }}
            >
              <EyeOffIcon size={14} />
              <div>
                <div className="text-[10px] font-semibold text-nerdio-teal" style={{ letterSpacing: "0.03em" }}>SECURE MODE</div>
                <div className="text-[10px] text-nerdio-muted mt-0.5">Tool URLs hidden via proxy</div>
              </div>
            </div>
          </div>

          {/* User card */}
          <div
            className="flex items-center gap-[9px] px-3.5 py-3"
            style={{ borderTop: "1px solid rgba(148,207,217,0.06)", background: "rgba(3,23,30,0.35)" }}
          >
            <div
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1e9db8, #94cfd9)" }}
            >
              {user.full_name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-white truncate">{user.full_name}</div>
              <span
                className="inline-flex text-[9px] font-semibold px-[7px] py-[2px] rounded mt-0.5"
                style={{ background: role?.color, color: role?.textColor }}
              >
                {role?.label}
              </span>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1100px] mx-auto px-8 py-7">
            {/* Header */}
            <div className="flex justify-between items-start mb-7 flex-wrap gap-3.5">
              <div>
                <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: "-0.025em" }}>
                  Welcome, {user.full_name.split(" ")[0]}
                </h1>
                <p className="text-[13px] text-nerdio-muted mt-[3px]">
                  {liveTools.length} active tool{liveTools.length !== 1 ? "s" : ""}
                  {upcomingTools.length > 0 && ` · ${upcomingTools.length} upcoming`}
                  {lockedTools.length > 0 && ` · ${lockedTools.length} restricted`}
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 py-[7px] px-[13px] rounded-[7px] text-nerdio-teal text-[11px] font-medium"
                style={{ background: "rgba(30,157,184,0.06)", border: "1px solid rgba(30,157,184,0.12)" }}
              >
                <ProxyIcon size={15} />
                <span>All tools served via secure proxy</span>
              </div>
            </div>

            {/* Security info for admins */}
            {isAdmin(user.role) && (
              <div className="p-4 rounded-[10px] mb-6 animate-fade-slide-in"
                style={{ background: "rgba(30,157,184,0.04)", border: "1px solid rgba(30,157,184,0.08)" }}>
                <div className="flex gap-2.5 items-center mb-2.5">
                  <EyeOffIcon size={16} className="text-nerdio-teal" />
                  <span className="text-[13px] font-semibold text-white">Security Architecture</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: <LockIcon size={15} />, title: "Magic Link + Microsoft Auth", desc: "Supabase OTP or Azure AD OAuth" },
                    { icon: <ProxyIcon size={15} />, title: "Proxy Delivery", desc: "Tool URLs never reach the browser" },
                    { icon: <ShieldIcon size={15} />, title: "Per-User Access", desc: "Individual tool grants, not just roles" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-nerdio-teal mt-[1px] flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="text-[12px] font-semibold text-nerdio-teal-light">{item.title}</div>
                        <div className="text-[11px] text-nerdio-muted mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live tools */}
            {liveTools.length > 0 && (
              <section>
                <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5" style={{ letterSpacing: "0.05em" }}>
                  Your Tools
                </h2>
                <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
                  {liveTools.map((tool, i) => (
                    <ToolCard key={tool.id} tool={tool} onLaunch={() => alert(`[DEMO] Would launch ${tool.name} via /api/proxy/${tool.id}`)} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcomingTools.length > 0 && (
              <section className="mt-9">
                <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5" style={{ letterSpacing: "0.05em" }}>
                  Coming Soon
                </h2>
                <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
                  {upcomingTools.map((tool, i) => (
                    <ToolCard key={tool.id} tool={tool} onLaunch={() => {}} index={i} dimmed />
                  ))}
                </div>
              </section>
            )}

            {/* Locked */}
            {lockedTools.length > 0 && (
              <section className="mt-9">
                <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5" style={{ letterSpacing: "0.05em" }}>
                  Restricted
                </h2>
                <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
                  {lockedTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} onLaunch={() => {}} locked />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
