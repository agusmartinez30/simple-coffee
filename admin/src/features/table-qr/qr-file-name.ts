/** "mesa-07-qr.png": lowercase ASCII slug of the label plus the piece and extension. */
export function getQrFileName(label: string, piece: "qr" | "tarjeta", extension: "png" | "svg"): string {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "mesa"}-${piece}.${extension}`;
}
