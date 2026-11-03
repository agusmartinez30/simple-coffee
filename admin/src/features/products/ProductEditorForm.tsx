"use client";

import clsx from "clsx";
import { Check, Trash2 } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { CONSUMPTION_MOMENTS, type ConsumptionMomentId } from "@/mocks/service-day";
import type { ProductCategoryOption } from "./product-catalog";
import type { EditorAction } from "./product-editor-state";
import { getImageFormatLabel, type ProductDraft, type ProductFormErrors } from "./product-form";
import { AvailabilitySwitch, ProductImage } from "./ProductTags";

type OnAction = (action: EditorAction) => void;

/** 44px tall below `lg` for touch, the export's 36px from it. */
const INPUT_CLASSES =
  "h-11 lg:h-9 w-full rounded-nav bg-surface px-2.5 text-[12px] text-ink outline-1 -outline-offset-[0.5px] focus:outline-2 focus:-outline-offset-1 focus:outline-brand";

type FieldProps = {
  label: string;
  error?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; className: string }) => ReactNode;
};

/** "Product Name Field", "Price Field", …: 11px label over a 36px input, with the error below. */
function Field({ label, error, className, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={clsx("flex flex-col gap-[5px]", className)}>
      <label htmlFor={id} className="text-[11px] font-bold whitespace-nowrap text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
        className: clsx(INPUT_CLASSES, error ? "outline-danger" : "outline-line"),
      })}
      {error && (
        <p id={errorId} className="text-[11px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type ImageEditorProps = { image?: string; name: string; error?: string; onAction: OnAction };

/**
 * "Main Image Editor". "Reemplazar" picks a local file and shows it for this session only (no
 * upload); the trash leaves the product without a photo. Full width above the fields below `lg`.
 */
function MainImageEditor({ image, name, error, onAction }: ImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  return (
    <div className="flex w-full flex-col gap-2 lg:w-[218px] lg:shrink-0">
      <ProductImage
        src={image}
        alt={name || "Producto nuevo"}
        sizes="(min-width: 1024px) 218px, 100vw"
        iconSize={24}
        className={clsx("h-[180px] w-full rounded-[10px] lg:h-[148px]", error && "outline-1 -outline-offset-1 outline-danger")}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onAction({ type: "set-image", image: URL.createObjectURL(file) });
          event.target.value = "";
        }}
      />
      <div className="flex w-full items-center justify-between gap-1.5">
        <p className="truncate text-[11px] text-muted">{getImageFormatLabel(image)}</p>
        <div className="flex shrink-0 items-center gap-1">
          {image && (
            <button
              type="button"
              aria-label="Quitar imagen"
              onClick={() => onAction({ type: "set-image", image: undefined })}
              className="flex size-11 items-center justify-center rounded-[7px] text-muted hover:bg-cream hover:text-danger lg:size-7"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-describedby={error ? errorId : undefined}
            onClick={() => inputRef.current?.click()}
            className="flex h-11 items-center rounded-[7px] px-3 text-[11px] font-bold text-brand lg:h-7 lg:px-[9px] outline-1 -outline-offset-[0.5px] outline-line hover:bg-brand-wash"
          >
            {image ? "Reemplazar" : "Agregar imagen"}
          </button>
        </div>
      </div>
      {error && (
        <p id={errorId} className="text-[11px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type SectionProps = { draft: ProductDraft; errors: ProductFormErrors; onAction: OnAction };

type GeneralInformationProps = SectionProps & {
  /** Options of the "Categoría" select. */
  categories: readonly ProductCategoryOption[];
};

/**
 * "Información general": image, name, base price, description, category and availability. Below
 * `lg` the image stacks over the fields and the price/availability columns narrow to 140px.
 */
export function GeneralInformation({ draft, errors, categories, onAction }: GeneralInformationProps) {
  return (
    <section aria-labelledby="general-information-title" className="flex w-full shrink-0 flex-col gap-3.5">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 id="general-information-title" className="text-[14px] font-bold text-ink">
            Información general
          </h3>
          <p className="text-[11px] text-muted">Datos visibles para el cliente</p>
        </div>
        <p className="text-[11px] text-muted">* Campos obligatorios</p>
      </div>
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
        <MainImageEditor image={draft.image} name={draft.name} error={errors.image} onAction={onAction} />
        <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
          <div className="flex w-full items-start gap-2.5">
            <Field label="Nombre *" error={errors.name} className="min-w-0 flex-1">
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={draft.name}
                  onChange={(event) => onAction({ type: "set-field", field: "name", value: event.target.value })}
                />
              )}
            </Field>
            <Field label="Precio base *" error={errors.price} className="w-[140px] shrink-0 lg:w-[150px]">
              {({ className, ...props }) => (
                <div
                  className={clsx(
                    className,
                    "flex items-center gap-1 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand",
                  )}
                >
                  <span aria-hidden="true" className="text-[12px] text-muted">
                    $
                  </span>
                  <input
                    {...props}
                    type="text"
                    inputMode="numeric"
                    value={draft.price.replace(/^\s*\$\s*/, "")}
                    placeholder="0"
                    onChange={(event) => onAction({ type: "set-field", field: "price", value: event.target.value })}
                    className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
                  />
                </div>
              )}
            </Field>
          </div>
          <Field label="Descripción" error={errors.description}>
            {(props) => (
              <input
                {...props}
                type="text"
                value={draft.description}
                onChange={(event) => onAction({ type: "set-field", field: "description", value: event.target.value })}
              />
            )}
          </Field>
          <div className="flex w-full items-start gap-2.5">
            <Field label="Categoría *" error={errors.categoryId} className="min-w-0 flex-1">
              {(props) => (
                <select
                  {...props}
                  value={draft.categoryId}
                  onChange={(event) =>
                    onAction({ type: "set-category", categoryId: event.target.value })
                  }
                  className={clsx(props.className, "cursor-pointer")}
                >
                  <option value="" disabled>
                    Elegí una categoría
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="flex w-[140px] shrink-0 flex-col gap-[5px] lg:w-[150px]">
              <p className="text-[11px] font-bold whitespace-nowrap text-ink">Disponibilidad</p>
              <div className="flex h-11 lg:h-9 items-center rounded-nav bg-surface px-2.5 outline-1 -outline-offset-[0.5px] outline-line">
                <AvailabilitySwitch
                  available={draft.available}
                  label="Disponibilidad del producto"
                  onChange={(available) => onAction({ type: "set-draft-availability", available })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "Consumption Moments Section": canonical moment chips, a check on the selected ones. Below `lg`
 * the chips wrap under the title as 44px targets.
 */
export function ConsumptionMoments({ moments, onAction }: { moments: readonly ConsumptionMomentId[]; onAction: OnAction }) {
  return (
    <div role="group" aria-labelledby="moments-title" className="flex w-full shrink-0 flex-col items-start gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-0.5">
        <h3 id="moments-title" className="text-[13px] font-bold text-ink">
          Momentos de consumo
        </h3>
        <p className="text-[11px] text-muted">Seleccioná dónde se recomienda mostrar el producto</p>
      </div>
      <div className="flex flex-wrap gap-1.5 lg:justify-end">
        {CONSUMPTION_MOMENTS.map((moment) => {
          const selected = moments.includes(moment.id);
          return (
            <button
              key={moment.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onAction({ type: "toggle-moment", moment: moment.id })}
              className={clsx(
                "flex h-11 items-center gap-[5px] rounded-[22px] px-3 outline-1 lg:h-7 lg:rounded-[14px] lg:px-2.5 -outline-offset-[0.5px]",
                selected ? "bg-brand text-white outline-brand" : "bg-surface text-muted outline-line hover:bg-cream",
              )}
            >
              {selected && <Check size={11} aria-hidden="true" />}
              <span className="text-[11px] font-bold whitespace-nowrap">{moment.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
