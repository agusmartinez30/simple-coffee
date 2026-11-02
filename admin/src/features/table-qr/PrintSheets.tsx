import clsx from "clsx";
import { CARD_COPY } from "./print-card";
import { PrintableCard } from "./PrintCards";
import { QrCode } from "./QrCode";
import type { PrintCard } from "./print-selection";

/** Compact card for six per sheet: the 09D sheet card scaled to a 63×138mm cell. */
function CompactPrintCard({ card }: { card: PrintCard }) {
  return (
    <article
      aria-label={`Tarjeta QR de ${card.label}`}
      className="flex size-full flex-col items-center justify-center gap-2 bg-cream outline-1 -outline-offset-[0.5px] outline-line"
    >
      <p className="text-[11px] font-bold tracking-[1px] whitespace-nowrap text-brand">{CARD_COPY.brand}</p>
      <p className="text-[24px] font-bold whitespace-nowrap text-ink">{card.title}</p>
      <div className="rounded-[4px] bg-surface p-2.5">
        <QrCode value={card.url} size={150} label={`Código QR de ${card.label}`} className="text-ink" />
      </div>
      <p className="text-[11px] font-bold whitespace-nowrap text-brand">{CARD_COPY.sheetCta}</p>
    </article>
  );
}

/**
 * The printed A4 sheets of 09E (inside `PrintPortal`): the A6 layout puts four 09D cards on a
 * 2×2 grid, the compact layout six cards on a 3×2 grid. Each sheet fills the 190×277mm printable
 * area (A4 minus the 10mm margins) and breaks the page after it.
 */
export function PrintSheets({ sheets, perSheet }: { sheets: PrintCard[][]; perSheet: number }) {
  const compact = perSheet > 4;
  return (
    <>
      {sheets.map((sheet) => (
        <section
          key={sheet[0].tableId}
          className={clsx(
            "grid h-[277mm] w-[190mm] grid-rows-2 gap-[4mm] break-after-page last:break-after-auto",
            compact ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {sheet.map((card) => (
            <div key={card.tableId} className="flex items-center justify-center">
              {compact ? <CompactPrintCard card={card} /> : <PrintableCard card={card} />}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
