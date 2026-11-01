"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Coffee, Plus } from "lucide-react";
import { TABLE } from "@/mocks/table";
import { useCart } from "@/features/cart";
import { formatPrice } from "@/shared/lib/format-price";
import {
  PrimaryButton,
  SecondaryButton,
  StateCard,
  StickyFooter,
  formatItemCount,
} from "@/shared/ui";
import { CartLineItem } from "./CartLineItem";
import { getCartLineView, type CartLineView } from "./order-lines";

const roundAction =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink outline-1 -outline-offset-[0.5px] outline-line outline-solid";

/** Screen 04 · Mi pedido: review the cart before confirming. */
export function OrderScreen() {
  const { lines, itemCount, subtotal, hydrated, increment, decrement, remove } = useCart();
  const items = lines.map(getCartLineView).filter((item): item is CartLineView => item !== null);
  const isEmpty = hydrated && items.length === 0;

  return (
    <>
      <header className="flex flex-col gap-[7px] px-4">
        <div className="flex h-10 items-center justify-between">
          <Link href="/explore" aria-label="Volver al menú" className={roundAction}>
            <ArrowLeft size={19} aria-hidden="true" />
          </Link>
          <h1 className="text-[16px] font-bold text-ink">Mi pedido</h1>
          <span className="flex h-7 min-w-10 items-center justify-center rounded-[14px] bg-brand-tint px-2.5 text-[10px] font-bold text-brand">
            {hydrated ? formatItemCount(itemCount) : ""}
          </span>
        </div>
        <p className="text-[10px] font-bold tracking-[0.6px] text-muted">
          {TABLE.cafeName} · Mesa {TABLE.number}
        </p>
      </header>

      {!hydrated ? (
        <main className="flex-1" aria-busy="true" />
      ) : isEmpty ? (
        <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
          <h2 className="flex flex-col">
            <span className="text-[23px] font-bold text-ink">Tu pedido está</span>
            <span className="font-display text-[31px] leading-tight font-bold text-brand">
              esperando algo rico.
            </span>
          </h2>
          <StateCard variant="empty" icon={Coffee} title="Todavía no agregaste productos">
            Elegí algo del menú y aparecerá acá para que lo revises antes de enviarlo.
          </StateCard>
          <PrimaryButton href="/explore" icon={ArrowRight} iconPosition="end">
            Explorar el menú
          </PrimaryButton>
        </main>
      ) : (
        <>
          <main className="flex flex-1 flex-col px-4 pt-4 pb-6">
            <section className="h-[78px]">
              <h2 className="flex items-baseline gap-1.5">
                <span className="text-[25px] font-bold tracking-[-0.7px] text-ink">Tu pedido,</span>
                <span className="font-display text-[31px] leading-none font-bold text-brand">
                  casi listo.
                </span>
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">
                Revisá tus productos antes de continuar.
              </p>
            </section>

            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <CartLineItem
                  key={item.line.id}
                  item={item}
                  onIncrement={() => increment(item.line.id)}
                  onDecrement={() => decrement(item.line.id)}
                  onRemove={() => remove(item.line.id)}
                />
              ))}
            </ul>

            <SecondaryButton
              href="/explore"
              icon={Plus}
              size="md"
              className="mt-2.5 h-[46px]! rounded-[23px]! bg-transparent! text-[13px]!"
            >
              Agregar más productos
            </SecondaryButton>

            <section className="mt-2.5 flex flex-col gap-2.5 rounded-2xl bg-surface p-3.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted">Subtotal ({formatItemCount(itemCount)})</span>
                <span className="font-bold text-ink">{formatPrice(subtotal)}</span>
              </div>
              <hr className="border-line" />
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold text-ink">Total</span>
                <span className="text-[19px] font-bold text-brand">{formatPrice(subtotal)}</span>
              </div>
            </section>
          </main>

          <StickyFooter variant="raised" className="flex flex-col gap-[7px] pb-3!">
            <PrimaryButton
              href="/order/confirm"
              icon={ArrowRight}
              iconPosition="end"
              className="h-[52px]! rounded-[26px]! text-[14px]!"
            >
              Continuar pedido · {formatPrice(subtotal)}
            </PrimaryButton>
            <p className="text-center text-[9.5px] text-muted">
              Podrás revisar los datos antes de confirmar.
            </p>
          </StickyFooter>
        </>
      )}
    </>
  );
}
