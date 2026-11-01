"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, Plus, SearchX } from "lucide-react";
import { TABLE, getOrderTotal } from "@/mocks/table";
import { useTableSession } from "@/features/table-session";
import { delay } from "@/shared/lib/delay";
import { useScreenState } from "@/shared/lib/use-screen-state";
import {
  Notice,
  PrimaryButton,
  SecondaryButton,
  StateCard,
} from "@/shared/ui";
import { OrderHero } from "./OrderHero";
import { OrderOutcomeView } from "./OrderOutcomeView";
import { OrderReceiptCard } from "./OrderReceiptCard";
import { countOrderItems } from "./order-lines";
import { ORDER_OUTCOMES, ORDER_OUTCOME_STATES } from "./order-outcomes";

type OrderStatusScreenProps = {
  orderId: string;
};

const RECHECK_DELAY_MS = 900;

/**
 * Screen 06 · Pedido confirmado. `?state=pending|error|closed` forces the 06A–C variants;
 * it reads search params, so it must render inside `<Suspense>`.
 */
export function OrderStatusScreen({ orderId }: OrderStatusScreenProps) {
  const router = useRouter();
  const forced = useScreenState(ORDER_OUTCOME_STATES);
  const { getOrder, hydrated } = useTableSession();
  const [busy, setBusy] = useState(false);
  const [staffNotified, setStaffNotified] = useState(false);

  if (forced) {
    async function handlePrimary() {
      if (forced === "closed") {
        setStaffNotified(true);
        return;
      }
      // Pending and error simulate a successful re-check, then show the confirmed order.
      setBusy(true);
      await delay(RECHECK_DELAY_MS);
      router.replace(`/order/${encodeURIComponent(orderId)}`);
      setBusy(false);
    }
    return (
      <OrderOutcomeView
        copy={ORDER_OUTCOMES[forced]}
        onPrimary={handlePrimary}
        primaryLoading={busy}
        feedback={staffNotified ? "Avisamos al personal. En breve se acercan a tu mesa." : undefined}
      />
    );
  }

  if (!hydrated) return null;

  const order = getOrder(orderId);
  if (!order) {
    return (
      <>
        <main className="flex flex-1 flex-col justify-center gap-4 px-4 pb-10">
          <StateCard variant="empty" icon={SearchX} title="No encontramos este pedido">
            Puede que el enlace sea viejo o que el pedido se haya hecho desde otro dispositivo.
          </StateCard>
          <PrimaryButton href="/explore" icon={ArrowRight} iconPosition="end">
            Volver al menú
          </PrimaryButton>
        </main>
      </>
    );
  }

  return (
    <>
      <OrderHero
        cafeName={TABLE.cafeName}
        table={TABLE.number}
        badgeIcon={CircleCheck}
        badgeLabel="Pedido confirmado"
        headline="¡Pedido recibido!"
        headlineSize={38}
        text="Ya enviamos tu pedido al restaurante."
        sparkles
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        <OrderReceiptCard
          number={order.number}
          status={order.status}
          customerName={order.customerName}
          itemCount={countOrderItems(order)}
          total={getOrderTotal(order)}
        />
        <Notice title="No tenés que pagar ahora">
          Este pedido se sumó a la cuenta compartida de tu mesa. Podés pedir algo más cuando
          quieras.
        </Notice>
        <div className="flex flex-col gap-3">
          <PrimaryButton href="/table" icon={ArrowRight} iconPosition="end" className="text-[15px]!">
            Ver mi mesa
          </PrimaryButton>
          <SecondaryButton
            href="/explore"
            icon={Plus}
            className="h-[52px]! rounded-[26px]! text-[14.5px]!"
          >
            Pedir algo más
          </SecondaryButton>
        </div>
        <p className="mt-auto pt-2 text-center text-[11px] text-muted">
          ¡Gracias por elegirnos! ☕
        </p>
      </main>
    </>
  );
}
