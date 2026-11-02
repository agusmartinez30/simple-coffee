"use client";

import clsx from "clsx";
import { ChevronLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import {
  PREVIEW_QUANTITY_MAX,
  getPreviewAddLabel,
  getPreviewSelection,
  stepPreviewQuantity,
  togglePreviewOption,
  type PreviewSelection,
} from "./preview-order";
import type { PreviewModel } from "./product-form";
import { ProductImage } from "./ProductTags";

/**
 * `phone`: the 07B "Refined Mobile Preview" in the editor column. `viewport`: the 07C "Premium
 * Mobile Viewport", a 370px customer screen with the café top bar and a taller hero.
 */
export type CustomerPreviewVariant = "phone" | "viewport";

type CustomerProductPreviewProps = {
  preview: PreviewModel;
  available: boolean;
  variant?: CustomerPreviewVariant;
  /**
   * Box size: from `lg` 07B gives a 330px column that fills its height, 07C a 370px column; below
   * `lg` both cap at that width and take a fixed height, so the frame fits a 375px screen.
   */
  className?: string;
};

const VARIANT_STYLES: Record<
  CustomerPreviewVariant,
  { frame: string; heroSizes: string; hero: string; content: string; name: string; footer: string; stepper: string }
> = {
  phone: {
    frame: "outline-[#d4d0c8]",
    heroSizes: "330px",
    hero: "h-[190px]",
    content: "gap-2 px-3.5 py-3",
    name: "text-[18px]",
    footer: "h-[54px] px-3 py-2",
    stepper: "w-[76px]",
  },
  viewport: {
    frame: "shadow-[0_5px_16px_#10101014] outline-[#cfcbc3]",
    heroSizes: "370px",
    hero: "h-[205px]",
    content: "gap-2.5 px-4 py-3.5",
    name: "text-[20px]",
    footer: "h-[58px] px-3 py-[9px]",
    stepper: "w-[82px]",
  },
};

/**
 * "Refined Mobile Preview" (07B) / "Premium Mobile Viewport" (07C): the product page of the
 * customer app inside a phone-like frame. Options and the quantity can be tried out; those choices stay in the
 * preview and never change the draft.
 */
export function CustomerProductPreview({ preview, available, variant = "phone", className }: CustomerProductPreviewProps) {
  const [touched, setTouched] = useState<PreviewSelection>({});
  const [quantity, setQuantity] = useState(1);
  const selection = getPreviewSelection(preview, touched);
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      aria-label={`Vista previa de ${preview.name} para clientes`}
      role="region"
      className={clsx(
        "flex flex-col items-center overflow-hidden rounded-[22px] bg-[#fbfaf7] outline-1 -outline-offset-[0.5px]",
        styles.frame,
        className,
      )}
    >
      <span aria-hidden="true" className="my-[7px] h-1 w-[70px] shrink-0 rounded-[2px] bg-[#d4d0c8]" />
      {variant === "viewport" && (
        <div aria-hidden="true" className="flex h-10 w-full shrink-0 items-center justify-between bg-surface px-3.5 text-ink">
          <ChevronLeft size={15} />
          <span className="text-[11px] font-bold tracking-[0.7px]">CAFÉ CENTRAL</span>
          <ShoppingBag size={14} />
        </div>
      )}
      <ProductImage
        src={preview.image}
        alt={preview.name}
        sizes={styles.heroSizes}
        iconSize={32}
        className={clsx(styles.hero, "w-full")}
      />
      <div className={clsx("flex min-h-0 w-full flex-1 flex-col overflow-y-auto", styles.content)}>
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <p className={clsx("truncate font-bold text-ink", styles.name)}>{preview.name}</p>
            {preview.description && <p className="line-clamp-2 text-[12px]/[15px] text-muted">{preview.description}</p>}
          </div>
          <p className="shrink-0 text-[14px] font-bold text-brand">{preview.price}</p>
        </div>
        <p
          className={clsx(
            "flex h-6 w-fit shrink-0 items-center gap-[5px] rounded-xl px-2",
            available ? "bg-success-bg text-success" : "bg-sand text-muted",
          )}
        >
          <span aria-hidden="true" className={clsx("size-[5px] rounded-full", available ? "bg-success" : "bg-muted")} />
          <span className="text-[11px] font-bold whitespace-nowrap">{available ? "Disponible ahora" : "No disponible"}</span>
        </p>
        {preview.groups.map((group) => {
          const picked = selection[group.id] ?? [];
          return (
            <div key={group.id} role="group" aria-label={group.title} className="flex w-full flex-col gap-[5px]">
              <div className="flex w-full items-start justify-between gap-2">
                <p className="truncate text-[12px] font-bold text-ink">{group.title}</p>
                <p className="shrink-0 text-[11px] text-muted">{group.meta}</p>
              </div>
              <div className="flex w-full flex-wrap gap-[5px]">
                {group.options.map((option) => {
                  const selected = picked.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setTouched((current) => ({
                          ...current,
                          [group.id]: togglePreviewOption(preview, selection, group.id, option.id)[group.id],
                        }))
                      }
                      className={clsx(
                        "flex h-7 min-w-0 flex-[1_1_auto] items-center justify-center rounded-[7px] px-2 outline-1 -outline-offset-[0.5px]",
                        selected ? "bg-brand-wash text-brand outline-brand" : "bg-surface text-muted outline-line hover:text-ink",
                      )}
                    >
                      <span className="truncate text-[11px] font-bold">{option.chipLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className={clsx("flex w-full shrink-0 gap-2 border-t border-line bg-surface", styles.footer)}>
        <div className={clsx("flex shrink-0 items-center justify-between rounded-nav bg-sand px-1", styles.stepper)}>
          <button
            type="button"
            aria-label="Restar uno"
            disabled={quantity <= 1}
            onClick={() => setQuantity((current) => stepPreviewQuantity(current, -1))}
            className="flex size-6 items-center justify-center rounded-chip text-ink enabled:hover:bg-line/60 disabled:text-muted"
          >
            <Minus size={11} aria-hidden="true" />
          </button>
          <output aria-label="Cantidad" className="text-[12px] font-bold text-ink">
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Sumar uno"
            disabled={quantity >= PREVIEW_QUANTITY_MAX}
            onClick={() => setQuantity((current) => stepPreviewQuantity(current, 1))}
            className="flex size-6 items-center justify-center rounded-chip text-ink enabled:hover:bg-line/60 disabled:text-muted"
          >
            <Plus size={11} aria-hidden="true" />
          </button>
        </div>
        <p
          className={clsx(
            "flex min-w-0 flex-1 items-center justify-center rounded-nav",
            available ? "bg-brand text-white" : "bg-line text-muted",
          )}
        >
          <span className="truncate px-1 text-[12px] font-bold whitespace-nowrap">
            {available ? getPreviewAddLabel(preview, selection, quantity) : "No disponible"}
          </span>
        </p>
      </div>
    </div>
  );
}
