import { Suspense } from "react";
import type { Metadata } from "next";
import { TableQrScreen } from "@/features/table-qr";

export const metadata: Metadata = { title: "QR de mesas · Café Central" };

export default function TableQrPage() {
  return (
    // Same shell as the other modules; the screen loads its tables on the client.
    <Suspense fallback={null}>
      <TableQrScreen />
    </Suspense>
  );
}
