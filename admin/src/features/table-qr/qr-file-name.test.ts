import { describe, expect, it } from "vitest";
import { getQrFileName } from "./qr-file-name";

describe("getQrFileName", () => {
  it("names downloads after the label", () => {
    expect(getQrFileName("Mesa 07", "qr", "png")).toBe("mesa-07-qr.png");
    expect(getQrFileName("Ventana Ñandú", "tarjeta", "svg")).toBe("ventana-nandu-tarjeta.svg");
  });

  it("falls back to mesa when the label has no usable characters", () => {
    expect(getQrFileName("¡!", "qr", "svg")).toBe("mesa-qr.svg");
  });
});
