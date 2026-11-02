import { BRAND_NAME } from "@/features/admin-shell/navigation";
import { getQrMatrix, getQrPath } from "./qr-matrix";

/** Copy of the 09D "Printable Card" and the 09D/09E sheet cards. */
export const CARD_COPY = {
  brand: BRAND_NAME.toUpperCase(),
  cta: "Escaneá y pedí desde tu celular",
  description: "Explorá nuestra carta, realizá tu pedido y compartí la cuenta de tu mesa.",
  sheetCta: "Escaneá y pedí",
} as const;

/** "MESA 07". */
export function formatCardTitle(label: string): string {
  return label.toUpperCase();
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FONT = "'DM Sans', Arial, sans-serif";

/**
 * Standalone SVG of the 09D card (320×470, the export's on-screen size) for the PNG / SVG
 * exports: cream card with the brand outline, brand, table, the QR in its white frame, the call
 * to action and the description in two lines.
 */
export function buildCardSvgMarkup({ label, url }: { label: string; url: string }): string {
  const matrix = getQrMatrix(url);
  const qrSide = 158;
  const scale = qrSide / matrix.size;
  const qrX = (320 - qrSide) / 2;
  const qrY = 157;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 470" width="320" height="470">`,
    `<rect x="1" y="1" width="318" height="468" rx="12" fill="#f5f3ee" stroke="#2f45ad" stroke-width="2"/>`,
    `<text x="160" y="57" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="1.4" fill="#2f45ad">${escapeXml(CARD_COPY.brand)}</text>`,
    `<text x="160" y="103" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="700" fill="#101010">${escapeXml(formatCardTitle(label))}</text>`,
    `<rect x="50.5" y="122.5" width="219" height="239" rx="16" fill="#ffffff" stroke="#d9d6cf"/>`,
    `<rect x="65.5" y="141.5" width="189" height="189" rx="4" fill="#ffffff" stroke="#101010"/>`,
    `<path d="${getQrPath(matrix)}" fill="#101010" transform="translate(${qrX} ${qrY}) scale(${scale})" shape-rendering="crispEdges"/>`,
    `<text x="160" y="392" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" fill="#2f45ad">${escapeXml(CARD_COPY.cta)}</text>`,
    `<text x="160" y="418" text-anchor="middle" font-family="${FONT}" font-size="9" fill="#101010">Explorá nuestra carta, realizá tu pedido</text>`,
    `<text x="160" y="430" text-anchor="middle" font-family="${FONT}" font-size="9" fill="#101010">y compartí la cuenta de tu mesa.</text>`,
    `</svg>`,
  ].join("");
}
