"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { Modal, PrimaryButton } from "@/shared/ui";
import { formatPrice } from "@/shared/lib/format-price";
import { clearGroupSelection, initialOptionSelection, optionIssues, toggleOption, toLine } from "./cart";
import { formatOptionDelta } from "./entry-view";
import type { EntryOptionGroup, EntryProduct } from "./entry-types";

type OptionPickerDialogProps = {
  product: EntryProduct;
  onClose: () => void;
  onAdd: (optionIds: string[]) => void;
};

function groupHint(group: EntryOptionGroup): string {
  const parts = [group.required ? "Obligatorio" : "Opcional"];
  if (group.selection === "multiple") parts.push(group.max === null ? "Elegí las que quieras" : `Hasta ${group.max}`);
  return parts.join(" · ");
}

const OPTION_ROW =
  "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-nav px-2.5 outline-1 -outline-offset-[0.5px] outline-line has-[:checked]:bg-brand-wash has-[:checked]:outline-brand has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";

/**
 * Option picker of a product with option groups: radios for single groups (optional ones add
 * "Sin elección"), checkboxes for multiple groups up to their max; required groups start on their
 * default. "Agregar" stays disabled until the choice satisfies every group.
 */
export function OptionPickerDialog({ product, onClose, onAdd }: OptionPickerDialogProps) {
  const [selection, setSelection] = useState(() => initialOptionSelection(product));
  const titleId = useId();
  const valid = optionIssues(product, selection).length === 0;
  const preview = toLine(product, selection);

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="w-[400px]">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onAdd(selection);
        }}
      >
        <div className="flex flex-col gap-1 pr-10">
          <h2 id={titleId} className="text-[18px] font-bold text-ink">
            {product.name}
          </h2>
          <p className="text-[11px] text-muted">{formatPrice(product.price)}</p>
        </div>
        {product.optionGroups.map((group) => {
          const picked = group.options.filter((option) => selection.includes(option.id)).length;
          const full = group.selection === "multiple" && group.max !== null && picked >= group.max;
          const name = `${titleId}-${group.id}`;
          return (
            <fieldset key={group.id} className="flex flex-col gap-1.5">
              <legend className="mb-1.5 flex w-full items-center justify-between">
                <span className="text-[12px] font-bold text-ink">{group.title}</span>
                <span className={clsx("text-[10px] font-semibold", group.required ? "text-brand" : "text-muted")}>
                  {groupHint(group)}
                </span>
              </legend>
              {group.selection === "single" && !group.required && (
                <label className={OPTION_ROW}>
                  <input
                    type="radio"
                    name={name}
                    checked={picked === 0}
                    onChange={() => setSelection((current) => clearGroupSelection(product, current, group.id))}
                    className="accent-brand"
                  />
                  <span className="flex-1 text-[11px] text-ink">Sin elección</span>
                </label>
              )}
              {group.options.map((option) => {
                const checked = selection.includes(option.id);
                return (
                  <label key={option.id} className={OPTION_ROW}>
                    <input
                      type={group.selection === "single" ? "radio" : "checkbox"}
                      name={name}
                      checked={checked}
                      disabled={!checked && full}
                      onChange={() => setSelection((current) => toggleOption(product, current, option.id))}
                      className="accent-brand"
                    />
                    <span className="flex-1 text-[11px] text-ink">{option.name}</span>
                    <span className="text-[10px] font-semibold text-muted">{formatOptionDelta(option.priceDelta)}</span>
                  </label>
                );
              })}
            </fieldset>
          );
        })}
        <PrimaryButton type="submit" disabled={!valid} className="h-11 text-[12px]">
          {`Agregar al pedido · ${formatPrice(preview.unitPrice)}`}
        </PrimaryButton>
      </form>
    </Modal>
  );
}
