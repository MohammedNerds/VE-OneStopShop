#!/usr/bin/env node

/**
 * VE-Tools: Add New Tool Helper
 *
 * Usage: node scripts/add-tool.mjs
 *
 * Walks you through adding a new tool and outputs:
 * 1. The TOOL_CATALOG entry to paste into lib/tools.ts
 * 2. The env var to add
 * 3. The SQL to grant access
 * 4. A reminder checklist
 */

import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function toEnvVar(id) {
  return `TOOL_URL_${id.toUpperCase().replace(/-/g, "_")}`;
}

async function main() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   VE-Tools: Add New Tool Wizard      ║");
  console.log("╚══════════════════════════════════════╝\n");

  const name = await ask("Tool name (e.g., Deal Scorecard): ");
  const id =
    (await ask(
      `Tool ID [${name.toLowerCase().replace(/\s+/g, "-")}]: `
    )) || name.toLowerCase().replace(/\s+/g, "-");
  const description = await ask("Description (one line): ");
  const deployUrl = await ask("Deployment URL (e.g., https://ve-dealcard.vercel.app): ");
  const status = (await ask("Status [live/coming_soon/planned] (default: live): ")) || "live";
  const version = status === "live" ? (await ask("Version (e.g., 1.0.0): ")) || "1.0.0" : null;
  const icon = (await ask("Icon key [calculator/clock/briefcase/shield/rocket/chart]: ")) || "chart";
  const category = (await ask("Category (e.g., analysis/planning/pipeline/strategy): ")) || "analysis";

  const envVar = toEnvVar(id);

  console.log("\n" + "═".repeat(60));
  console.log("\n1️⃣  ADD TO lib/tools.ts — paste this into the TOOL_CATALOG array:\n");
  console.log(`  {
    id: "${id}",
    name: "${name}",
    description: "${description}",
    icon: "${icon}",
    status: "${status}",
    version: ${version ? `"${version}"` : "null"},
    category: "${category}",
  },`);

  console.log("\n2️⃣  SET ENVIRONMENT VARIABLE:\n");
  console.log(`  Local (.env.local):     ${envVar}=${deployUrl || "http://localhost:300X"}`);
  console.log(`  Vercel (production):    ${envVar}=${deployUrl}`);

  console.log("\n3️⃣  TOOL-SIDE SETUP (in the tool's repo):\n");
  console.log("  cp tool-side-middleware-template.ts /path/to/tool-repo/middleware.ts");
  console.log("  cp tool-side-vercel-config-template.json /path/to/tool-repo/vercel.json");
  console.log("  Add PROXY_SECRET to the tool's .env.local and Vercel env vars");

  console.log("\n4️⃣  GRANT ACCESS — run in Supabase SQL Editor:\n");
  console.log(`  -- Grant to all VE team members
  UPDATE public.profiles
  SET tool_access = array_append(tool_access, '${id}')
  WHERE role IN ('ve', 'ae', 'se') AND status = 'active'
    AND NOT ('${id}' = ANY(tool_access));

  -- Or grant to specific user
  UPDATE public.profiles
  SET tool_access = array_append(tool_access, '${id}')
  WHERE email = 'user@nerdio.net';`);

  console.log("\n5️⃣  DEPLOY & VERIFY:\n");
  console.log("  git add lib/tools.ts");
  console.log(`  git commit -m "feat: add ${name} tool"`);
  console.log("  git push");
  console.log("  Then verify: GET /api/health (should show no missing env vars)");

  console.log("\n" + "═".repeat(60));
  console.log("✅ Done! The tool will appear on the dashboard for granted users.\n");

  rl.close();
}

main().catch(console.error);
