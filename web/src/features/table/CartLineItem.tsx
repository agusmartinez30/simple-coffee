import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/shared/lib/format-price";
import { QuantityStepper } from "@/shared/ui";
import type { CartLineView } from "./cart-lines";

type CartLineItemProps = {
  item: CartLineView;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

const iconAction = "flex size-[26px] items-center justify-center rounded-full bg-cream text-ink";

/** One product row of the pending order on screen 07 · Mi mesa. */
export function CartLineItem({ item, onIncrement, onDecrement, onRemove }: CartLineItemProps) {
  return (
    <li className="flex h-28 w-full items-center gap-2.5 rounded-2xl bg-surface p-2.5">
      <div className="relative h-[92px] w-[82px] shrink-0 overflow-hidden rounded-xl">
        <Image src={item.image} alt="" fill sizes="82px" className="object-cover" />
      </div>
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-[12.5px] font-bold text-ink">{item.name}</h3>
            <p className="line-clamp-2 text-[9.5px] text-muted">{item.details}</p>
            {item.note ? (
              <p className="truncate font-display text-[11px] font-bold text-brand">
                {item.note}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-[3px]">
            {/* Editing an existing line is visual only in this prototype. */}
            <button type="button" aria-label={`Editar ${item.name}`} className={iconAction}>
              <Pencil size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${item.name}`}
              onClick={onRemove}
              className={iconAction}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-ink">{formatPrice(item.lineTotal)}</span>
          <QuantityStepper
            size="sm"
            value={item.line.quantity}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            itemLabel={item.name}
          />
        </div>
      </div>
    </li>
  );
}
