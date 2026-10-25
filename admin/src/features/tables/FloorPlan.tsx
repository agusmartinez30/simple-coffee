"use client";

import clsx from "clsx";
import { useRef, type ReactNode } from "react";
import { Check, Map as MapIcon, Maximize, Minus, Plus } from "lucide-react";
import {
  getFitTransform,
  getTableBody,
  zoomAround,
  type Chair,
  type PlanTable,
  type PlanTone,
  type PlanTransform,
  type SpaceTab,
} from "./floor-plan";

const TONES: Record<PlanTone, { chair: string; body: string; text: string; ring: string; dot: string }> = {
  free: { chair: "bg-[#e9e6e1]", body: "bg-surface", text: "text-ink", ring: "outline-ink", dot: "bg-ink" },
  occupied: { chair: "bg-brand-wash", body: "bg-brand-wash", text: "text-brand", ring: "outline-brand", dot: "bg-brand" },
  bill: { chair: "bg-danger-bg", body: "bg-danger-bg", text: "text-danger", ring: "outline-danger", dot: "bg-danger" },
};

type TableFigureProps = {
  /** Box size (body plus chairs), as stored in the layout. */
  size: { width: number; height: number };
  chairs: readonly Chair[];
  shape: "rect" | "round";
  chairClass: string;
  bodyClass: string;
  /** Outline color class when selected; null draws the resting hairline. */
  ringClass: string | null;
  children: ReactNode;
};

/** A table in its box (150×132 by default): chairs by capacity around the body (round or rect). */
export function TableFigure({ size, chairs, shape, chairClass, bodyClass, ringClass, children }: TableFigureProps) {
  const body = getTableBody(size);
  return (
    <>
      {chairs.map((chair, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{ left: chair.x, top: chair.y, width: chair.width, height: chair.height }}
          className={clsx("absolute rounded-[4px]", chairClass)}
        />
      ))}
      <span
        aria-hidden="true"
        style={{ left: body.x, top: body.y, width: body.width, height: body.height }}
        className={clsx(
          "absolute flex flex-col items-center justify-center gap-1.5 group-hover:brightness-[0.97]",
          bodyClass,
          shape === "round" ? "rounded-full" : "rounded-[14px]",
          ringClass ? clsx("outline-3 -outline-offset-[1.5px]", ringClass) : "outline-1 -outline-offset-[0.5px] outline-line",
        )}
      >
        {children}
      </span>
    </>
  );
}

type PlanTableProps = { table: PlanTable; selected: boolean; onSelect: (id: string) => void };

/** "Mesa NN · free/occ/bill": chairs by capacity around the body at its stored size (round in the patio). */
function PlanTableButton({ table, selected, onSelect }: PlanTableProps) {
  const tone = TONES[table.tone];
  const details = table.account ? `${table.account}, ${table.duration ?? ""}` : table.capacityLabel;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${table.label}: ${details}`}
      onClick={() => onSelect(table.id)}
      style={{ left: table.x, top: table.y, width: table.width, height: table.height }}
      className={clsx(
        "group absolute rounded-[14px] transition-opacity focus-visible:outline-2 focus-visible:outline-brand",
        !table.matches && "opacity-30",
      )}
    >
      <TableFigure
        size={table}
        chairs={table.chairs}
        shape={table.shape}
        chairClass={tone.chair}
        bodyClass={tone.body}
        ringClass={selected ? tone.ring : null}
      >
        <span className={clsx("text-[14px] font-bold whitespace-nowrap", tone.text)}>{table.code}</span>
        {table.account ? (
          <>
            <span className={clsx("font-bold whitespace-nowrap", tone.text, table.shape === "round" ? "text-[11px]" : "text-[12px]")}>
              {table.account}
            </span>
            {table.duration && (
              <span className={clsx("text-[10px] font-semibold whitespace-nowrap", tone.text)}>◷ {table.duration}</span>
            )}
          </>
        ) : (
          <span className="text-[10px] whitespace-nowrap text-muted">{table.capacityLabel}</span>
        )}
      </TableFigure>
      {selected && (
        <span
          aria-hidden="true"
          style={{ left: table.width - 25 }}
          className={clsx("absolute top-3.5 flex size-[18px] items-center justify-center rounded-full text-white", tone.dot)}
        >
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/** "Zoom Controls": in, out and fit, stacked at the bottom-left corner of the plan. */
export function ZoomControls({ onZoom, onFit }: { onZoom: (direction: 1 | -1) => void; onFit: () => void }) {
  return (
    <div
      role="group"
      aria-label="Zoom del plano"
      className="absolute bottom-[26px] left-4 flex flex-col rounded-nav bg-surface outline-1 -outline-offset-[0.5px] outline-line"
    >
      <button type="button" aria-label="Acercar" onClick={() => onZoom(1)} className="flex h-[30px] w-8 items-center justify-center text-ink hover:bg-cream">
        <Plus size={14} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Alejar" onClick={() => onZoom(-1)} className="flex h-[30px] w-8 items-center justify-center text-ink hover:bg-cream">
        <Minus size={14} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Ajustar a la vista" onClick={onFit} className="flex h-[30px] w-8 items-center justify-center text-ink hover:bg-cream">
        <Maximize size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

type FloorPlanProps = {
  spaceName: string;
  tables: readonly PlanTable[];
  tabs: readonly SpaceTab[];
  activeSpaceId: string;
  selectedId: string | null;
  transform: PlanTransform;
  /** Shown over the plan when no table can be drawn or found. */
  notice: { title: string; action?: { label: string; onClick: () => void } } | null;
  onSelect: (id: string) => void;
  onSpaceChange: (id: string) => void;
  onTransformChange: (transform: PlanTransform) => void;
};

/**
 * "Plano · Salón principal": the active space's tables at their layout coordinates, with the
 * floor label, the zoom controls (in, out, fit) and the space tabs. The tables live in one
 * transformed layer, so zooming keeps chairs and labels proportional.
 */
export function FloorPlan(props: FloorPlanProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewport = () => {
    const element = viewportRef.current;
    return { width: element?.clientWidth ?? 852, height: element?.clientHeight ?? 640 };
  };
  const zoom = (direction: 1 | -1) => {
    const { width, height } = viewport();
    props.onTransformChange(zoomAround(props.transform, direction, { x: width / 2, y: height / 2 }));
  };
  const { scale, x, y } = props.transform;

  return (
    <section
      ref={viewportRef}
      aria-label={`Plano · ${props.spaceName}`}
      className="relative min-h-[520px] w-full flex-1 overflow-hidden rounded-card bg-[#f7f5f1] outline-1 -outline-offset-[0.5px] outline-line"
    >
      <div
        className="absolute top-0 left-0 origin-top-left transition-transform duration-200"
        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      >
        {props.tables.map((table) => (
          <PlanTableButton key={table.id} table={table} selected={table.id === props.selectedId} onSelect={props.onSelect} />
        ))}
      </div>

      <p className="absolute top-4 left-[18px] flex items-center gap-[7px] rounded-nav bg-surface px-2.5 py-[7px] outline-1 -outline-offset-[0.5px] outline-line">
        <MapIcon size={14} aria-hidden="true" className="text-ink" />
        <span className="text-[12px] font-bold whitespace-nowrap text-ink">{props.spaceName}</span>
      </p>

      {props.notice && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-[15px] font-bold text-ink">{props.notice.title}</p>
          {props.notice.action && (
            <button type="button" onClick={props.notice.action.onClick} className="text-[13px] font-bold text-brand hover:underline">
              {props.notice.action.label}
            </button>
          )}
        </div>
      )}

      <ZoomControls onZoom={zoom} onFit={() => props.onTransformChange(getFitTransform(props.tables, viewport()))} />

      <div
        role="tablist"
        aria-label="Espacios"
        className="absolute bottom-[66px] left-1/2 flex -translate-x-1/2 gap-1 rounded-[9px] bg-surface p-1 outline-1 -outline-offset-[0.5px] outline-line"
      >
        {props.tabs.map((tab) => {
          const active = tab.id === props.activeSpaceId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => props.onSpaceChange(tab.id)}
              className={clsx(
                "rounded-[6px] px-2.5 py-1.5 text-[11px] whitespace-nowrap",
                active ? "bg-ink font-bold text-white" : "font-semibold text-muted hover:bg-cream hover:text-ink",
              )}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
