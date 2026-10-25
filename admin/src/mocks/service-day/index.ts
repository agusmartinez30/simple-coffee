import { SERVICE_DAY } from "./day";
import {
  getBillRequestsBoard,
  getCollectionsHistory,
  getOrdersBoard,
  getOverviewSnapshot,
  getTablesBoard,
} from "./derive";

export { SERVICE_DAY } from "./day";
export {
  CATALOG_VERSION,
  CONSUMPTION_MOMENTS,
  PAYMENT_METHODS,
  PRODUCT_CATEGORIES,
  PRODUCTS,
  REQUEST_MODES,
  STAFF,
  getPaymentMethodLabel,
  getRequestModeShortLabel,
} from "./catalog";
export {
  DELIVERED_BOARD_WINDOW_MINUTES,
  deriveTable,
  getActiveBillRequest,
  getBestSellers,
  getOpenSession,
  getOrderTotal,
  getSessionOrders,
  getBillRequestsBoard,
  getCollectionsHistory,
  getOrdersBoard,
  getOverviewSnapshot,
  getTablesBoard,
} from "./derive";
export { VENUE_SPACES, VENUE_TABLES } from "./tables";
export { addMinutes, minutesBetween } from "./time";
export type * from "./types";

/** 10A · Resumen general. */
export const OVERVIEW_SNAPSHOT = getOverviewSnapshot(SERVICE_DAY);
/** 02 · Gestión de mesas. */
export const TABLES_BOARD = getTablesBoard(SERVICE_DAY);
/** 03 · Gestión de pedidos. */
export const ORDERS_BOARD = getOrdersBoard(SERVICE_DAY);
/** 04 · Solicitudes de cuenta, with Mesa 10 open in "Solicitud seleccionada". */
export const BILL_REQUESTS_BOARD = getBillRequestsBoard(SERVICE_DAY);
/** 05 · Historial de cobros, with COB-0026 open in "Cobro seleccionado". */
export const COLLECTIONS_HISTORY = getCollectionsHistory(SERVICE_DAY);
