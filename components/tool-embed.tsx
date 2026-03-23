"use client";

import { type Tool } from "@/lib/tools";
import { ToolIcon, CloseIcon, LockIcon } from "@/components/icons";

interface ToolEmbedProps {
  tool: Tool;
  onClose: () => void;
}

export function ToolEmbed({ tool, onClose }: ToolEmbedProps) {
  // This is the ONLY URL the browser sees — goes through the proxy
  const proxyUrl = `/api/proxy/${tool.id}`;

  return (
    <div className="flex flex-col h-screen">
      {/* Header bar */}
      <div
        className="flex justify-between items-center px-[18px] py-[10px] flex-shrink-0 flex-wrap gap-2"
        style={{
          background: "#042838",
          borderBottom: "1px solid rgba(148,207,217,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-nerdio-teal">
            <ToolIcon icon={tool.icon} size={22} />
          </span>
          <span className="text-[14px] font-semibold text-white">{tool.name}</span>
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
        </div>

        <div className="flex items-center gap-3">
          {/* Show the proxy URL — proves to user the real URL is hidden */}
          <div
            className="flex items-center gap-[5px] py-[5px] px-2.5 rounded-md"
            style={{
              background: "rgba(3,23,30,0.5)",
              border: "1px solid rgba(148,207,217,0.08)",
            }}
          >
            <LockIcon size={12} className="text-nerdio-teal" />
            <code className="text-[11px] text-nerdio-teal-light">/api/proxy/{tool.id}</code>
            <span className="text-[10px] text-nerdio-muted ml-1">← user sees only this</span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center w-[30px] h-[30px] rounded-md text-nerdio-muted hover:text-white transition-colors"
            style={{
              background: "rgba(148,207,217,0.06)",
              border: "1px solid rgba(148,207,217,0.08)",
              cursor: "pointer",
            }}
            title="Close"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Iframe — loads through our proxy, not the real tool URL */}
      <iframe
        src={proxyUrl}
        className="flex-1 w-full border-none"
        style={{ background: "#ffffff" }}
        title={tool.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
