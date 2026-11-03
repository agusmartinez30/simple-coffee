import clsx from "clsx";
import { ChevronDown, Search, X } from "lucide-react";
import {
  MOMENT_FILTER_OPTIONS,
  PUBLICATION_FILTER_OPTIONS,
  type FilterOption,
  type ProductFilters,
} from "./product-catalog";
import type { FilterKey } from "./products-state";

type ProductListFiltersProps = {
  filters: ProductFilters;
  /** Options of the "Categoría" select (from the API, or the mock categories). */
  categoryOptions: readonly FilterOption<ProductFilters["category"]>[];
  /** Shows "Limpiar" when the search or a filter narrows the list. */
  canClear: boolean;
  onQueryChange: (query: string) => void;
  onFilterChange: <K extends FilterKey>(filter: K, value: ProductFilters[K]) => void;
  onClear: () => void;
};

const FIELD_CLASSES =
  "h-11 rounded-nav bg-surface outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand lg:h-10";

type SelectFilterProps<T extends string> = {
  label: string;
  /** Minimum width of the closed select, as in the export. */
  width: string;
  value: T;
  options: readonly FilterOption<T>[];
  onChange: (value: T) => void;
};

/** "Filter · …": native select showing the filter name until an option is chosen. */
function SelectFilter<T extends string>({ label, width, value, options, onChange }: SelectFilterProps<T>) {
  return (
    <label className={clsx("relative flex flex-1 items-center lg:flex-none", width, FIELD_CLASSES)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-full w-full cursor-pointer appearance-none bg-transparent pr-7 pl-[11px] text-[12px] font-semibold text-ink outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-[11px] text-muted" />
    </label>
  );
}

/**
 * "Commerce Filters": search by name or SKU, the "Disponibles" chip (brand-filled while on),
 * the three filter selects and "Limpiar". Below `lg` the search takes the full width and the rest
 * wraps under it, with the selects growing to fill each line.
 */
export function ProductListFilters({
  filters,
  categoryOptions,
  canClear,
  onQueryChange,
  onFilterChange,
  onClear,
}: ProductListFiltersProps) {
  const onlyAvailable = filters.availability === "available";
  return (
    <div role="search" className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:h-10 lg:flex-nowrap">
      <label className={clsx("flex w-full shrink-0 items-center gap-2 px-[11px] lg:w-[300px]", FIELD_CLASSES)}>
        <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
        <span className="sr-only">Buscar producto por nombre o SKU</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar producto…"
          className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
        />
      </label>
      <button
        type="button"
        aria-pressed={onlyAvailable}
        onClick={() => onFilterChange("availability", onlyAvailable ? "all" : "available")}
        className={clsx(
          "flex h-11 shrink-0 items-center gap-[7px] rounded-nav px-[11px] text-[12px] font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:h-10",
          onlyAvailable
            ? "bg-brand text-white hover:bg-brand/92"
            : "bg-surface text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream",
        )}
      >
        Disponibles
        {onlyAvailable && <X size={13} aria-hidden="true" className="shrink-0" />}
      </button>
      <SelectFilter
        label="Categoría"
        width="min-w-[118px]"
        value={filters.category}
        options={categoryOptions}
        onChange={(value) => onFilterChange("category", value)}
      />
      <SelectFilter
        label="Momento"
        width="min-w-[110px]"
        value={filters.moment}
        options={MOMENT_FILTER_OPTIONS}
        onChange={(value) => onFilterChange("moment", value)}
      />
      <SelectFilter
        label="Publicación"
        width="min-w-[126px]"
        value={filters.publication}
        options={PUBLICATION_FILTER_OPTIONS}
        onChange={(value) => onFilterChange("publication", value)}
      />
      {canClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-11 shrink-0 items-center rounded-nav px-3 text-[11px] font-bold whitespace-nowrap text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand lg:h-10 lg:px-2"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
