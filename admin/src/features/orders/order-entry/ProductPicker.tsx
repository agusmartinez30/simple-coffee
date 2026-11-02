import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { formatPrice } from "@/shared/lib/format-price";
import type { EntryCategory, EntryProduct } from "./entry-types";

type ProductPickerProps = {
  products: readonly EntryProduct[];
  categories: readonly EntryCategory[];
  query: string;
  onQueryChange: (query: string) => void;
  /** Chip filter; null shows every category. */
  categoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onPick: (product: EntryProduct) => void;
  disabled?: boolean;
};

function CategoryChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(
        "min-h-9 shrink-0 rounded-[7px] px-[9px] py-1.5 text-[10px] sm:min-h-0 font-semibold whitespace-nowrap outline-1 -outline-offset-[0.5px]",
        pressed ? "bg-ink text-white outline-ink" : "bg-surface text-muted outline-line hover:bg-cream",
      )}
    >
      {children}
    </button>
  );
}

/**
 * "Agregar productos": search, category chips and one row per orderable product. On phones the list
 * grows with the panel's own scroll instead of nesting a 230px scroller.
 */
export function ProductPicker({
  products,
  categories,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  onPick,
  disabled = false,
}: ProductPickerProps) {
  return (
    <section aria-labelledby="order-entry-products" className="flex w-full flex-col gap-[9px]">
      <h3 id="order-entry-products" className="text-[13px] font-bold text-ink">
        Agregar productos
      </h3>
      <label className="flex h-[38px] w-full shrink-0 items-center gap-2 rounded-nav bg-cream px-[11px] outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand">
        <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
        <span className="sr-only">Buscar producto</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar café, comida o extra…"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted"
        />
      </label>
      {categories.length > 0 && (
        <div role="group" aria-label="Categorías" className="flex w-full flex-wrap gap-1.5">
          <CategoryChip pressed={categoryId === null} onClick={() => onCategoryChange(null)}>
            Todas
          </CategoryChip>
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              pressed={categoryId === category.id}
              onClick={() => onCategoryChange(categoryId === category.id ? null : category.id)}
            >
              {category.name}
            </CategoryChip>
          ))}
        </div>
      )}
      {products.length === 0 ? (
        <p className="py-3 text-center text-[11px] text-muted">No encontramos productos con esa búsqueda.</p>
      ) : (
        <ul aria-label="Productos" className="flex w-full flex-col sm:max-h-[230px] sm:overflow-y-auto">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(product)}
                aria-label={`Agregar ${product.name}`}
                className="group flex h-[46px] w-full items-center justify-between gap-3 rounded-nav px-1 text-left hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[12px] font-bold text-ink">{product.name}</span>
                  <span className="text-[10px] text-muted">
                    {formatPrice(product.price)}
                    {product.optionGroups.length > 0 && " · Con opciones"}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-nav text-ink outline-1 -outline-offset-[0.5px] outline-line group-hover:bg-surface"
                >
                  <Plus size={15} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
