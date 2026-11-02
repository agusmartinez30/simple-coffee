"use client";

import clsx from "clsx";
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Copy, Pencil, SearchX } from "lucide-react";
import { useState } from "react";
import { Pagination, RowMenu, type RowMenuItem } from "@/shared/ui";
import type { ProductRowView } from "./products-state";
import { ProductImage } from "./ProductTags";

type ProductCatalogTableProps = {
  rows: readonly ProductRowView[];
  /** "13 productos". */
  countLabel: string;
  /** "Mostrando todos · Orden: relevancia comercial". */
  summaryLabel: string;
  page: number;
  pageCount: number;
  /** No product matches the search and filters. */
  empty: boolean;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onAvailabilityChange: (id: string, available: boolean) => void;
};

/** "Table Header" columns of the 1164px table, widths from the 07A export. */
const COLUMNS = [
  { label: "Producto", width: "w-[400px]", align: "text-left" },
  { label: "Precio", width: "w-[110px]", align: "text-right" },
  { label: "Momentos", width: "w-[150px]", align: "text-left" },
  { label: "Publicación", width: "w-[140px]", align: "text-left" },
  { label: "Disponibilidad", width: "w-[170px]", align: "text-left" },
  { label: "Acciones", width: "", align: "text-right" },
] as const;

const CELL = "px-3 align-middle";

const PUBLICATION_TONES: Record<ProductRowView["status"], string> = {
  published: "bg-success-bg text-success",
  draft: "bg-sand text-muted",
  archived: "bg-warning-bg text-warning",
};

/** Publication chip of a row ("Publicado", "Borrador", "Archivado"). */
function StatusChip({ row }: { row: ProductRowView }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[23px] items-center rounded-[12px] px-2 text-[11px] font-bold whitespace-nowrap",
        PUBLICATION_TONES[row.status],
      )}
    >
      {row.statusLabel}
    </span>
  );
}

/** "Availability": 30×18 switch with its state line and, after a failed save, the inline error. */
function RowAvailability({ row, onChange }: { row: ProductRowView; onChange: (available: boolean) => void }) {
  const pending = row.availabilityState === "pending";
  const archived = row.status === "archived";
  return (
    <div className="flex flex-col items-start gap-[3px]">
      <span className="inline-flex items-center gap-[7px]">
        <button
          type="button"
          role="switch"
          aria-checked={row.available}
          aria-label={`Disponibilidad de ${row.name}`}
          aria-busy={pending || undefined}
          disabled={archived || pending}
          onClick={() => onChange(!row.available)}
          className={clsx(
            "relative flex h-[18px] w-[30px] shrink-0 items-center rounded-[9px] p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            // Below `lg` an invisible 44×44 hit area around the track, for touch.
            "before:absolute before:-inset-x-[7px] before:-inset-y-[13px] lg:before:hidden",
            row.available ? "justify-end bg-brand" : "justify-start bg-[#D3CFC6]",
            archived && "cursor-not-allowed opacity-50",
            pending && "cursor-progress",
          )}
        >
          <span aria-hidden="true" className="size-3.5 rounded-full bg-surface" />
        </button>
        <span
          aria-hidden="true"
          className={clsx(
            "text-[11px] font-semibold whitespace-nowrap",
            pending ? "text-brand" : row.availabilityError ? "text-warning" : "text-ink",
          )}
        >
          {row.availabilityLabel}
        </span>
      </span>
      {row.availabilityError && (
        <span className="text-[11px] font-bold whitespace-nowrap text-danger">{row.availabilityError}</span>
      )}
    </div>
  );
}

const CARD_ACTION =
  "flex h-11 items-center justify-center gap-[5px] rounded-nav px-3 text-[11px] font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const CARD_SECONDARY_ACTION = "text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream";

type ProductCardProps = {
  row: ProductRowView;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleArchive: () => void;
  onAvailabilityChange: (available: boolean) => void;
};

/**
 * Below `lg`, one row as a stacked card: photo, name, meta, moments and price; publication chip
 * and availability switch; then the row actions as 44px buttons instead of the "More Actions" menu.
 */
function ProductCard({ row, onEdit, onDuplicate, onToggleArchive, onAvailabilityChange }: ProductCardProps) {
  const archived = row.status === "archived";
  const ArchiveIcon = archived ? ArchiveRestore : Archive;
  const archiveLabel = archived ? "Restaurar" : "Archivar";
  return (
    <li className={clsx("flex flex-col gap-3 border-b border-[#E8E5DF] p-3", archived && "opacity-[0.92]")}>
      <div className="flex items-start gap-3">
        <ProductImage src={row.image} alt={row.name} sizes="56px" className="size-14 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-[13px] font-bold text-ink">{row.name}</h3>
          <p className="truncate text-[11px] text-muted">{row.metaLabel}</p>
          <p className="truncate text-[12px] font-medium text-muted">{row.momentsLabel}</p>
        </div>
        <p className="shrink-0 text-[13px] font-bold whitespace-nowrap text-ink">{row.price}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <StatusChip row={row} />
        <RowAvailability row={row} onChange={onAvailabilityChange} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Editar ${row.name}`}
          onClick={onEdit}
          className={clsx(CARD_ACTION, "flex-1 bg-brand-wash text-brand hover:bg-brand/15")}
        >
          <Pencil size={13} aria-hidden="true" className="shrink-0" />
          Editar
        </button>
        <button
          type="button"
          aria-label={`Duplicar ${row.name}`}
          onClick={onDuplicate}
          className={clsx(CARD_ACTION, CARD_SECONDARY_ACTION)}
        >
          <Copy size={13} aria-hidden="true" className="shrink-0" />
          Duplicar
        </button>
        <button
          type="button"
          aria-label={`${archiveLabel} ${row.name}`}
          onClick={onToggleArchive}
          className={clsx(CARD_ACTION, CARD_SECONDARY_ACTION)}
        >
          <ArchiveIcon size={13} aria-hidden="true" className="shrink-0" />
          {archiveLabel}
        </button>
      </div>
    </li>
  );
}

type CompactPaginationProps = Pick<ProductCatalogTableProps, "page" | "pageCount" | "onPageChange">;

const PAGER_ARROW =
  "flex size-11 shrink-0 items-center justify-center rounded-nav focus-visible:outline-2 focus-visible:outline-brand";

/** Below `lg`, previous/next as 44px buttons around "Página n de m", in place of `Pagination`. */
function CompactPagination({ page, pageCount, onPageChange }: CompactPaginationProps) {
  const arrow = (direction: "previous" | "next") => {
    const target = direction === "previous" ? page - 1 : page + 1;
    const disabled = target < 1 || target > pageCount;
    const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPageChange(target)}
        aria-label={direction === "previous" ? "Página anterior" : "Página siguiente"}
        className={clsx(PAGER_ARROW, disabled ? "bg-sand text-muted" : clsx("bg-surface", CARD_SECONDARY_ACTION))}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    );
  };

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2 lg:hidden">
      {arrow("previous")}
      <span className="text-[12px] font-bold text-ink">
        Página {page} de {Math.max(pageCount, 1)}
      </span>
      {arrow("next")}
    </nav>
  );
}

function EmptyRows({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <SearchX size={28} aria-hidden="true" className="text-muted" />
      <p className="text-[14px] font-bold text-ink">Sin productos para estos filtros</p>
      <p className="max-w-[360px] text-[12px] text-muted">Probá con otra búsqueda o limpiá los filtros.</p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-1 flex h-[34px] items-center rounded-nav px-3 text-[11px] font-bold text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream focus-visible:outline-2 focus-visible:outline-brand"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

/**
 * "Products Table · Commerce": sticky header, one 65.5px row per product of the current page,
 * "Editar" plus a "More Actions" menu per row, and the "Commerce Footer" with the pagination.
 * Below `lg` the table gives way to a list of `ProductCard`s and a compact pager; the hidden
 * variant is `display: none`, so only one of them is in the accessibility tree.
 */
export function ProductCatalogTable({
  rows,
  countLabel,
  summaryLabel,
  page,
  pageCount,
  empty,
  onPageChange,
  onClearFilters,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onAvailabilityChange,
}: ProductCatalogTableProps) {
  const [menuRowId, setMenuRowId] = useState<string | null>(null);

  const menuItems = (row: ProductRowView): RowMenuItem[] => [
    { label: "Duplicar", icon: Copy, onSelect: () => onDuplicate(row.id) },
    row.status === "archived"
      ? { label: "Restaurar", icon: ArchiveRestore, onSelect: () => onRestore(row.id) }
      : { label: "Archivar", icon: Archive, onSelect: () => onArchive(row.id) },
  ];

  return (
    <section
      aria-label="Productos"
      className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[10px] bg-surface outline-1 -outline-offset-[0.5px] outline-line"
    >
      {!empty && (
        <ul aria-label="Lista de productos" className="lg:hidden">
          {rows.map((row) => (
            <ProductCard
              key={row.id}
              row={row}
              onEdit={() => onEdit(row.id)}
              onDuplicate={() => onDuplicate(row.id)}
              onToggleArchive={() => (row.status === "archived" ? onRestore(row.id) : onArchive(row.id))}
              onAvailabilityChange={(available) => onAvailabilityChange(row.id, available)}
            />
          ))}
        </ul>
      )}
      <div className="hidden min-h-0 shrink overflow-y-auto lg:block">
        <table className="w-full table-fixed border-collapse">
          <thead className="sticky top-0 z-[1] bg-[#F6F4EF]">
            <tr className="h-[38px]">
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={clsx(
                    CELL,
                    column.width,
                    column.align,
                    "text-[11px] font-bold tracking-[0.7px] whitespace-nowrap text-muted uppercase",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          {!empty && (
            <tbody>
              {rows.map((row) => {
                const menuOpen = menuRowId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      "h-[65.5px] border-b border-[#E8E5DF]",
                      menuOpen ? "bg-[#F1F4FF] shadow-[inset_3px_0_0_#2F45AD]" : "bg-surface",
                      row.status === "archived" && "opacity-[0.92]",
                    )}
                  >
                    <th scope="row" className={clsx(CELL, "text-left font-normal")}>
                      <span className="flex items-center gap-3">
                        <ProductImage src={row.image} alt={row.name} sizes="56px" className="size-14 rounded-[10px]" />
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-[13px] font-bold text-ink">{row.name}</span>
                          <span className="truncate text-[11px] text-muted">{row.metaLabel}</span>
                        </span>
                      </span>
                    </th>
                    <td className={clsx(CELL, "text-right text-[13px] font-bold whitespace-nowrap text-ink")}>{row.price}</td>
                    <td title={row.momentsLabel} className={clsx(CELL, "truncate text-[12px] font-medium text-muted")}>
                      {row.momentsLabel}
                    </td>
                    <td className={CELL}>
                      <StatusChip row={row} />
                    </td>
                    <td className={CELL}>
                      <RowAvailability row={row} onChange={(available) => onAvailabilityChange(row.id, available)} />
                    </td>
                    <td className="px-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Editar ${row.name}`}
                          onClick={() => onEdit(row.id)}
                          className="flex h-[30px] items-center gap-[5px] rounded-nav bg-brand-wash px-2.5 text-brand hover:bg-brand/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          <Pencil size={12} aria-hidden="true" className="shrink-0" />
                          <span className="text-[11px] font-bold whitespace-nowrap">Editar</span>
                        </button>
                        <RowMenu
                          label={`Más acciones para ${row.name}`}
                          items={menuItems(row)}
                          open={menuOpen}
                          onOpenChange={(open) => setMenuRowId(open ? row.id : null)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
      {empty && <EmptyRows onClearFilters={onClearFilters} />}
      <footer
        className={clsx(
          "flex min-h-12 w-full flex-col gap-3 border-t border-[#E8E5DF] px-3.5 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:py-0",
          empty ? "shrink-0" : "flex-1",
        )}
      >
        <p role="status" className="flex flex-wrap items-center gap-x-2 lg:flex-nowrap lg:whitespace-nowrap">
          <span className="text-[12px] font-bold text-ink">{countLabel}</span>
          <span className="text-[11px] text-muted">{summaryLabel}</span>
        </p>
        <div className="hidden lg:block">
          <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
        </div>
        <CompactPagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </footer>
    </section>
  );
}
