"use client";

import clsx from "clsx";
import { Check, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import type { OptionSelection } from "@/mocks/service-day";
import type { EditorAction } from "./product-editor-state";
import { getOptionPriceLabel, parsePriceInput, type OptionGroupDraft, type OptionGroupErrors } from "./product-form";

type OptionGroupCardProps = {
  group: OptionGroupDraft;
  /** "Selección única · Obligatorio". */
  meta: string;
  /** The group settings (title, selection, required, maximum) are open. */
  editingGroup: boolean;
  editingOptionId: string | null;
  /** Messages of this group after a blocked save. */
  errors?: OptionGroupErrors;
  onAction: (action: EditorAction) => void;
};

const ICON_BUTTON = "flex shrink-0 items-center justify-center rounded-chip hover:bg-cream";
/** Settings fields (and the icon buttons below) are 44px tall under `lg`, the export size from it. */
const SETTING_INPUT =
  "h-11 lg:h-8 rounded-nav bg-surface px-2 text-[12px] text-ink outline-1 -outline-offset-[0.5px] focus:outline-2 focus:-outline-offset-1 focus:outline-brand";

/** Title, selection, required and maximum of the group, opened from the group header. */
function GroupSettings({ group, errors, onAction }: Pick<OptionGroupCardProps, "group" | "errors" | "onAction">) {
  const groupId = group.id;
  const titleErrorId = `${groupId}-title-error`;
  return (
    <div className="flex flex-col gap-2 rounded-nav bg-surface p-2.5 outline-1 -outline-offset-[0.5px] outline-line">
      <input
        type="text"
        autoFocus
        aria-label="Nombre del grupo"
        aria-invalid={Boolean(errors?.title)}
        aria-describedby={errors?.title ? titleErrorId : undefined}
        value={group.title}
        placeholder="Nombre del grupo"
        onChange={(event) => onAction({ type: "rename-group", groupId, title: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") onAction({ type: "finish-group-edit" });
        }}
        className={clsx(SETTING_INPUT, "w-full font-bold", errors?.title ? "outline-danger" : "outline-line")}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Tipo de selección"
          value={group.selection}
          onChange={(event) =>
            onAction({ type: "set-group-selection", groupId, selection: event.target.value as OptionSelection })
          }
          className={clsx(SETTING_INPUT, "min-w-0 flex-1 cursor-pointer outline-line lg:flex-initial")}
        >
          <option value="single">Selección única</option>
          <option value="multiple">Selección múltiple</option>
        </select>
        <label className="flex min-h-11 items-center gap-1.5 px-1 text-[11px] font-bold text-ink lg:min-h-0 lg:px-0">
          <input
            type="checkbox"
            checked={group.required}
            onChange={(event) => onAction({ type: "set-group-required", groupId, required: event.target.checked })}
            className="size-5 accent-brand lg:size-3.5"
          />
          Obligatorio
        </label>
        {group.selection === "multiple" && (
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
            Máximo
            <input
              type="number"
              min={1}
              inputMode="numeric"
              aria-invalid={Boolean(errors?.max)}
              value={group.max ?? ""}
              placeholder="—"
              onChange={(event) =>
                onAction({
                  type: "set-group-max",
                  groupId,
                  max: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
              className={clsx(SETTING_INPUT, "w-14", errors?.max ? "outline-danger" : "outline-line")}
            />
          </label>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onAction({ type: "remove-group", groupId })}
          className="flex h-11 items-center gap-1 rounded-[7px] px-2 text-danger hover:bg-danger-bg lg:h-7 lg:px-1.5"
        >
          <Trash2 size={11} aria-hidden="true" />
          <span className="text-[11px] font-bold">Quitar grupo</span>
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "finish-group-edit" })}
          className="flex h-11 items-center rounded-[7px] bg-brand px-4 text-[11px] font-bold text-white hover:bg-brand/92 lg:h-7 lg:px-2.5"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

/**
 * "Group · Tamaño" / "Group · Extras": the group title and rule, its option rows with the price
 * label ("Incluido", "Sin cargo", "+$800"), the pencil to edit a row in place, the trash to remove
 * it, "Agregar opción" and the group settings. Below `lg` rows and controls are 44px tall.
 */
export function OptionGroupCard({ group, meta, editingGroup, editingOptionId, errors, onAction }: OptionGroupCardProps) {
  const groupId = group.id;
  const titleId = `option-group-${groupId}`;
  const title = group.title.trim() || "Grupo sin nombre";
  const optionErrors = errors?.options;
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-[7px] rounded-[9px] bg-[#faf9f6] p-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-px">
          <h4 id={titleId} className="truncate text-[13px] font-bold text-ink">
            {title}
          </h4>
          <p className="text-[11px] text-muted">{meta}</p>
        </div>
        <button
          type="button"
          aria-label={`Configurar ${title}`}
          aria-expanded={editingGroup}
          onClick={() => onAction(editingGroup ? { type: "finish-group-edit" } : { type: "edit-group", groupId })}
          className={clsx(ICON_BUTTON, "size-11 lg:size-6", editingGroup ? "bg-brand-wash text-brand" : "text-muted hover:text-ink")}
        >
          <Settings2 size={14} aria-hidden="true" />
        </button>
      </header>
      {editingGroup && <GroupSettings group={group} errors={errors} onAction={onAction} />}
      {(errors?.title || errors?.max) && (
        <p className="text-[11px] font-semibold text-danger">{[errors.title, errors.max].filter(Boolean).join(" ")}</p>
      )}
      <ul className="flex flex-col gap-[3px]">
        {group.options.map((option) => {
          const error = optionErrors?.[option.id];
          const errorId = `${option.id}-error`;
          const label = option.name.trim() || "Opción sin nombre";
          if (option.id === editingOptionId) {
            return (
              <li key={option.id} className="flex flex-col gap-1">
                <div className="flex h-12 items-center gap-1.5 rounded-[6px] bg-surface pr-0.5 pl-[7px] outline-1 -outline-offset-[0.5px] outline-brand lg:h-[30px] lg:px-[7px]">
                  <input
                    type="text"
                    autoFocus
                    aria-label={`Nombre de la opción de ${title}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    value={option.name}
                    placeholder="Nombre"
                    onChange={(event) =>
                      onAction({ type: "update-option", groupId, id: option.id, changes: { name: event.target.value } })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onAction({ type: "finish-option-edit" });
                    }}
                    className="h-9 min-w-0 flex-1 bg-transparent lg:h-6 text-[12px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
                  />
                  <span aria-hidden="true" className="text-[11px] font-bold text-ink">
                    +$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Ajuste de precio de ${label}`}
                    aria-invalid={Boolean(error)}
                    value={option.priceDelta}
                    onChange={(event) =>
                      onAction({ type: "update-option", groupId, id: option.id, changes: { priceDelta: event.target.value } })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onAction({ type: "finish-option-edit" });
                    }}
                    className="h-9 w-14 shrink-0 rounded-chip bg-cream lg:h-6 px-1.5 text-right text-[11px] font-bold text-ink outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Listo con ${label}`}
                    onClick={() => onAction({ type: "finish-option-edit" })}
                    className={`${ICON_BUTTON} size-11 text-brand lg:size-6`}
                  >
                    <Check size={12} aria-hidden="true" />
                  </button>
                </div>
                {error && (
                  <p id={errorId} className="text-[11px] font-semibold text-danger">
                    {error}
                  </p>
                )}
              </li>
            );
          }
          const delta = parsePriceInput(option.priceDelta);
          return (
            <li key={option.id} className="flex flex-col gap-1">
              <div
                className={clsx(
                  "flex h-11 items-center justify-between gap-2 rounded-[6px] pl-[7px] lg:h-[30px] lg:px-[7px]",
                  error && "bg-surface outline-1 -outline-offset-[0.5px] outline-danger",
                )}
              >
                <span className="min-w-0 truncate text-[12px] font-semibold text-ink">{label}</span>
                <span className="flex shrink-0 items-center lg:gap-1">
                  <span
                    className={clsx(
                      "mr-1 text-[11px] font-bold whitespace-nowrap",
                      delta === null ? "text-danger" : delta === 0 ? "text-success" : "text-ink",
                    )}
                  >
                    {delta === null ? option.priceDelta : getOptionPriceLabel(delta, group.required)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Editar ${label}`}
                    onClick={() => onAction({ type: "edit-option", id: option.id })}
                    className={`${ICON_BUTTON} size-11 text-muted hover:text-ink lg:size-5`}
                  >
                    <Pencil size={11} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${label}`}
                    onClick={() => onAction({ type: "remove-option", groupId, id: option.id })}
                    className={`${ICON_BUTTON} size-11 text-muted hover:text-danger lg:size-5`}
                  >
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                </span>
              </div>
              {error && <p className="text-[11px] font-semibold text-danger">{error}</p>}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onAction({ type: "add-option", groupId })}
        className="flex h-11 w-fit shrink-0 items-center gap-[5px] rounded-chip px-2 text-brand hover:bg-brand-wash lg:h-[27px] lg:px-1"
      >
        <Plus size={11} aria-hidden="true" />
        <span className="text-[11px] font-bold whitespace-nowrap">Agregar opción</span>
      </button>
    </section>
  );
}
