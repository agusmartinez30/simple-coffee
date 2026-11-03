"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Menu } from "@/mocks/types";
import { fetchMenu } from "./menu-api";
import { EMPTY_MENU, toMenu } from "./menu-mapper";

export type MenuStatus = "loading" | "ready" | "error";

export type MenuContextValue = {
  status: MenuStatus;
  /** The loaded menu; empty while loading or after an error, so lookups find nothing. */
  menu: Menu;
  /** Loads the menu again (after an error). */
  retry: () => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

type MenuState = { status: MenuStatus; menu: Menu };

/**
 * The customer menu from `GET /catalog/menu`, shared by Explore, the product detail, the cart
 * and the table. It loads after mount in the browser, so the server render and the build never
 * reach the API: pages show the loading state first, then the menu or the error state.
 */
export function MenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MenuState>({ status: "loading", menu: EMPTY_MENU });
  const runRef = useRef(0);

  const load = useCallback(async () => {
    const run = ++runRef.current;
    const result = await fetchMenu();
    // A newer load (retry) owns the state.
    if (run !== runRef.current) return;
    setState(result.ok ? { status: "ready", menu: toMenu(result.menu) } : { status: "error", menu: EMPTY_MENU });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<MenuContextValue>(
    () => ({
      status: state.status,
      menu: state.menu,
      retry: () => {
        setState({ status: "loading", menu: EMPTY_MENU });
        void load();
      },
    }),
    [state, load],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) throw new Error("useMenu must be used within <MenuProvider>");
  return context;
}
