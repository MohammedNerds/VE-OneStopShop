"use client";

import { useState, useMemo } from "react";
import { type UserProfile, isAdmin, ROLES } from "@/lib/access";
import { TOOL_CATALOG, type Tool } from "@/lib/tools";
import { Sidebar } from "@/components/sidebar";
import { ToolCard } from "@/components/tool-card";
import { ToolEmbed } from "@/components/tool-embed";
import { ProxyIcon, ShieldIcon, LockIcon, EyeOffIcon } from "@/components/icons";

interface Props {
  user: UserProfile;
}

export function DashboardClient({ user }: Props) {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);

  // Compute accessible tools based on user's role + tool_access array
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

  const handleLaunch = (tool: Tool) => {
    if (tool.status !== "live") return;
    setActiveTool(tool);
  };

  // If a tool is active, show embedded view full-screen
  if (activeTool) {
    return (
      <div className="flex min-h-screen font-poppins" style={{ background: "#03171e" }}>
        <Sidebar user={user} currentPath="/dashboard" />
        <main className="flex-1 overflow-auto">
          <ToolEmbed tool={activeTool} onClose={() => setActiveTool(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-poppins" style={{ background: "#03171e" }}>
      <Sidebar user={user} currentPath="/dashboard" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-7">
          {/* Header */}
          <div className="flex justify-between items-start mb-7 flex-wrap gap-3.5">
            <div>
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: "-0.025em" }}>
                Welcome, {user.full_name?.split(" ")[0] || "there"}
              </h1>
              <p className="text-[13px] text-nerdio-muted mt-[3px]">
                {liveTools.length} active tool{liveTools.length !== 1 ? "s" : ""}
                {upcomingTools.length > 0 && ` · ${upcomingTools.length} upcoming`}
                {lockedTools.length > 0 && ` · ${lockedTools.length} restricted`}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 py-[7px] px-[13px] rounded-[7px] text-nerdio-teal text-[11px] font-medium"
              style={{
                background: "rgba(30,157,184,0.06)",
                border: "1px solid rgba(30,157,184,0.12)",
              }}
            >
              <ProxyIcon size={15} />
              <span>All tools served via secure proxy</span>
            </div>
          </div>

          {/* Admin security info box */}
          {isAdmin(user.role) && (
            <div
              className="p-4 rounded-[10px] mb-6 animate-fade-slide-in"
              style={{
                background: "rgba(30,157,184,0.04)",
                border: "1px solid rgba(30,157,184,0.08)",
              }}
            >
              <div className="flex gap-2.5 items-center mb-2.5">
                <EyeOffIcon size={16} className="text-nerdio-teal" />
                <span className="text-[13px] font-semibold text-white">Security Architecture</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: <LockIcon size={15} />, title: "Magic Link Auth", desc: "Supabase OTP, no passwords stored" },
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
              <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5"
                style={{ letterSpacing: "0.05em" }}>
                Your Tools
              </h2>
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
                {liveTools.map((tool, i) => (
                  <ToolCard key={tool.id} tool={tool} onLaunch={handleLaunch} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming tools */}
          {upcomingTools.length > 0 && (
            <section className="mt-9">
              <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5"
                style={{ letterSpacing: "0.05em" }}>
                Coming Soon
              </h2>
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
                {upcomingTools.map((tool, i) => (
                  <ToolCard key={tool.id} tool={tool} onLaunch={handleLaunch} index={i} dimmed />
                ))}
              </div>
            </section>
          )}

          {/* Locked tools */}
          {lockedTools.length > 0 && (
            <section className="mt-9">
              <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5"
                style={{ letterSpacing: "0.05em" }}>
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
  );
}
