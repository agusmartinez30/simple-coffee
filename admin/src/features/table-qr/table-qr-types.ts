/** Active QR credential of a table: the token its printed code carries. */
export type QrCredential = {
  token: string;
  /** ISO instant the API issued it. */
  issuedAt: string;
  /** Name of the staff member who issued it. */
  issuedBy: string;
};

/** A rotated credential: its printed code no longer resolves the table. */
export type RevokedQrCredential = QrCredential & {
  /** ISO instant of the rotation. */
  revokedAt: string;
  /** Audit entry of the rotation ("QR-118"). */
  auditNumber: number;
};

/** A table as the QR module needs it (no layout, capacity or version). */
export type TableQr = {
  id: string;
  number: number;
  label: string;
  spaceId: string;
  spaceName: string;
  enabled: boolean;
  /** Null when the table has no credential yet. */
  qr: QrCredential | null;
  /** Rotated credentials, newest first. */
  revoked: RevokedQrCredential[];
};

export type QrSpace = { id: string; name: string };

/** Spaces in display order and tables by number. */
export type TablesQrConfig = { spaces: QrSpace[]; tables: TableQr[] };
