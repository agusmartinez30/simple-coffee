export type StaffMember = {
  id: string;
  /** Short display name, e.g. "Sofía M.". */
  name: string;
  /** Role label in Spanish, e.g. "Administradora". */
  role: string;
  email: string;
};

export type OrderLine = {
  quantity: number;
  name: string;
};

export type OrderStatus = "received" | "preparing" | "delivered";

/** Live order shown in "Pedidos que requieren atención". */
export type AttentionOrder = {
  id: number;
  /** Two-digit table label, e.g. "03". */
  table: string;
  customer: string;
  items: OrderLine[];
  note?: string;
  status: OrderStatus;
  waitMinutes: number;
};

export type BillPaymentMethod = "transfer" | "table" | "register";

export type BillRequest = {
  table: string;
  paymentMethod: BillPaymentMethod;
  total: number;
  waitMinutes: number;
  /** Kitchen orders of the table that are still in preparation. */
  ordersInPreparation: number;
};

export type TableStatus = "free" | "occupied" | "bill-requested";

export type TableSnapshot = {
  number: number;
  status: TableStatus;
  /** True when the table has an order in preparation. */
  preparing: boolean;
};

/** A confirmed payment; `closedAt` is a local "HH:MM" time. */
export type ConfirmedPayment = {
  id: string;
  amount: number;
  closedAt: string;
};

export type BestSeller = {
  name: string;
  quantity: number;
};

export type OverviewPeriod = "today" | "yesterday" | "last-7-days" | "custom";

export type OverviewSnapshot = {
  /** "HH:MM:SS" of the last data sync. */
  lastSync: string;
  orders: AttentionOrder[];
  billRequests: BillRequest[];
  tables: TableSnapshot[];
  payments: ConfirmedPayment[];
  confirmedOrders: number;
  bestSellers: BestSeller[];
};

/** Service state of a table in 02 · Gestión de mesas. */
export type TableServiceStatus = "available" | "occupied" | "bill-requested";

export type ManagedTable = {
  id: string;
  number: number;
  status: TableServiceStatus;
  /** Orders confirmed for the table's shared account. */
  confirmedOrders: number;
  /** Confirmed orders the kitchen has not finished yet. */
  pendingKitchenOrders: number;
  /** Shared account total in ARS; 0 for available tables. */
  accountTotal: number;
  /** How the customers want to pay; only set once the bill was requested. */
  paymentPreference?: BillPaymentMethod;
  /** Minutes since the bill was requested; only set once the bill was requested. */
  billRequestedMinutesAgo?: number;
  /** Minutes since the table's session opened (02 plan "◷ 18 min"); only set while seated. */
  seatedMinutes?: number;
};

export type TablesBoard = {
  /** "HH:MM:SS" of the last realtime update. */
  syncedAt: string;
  tables: ManagedTable[];
};

/** Kitchen stage of an order in 03 · Gestión de pedidos; cancelled orders leave the board. */
export type ManagedOrderStatus = "received" | "preparing" | "delivered" | "cancelled";

/** Entries of the drawer's "Historial de estado". */
export type OrderHistoryKind = "confirmed" | ManagedOrderStatus;

export type OrderHistoryEvent = {
  kind: OrderHistoryKind;
  /** Local "HH:MM" time. */
  at: string;
  /** Staff member who confirmed the order in the kitchen ("received" entries). */
  by?: string;
};

export type CancellationReason = "product-unavailable" | "customer-request" | "order-error";

export type ManagedOrderItem = {
  id: string;
  quantity: number;
  name: string;
  /** Size or temperature line under the product name, e.g. "Grande · caliente". */
  variant?: string;
  /** Unit price in ARS. */
  unitPrice: number;
  /** Product customization requested by the customer, e.g. "Leche deslactosada". */
  customization?: string;
};

export type ManagedOrder = {
  /** Order number shown as "Pedido #1051". */
  id: number;
  tableNumber: number;
  /** 09A space of the table, e.g. "Salón". */
  spaceName?: string;
  customer: string;
  /** Local "HH:MM" time the order was confirmed. */
  receivedAt: string;
  items: ManagedOrderItem[];
  /** Free-text "Nota del cliente" for the whole order. */
  note?: string;
  status: ManagedOrderStatus;
  history: OrderHistoryEvent[];
  cancellationReason?: CancellationReason;
};

export type OrdersBoard = {
  orders: ManagedOrder[];
};

/** Stage of a bill request in 04 · Solicitudes de cuenta; finalized requests are paid and closed. */
export type BillRequestStatus = "pending" | "attending" | "finalized";

export type BillRequestHistoryKind =
  | "requested"
  | "attending"
  | "receipt-reported"
  | "payment-verified"
  | "finalized";

export type BillRequestHistoryEvent = {
  kind: BillRequestHistoryKind;
  /** Local "HH:MM" time. */
  at: string;
  /** Staff member responsible for operational transitions. */
  by?: string;
};

export type PaymentVerification =
  | { status: "not-required" }
  | { status: "awaiting-receipt" }
  | { status: "pending"; reportedAt: string }
  | { status: "verified"; reportedAt?: string; verifiedAt: string; verifiedBy: string };

export type BillRequestConsumption = {
  /** Stable catalogue product id. */
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ManagedBillRequest = {
  /** Request code shown as "#SC-010". */
  id: string;
  tableNumber: number;
  /** 09A space containing the table. */
  spaceName: string;
  /** Customer who asked for the bill. */
  customer: string;
  /** Local "HH:MM" time the bill was requested. */
  requestedAt: string;
  /** Minutes since the bill was requested. */
  waitMinutes: number;
  paymentPreference: BillPaymentMethod;
  /** Shared account total in ARS. */
  total: number;
  /** Account lines aggregated by catalogue product. */
  consumptions: BillRequestConsumption[];
  /** Orders confirmed for the table's shared account. */
  confirmedOrders: number;
  /** Confirmed orders the kitchen has not finished yet. */
  ordersInPreparation: number;
  status: BillRequestStatus;
  /** Staff member attending the request ("Responsable"); unset while pending. */
  assignee?: string;
  paymentVerification: PaymentVerification;
  history: BillRequestHistoryEvent[];
};

export type BillRequestsBoard = {
  requests: ManagedBillRequest[];
  /** Request open in the quick-detail drawer of the "Solicitud seleccionada" export. */
  selectedId: string;
};

/** Payment method actually used to settle an account in 05 · Historial de cobros. */
export type CollectionMethod = "cash" | "transfer" | "card";

/** The 05 history only lists confirmed collections ("Confirmado"). */
export type CollectionStatus = "confirmed";

/** Entries of the drawer's "Auditoría" timeline. */
export type CollectionAuditKind = "payment-confirmed" | "balance-updated" | "table-session-closed";

export type CollectionAuditEvent = {
  kind: CollectionAuditKind;
  /** Local "HH:MM" time, on the collection's date. */
  at: string;
};

/** One order of the closed account ("Historial completo de pedidos"). */
export type CollectionOrder = {
  /** Order number shown as "Pedido #1042". */
  id: number;
  customer: string;
  items: OrderLine[];
  /** Order total in ARS. */
  total: number;
};

export type ManagedCollection = {
  /** Operation code, e.g. "COB-0026". */
  id: string;
  /** Closed account code, e.g. "CTA-026". */
  accountId: string;
  tableNumber: number;
  /** ISO "YYYY-MM-DD" date the table session was closed. */
  date: string;
  /** Local "HH:MM" time the payment was confirmed. */
  time: string;
  /** "Medio real": how the account was actually paid. */
  method: CollectionMethod;
  /** "Preferencia cliente": what the customers asked for when requesting the bill. */
  customerPreference: BillPaymentMethod;
  /** Confirmed amount in ARS: the orders' subtotal plus `adjustments`. */
  amount: number;
  /** "Descuentos y ajustes" in ARS; negative for discounts. */
  adjustments: number;
  /** Staff member who confirmed the payment ("Empleado" / "Confirmado por"). */
  confirmedBy: string;
  status: CollectionStatus;
  orders: CollectionOrder[];
  audit: CollectionAuditEvent[];
};

export type CollectionsHistory = {
  /** ISO date the quick date filters are relative to ("Hoy"). */
  today: string;
  collections: ManagedCollection[];
  /** Collection open in the drawer of the "Cobro seleccionado" export. */
  selectedId: string;
};

/** Payment methods staff can record when collecting an account (06 "Medios de cobro"). */
export type AcceptedPaymentMethod = CollectionMethod | "other";

/** Bank account customers transfer to (06 "Datos bancarios"). Mock values are fictional. */
export type BankAccount = {
  /** "Titular de la cuenta". */
  holder: string;
  /** "Banco o billetera". */
  bank: string;
  alias: string;
  /** "CBU / CVU": 22 digits. */
  cbu: string;
  /** "Instrucciones para el personal". */
  staffInstructions: string;
};

export type PaymentSettings = {
  /** "Medios de cobro aceptados": methods staff can record. */
  methods: Record<AcceptedPaymentMethod, boolean>;
  /** "Modalidades para solicitar la cuenta" offered on the customer's 08 screen. */
  requestModes: Record<BillPaymentMethod, boolean>;
  bankAccount: BankAccount;
};

/** Saved configuration with the version the save bar shows ("Versión 18 · actualizada hoy 09:42"). */
export type SavedPaymentSettings = {
  settings: PaymentSettings;
  version: number;
  /** Local "HH:MM" time of today's last update. */
  updatedAt: string;
};
