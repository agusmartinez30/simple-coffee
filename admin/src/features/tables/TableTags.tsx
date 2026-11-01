import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { DetailTone } from "./table-detail";

/** Background, text, dot and selection-outline classes of each status tone. */
export const TONE_CLASSES: Record<DetailTone, { wash: string; text: string; dot: string; outline: string }> = {
  success: { wash: "bg-success-bg", text: "text-success", dot: "bg-success", outline: "outline-success" },
  brand: { wash: "bg-brand-wash", text: "text-brand", dot: "bg-brand", outline: "outline-brand" },
  warning: { wash: "bg-warning-bg", text: "text-warning", dot: "bg-warning", outline: "outline-warning" },
  danger: { wash: "bg-danger-bg", text: "text-danger", dot: "bg-danger", outline: "outline-danger" },
  neutral: { wash: "bg-cream", text: "text-muted", dot: "bg-muted", outline: "outline-line" },
};

type StatusBadgeProps = {
  label: string;
  tone: DetailTone;
};

/** Rounded "Status Badge" / "Panel Status" pill with its "Badge Dot". */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={clsx(
        "inline-flex h-7 w-fit shrink-0 items-center gap-[7px] rounded-[14px] px-2.5",
        classes.wash,
      )}
    >
      <span aria-hidden="true" className={clsx("size-[7px] shrink-0 rounded-full", classes.dot)} />
      <span className={clsx("text-[11px] font-bold whitespace-nowrap", classes.text)}>{label}</span>
    </span>
  );
}

type InfoTagProps = {
  icon: LucideIcon;
  label: string;
  tone: DetailTone;
};

/** Square-ish "Card Alert" / "Payment Preference" tag with a 14px icon. */
export function InfoTag({ icon: Icon, label, tone }: InfoTagProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={clsx(
        "inline-flex h-7 w-fit shrink-0 items-center gap-[7px] rounded-[7px] px-2.5",
        classes.wash,
        classes.text,
      )}
    >
      <Icon size={14} aria-hidden="true" className="shrink-0" />
      <span className="text-[11px] font-bold whitespace-nowrap">{label}</span>
    </span>
  );
}
