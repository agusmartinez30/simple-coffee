import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText, downloadSvg } from "./qr-download";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Minimal `document` for the anchor-click download (the tests run in node). */
function stubDocument() {
  const link = { href: "", download: "", rel: "", click: vi.fn(), remove: vi.fn() };
  const append = vi.fn();
  vi.stubGlobal("document", { createElement: vi.fn(() => link), body: { append } });
  return { link, append };
}

describe("downloadSvg", () => {
  it("saves the SVG as a data URL under the given file name", () => {
    const { link, append } = stubDocument();

    downloadSvg('<svg xmlns="http://www.w3.org/2000/svg"/>', "mesa-07-qr.svg");

    expect(link.href).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`,
    );
    expect(link.download).toBe("mesa-07-qr.svg");
    expect(append).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
  });
});

describe("copyText", () => {
  it("copies to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    expect(await copyText("http://x/?mesa=07&qr=a")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("http://x/?mesa=07&qr=a");
  });

  it("answers false when the browser refuses", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    expect(await copyText("x")).toBe(false);
  });
});
