import clsx from "clsx";

type ConnectionBadgeProps = {
  /**
   * `online`: 10A "Live Connection" pill. `live`: 03 "Connection Status" pill. `synced`: 07
   * "Catalog Sync" pill (same shape as `live`).
   */
  variant?: "online" | "live" | "synced";
  className?: string;
};

const BADGE_LABELS = {
  online: "En línea",
  live: "En vivo",
  synced: "Sincronizado",
} as const;

/** Green connection pill of the top bar. */
export function ConnectionBadge({ variant = "online", className }: ConnectionBadgeProps) {
  return (
    <div
      role="status"
      className={clsx(
        "h-8 items-center gap-[7px] bg-success-bg px-[11px]",
        variant === "online" ? "rounded-[16px]" : "rounded-nav",
        className ?? "flex",
      )}
    >
      <span aria-hidden="true" className="size-[7px] rounded-full bg-success" />
      <span className="text-[11px] font-bold whitespace-nowrap text-success">
        {BADGE_LABELS[variant]}
      </span>
    </div>
  );
}
