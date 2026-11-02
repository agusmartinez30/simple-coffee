"use client";

import type { ReactNode } from "react";
import { useTableAccess } from "./TableAccessProvider";

/** Renders its children only once the table QR has been validated (server screens can use it). */
export function ValidTableOnly({ children }: { children: ReactNode }) {
  const { tableNumber } = useTableAccess();
  return tableNumber === null ? null : <>{children}</>;
}

/** The validated table number ("07"); renders nothing while there is no valid QR. */
export function TableNumberText() {
  const { tableNumber } = useTableAccess();
  return tableNumber;
}
