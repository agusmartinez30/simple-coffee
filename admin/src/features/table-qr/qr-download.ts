/** Browser-only helpers that save the generated SVGs as files (no extra dependencies). */

function saveDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

const toSvgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function downloadSvg(svg: string, fileName: string) {
  saveDataUrl(toSvgDataUrl(svg), fileName);
}

/** Rasterizes the SVG on a canvas (`width` px wide, keeping its aspect ratio) and saves a PNG. */
export async function downloadPng(svg: string, fileName: string, width: number) {
  const image = new Image();
  image.src = toSvgDataUrl(svg);
  await image.decode();
  const ratio = image.naturalWidth > 0 ? image.naturalHeight / image.naturalWidth : 1;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(width * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  saveDataUrl(canvas.toDataURL("image/png"), fileName);
}

/** Copies text to the clipboard; false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
