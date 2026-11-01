import Link from "next/link";
import { Info, Search } from "lucide-react";
import { MOMENTS } from "@/mocks/moments";
import { TABLE } from "@/mocks/table";
import { CartFloatingCta } from "@/features/cart";
import { BottomDock, BottomNav } from "@/shared/ui";
import { MomentCard } from "./MomentCard";

/** Screen 02B · Explore landing: pick a consumption moment. */
export function ExploreLanding() {
  return (
    <>
      <main className="flex flex-1 flex-col px-4 pt-3 pb-[164px]">
        <header className="flex flex-col gap-[13px]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[0.9px] text-brand uppercase">
              {TABLE.cafeName} · Mesa {TABLE.number}
            </p>
            <div className="flex gap-2">
              <Link
                href="/info"
                aria-label="Información del café"
                className="flex size-[38px] items-center justify-center rounded-full bg-surface text-ink"
              >
                <Info size={19} aria-hidden="true" />
              </Link>
              {/* Search is visual only in this prototype. */}
              <button
                type="button"
                aria-label="Buscar"
                className="flex size-[38px] items-center justify-center rounded-full bg-surface text-ink"
              >
                <Search size={19} aria-hidden="true" />
              </button>
            </div>
          </div>
          <h1 className="font-display text-[34px] leading-8 font-bold text-ink">
            ¿Qué tenés ganas
            <br />
            de disfrutar?
          </h1>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {MOMENTS.map((moment, index) => (
            <MomentCard key={moment.id} moment={moment} eager={index < 2} />
          ))}
        </div>

        <p className="mt-[19px] text-[11px] text-muted">
          Elegí un momento. El menú se adapta a vos.
        </p>
      </main>
      <BottomDock>
        <CartFloatingCta variant="count" />
        <BottomNav active="explorar" />
      </BottomDock>
    </>
  );
}
