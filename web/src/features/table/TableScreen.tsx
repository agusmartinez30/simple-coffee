"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Coffee, RefreshCw } from "lucide-react";
import { TABLE } from "@/mocks/table";
import { getTableSummary, useTableSession } from "@/features/table-session";
import { delay } from "@/shared/lib/delay";
import { useScreenState } from "@/shared/lib/use-screen-state";
import {
  BottomNav,
  PrimaryButton,
  ScreenHeader,
  StateCard,
  StatusPill,
  StickyFooter,
} from "@/shared/ui";
import { AccountSummaryCard } from "./AccountSummaryCard";
import { OrderCard } from "./OrderCard";
import { TableHeading } from "./TableHeading";
import { TABLE_VIEW_COPY } from "./table-copy";
import { TABLE_FORCED_STATES, getTableView } from "./table-view";

const RETRY_DELAY_MS = 900;

/**
 * Screen 07 · Mi mesa: read-only summary of the table orders. The variant follows the table
 * session; `?state=empty|error` forces it. It reads search params, so it must render inside
 * `<Suspense>`.
 */
export function TableScreen() {
  const router = useRouter();
  const forced = useScreenState(TABLE_FORCED_STATES);
  const { orders, hydrated } = useTableSession();
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
  const [retrying, setRetrying] = useState(false);

  const header = <ScreenHeader title="Mi mesa" backHref="/explore" table={TABLE.number} className="mt-2" />;

  if (!hydrated && !forced) {
    return (
      <>
        {header}
        <main className="flex-1" aria-busy="true" />
      </>
    );
  }

  const view = getTableView({ orders }, forced);
  const copy = TABLE_VIEW_COPY[view];
  const visibleOrders = view === "empty" ? [] : orders;
  const summary = getTableSummary(visibleOrders);
  const latestTime = visibleOrders.reduce((latest, order) => (order.time > latest ? order.time : latest), "");
  const statusMeta = view === "error" && latestTime ? `${copy.statusMeta} ${latestTime} hs` : copy.statusMeta;

  function toggleOrder(orderId: string) {
    setToggled((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  async function handleRetry() {
    // Simulates a re-fetch, then shows the live account without the forced variant.
    setRetrying(true);
    await delay(RETRY_DELAY_MS);
    router.replace("/table");
    setRetrying(false);
  }

  const notice = copy.notice ? (
    <div className="flex min-h-[58px] w-full items-center gap-2.5 rounded-[13px] bg-brand-tint px-[13px] py-3 text-brand">
      <copy.notice.icon size={19} className="shrink-0" aria-hidden="true" />
      <p className="text-[10.5px] leading-[13px] font-bold">{copy.notice.text}</p>
    </div>
  ) : null;

  const history = (
    <section aria-label="Pedidos de la mesa" className="flex flex-col gap-3">
      <div className="flex h-5 items-center justify-between">
        <h2 className="text-[14px] font-bold text-ink">Pedidos de la mesa</h2>
        <span className="text-[9.5px] text-muted">{copy.historyHint}</span>
      </div>
      <div className="flex flex-col gap-3">
        {visibleOrders.map((order, index) => {
          // On the open account the first order starts expanded, as in the design.
          const expandedByDefault = view === "open" && index === 0;
          return (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedByDefault !== toggled.has(order.id)}
              onToggle={() => toggleOrder(order.id)}
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <>
      {header}
      <main className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        <TableHeading heading={copy.heading} />
        <div className="flex h-[30px] items-center justify-between">
          <StatusPill size="md" icon={copy.statusIcon}>
            {copy.statusLabel}
          </StatusPill>
          <span className="text-[9.5px] text-muted">{statusMeta}</span>
        </div>
        <AccountSummaryCard total={summary.total} orderCount={summary.orderCount} table={TABLE.number} />

        {view === "empty" ? (
          <StateCard variant="empty" icon={Coffee} title="Todavía no hay pedidos">
            Cuando alguien de la mesa confirme un pedido, aparecerá acá para todos.
          </StateCard>
        ) : (
          <>
            {notice}
            {history}
          </>
        )}

        {copy.note ? (
          <p className={view === "open" ? "text-center text-[9px] text-muted" : "text-center text-[10px] text-muted"}>
            {copy.note}
          </p>
        ) : null}
      </main>

      <StickyFooter className="flex flex-col gap-2 pt-[3px]!">
        {view === "empty" && copy.footer ? (
          <PrimaryButton href="/explore" icon={ArrowRight} iconPosition="end" className="h-[52px]! rounded-[26px]! text-[14px]!">
            {copy.footer.primaryLabel}
          </PrimaryButton>
        ) : null}
        {view === "error" && copy.footer ? (
          <PrimaryButton size="md" icon={RefreshCw} onClick={handleRetry} loading={retrying}>
            {copy.footer.primaryLabel}
          </PrimaryButton>
        ) : null}
        {copy.footer?.hint ? <p className="text-center text-[9px] text-muted">{copy.footer.hint}</p> : null}
        {view === "error" ? null : <BottomNav active="mesa" />}
      </StickyFooter>
    </>
  );
}
