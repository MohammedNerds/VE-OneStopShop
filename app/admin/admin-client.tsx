"use client";

import { useState } from "react";
import { type UserProfile, ROLES, isAdmin, type Role } from "@/lib/access";
import { TOOL_CATALOG } from "@/lib/tools";
import { Sidebar } from "@/components/sidebar";
import { ToolIcon, PlusIcon, CheckIcon, MailIcon, CloseIcon, TrashIcon, EyeOffIcon } from "@/components/icons";

interface Props {
  currentUser: UserProfile;
  initialUsers: UserProfile[];
}

export function AdminClient({ currentUser, initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [modal, setModal] = useState<string | null>(null); // null | "invite" | userId
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<Role>("ae");
  const [invTools, setInvTools] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── API calls ──
  const updateUser = async (userId: string, data: Record<string, any>) => {
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...data }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      notify(`Error: ${err.error}`);
      return false;
    }
    return true;
  };

  const toggleTool = async (userId: string, toolId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const has = (user.tool_access || []).includes(toolId);
    const newAccess = has
      ? (user.tool_access || []).filter((t) => t !== toolId)
      : [...(user.tool_access || []), toolId];

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tool_access: newAccess } : u))
    );

    const ok = await updateUser(userId, { toolAccess: newAccess });
    if (!ok) {
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tool_access: user.tool_access } : u))
      );
    }
  };

  const changeRole = async (userId: string, newRole: Role) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const ok = await updateUser(userId, { role: newRole });
    if (ok) {
      notify("Role updated");
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: user.role } : u))
      );
    }
  };

  const disableUser = async (userId: string) => {
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setSaving(false);

    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "disabled" as const } : u))
      );
      notify("User disabled");
    }
  };

  const inviteUser = async () => {
    if (!invEmail.trim()) return;
    setSaving(true);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: invEmail, role: invRole, toolAccess: invTools }),
    });

    setSaving(false);
    if (res.ok) {
      notify(`Invite sent to ${invEmail}`);
      setModal(null);
      setInvEmail("");
      setInvTools([]);
    } else {
      const err = await res.json();
      notify(`Error: ${err.error}`);
    }
  };

  const editingUser = users.find((u) => u.id === modal && modal !== "invite");

  return (
    <div className="flex min-h-screen font-poppins" style={{ background: "#03171e" }}>
      <Sidebar user={currentUser} currentPath="/admin" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-7">
          {/* Toast */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 py-2.5 px-[18px] rounded-[9px] text-[13px] font-medium font-poppins flex items-center gap-[7px] animate-fade-slide-in"
              style={{ background: "#22c55e", color: "#042838", boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
              <CheckIcon size={14} /> {toast}
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start mb-7 flex-wrap gap-3.5">
            <div>
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: "-0.025em" }}>
                Users & Access Control
              </h1>
              <p className="text-[13px] text-nerdio-muted mt-[3px]">
                {users.filter((u) => u.status === "active").length} active users · Per-user tool grants
              </p>
            </div>
            <button
              onClick={() => setModal("invite")}
              className="inline-flex items-center gap-1.5 py-[9px] px-4 rounded-[7px] text-[12.5px] font-semibold font-poppins"
              style={{ background: "#cdff4e", color: "#042838", border: "none", cursor: "pointer" }}
            >
              <PlusIcon size={16} /> Invite User
            </button>
          </div>

          {/* Info box */}
          <div className="p-4 rounded-[10px] mb-6"
            style={{ background: "rgba(30,157,184,0.04)", border: "1px solid rgba(30,157,184,0.08)" }}>
            <p className="text-[12.5px] leading-relaxed" style={{ color: "#94cfd9" }}>
              <strong className="text-white">Per-user tool access:</strong> Each user is individually granted access to specific tools. Admins and Super Admins automatically see all tools. Click "manage" on a user row to toggle their tool access.
            </p>
          </div>

          {/* Users table */}
          <div className="rounded-[11px] overflow-auto"
            style={{ background: "rgba(4,40,56,0.35)", border: "1px solid rgba(148,207,217,0.06)" }}>
            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["User", "Role", "Status", "Tool Access", "Last Login", ""].map((h, i) => (
                    <th key={h || i} className="py-2.5 px-3.5 text-left text-[10.5px] font-semibold text-nerdio-muted uppercase whitespace-nowrap"
                      style={{
                        letterSpacing: "0.04em",
                        borderBottom: "1px solid rgba(148,207,217,0.06)",
                        background: "rgba(3,23,30,0.35)",
                        ...(i === 5 ? { textAlign: "right", width: 60 } : {}),
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const r = ROLES[u.role as Role];
                  const initials = u.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(148,207,217,0.03)" }}>
                      {/* User */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, #1e9db8, #94cfd9)", opacity: u.status === "disabled" ? 0.4 : 1 }}>
                            {initials}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-white">{u.full_name}</div>
                            <div className="text-[11px] text-nerdio-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="py-2.5 px-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                          className="py-[5px] px-2 rounded-[5px] text-white text-[11.5px] font-poppins"
                          style={{
                            background: "rgba(3,23,30,0.5)",
                            border: "1px solid rgba(148,207,217,0.15)",
                            cursor: "pointer",
                          }}
                        >
                          {Object.entries(ROLES).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      {/* Status */}
                      <td className="py-2.5 px-3.5">
                        <span className="inline-flex items-center gap-[5px]">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: u.status === "active" ? "#22c55e" : u.status === "invited" ? "#f59e0b" : "#ff4d6a",
                            }}
                          />
                          <span className="text-[12px] text-nerdio-muted capitalize">{u.status}</span>
                        </span>
                      </td>
                      {/* Tool Access */}
                      <td className="py-2.5 px-3.5">
                        {isAdmin(u.role as Role) ? (
                          <span className="text-[11px] text-nerdio-teal font-medium">All tools (admin)</span>
                        ) : (
                          <button
                            onClick={() => setModal(u.id)}
                            className="flex items-center rounded-md py-1 px-2.5 transition-all"
                            style={{
                              background: "none",
                              border: "1px solid rgba(148,207,217,0.1)",
                              cursor: "pointer",
                            }}
                          >
                            <span className="text-[12px] font-medium" style={{ color: "#94cfd9" }}>
                              {(u.tool_access || []).length} / {TOOL_CATALOG.length}
                            </span>
                            <span className="text-[10px] text-nerdio-muted ml-1">manage →</span>
                          </button>
                        )}
                      </td>
                      {/* Last Login */}
                      <td className="py-2.5 px-3.5">
                        <span className="text-[12px] text-nerdio-muted">
                          {u.last_login
                            ? new Date(u.last_login).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right">
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => disableUser(u.id)}
                            className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-md transition-colors hover:text-red-400"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "rgba(255,77,106,0.5)",
                            }}
                            title="Disable user"
                          >
                            <TrashIcon size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Access Matrix */}
          <div className="mt-8">
            <h2 className="text-[12px] font-semibold text-nerdio-muted uppercase mb-3.5"
              style={{ letterSpacing: "0.05em" }}>
              Access Matrix
            </h2>
            <div className="rounded-[11px] overflow-auto"
              style={{ background: "rgba(4,40,56,0.35)", border: "1px solid rgba(148,207,217,0.06)" }}>
              <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="py-2.5 px-3.5 text-left text-[10.5px] font-semibold text-nerdio-muted uppercase"
                      style={{ letterSpacing: "0.04em", borderBottom: "1px solid rgba(148,207,217,0.06)", background: "rgba(3,23,30,0.35)" }}>
                      Tool
                    </th>
                    {users.filter(u => u.status !== "disabled").map((u) => (
                      <th key={u.id} className="py-2.5 px-2 text-center text-[10px] font-semibold text-nerdio-muted"
                        style={{ borderBottom: "1px solid rgba(148,207,217,0.06)", background: "rgba(3,23,30,0.35)", maxWidth: 80 }}>
                        {u.full_name?.split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOOL_CATALOG.map((tool) => (
                    <tr key={tool.id} style={{ borderBottom: "1px solid rgba(148,207,217,0.03)" }}>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <span style={{ color: tool.status === "live" ? "#1e9db8" : "#6b8a99" }}>
                            <ToolIcon icon={tool.icon} size={16} />
                          </span>
                          <span className="text-[12px] text-white font-medium">{tool.name}</span>
                          {tool.status !== "live" && (
                            <span className="text-[9px] text-nerdio-muted italic">
                              {tool.status === "coming_soon" ? "soon" : "planned"}
                            </span>
                          )}
                        </div>
                      </td>
                      {users.filter(u => u.status !== "disabled").map((u) => {
                        const hasAccess = isAdmin(u.role as Role) || (u.tool_access || []).includes(tool.id);
                        const isAdminUser = isAdmin(u.role as Role);
                        return (
                          <td key={u.id} className="py-2.5 px-2 text-center">
                            {isAdminUser ? (
                              <span style={{ color: "#22c55e", opacity: 0.7 }}><CheckIcon size={14} /></span>
                            ) : (
                              <button
                                onClick={() => toggleTool(u.id, tool.id)}
                                className="inline-flex items-center justify-center p-1"
                                style={{ background: "none", border: "none", cursor: "pointer" }}
                              >
                                {hasAccess ? (
                                  <span style={{ color: "#22c55e" }}><CheckIcon size={14} /></span>
                                ) : (
                                  <span style={{ color: "rgba(107,138,153,0.25)", fontSize: 16 }}>○</span>
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Invite Modal ── */}
          {modal === "invite" && (
            <ModalOverlay onClose={() => setModal(null)}>
              <ModalContent title="Invite New User" onClose={() => setModal(null)}>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: "#94cfd9", letterSpacing: "0.02em" }}>Email address</label>
                    <input
                      type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)}
                      placeholder="colleague@nerdio.net" autoFocus
                      className="w-full py-3 px-3.5 rounded-[9px] text-white text-[13.5px] font-poppins transition-all"
                      style={{ background: "rgba(3,23,30,0.55)", border: "1px solid rgba(148,207,217,0.12)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: "#94cfd9" }}>Role</label>
                    <select value={invRole} onChange={(e) => setInvRole(e.target.value as Role)}
                      className="w-full py-2 px-2.5 rounded-md text-white text-[12px] font-poppins"
                      style={{ background: "rgba(3,23,30,0.5)", border: "1px solid rgba(148,207,217,0.15)", cursor: "pointer" }}>
                      {Object.entries(ROLES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label} — {v.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: "#94cfd9" }}>Grant tool access</label>
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      {TOOL_CATALOG.map((t) => {
                        const on = invTools.includes(t.id);
                        return (
                          <ToolToggle key={t.id} tool={t} on={on} onToggle={() => {
                            setInvTools((prev) => on ? prev.filter((x) => x !== t.id) : [...prev, t.id]);
                          }} />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-1">
                    <button onClick={() => setModal(null)}
                      className="inline-flex items-center gap-1.5 py-[9px] px-4 rounded-[7px] text-[12.5px] font-medium font-poppins text-nerdio-muted"
                      style={{ background: "transparent", border: "1px solid rgba(148,207,217,0.12)", cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={inviteUser} disabled={saving}
                      className="inline-flex items-center gap-1.5 py-[9px] px-4 rounded-[7px] text-[12.5px] font-semibold font-poppins"
                      style={{ background: "#cdff4e", color: "#042838", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                      Send Invite <MailIcon size={15} />
                    </button>
                  </div>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}

          {/* ── Edit User Tool Access Modal ── */}
          {editingUser && (
            <ModalOverlay onClose={() => setModal(null)}>
              <ModalContent title={`Tool Access — ${editingUser.full_name}`} onClose={() => setModal(null)}>
                <p className="text-[12px] text-nerdio-muted mb-4">
                  Toggle which tools this user can see and launch. Changes save automatically.
                </p>
                <div className="flex flex-col gap-1.5">
                  {TOOL_CATALOG.map((t) => {
                    const on = (editingUser.tool_access || []).includes(t.id);
                    return (
                      <ToolToggle key={t.id} tool={t} on={on} showDesc onToggle={() => toggleTool(editingUser.id, t.id)} />
                    );
                  })}
                </div>
                <button onClick={() => setModal(null)}
                  className="w-full mt-4 py-[9px] rounded-[7px] text-[12.5px] font-semibold font-poppins"
                  style={{ background: "#cdff4e", color: "#042838", border: "none", cursor: "pointer" }}>
                  Done
                </button>
              </ModalContent>
            </ModalOverlay>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Helper components ──

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(3,23,30,0.82)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      {children}
    </div>
  );
}

function ModalContent({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[480px] rounded-[14px] max-h-[85vh] overflow-auto animate-fade-slide-in"
      style={{ background: "#042838", border: "1px solid rgba(148,207,217,0.12)" }}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center px-[22px] py-4"
        style={{ borderBottom: "1px solid rgba(148,207,217,0.07)" }}>
        <h2 className="text-[16px] font-semibold text-white">{title}</h2>
        <button onClick={onClose}
          className="flex items-center justify-center w-[30px] h-[30px] rounded-md text-nerdio-muted"
          style={{ background: "none", border: "none", cursor: "pointer" }}>
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="p-[22px]">{children}</div>
    </div>
  );
}

function ToolToggle({ tool, on, onToggle, showDesc }: { tool: any; on: boolean; onToggle: () => void; showDesc?: boolean }) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-2.5 py-[9px] px-3 rounded-lg text-left font-poppins transition-all"
      style={{
        border: `1px solid ${on ? "#1e9db8" : "rgba(148,207,217,0.1)"}`,
        background: on ? "rgba(30,157,184,0.06)" : "transparent",
        cursor: "pointer",
      }}>
      <span className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          border: `1.5px solid ${on ? "#1e9db8" : "#6b8a99"}`,
          background: on ? "#1e9db8" : "transparent",
        }}>
        {on && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-nerdio-teal flex-shrink-0"><ToolIcon icon={tool.icon} size={16} /></span>
      <div className="flex-1 min-w-0">
        <div className={`text-[12.5px] font-medium ${on ? "text-white" : "text-nerdio-muted"}`}>{tool.name}</div>
        {showDesc && <div className="text-[10.5px] text-nerdio-muted mt-0.5 truncate">{tool.description}</div>}
      </div>
      {tool.status !== "live" && (
        <span className="text-[9px] text-nerdio-muted flex-shrink-0">{tool.status === "coming_soon" ? "soon" : "planned"}</span>
      )}
    </button>
  );
}
