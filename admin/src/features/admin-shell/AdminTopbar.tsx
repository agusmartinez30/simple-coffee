"use client";

import { usePathname } from "next/navigation";
import { Bell, ShieldCheck } from "lucide-react";
import { useSession, type StaffRole } from "@/features/auth";
import { ConnectionBadge } from "./ConnectionBadge";
import { StaffProfile } from "./StaffProfile";
import { getTopbarConfig } from "./navigation";

const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: "Titular",
  MANAGER: "Gerente",
  STAFF: "Personal",
};

/**
 * Round "Notifications" button with the 7px unread dot of the 03 top bar, or without a dot and
 * with the 17px bell of 06.
 */
function NotificationsButton({ dot }: { dot: "small" | "none" }) {
  if (dot === "none") {
    return (
      <button
        type="button"
        aria-label="Notificaciones"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink"
      >
        <Bell size={17} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Notificaciones (sin leer)"
      className="relative size-10 shrink-0 rounded-full bg-cream text-ink"
    >
      <Bell size={18} aria-hidden="true" className="absolute top-[11px] left-[11px]" />
      <span aria-hidden="true" className="absolute top-2 left-[25px] size-[7px] rounded-full bg-danger" />
    </button>
  );
}

/**
 * White top bar ("AdminTopbar" / "Topbar · Desktop"). Modules pick the layout of their
 * export through `NavItem.topbar`: the 10A section title, the 03 branch and shift with the
 * "En vivo" pill, the 06 branch with the "Administrador" pill, or the 07 "Carta digital" title with
 * the "Sincronizado" pill. The staff profile is the signed-in member from `GET /auth/me` (blank
 * until it answers).
 */
export function AdminTopbar() {
  const pathname = usePathname();
  const { variant, title } = getTopbarConfig(pathname);
  const session = useSession();
  const staff = session.status === "ready" ? session.staff : null;
  const staffName = staff?.name ?? "";
  const staffRole = staff ? ROLE_LABELS[staff.role] : "";

  return (
    <header className="sticky top-0 z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-line bg-surface px-7">
      <h1 className="text-[13px] font-semibold whitespace-nowrap text-ink">{title}</h1>
      {variant === "live-location" && (
        <div className="flex items-center gap-4">
          <ConnectionBadge variant="live" />
          <NotificationsButton dot="small" />
          <StaffProfile name={staffName} role={staffRole} compact />
        </div>
      )}
      {variant === "catalog" && (
        <div className="flex items-center gap-4">
          <ConnectionBadge variant="synced" />
          <NotificationsButton dot="none" />
          <StaffProfile name={staffName} role={staffRole} compact />
        </div>
      )}
      {variant === "admin-location" && (
        <div className="flex items-center gap-4">
          <p className="flex h-8 items-center gap-[7px] rounded-nav bg-brand-wash px-[11px] text-brand">
            <ShieldCheck size={13} aria-hidden="true" className="shrink-0" />
            <span className="text-[11px] font-bold whitespace-nowrap">Administrador</span>
          </p>
          <NotificationsButton dot="none" />
          <StaffProfile name={staffName} role={staffRole} compact />
        </div>
      )}
      {variant === "section" && (
        <div className="flex items-center gap-3.5">
          <ConnectionBadge variant="online" />
          <button
            type="button"
            aria-label="Notificaciones"
            className="flex size-[18px] items-center justify-center text-ink"
          >
            <Bell size={18} aria-hidden="true" />
          </button>
          <StaffProfile name={staffName} role={staffRole} />
        </div>
      )}
    </header>
  );
}
