"use client";

import { useState } from "react";
import { type Tool } from "@/lib/tools";
import { ToolIcon, ArrowIcon, ProxyIcon, LockIcon } from "@/components/icons";

interface ToolCardProps {
  tool: Tool;
  onLaunch: (tool: Tool) => void;
  index?: number;
  dimmed?: boolean;
  locked?: boolean;
}

export function ToolCard({ tool, onLaunch, index = 0, dimmed, locked }: ToolCardProps) {
  const [hovered, setHovered] = useState(false);
  const isLive = tool.status === "live";

  if (locked) {
    return (
      <div
        className="rounded-[13px] p-5 relative overflow-hidden"
        style={{
          background: "rgba(4,40,56,0.25)",
          border: "1px solid rgba(148,207,217,0.04)",
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-nerdio-muted z-10"
          style={{ background: "rgba(3,23,30,0.65)" }}
        >
          <LockIcon size={18} />
          <span className="text-[11px] mt-1">Contact admin for access</span>
        </div>
        <div style={{ opacity: 0.15 }}>
          <div className="w-11 h-11 rounded-[10px] flex items-center justify-center"
            style={{ background: "rgba(107,138,153,0.08)" }}>
            <ToolIcon icon={tool.icon} size={26} />
          </div>
          <div className="text-[14px] font-semibold text-white mt-2.5">{tool.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => isLive && onLaunch(tool)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="animate-fade-slide-in rounded-[13px] p-5 flex flex-col transition-all duration-300"
      style={{
        background: "rgba(4,40,56,0.55)",
        border: `1px solid ${hovered && isLive ? "rgba(30,157,184,0.3)" : "rgba(148,207,217,0.07)"}`,
        boxShadow: hovered && isLive ? "0 12px 40px rgba(30,157,184,0.1)" : "0 2px 8px rgba(0,0,0,0.15)",
        opacity: dimmed ? 0.55 : 1,
        cursor: isLive ? "pointer" : "default",
        transform: hovered && isLive ? "translateY(-3px)" : "none",
        animationDelay: `${index * 0.07}s`,
      }}
    >
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center"
          style={{
            color: isLive ? "#1e9db8" : "#6b8a99",
            background: isLive ? "rgba(30,157,184,0.08)" : "rgba(107,138,153,0.08)",
          }}
        >
          <ToolIcon icon={tool.icon} size={26} />
        </div>
        <div className="flex gap-[5px] items-center flex-wrap">
          {tool.env === "production" && (
            <span className="text-[9px] font-bold px-[6px] py-[2px] rounded"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", letterSpacing: "0.05em" }}>
              PROD
            </span>
          )}
          {tool.env === "staging" && (
            <span className="text-[9px] font-bold px-[6px] py-[2px] rounded"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", letterSpacing: "0.05em" }}>
              STAGING
            </span>
          )}
          {tool.version && (
            <span className="text-[9.5px] font-medium text-nerdio-muted px-1.5 py-0.5 rounded"
              style={{ background: "rgba(107,138,153,0.08)" }}>
              v{tool.version}
            </span>
          )}
          {!isLive && (
            <span
              className="text-[9.5px] font-semibold px-[7px] py-[2px] rounded"
              style={{
                background: tool.status === "coming_soon" ? "rgba(205,255,78,0.1)" : "rgba(148,207,217,0.08)",
                color: tool.status === "coming_soon" ? "#cdff4e" : "#94cfd9",
              }}
            >
              {tool.status === "coming_soon" ? "Soon" : "Planned"}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="text-[15px] font-semibold text-white mt-3.5" style={{ letterSpacing: "-0.01em" }}>
        {tool.name}
      </div>
      <p className="text-[12.5px] text-nerdio-muted leading-relaxed mt-1.5 flex-1">
        {tool.description}
      </p>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3.5 pt-3"
        style={{ borderTop: "1px solid rgba(148,207,217,0.05)" }}>
        {isLive ? (
          <span
            className="flex items-center gap-[5px] text-[12px] font-medium transition-colors"
            style={{ color: hovered ? "#cdff4e" : "#6b8a99" }}
          >
            <ProxyIcon size={13} /> Launch via proxy <ArrowIcon size={13} />
          </span>
        ) : (
          <span className="text-[11px] text-nerdio-muted">Notify when available</span>
        )}
      </div>
    </div>
  );
}
