/** Customer app the printed codes open when `NEXT_PUBLIC_CUSTOMER_APP_URL` is not set. */
export const DEFAULT_CUSTOMER_APP_URL = "http://localhost:3000";

/** Base URL of the customer app (`web/`), without trailing slashes. */
export function getCustomerAppUrl(): string {
  // Referenced literally so Next inlines the public variable in the client bundle.
  const configured = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL?.trim();
  return (configured || DEFAULT_CUSTOMER_APP_URL).replace(/\/+$/, "");
}

export type QrTarget = { number: number; token: string };

/**
 * URL a table's QR code carries: `<customer app>/?mesa=07&qr=<token>`. The token identifies
 * the credential (rotating it invalidates the old URL); it never carries a session id.
 */
export function buildTableQrUrl({ number, token }: QrTarget, baseUrl: string = getCustomerAppUrl()): string {
  const mesa = String(number).padStart(2, "0");
  return `${baseUrl}/?mesa=${mesa}&qr=${encodeURIComponent(token)}`;
}

/** The URL without its protocol, as the 09C "Table Access URL" field shows it. */
export function formatDisplayUrl(url: string): string {
  return url.replace(/^[a-z]+:\/\//i, "");
}
