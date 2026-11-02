import clsx from "clsx";
import { CARD_COPY } from "./print-card";
import { QrCode } from "./QrCode";
import type { PrintCard } from "./print-selection";

/**
 * 09D "Printable Card": 320×470 cream card with a 2px brand outline, the brand, the table, the
 * QR in its white frame, the call to action and the description. Keeps the export's print sizes
 * (13/34/13/9px), not the admin type scale.
 */
export function PrintableCard({ card, className }: { card: PrintCard; className?: string }) {
  return (
    <article
      aria-label={`Tarjeta QR de ${card.label}`}
      className={clsx(
        "flex h-[470px] w-[320px] shrink-0 flex-col items-center gap-3.5 rounded-card bg-cream px-[30px] py-7 outline-2 -outline-offset-1 outline-brand break-inside-avoid",
        className,
      )}
    >
      <p className="text-[13px] font-bold tracking-[1.4px] whitespace-nowrap text-brand">{CARD_COPY.brand}</p>
      <p className="text-[34px] font-bold whitespace-nowrap text-ink">{card.title}</p>
      <div className="flex h-[240px] w-[220px] shrink-0 flex-col items-center rounded-[16px] bg-surface p-[22px] outline-1 -outline-offset-[0.5px] outline-line">
        <div className="flex size-[190px] shrink-0 items-center justify-center rounded-[4px] bg-surface outline-1 -outline-offset-[0.5px] outline-ink">
          <QrCode value={card.url} size={158} label={`Código QR de ${card.label}`} className="text-ink" />
        </div>
      </div>
      <p className="text-center text-[13px] font-bold whitespace-nowrap text-brand">{CARD_COPY.cta}</p>
      <p className="w-full text-center text-[9px]/[12px] text-ink">{CARD_COPY.description}</p>
    </article>
  );
}
