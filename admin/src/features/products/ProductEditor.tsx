"use client";

import clsx from "clsx";
import { ArrowLeft, CircleAlert, Clock3, LockKeyhole, Maximize2, Plus, Save } from "lucide-react";
import type { EditorAction, EditorState, EditorView } from "./product-editor-state";
import { CustomerProductPreview } from "./CustomerProductPreview";
import { OptionGroupCard } from "./OptionGroupCard";
import { ConsumptionMoments, GeneralInformation } from "./ProductEditorForm";

type ProductEditorProps = {
  editor: EditorState;
  view: EditorView;
  onAction: (action: EditorAction) => void;
};

/** "CARTA DIGITAL / PRODUCTOS / …" with "Productos" back to the list. */
export function ProductsBreadcrumb({ current, onAction }: { current: string; onAction: (action: EditorAction) => void }) {
  return (
    <nav aria-label="Ruta" className="text-[11px] font-bold tracking-[0.6px] text-brand uppercase lg:whitespace-nowrap">
      Carta digital /{" "}
      <button
        type="button"
        onClick={() => onAction({ type: "close-editor" })}
        // Below `lg` an invisible 44px-tall hit area around the link, for touch.
        className="relative uppercase underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-4 hover:underline lg:before:hidden"
      >
        Productos
      </button>{" "}
      / <span aria-current="page">{current}</span>
    </nav>
  );
}

/** "Publication Control": the publication "Guardar cambios" will save. */
function PublicationControl({ view, onAction }: Omit<ProductEditorProps, "editor">) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-field bg-surface px-2.5 outline-1 -outline-offset-[0.5px] outline-line lg:h-[34px]">
      <span aria-hidden="true" className="text-[11px] font-bold whitespace-nowrap text-ink">
        {view.publicationLabel}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={view.published}
        aria-label="Producto publicado"
        onClick={() => onAction({ type: "set-draft-publication", published: !view.published })}
        className={clsx(
          "relative flex h-[18px] w-[30px] shrink-0 items-center rounded-[9px] p-0.5 transition-colors",
          // Below `lg` an invisible 44×44 hit area around the track, for touch.
          "before:absolute before:-inset-x-[7px] before:-inset-y-[13px] lg:before:hidden",
          view.published ? "justify-end bg-brand" : "justify-start bg-line",
        )}
      >
        <span aria-hidden="true" className="size-3.5 rounded-full bg-surface" />
      </button>
    </div>
  );
}

/**
 * "Persistent Save Bar": only while the draft has unsaved changes. Below `lg` it sticks to the
 * bottom of the scrolling page (still in flow, so it never covers the last fields) and its actions
 * become 44px: "Descartar" and "Guardar borrador" side by side, "Guardar cambios" under them.
 */
function PersistentSaveBar({ view, onAction }: Omit<ProductEditorProps, "editor">) {
  const blocked = view.saveTone === "danger";
  const Icon = blocked ? CircleAlert : Clock3;
  return (
    <div className="sticky bottom-0 z-[5] flex w-full shrink-0 flex-col gap-2.5 rounded-tile bg-surface p-3 shadow-[0_-4px_14px_#1010100f] outline-1 -outline-offset-[0.5px] outline-line lg:static lg:h-[58px] lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:px-3.5 lg:py-0 lg:shadow-none">
      <div role="status" className="flex items-center gap-[9px]">
        <Icon size={15} aria-hidden="true" className={clsx("shrink-0", blocked ? "text-danger" : "text-warning")} />
        <div className="flex flex-col gap-px">
          <p className={clsx("text-[12px] font-bold lg:whitespace-nowrap", blocked ? "text-danger" : "text-ink")}>{view.saveTitle}</p>
          <p className="text-[11px] text-muted lg:whitespace-nowrap">{view.saveHint}</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:items-center">
        <button
          type="button"
          onClick={() => onAction({ type: "discard" })}
          className="flex h-11 items-center justify-center rounded-nav px-3 text-[12px] font-bold text-muted hover:bg-cream hover:text-ink lg:h-9"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "save", mode: "draft" })}
          className="flex h-11 items-center justify-center rounded-nav px-3 text-[12px] font-bold whitespace-nowrap text-ink lg:h-9 outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "save", mode: view.primarySaveMode })}
          className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-nav bg-brand px-[15px] text-white hover:bg-brand/92 lg:h-9"
        >
          <Save size={13} aria-hidden="true" />
          <span className="text-[12px] font-bold whitespace-nowrap">Guardar cambios</span>
        </button>
      </div>
    </div>
  );
}

/**
 * "Preview Column 34%": the customer preview of the draft and the way into 07C. Below `lg` it
 * follows the form, with a fixed-height phone up to 330px wide.
 */
function PreviewColumn({ editor, view, onAction }: ProductEditorProps) {
  return (
    <aside
      aria-label="Vista previa del cliente"
      className="flex w-full min-w-0 flex-col items-center gap-2.5 rounded-card bg-surface px-4 py-3.5 outline-1 -outline-offset-[0.5px] outline-line lg:h-full lg:w-auto lg:flex-1"
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:flex-nowrap lg:gap-0">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] font-bold whitespace-nowrap text-ink">Vista previa del cliente</h3>
          <p className="text-[11px] whitespace-nowrap text-muted">Cambios reflejados en tiempo real</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAction({ type: "open-preview" })}
            className="flex h-11 items-center gap-[5px] rounded-xl px-3 text-brand hover:bg-brand-wash lg:h-6 lg:px-2"
          >
            <Maximize2 size={10} aria-hidden="true" />
            <span className="text-[11px] font-bold whitespace-nowrap">Ampliar</span>
          </button>
          <p className="flex h-6 items-center gap-[5px] rounded-xl bg-sand px-2 text-muted">
            <LockKeyhole size={10} aria-hidden="true" />
            <span className="text-[11px] font-bold whitespace-nowrap">Solo lectura</span>
          </p>
        </div>
      </div>
      <CustomerProductPreview
        preview={view.preview}
        available={editor.draft.available}
        className="h-[560px] w-full max-w-[330px] lg:h-auto lg:min-h-0 lg:w-[330px] lg:max-w-none lg:flex-1"
      />
    </aside>
  );
}

/**
 * 07B · Editar producto ("Premium Editor Main"): header with the unsaved badge and the
 * publication control, the form column, the live customer preview and, while there are
 * unsaved changes, the save bar. Below `lg` everything stacks in one scrolling column (header,
 * form, preview, sticky save bar); from `lg` it fills the viewport as in the export.
 */
export function ProductEditor({ editor, view, onAction }: ProductEditorProps) {
  const { draft } = editor;
  return (
    <div className="flex min-h-[calc(100dvh-var(--topbar-h))] flex-col gap-3 px-4 pt-4 pb-6 lg:h-[calc(100dvh-var(--topbar-h))] lg:min-h-[760px] lg:gap-2.5 lg:px-7 lg:pt-[18px] lg:pb-3.5">
      <button
        type="button"
        onClick={() => onAction({ type: "close-editor" })}
        className="-ml-2 flex h-11 w-fit shrink-0 items-center gap-1.5 rounded-nav px-2 text-ink hover:bg-cream lg:h-8"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        <span className="text-[12px] font-bold">Volver</span>
      </button>
      <header className="flex w-full shrink-0 flex-col gap-3 lg:h-[54px] lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <ProductsBreadcrumb current={view.breadcrumb} onAction={onAction} />
          <h2 className="text-[20px] font-bold text-ink lg:text-[25px] lg:whitespace-nowrap">{view.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {view.dirty && (
            <p className="flex h-7 items-center gap-1.5 rounded-[14px] bg-warning-bg px-2.5 text-warning">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
              <span className="text-[11px] font-bold whitespace-nowrap">Cambios sin guardar</span>
            </p>
          )}
          <PublicationControl view={view} onAction={onAction} />
        </div>
      </header>
      <div className="flex w-full flex-col gap-3.5 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-start">
        <div className="flex w-full min-w-0 flex-col gap-3.5 rounded-card bg-surface p-4 outline-1 -outline-offset-[0.5px] outline-line lg:h-full lg:w-[758px] lg:shrink-0 lg:overflow-y-auto lg:p-[18px]">
          <GeneralInformation draft={draft} errors={view.errors} onAction={onAction} />
          <hr className="w-full shrink-0 border-[#e9e6df]" />
          <ConsumptionMoments moments={draft.moments} onAction={onAction} />
          <hr className="w-full shrink-0 border-[#e9e6df]" />
          <section aria-labelledby="customizations-title" className="flex w-full flex-1 flex-col gap-3.5">
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 id="customizations-title" className="text-[14px] font-bold text-ink">
                  Personalizaciones
                </h3>
                <p className="text-[11px] text-muted">Opciones disponibles en la vista del cliente</p>
              </div>
              <button
                type="button"
                onClick={() => onAction({ type: "add-group" })}
                className="flex h-11 shrink-0 items-center gap-[5px] rounded-[7px] px-[9px] text-brand hover:bg-brand-wash lg:h-7"
              >
                <Plus size={12} aria-hidden="true" />
                <span className="text-[11px] font-bold whitespace-nowrap">Agregar grupo</span>
              </button>
            </div>
            {view.optionGroups.length === 0 ? (
              <p className="rounded-[9px] bg-[#faf9f6] p-3 text-[12px] text-muted">
                Sin personalizaciones. Agregá un grupo para ofrecer tamaños, extras u otras opciones.
              </p>
            ) : (
              <div className="grid w-full grid-cols-1 items-start gap-3 sm:grid-cols-2">
                {view.optionGroups.map((group) => {
                  const draftGroup = draft.optionGroups.find((candidate) => candidate.id === group.id)!;
                  return (
                    <OptionGroupCard
                      key={group.id}
                      group={draftGroup}
                      meta={group.meta}
                      editingGroup={editor.editingGroupId === group.id}
                      editingOptionId={editor.editingOptionId}
                      errors={view.errors.optionGroups?.[group.id]}
                      onAction={onAction}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
        <PreviewColumn editor={editor} view={view} onAction={onAction} />
      </div>
      {(view.dirty || view.saveTone === "danger") && <PersistentSaveBar view={view} onAction={onAction} />}
    </div>
  );
}
