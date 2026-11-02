import { create } from "qrcode";

/** Modules of a QR symbol, row by row (`true` = dark). */
export type QrMatrix = { size: number; cells: boolean[] };

/** Encodes `text` with error correction level M (about 15% of the code can be damaged). */
export function getQrMatrix(text: string): QrMatrix {
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  return { size: modules.size, cells: Array.from(modules.data, (value) => value === 1) };
}

/** SVG path drawing the dark modules, one rectangle per horizontal run, in module units. */
export function getQrPath({ size, cells }: QrMatrix): string {
  const runs: string[] = [];
  for (let row = 0; row < size; row += 1) {
    let col = 0;
    while (col < size) {
      if (!cells[row * size + col]) {
        col += 1;
        continue;
      }
      const start = col;
      while (col < size && cells[row * size + col]) col += 1;
      const width = col - start;
      runs.push(`M${start} ${row}h${width}v1h-${width}z`);
    }
  }
  return runs.join(" ");
}

export type QrSvgOptions = {
  /** Quiet zone in modules (the QR spec asks for 4). */
  margin?: number;
  color?: string;
  background?: string;
};

/** Standalone SVG document of the code, for downloads and PNG rasterization. */
export function buildQrSvgMarkup(text: string, { margin = 4, color = "#101010", background = "#ffffff" }: QrSvgOptions = {}): string {
  const matrix = getQrMatrix(text);
  const side = matrix.size + margin * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">` +
    `<rect width="${side}" height="${side}" fill="${background}"/>` +
    `<path d="${getQrPath(matrix)}" fill="${color}" transform="translate(${margin} ${margin})"/>` +
    `</svg>`
  );
}
