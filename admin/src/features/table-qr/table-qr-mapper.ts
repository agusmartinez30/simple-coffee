import type { QrCredential, QrSpace, RevokedQrCredential, TableQr, TablesQrConfig } from "./table-qr-types";

/**
 * `/tables/config` API body (`{ spaces, tables }`, see `api/src/modules/tables`) → QR view model.
 * Credentials carry `issuedBy: { id, name }` and ISO instants; revoked ones add `revokedAt` and
 * `auditNumber`. Layout, capacity and version are not needed here and are dropped.
 */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function toCredential(value: unknown): QrCredential | null {
  if (!isRecord(value)) return null;
  const { token, issuedAt, issuedBy } = value;
  if (!isString(token) || !isString(issuedAt) || !isRecord(issuedBy) || !isString(issuedBy.name)) return null;
  return { token, issuedAt, issuedBy: issuedBy.name };
}

function toRevoked(value: unknown): RevokedQrCredential | null {
  const credential = toCredential(value);
  if (!credential || !isRecord(value) || !isString(value.revokedAt) || !isNumber(value.auditNumber)) return null;
  return { ...credential, revokedAt: value.revokedAt, auditNumber: value.auditNumber };
}

function toSpace(value: unknown): QrSpace | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return null;
  return { id: value.id, name: value.name };
}

function toTable(value: unknown, spaces: readonly QrSpace[]): TableQr | null {
  if (!isRecord(value)) return null;
  const { id, number, label, spaceId, enabled, qr, revokedQrs } = value;
  if (!isString(id) || !isNumber(number) || !isString(label) || !isString(spaceId) || typeof enabled !== "boolean") {
    return null;
  }
  const credential = qr === null ? null : toCredential(qr);
  if (qr !== null && credential === null) return null;
  if (!Array.isArray(revokedQrs)) return null;
  const revoked = revokedQrs.map(toRevoked);
  if (revoked.some((entry) => entry === null)) return null;
  return {
    id,
    number,
    label,
    spaceId,
    spaceName: spaces.find((space) => space.id === spaceId)?.name ?? "",
    enabled,
    qr: credential,
    revoked: revoked as RevokedQrCredential[],
  };
}

/** The configuration with tables sorted by number, or null when the body is malformed. */
export function toTablesQrConfig(body: unknown): TablesQrConfig | null {
  if (!isRecord(body) || !Array.isArray(body.spaces) || !Array.isArray(body.tables)) return null;
  const spaces = body.spaces.map(toSpace);
  if (spaces.some((space) => space === null)) return null;
  const validSpaces = spaces as QrSpace[];
  const tables = body.tables.map((table) => toTable(table, validSpaces));
  if (tables.some((table) => table === null)) return null;
  return { spaces: validSpaces, tables: (tables as TableQr[]).sort((a, b) => a.number - b.number) };
}
