import { describe, expect, it } from "vitest";
import { buildQrSvgMarkup, getQrMatrix, getQrPath } from "./qr-matrix";

const URL_07 = "http://localhost:3000/?mesa=07&qr=4pX9kR2mL7";

describe("getQrMatrix", () => {
  it("encodes the URL as a square QR symbol with the three finder patterns", () => {
    const matrix = getQrMatrix(URL_07);
    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect(matrix.cells).toHaveLength(matrix.size * matrix.size);
    const dark = (row: number, col: number) => matrix.cells[row * matrix.size + col];
    const last = matrix.size - 1;
    for (const [row, col] of [[0, 0], [0, last - 6], [last - 6, 0]]) {
      // Outer ring and center of each 7×7 finder pattern are dark; the ring inside it is light.
      expect(dark(row, col)).toBe(true);
      expect(dark(row + 6, col + 6)).toBe(true);
      expect(dark(row + 1, col + 1)).toBe(false);
      expect(dark(row + 3, col + 3)).toBe(true);
    }
  });

  it("changes when the token changes", () => {
    const other = getQrMatrix("http://localhost:3000/?mesa=07&qr=Q7wE3rT9yU");
    expect(other.cells).not.toEqual(getQrMatrix(URL_07).cells);
  });
});

describe("getQrPath", () => {
  it("draws one unit square per dark module, merging horizontal runs", () => {
    const path = getQrPath({ size: 2, cells: [true, true, false, true] });
    expect(path).toBe("M0 0h2v1h-2z M1 1h1v1h-1z");
  });
});

describe("buildQrSvgMarkup", () => {
  it("renders a standalone SVG with a quiet zone for the URL", () => {
    const { size } = getQrMatrix(URL_07);
    const svg = buildQrSvgMarkup(URL_07, { margin: 4 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`viewBox="0 0 ${size + 8} ${size + 8}"`);
    expect(svg).toContain(`<path d="${getQrPath(getQrMatrix(URL_07))}"`);
    expect(buildQrSvgMarkup(URL_07, { margin: 4 })).toBe(svg);
  });
});
