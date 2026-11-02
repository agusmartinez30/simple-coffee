"use client";

import { ConfirmDialog } from "@/shared/ui";

type RegenerateDialogProps = { label: string; onCancel: () => void; onConfirm: () => void };

/**
 * "¿Regenerar código QR?" over the dimmed screen. Nothing changes until "Regenerar código";
 * "Cancelar", Escape or the scrim keep the current code. The printed code stops working.
 */
export function RegenerateDialog({ label, onCancel, onConfirm }: RegenerateDialogProps) {
  return (
    <ConfirmDialog
      title={`¿Regenerar el código QR de ${label}?`}
      description="El código anterior dejará de funcionar. Tendrás que reemplazar el QR impreso de esta mesa."
      note="La mesa, sus pedidos y pagos no cambian."
      confirmLabel="Regenerar código"
      tone="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
