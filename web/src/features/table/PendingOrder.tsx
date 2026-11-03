"use client";

import { useCart } from "@/features/cart";
import { MenuGate } from "@/features/menu/MenuGate";
import { useMenu } from "@/features/menu/MenuProvider";
import { formatPrice } from "@/shared/lib/format-price";
import { formatItemCount } from "@/shared/ui";
import { CartLineItem } from "./CartLineItem";
import { getCartLineView, type CartLineView } from "./cart-lines";

/** "Tu pedido" on screen 07: the cart lines the guest has not sent yet, with their subtotal. */
export function PendingOrder() {
  const { lines, itemCount, subtotal, increment, decrement, remove } = useCart();
  const { menu, status } = useMenu();
  // Cart lines are priced from the menu: show its loading or error state instead of hiding them.
  if (lines.length > 0 && status !== "ready") return <MenuGate>{null}</MenuGate>;
  const items = lines
    .map((line) => getCartLineView(line, menu))
    .filter((item): item is CartLineView => item !== null);
  if (items.length === 0) return null;

  return (
    <section aria-label="Tu pedido" className="flex flex-col gap-3">
      <div className="flex h-5 items-center justify-between">
        <h2 className="text-[14px] font-bold text-ink">Tu pedido</h2>
        <span className="text-[9.5px] text-muted">Sin enviar</span>
      </div>
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
      <div className="flex items-center justify-between rounded-2xl bg-surface p-3.5 text-[12px]">
        <span className="text-muted">Subtotal ({formatItemCount(itemCount)})</span>
        <span className="font-bold text-ink">{formatPrice(subtotal)}</span>
      </div>
    </section>
  );
}
