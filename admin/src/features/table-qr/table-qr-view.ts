import type { TableQr } from "./table-qr-types";

/**
 * Venue time zone, the same the API uses for its service day; credential dates ("Generado hoy",
 * "12 jun") are shown in it, as the orders board shows its times.
 */
export const VENUE_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** "QR pausado" is a disabled table (its code resolves nothing); "Sin QR" has no credential. */
export type QrStatus = "active" | "paused" | "missing";

export const QR_STATUS_LABELS: Record<QrStatus, string> = {
  active: "QR activo",
  paused: "QR pausado",
  missing: "Sin QR",
};

export function getQrStatus(table: TableQr): QrStatus {
  if (!table.qr) return "missing";
  return table.enabled ? "active" : "paused";
}

export type SpaceFilter = "all" | string;
export type TableFilters = { query: string; spaceId: SpaceFilter };

/** Lowercase without accents or surrounding spaces ("Ñandú " → "nandu"). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function matchesQuery(table: TableQr, query: string): boolean {
  if (query === "") return true;
  if (normalize(table.label).includes(query)) return true;
  // "mesa 7" or "7" finds Mesa 07 even without the leading zero.
  const digits = query.replace(/^mesa\s*/, "");
  return /^\d+$/.test(digits) && Number(digits) === table.number;
}

/** "Buscar mesa…" and the "Espacio" filter. */
export function filterTables(tables: readonly TableQr[], { query, spaceId }: TableFilters): TableQr[] {
  const normalized = normalize(query);
  return tables.filter((table) => (spaceId === "all" || table.spaceId === spaceId) && matchesQuery(table, normalized));
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const DATE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: VENUE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function venueDay(at: Date): { year: number; month: number; day: number } | null {
  if (Number.isNaN(at.getTime())) return null;
  const parts = DATE_PARTS.formatToParts(at);
  const part = (type: "year" | "month" | "day") => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

/** "hoy" for the venue's current day, otherwise "12 jun"; empty for an invalid date. */
export function formatCredentialDate(isoDate: string, now: Date): string {
  const day = venueDay(new Date(isoDate));
  if (!day) return "";
  const today = venueDay(now);
  if (today && today.year === day.year && today.month === day.month && today.day === day.day) return "hoy";
  return `${day.day} ${MONTHS[day.month - 1]}`;
}

/** "QR-118", the audit entry of a rotation. */
export function formatAuditNumber(auditNumber: number): string {
  return `QR-${auditNumber}`;
}

export type CredentialHistoryRow = { key: string; status: "active" | "revoked"; label: string; meta: string };

/** "Historial de credenciales": the active credential, then the rotated ones (newest first). */
export function getCredentialHistory(table: TableQr, now: Date): CredentialHistoryRow[] {
  const rows: CredentialHistoryRow[] = [];
  if (table.qr) {
    rows.push({
      key: table.qr.token,
      status: "active",
      label: "Activo",
      meta: `Generado ${formatCredentialDate(table.qr.issuedAt, now)} · ${table.qr.issuedBy}`,
    });
  }
  for (const credential of table.revoked) {
    rows.push({
      key: credential.token,
      status: "revoked",
      label: "Revocado",
      meta: `Rotado ${formatCredentialDate(credential.revokedAt, now)} · auditoría ${formatAuditNumber(credential.auditNumber)}`,
    });
  }
  return rows;
}
