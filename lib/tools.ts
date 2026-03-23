// ═══════════════════════════════════════════════════════════════
// TOOL CATALOG — Client-safe tool definitions
// ═══════════════════════════════════════════════════════════════
// SECURITY: No deployment URLs exist in this file.
// Real URLs live in server-only env vars (TOOL_URL_*) and are
// resolved ONLY inside /api/proxy/[...path]/route.ts
// ═══════════════════════════════════════════════════════════════

export type ToolStatus = "live" | "coming_soon" | "planned";
export type ToolEnv = "production" | "staging" | null;

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string; // icon key for the Icons component
  status: ToolStatus;
  version: string | null;
  category: string;
  env: ToolEnv; // shows a colored badge: "PROD" or "STAGING"
}

export const TOOL_CATALOG: Tool[] = [
  // ═══════════════════════════════════════════════════════
  // LIVE TOOLS — these proxy to real deployments
  // ═══════════════════════════════════════════════════════
  {
    id: "tco-calc-prod",
    name: "TCO Calculator",
    description:
      "Citrix to AVD Total Cost of Ownership analysis. One number in, full business case out. Production version for customer-facing use.",
    icon: "calculator",
    status: "live",
    version: "2.4.1",
    category: "analysis",
    env: "production",
    // Repo: MohammedNerds/tco-calc-prod
    // Vercel: https://tco-calc-prod-eight.vercel.app
    // Env var: TOOL_URL_TCO_CALC_PROD
  },
  {
    id: "tco-calc-test",
    name: "TCO Calculator (Staging)",
    description:
      "Staging environment for the TCO Calculator. Use for testing new features, UI changes, and data model updates before promoting to production.",
    icon: "calculator",
    status: "live",
    version: "dev",
    category: "analysis",
    env: "staging",
    // Repo: MohammedNerds/tco-calc-test
    // Vercel: https://tco-calc-test-ten.vercel.app
    // Env var: TOOL_URL_TCO_CALC_TEST
  },

  // ═══════════════════════════════════════════════════════
  // FUTURE TOOLS — coming_soon and planned
  // ═══════════════════════════════════════════════════════
  {
    id: "reverse-timeline",
    name: "Reverse Timeline",
    description:
      "Work backwards from go-live date to build deal milestones, identify dependencies, and create urgency frameworks for deal acceleration.",
    icon: "clock",
    status: "coming_soon",
    version: null,
    category: "planning",
    env: null,
  },
  {
    id: "business-case-builder",
    name: "Business Case Builder",
    description:
      "Generate executive-ready business cases with ROI projections, risk analysis, and competitive displacement narratives.",
    icon: "briefcase",
    status: "coming_soon",
    version: null,
    category: "analysis",
    env: null,
  },
  {
    id: "competitive-intel",
    name: "Competitive Intelligence",
    description:
      "Real-time competitive positioning against Citrix, VMware/Omnissa, and EUC vendors with battlecard generation.",
    icon: "shield",
    status: "planned",
    version: null,
    category: "strategy",
    env: null,
  },
  {
    id: "deal-accelerator",
    name: "Deal Accelerator",
    description:
      "Pipeline analytics, deal velocity tracking, stuck deal identification, and action plan generation.",
    icon: "rocket",
    status: "planned",
    version: null,
    category: "pipeline",
    env: null,
  },
  {
    id: "roi-analyzer",
    name: "ROI Analyzer",
    description:
      "Customer-specific ROI modeling with industry benchmarks and peer comparison data for executive presentations.",
    icon: "chart",
    status: "planned",
    version: null,
    category: "analysis",
    env: null,
  },
];

/**
 * SERVER-ONLY: Resolve a tool ID to its real deployment URL.
 * Called only inside API routes — never imported by client components.
 *
 * CONVENTION: Tool ID "my-cool-tool" → env var TOOL_URL_MY_COOL_TOOL
 * This means you NEVER need to edit this function when adding a tool.
 * Just:
 *   1. Add the tool to TOOL_CATALOG above
 *   2. Set the env var: TOOL_URL_MY_COOL_TOOL=https://...
 * That's it.
 */
export function getToolUrl(toolId: string): string | undefined {
  // Convert tool ID to env var name: "tco-calculator" → "TOOL_URL_TCO_CALCULATOR"
  const envKey = `TOOL_URL_${toolId.toUpperCase().replace(/-/g, "_")}`;
  return process.env[envKey];
}

/**
 * Validate that all "live" tools have their env var configured.
 * Call this at startup or in a health check route.
 */
export function validateToolConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const tool of TOOL_CATALOG) {
    if (tool.status === "live") {
      const envKey = `TOOL_URL_${tool.id.toUpperCase().replace(/-/g, "_")}`;
      if (!process.env[envKey]) {
        missing.push(`${tool.id} → ${envKey}`);
      }
    }
  }
  return { valid: missing.length === 0, missing };
}
