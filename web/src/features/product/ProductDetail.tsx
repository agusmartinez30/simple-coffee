"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import type { Product } from "@/mocks/types";
import { useCart } from "@/features/cart";
import { useMenu } from "@/features/menu/MenuProvider";
import { findMenuCategory } from "@/features/menu/menu-mapper";
import { ProductPhoto } from "@/features/menu/ProductPhoto";
import { getUnitPrice } from "@/features/menu/product-pricing";
import { formatPrice } from "@/shared/lib/format-price";
import { Notice, PrimaryButton, QuantityStepper, StickyFooter } from "@/shared/ui";
import { OptionGroupField } from "./OptionGroupField";
import {
  getFromPrice,
  getMissingRequiredGroups,
  getSelectedChoiceIds,
  initSelection,
  toggleChoice,
  type OptionSelection,
} from "./product-options";

type ProductDetailProps = {
  product: Product;
};

/** Product photos with a dedicated, larger hero version. */
const HERO_IMAGES: Record<string, string> = {
  "/images/products/cappuccino.webp": "/images/products/cappuccino-hero.webp",
};

const MAX_NOTE_LENGTH = 140;

const roundAction =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink outline-1 -outline-offset-[0.5px] outline-line outline-solid";

/** Screen 03 · Detalle del producto: customization, notes, quantity and add to the cart. */
export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const category = findMenuCategory(useMenu().menu, product.category);
  const allowNotes = product.allowCustomerNotes !== false;
  const [selection, setSelection] = useState<OptionSelection>(() => initSelection(product));
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  const groups = product.optionGroups ?? [];
  const choiceIds = getSelectedChoiceIds(product, selection);
  const missing = getMissingRequiredGroups(product, selection);
  const total = getUnitPrice(product, choiceIds) * quantity;
  const fromPrice = getFromPrice(product);

  function handleAdd() {
    if (missing.length > 0) {
      setShowErrors(true);
      return;
    }
    addItem({ productId: product.id, choiceIds, note: allowNotes ? note : undefined, quantity });
    router.push("/explore");
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-cream px-4">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/explore"))}
          className={roundAction}
        >
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <p className="text-[14px] font-bold text-ink">Detalle del producto</p>
        <Link href="/table" aria-label="Ver mi pedido" className={roundAction}>
          <ShoppingBag size={18} aria-hidden="true" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 pt-2 pb-6">
        <div className="relative h-[286px] w-full shrink-0 overflow-hidden rounded-[22px] bg-[#dad4c8]">
          <ProductPhoto
            src={product.image ? (HERO_IMAGES[product.image] ?? product.image) : undefined}
            alt={product.name}
            sizes="358px"
            eager
          />
        </div>

        <section className="flex flex-col items-start gap-2">
          {category ? (
            <span className="flex h-6 items-center rounded-xl bg-brand-tint px-2.5 text-[9px] font-bold tracking-[1.1px] text-brand">
              {category.label.toLocaleUpperCase("es-AR")}
            </span>
          ) : null}
          <h1 className="font-display text-[36px] leading-[34px] font-bold text-ink">
            {product.name}
          </h1>
          <p className="text-[13px] leading-[18px] text-muted">
            {product.longDescription ?? product.description}
          </p>
          <p className="text-[16px] font-bold text-brand">
            {fromPrice.varies ? "Desde " : ""}
            {formatPrice(fromPrice.amount)}
          </p>
        </section>

        {groups.map((group) => (
          <OptionGroupField
            key={group.id}
            product={product}
            group={group}
            selected={selection[group.id] ?? []}
            invalid={showErrors && missing.includes(group.id)}
            onToggle={(choiceId) => setSelection((prev) => toggleChoice(prev, group, choiceId))}
          />
        ))}

        {allowNotes ? (
          <section className="flex flex-col gap-2">
            <label htmlFor="product-note" className="text-[16px] font-bold text-ink">
              Indicaciones especiales
            </label>
            <textarea
              id="product-note"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej: poco caliente, sin azúcar..."
              className="h-[88px] w-full resize-none rounded-card bg-surface p-3 text-[12px] text-ink outline-1 -outline-offset-[0.5px] outline-line outline-solid placeholder:text-[#8a8986] focus:outline-2 focus:outline-brand"
            />
          </section>
        ) : null}

        <section className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">Cantidad</h2>
          <QuantityStepper
            value={quantity}
            canDecrement={quantity > 1}
            onDecrement={() => setQuantity((value) => Math.max(1, value - 1))}
            onIncrement={() => setQuantity((value) => value + 1)}
            itemLabel={product.name}
          />
        </section>

        {showErrors && missing.length > 0 ? (
          <Notice tone="error">Elegí una opción en los grupos obligatorios para continuar.</Notice>
        ) : null}
      </main>

      <StickyFooter variant="raised" className="flex items-center gap-3">
        <div className="flex shrink-0 flex-col gap-px">
          <span className="text-[8px] font-bold tracking-[1px] text-muted">TOTAL</span>
          <span className="text-[18px] font-bold text-ink">{formatPrice(total)}</span>
        </div>
        <PrimaryButton
          icon={ShoppingBag}
          onClick={handleAdd}
          fullWidth={false}
          className="h-[52px]! min-w-0 flex-1 rounded-[26px]! text-[13px]!"
        >
          Agregar al pedido · {formatPrice(total)}
        </PrimaryButton>
      </StickyFooter>
    </>
  );
}
