import { describe, expect, it } from "vitest";
import { toApiCancellationReason, toOrder, toOrders } from "./orders-mapper";

/** `GET /orders/:id` body as the API serializes it (dates as ISO strings, UTC). */
const apiOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "ckorder1051",
  number: 1051,
  tableNumber: 3,
  tableLabel: "Mesa 3",
  spaceName: "Salón",
  customerName: "Martina",
  note: "Sin apuro",
  status: "preparing",
  cancellationReason: null,
  source: "table",
  createdBy: null,
  total: 13000,
  items: [
    {
      id: "item-1",
      productId: "prod-latte",
      productName: "Latte",
      sku: "LAT-01",
      quantity: 2,
      unitPrice: 4500,
      note: "Bien caliente",
      options: [
        { groupTitle: "Leche", optionName: "Leche deslactosada", priceDelta: 500 },
        { groupTitle: "Tamaño", optionName: "Grande", priceDelta: 0 },
      ],
      subtotal: 9000,
    },
    {
      id: "item-2",
      productId: "prod-medialuna",
      productName: "Medialuna",
      sku: "MED-01",
      quantity: 2,
      unitPrice: 2000,
      note: null,
      options: [],
      subtotal: 4000,
    },
  ],
  events: [
    { kind: "received", at: "2026-11-02T17:36:10.000Z", actor: null },
    { kind: "preparing", at: "2026-11-02T17:40:00.000Z", actor: { id: "staff-1", name: "María G." } },
  ],
  createdAt: "2026-11-02T17:36:10.000Z",
  updatedAt: "2026-11-02T17:40:00.000Z",
  ...overrides,
});

describe("toOrder", () => {
  it("maps an API order to the board model in the service time zone", () => {
    expect(toOrder(apiOrder())).toEqual({
      id: "ckorder1051",
      number: 1051,
      tableNumber: 3,
      spaceName: "Salón",
      customer: "Martina",
      receivedAt: "14:36",
      note: "Sin apuro",
      status: "preparing",
      history: [
        { kind: "confirmed", at: "14:36" },
        { kind: "preparing", at: "14:40", by: "María G." },
      ],
      items: [
        {
          id: "item-1",
          quantity: 2,
          name: "Latte",
          unitPrice: 4500,
          customization: "Leche deslactosada · Grande",
          note: "Bien caliente",
        },
        { id: "item-2", quantity: 2, name: "Medialuna", unitPrice: 2000 },
      ],
      updatedAt: "2026-11-02T17:40:00.000Z",
    });
  });

  it("attributes the received entry of staff orders to who created them", () => {
    const order = toOrder(
      apiOrder({ events: [{ kind: "received", at: "2026-11-02T17:36:10.000Z", actor: { id: "s", name: "Juan P." } }] }),
    );
    expect(order?.history).toEqual([{ kind: "received", at: "14:36", by: "Juan P." }]);
  });

  it("drops a customer name that only repeats the table label, and an empty space", () => {
    const order = toOrder(apiOrder({ customerName: "Mesa 3", spaceName: "", note: null }));
    expect(order?.customer).toBe("");
    expect(order?.spaceName).toBeUndefined();
    expect(order?.note).toBeUndefined();
  });

  it("maps the cancellation reason to the board's kebab-case", () => {
    const order = toOrder(apiOrder({ status: "cancelled", cancellationReason: "product_unavailable" }));
    expect(order?.status).toBe("cancelled");
    expect(order?.cancellationReason).toBe("product-unavailable");
  });

  it("rejects bodies that are not orders", () => {
    expect(toOrder(null)).toBeNull();
    expect(toOrder(apiOrder({ status: "PREPARING" }))).toBeNull();
    expect(toOrder(apiOrder({ number: "1051" }))).toBeNull();
    expect(toOrder(apiOrder({ items: [{ id: "x" }] }))).toBeNull();
    expect(toOrder(apiOrder({ events: [{ kind: "received", at: "not a date", actor: null }] }))).toBeNull();
    expect(toOrder(apiOrder({ cancellationReason: "lost" }))).toBeNull();
  });
});

describe("toOrders", () => {
  it("maps a list and rejects it when any entry is malformed", () => {
    expect(toOrders([apiOrder(), apiOrder({ id: "ckorder1052", number: 1052 })])?.map((o) => o.number)).toEqual([
      1051, 1052,
    ]);
    expect(toOrders([apiOrder(), {}])).toBeNull();
    expect(toOrders({})).toBeNull();
  });
});

describe("toApiCancellationReason", () => {
  it("maps the dialog reasons to the API's snake_case", () => {
    expect(toApiCancellationReason("product-unavailable")).toBe("product_unavailable");
    expect(toApiCancellationReason("customer-request")).toBe("customer_request");
    expect(toApiCancellationReason("order-error")).toBe("order_error");
  });
});
