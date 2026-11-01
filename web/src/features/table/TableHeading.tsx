import type { TableViewCopy } from "./table-copy";

type TableHeadingProps = {
  heading: TableViewCopy["heading"];
};

/** Heading of screen 07: editorial two-line heading (07, 07C) or a display title (07D). */
export function TableHeading({ heading }: TableHeadingProps) {
  if (heading.kind === "display") {
    return (
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-[32px] leading-[1.15] font-bold text-ink">{heading.title}</h2>
        <p className="text-[10.5px] text-muted">{heading.supporting}</p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <h2 className="flex shrink-0 flex-col">
        <span className="text-[24px] leading-tight font-bold tracking-[-0.7px] text-ink">{heading.line}</span>
        <span className="font-display text-[34px] leading-none font-bold text-brand">{heading.accent}</span>
      </h2>
      {heading.supporting ? (
        <p className="pb-1 text-[10.5px] leading-[13px] text-muted">{heading.supporting}</p>
      ) : null}
    </div>
  );
}
