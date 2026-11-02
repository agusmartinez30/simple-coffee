/** Query parameters printed in the table QR URL: `/?mesa=07&qr=<token>`. */
export const TABLE_PARAM = "mesa";
export const TOKEN_PARAM = "qr";

/** What the customer brings from the QR: the table number as printed and its token. */
export type TableCredentials = { number: string; token: string };

// Mirrors the API query schema (`api/src/modules/tables/http/tables.schemas.ts`), so a URL the
// API would reject with a 400 never leaves the browser.
const NUMBER_PATTERN = /^\d{1,6}$/;
const MAX_TOKEN_LENGTH = 64;

/** Reads the table credentials from a `location.search` string, or null when absent or malformed. */
export function parseTableQrParams(search: string): TableCredentials | null {
  const params = new URLSearchParams(search);
  const number = params.get(TABLE_PARAM)?.trim() ?? "";
  const token = params.get(TOKEN_PARAM)?.trim() ?? "";
  if (!NUMBER_PATTERN.test(number)) return null;
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  return { number, token };
}

/** The search string without the QR parameters (`""` or `"?…"`), keeping every other parameter. */
export function stripTableQrParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(TABLE_PARAM);
  params.delete(TOKEN_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

/** Same table and token; numbers compare by value so "07" and "7" are the same table. */
export function sameTableCredentials(a: TableCredentials, b: TableCredentials): boolean {
  return Number(a.number) === Number(b.number) && a.token === b.token;
}
