// ═══════════════════════════════════════════════════════════════
// ACCESS CONTROL — Roles, permissions, types
// ═══════════════════════════════════════════════════════════════

export type Role =
  | "super_admin"
  | "admin"
  | "ve"
  | "ae"
  | "se"
  | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  tool_access: string[]; // array of tool IDs
  status: "active" | "invited" | "disabled";
  last_login: string | null;
  created_at: string;
}

export const ROLES: Record<
  Role,
  { label: string; color: string; textColor: string; tier: number; description: string }
> = {
  super_admin: {
    label: "Super Admin",
    color: "#cdff4e",
    textColor: "#042838",
    tier: 0,
    description: "Full access to all tools, users, and settings",
  },
  admin: {
    label: "Admin",
    color: "#1e9db8",
    textColor: "#ffffff",
    tier: 1,
    description: "Full access to all tools and user management",
  },
  ve: {
    label: "Value Engineer",
    color: "#3db8d4",
    textColor: "#ffffff",
    tier: 2,
    description: "Access to assigned VE tools",
  },
  ae: {
    label: "Account Executive",
    color: "#94cfd9",
    textColor: "#042838",
    tier: 3,
    description: "Access to customer-facing tools",
  },
  se: {
    label: "Sales Engineer",
    color: "#5e95a5",
    textColor: "#ffffff",
    tier: 3,
    description: "Access to technical tools",
  },
  viewer: {
    label: "Viewer",
    color: "#6b8a99",
    textColor: "#ffffff",
    tier: 4,
    description: "Read-only access to shared outputs",
  },
};

/**
 * Check if a role has admin privileges (super_admin or admin)
 */
export function isAdmin(role: Role): boolean {
  return role === "super_admin" || role === "admin";
}

/**
 * Check if a user can access a specific tool.
 * Admins/super_admins can access ALL tools.
 * Others need the tool in their tool_access array.
 */
export function canAccessTool(
  userRole: Role,
  userToolAccess: string[],
  toolId: string
): boolean {
  if (isAdmin(userRole)) return true;
  return userToolAccess.includes(toolId);
}

/**
 * Get the list of tool IDs a user can access.
 * For admins, returns null (meaning "all tools").
 * For others, returns their tool_access array.
 */
export function getAccessibleToolIds(
  userRole: Role,
  userToolAccess: string[]
): string[] | null {
  if (isAdmin(userRole)) return null; // null = all
  return userToolAccess;
}
