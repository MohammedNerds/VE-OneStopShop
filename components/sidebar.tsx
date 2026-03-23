"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { ROLES, isAdmin, type Role, type UserProfile } from "@/lib/access";
import { GridIcon, UsersIcon, LogoutIcon, EyeOffIcon } from "@/components/icons";

interface SidebarProps {
  user: UserProfile;
  currentPath: string;
}

export function Sidebar({ user, currentPath }: SidebarProps) {
  const router = useRouter();

  const nav = [
    { path: "/dashboard", label: "Dashboard", icon: <GridIcon /> },
    ...(isAdmin(user.role)
      ? [{ path: "/admin", label: "Users & Access", icon: <UsersIcon /> }]
      : []),
  ];

  const role = ROLES[user.role];
  const initials = user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <nav
      className="w-[230px] flex flex-col justify-between sticky top-0 h-screen flex-shrink-0"
      style={{
        background: "#042838",
        borderRight: "1px solid rgba(148,207,217,0.06)",
      }}
    >
      <div>
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-[18px]"
          style={{ borderBottom: "1px solid rgba(148,207,217,0.05)" }}
        >
          <img
            src="https://getnerdio.com/wp-content/uploads/2026/01/nerdio-logo-square.png"
            alt="Nerdio"
            width={32}
            height={32}
            className="rounded-[7px] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <div className="font-semibold text-[14px] text-white" style={{ letterSpacing: "-0.02em" }}>
              VE Tools
            </div>
            <div className="text-[10px] text-nerdio-muted" style={{ letterSpacing: "0.04em" }}>
              PORTAL
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="p-[12px_10px]">
          {nav.map((item) => {
            const active = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-[9px] w-full py-[9px] px-[11px] rounded-[7px] text-[12.5px] font-medium font-poppins text-left mb-0.5 transition-all"
                style={{
                  background: active ? "rgba(30,157,184,0.1)" : "transparent",
                  color: active ? "#1e9db8" : "#6b8a99",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Security indicator */}
        <div
          className="mx-2.5 p-[10px_12px] flex items-center gap-2 rounded-lg text-nerdio-teal"
          style={{
            background: "rgba(30,157,184,0.04)",
            border: "1px solid rgba(30,157,184,0.08)",
          }}
        >
          <EyeOffIcon size={14} />
          <div>
            <div className="text-[10px] font-semibold text-nerdio-teal" style={{ letterSpacing: "0.03em" }}>
              SECURE MODE
            </div>
            <div className="text-[10px] text-nerdio-muted mt-0.5">Tool URLs hidden via proxy</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div
        className="flex items-center gap-[9px] px-3.5 py-3"
        style={{
          borderTop: "1px solid rgba(148,207,217,0.06)",
          background: "rgba(3,23,30,0.35)",
        }}
      >
        <div
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1e9db8, #94cfd9)" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-white truncate">{user.full_name}</div>
          <span
            className="inline-flex text-[9px] font-semibold px-[7px] py-[2px] rounded mt-0.5"
            style={{
              background: role?.color || "#6b8a99",
              color: role?.textColor || "#fff",
              letterSpacing: "0.02em",
            }}
          >
            {role?.label || user.role}
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center justify-center w-[30px] h-[30px] rounded-md text-nerdio-muted hover:text-white transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            title="Sign out"
          >
            <LogoutIcon size={18} />
          </button>
        </form>
      </div>
    </nav>
  );
}
