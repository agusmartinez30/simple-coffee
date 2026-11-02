import { ArrowLeft, RefreshCw } from "lucide-react";
import { BottomNav, PrimaryButton, SecondaryButton, StateCard, StickyFooter } from "@/shared/ui";
import { TableHeading } from "./TableHeading";
import { TABLE_ACCESS_COPY, type TableAccessView } from "./table-access-copy";

type TableAccessCardProps = {
  view: TableAccessView;
  onRetry: () => void;
};

/**
 * Shown by "Mi mesa" instead of the table while there is no validated QR (09E · Sesión
 * inválida): the account and ordering stay blocked, the menu stays browsable.
 */
export function TableAccessCard({ view, onRetry }: TableAccessCardProps) {
  const copy = TABLE_ACCESS_COPY[view];
  const checking = view === "checking";

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-3 pb-4" aria-busy={checking || undefined}>
        <TableHeading heading={{ kind: "display", title: copy.title, supporting: copy.supporting }} />
        <StateCard variant="empty" icon={copy.cardIcon} title={copy.cardTitle} spinIcon={checking}>
          {copy.cardText}
        </StateCard>
      </main>

      <StickyFooter className="flex flex-col gap-2 pt-[3px]!">
        {copy.retryLabel ? (
          <PrimaryButton size="md" icon={RefreshCw} onClick={onRetry}>
            {copy.retryLabel}
          </PrimaryButton>
        ) : null}
        {checking ? null : (
          <SecondaryButton size="md" icon={ArrowLeft} href="/explore">
            Volver a la carta
          </SecondaryButton>
        )}
        {copy.note ? <p className="text-center text-[9px] text-muted">{copy.note}</p> : null}
        <BottomNav active="mesa" />
      </StickyFooter>
    </>
  );
}
