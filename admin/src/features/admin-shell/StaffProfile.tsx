import clsx from "clsx";

type StaffProfileProps = {
  name: string;
  role: string;
  /** 03 sets the name and role at 12/10px instead of 13/11px, 16px away from the avatar. */
  compact?: boolean;
};

/**
 * Avatar plus name and role ("Staff Avatar" / "Staff Profile"), 02/03 scale: 34px avatar, 13/11px
 * copy. Below `md` only a 32px avatar shows.
 */
export function StaffProfile({ name, role, compact = false }: StaffProfileProps) {
  return (
    <div className={clsx("flex items-center", compact ? "md:gap-4" : "md:gap-2.5")}>
      <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-brand md:size-[34px]" />
      <div className="hidden flex-col gap-px whitespace-nowrap md:flex">
        <p className={clsx("font-bold text-ink", compact ? "text-[12px]" : "text-[13px]")}>{name}</p>
        <p className={clsx("text-muted", compact ? "text-[10px]" : "text-[11px]")}>{role}</p>
      </div>
    </div>
  );
}
