"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Coffee, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import { PrimaryButton, SecondaryButton, StateCard } from "@/shared/ui";
import { useMenu } from "./MenuProvider";

type MenuGateProps = {
  children: ReactNode;
  /** Wraps the loading and error cards in a screen `<main>`, for routes whose content is the menu. */
  screen?: boolean;
};

/**
 * Renders its children once the menu is loaded; until then the loading card, and when the API
 * could not answer, the error card with "Reintentar". There is no fallback to mock data.
 */
export function MenuGate({ children, screen = false }: MenuGateProps) {
  const { status, retry } = useMenu();
  if (status === "ready") return <>{children}</>;

  const card =
    status === "loading" ? (
      <MenuLoading />
    ) : (
      <div className="flex flex-col gap-3" role="alert">
        <StateCard icon={WifiOff} title="No pudimos cargar el menú">
          No pudimos comunicarnos con el café. Revisá tu conexión e intentá de nuevo.
        </StateCard>
        <PrimaryButton size="md" icon={RefreshCw} onClick={retry}>
          Reintentar
        </PrimaryButton>
      </div>
    );
  return screen ? <MenuScreen>{card}</MenuScreen> : card;
}

/** Pending card while the menu loads; also the Suspense fallback of the menu routes. */
export function MenuLoading() {
  return (
    <div aria-busy="true">
      <StateCard icon={LoaderCircle} title="Cargando el menú" spinIcon>
        Esto lleva solo un momento.
      </StateCard>
    </div>
  );
}

/** A screen `<main>` around a menu state card. */
export function MenuScreen({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col gap-3 px-4 pt-6 pb-6">{children}</main>;
}

/** A product or category the loaded menu no longer has (unpublished, sold out, hidden). */
export function MenuItemUnavailable({ title }: { title: string }) {
  return (
    <MenuScreen>
      <StateCard variant="empty" icon={Coffee} title={title}>
        Puede que se haya agotado o que ya no esté en la carta.
      </StateCard>
      <SecondaryButton size="md" icon={ArrowLeft} href="/explore">
        Volver a la carta
      </SecondaryButton>
    </MenuScreen>
  );
}
