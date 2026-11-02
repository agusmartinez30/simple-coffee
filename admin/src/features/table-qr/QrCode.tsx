import { getQrMatrix, getQrPath } from "./qr-matrix";

type QrCodeProps = {
  /** Text the code encodes (the table's QR URL). */
  value: string;
  /** Rendered side in px; the quiet zone is drawn by the caller's frame. */
  size: number;
  /** Accessible name, e.g. "Código QR de Mesa 07". */
  label: string;
  className?: string;
};

/**
 * Real, scannable QR code (replaces the exports' drawn placeholder). The modules come from
 * `qrcode` synchronously and are drawn as one crisp SVG path, so the code renders on the server
 * and prints sharply at any size.
 */
export function QrCode({ value, size, label, className }: QrCodeProps) {
  const matrix = getQrMatrix(value);
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${matrix.size} ${matrix.size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={getQrPath(matrix)} fill="currentColor" />
    </svg>
  );
}
