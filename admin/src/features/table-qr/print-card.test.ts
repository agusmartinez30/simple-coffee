import { describe, expect, it } from "vitest";
import { getQrMatrix, getQrPath } from "./qr-matrix";
import { CARD_COPY, buildCardSvgMarkup, formatCardTitle } from "./print-card";

const URL_07 = "http://localhost:3000/?mesa=07&qr=4pX9kR2mL7";

describe("formatCardTitle", () => {
  it("prints the label in capitals, as the 09D card", () => {
    expect(formatCardTitle("Mesa 07")).toBe("MESA 07");
  });
});

describe("buildCardSvgMarkup", () => {
  it("draws the 09D card with the brand, the table, the real QR and the call to action", () => {
    const svg = buildCardSvgMarkup({ label: "Mesa 07", url: URL_07 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 320 470"');
    expect(svg).toContain("CAFÉ CENTRAL");
    expect(svg).toContain("MESA 07");
    expect(svg).toContain(CARD_COPY.cta);
    expect(svg).toContain(getQrPath(getQrMatrix(URL_07)));
  });

  it("escapes the label", () => {
    expect(buildCardSvgMarkup({ label: "Mesa <1> & 2", url: URL_07 })).toContain("MESA &lt;1&gt; &amp; 2");
  });
});
