import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advanceOrder, cancelOrder, createOrder, listOrders } from "./orders-api";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

const apiError = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  jsonResponse(status, { statusCode: status, error, message: "irrelevant", ...extra });

const API_ORDER = {
  id: "ckorder1051",
  number: 1051,
  tableNumber: 3,
  tableLabel: "Mesa 3",
  spaceName: "Salón",
  customerName: "Martina",
  note: null,
  status: "received",
  cancellationReason: null,
  source: "staff",
  createdBy: { id: "staff-1", name: "María G." },
  total: 4500,
  items: [
    {
      id: "item-1",
      productId: "prod-latte",
      productName: "Latte",
      sku: "LAT-01",
      quantity: 1,
      unitPrice: 4500,
      note: null,
      options: [],
      subtotal: 4500,
    },
  ],
  events: [{ kind: "received", at: "2026-11-02T17:36:00.000Z", actor: { id: "staff-1", name: "María G." } }],
  createdAt: "2026-11-02T17:36:00.000Z",
  updatedAt: "2026-11-02T17:36:00.000Z",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listOrders", () => {
  it("gets the day's orders same-origin through the /api proxy", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [API_ORDER]));

    const result = await listOrders();

    expect(fetchMock).toHaveBeenCalledWith("/api/orders", { method: "GET", credentials: "same-origin" });
    expect(result.ok && result.value.map((order) => [order.id, order.number, order.receivedAt])).toEqual([
      ["ckorder1051", 1051, "14:36"],
    ]);
  });

  it("asks for a given service day", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    expect(await listOrders("2026-11-01")).toEqual({ ok: true, value: [] });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/orders?date=2026-11-01");
  });

  it("treats a malformed body as unknown", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: 1 }]));
    expect(await listOrders()).toEqual({ ok: false, error: { kind: "unknown" } });
  });
});

describe("advanceOrder", () => {
  it("posts the advance and answers the updated order", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...API_ORDER, status: "preparing" }));

    const result = await advanceOrder("ckorder1051");

    expect(fetchMock).toHaveBeenCalledWith("/api/orders/ckorder1051/advance", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(result.ok && result.value.status).toBe("preparing");
  });

  it("encodes the order id in the path", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, API_ORDER));
    await advanceOrder("a/b");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/orders/a%2Fb/advance");
  });

  it("reports a finished order as an invalid transition", async () => {
    fetchMock.mockResolvedValue(apiError(409, "invalid_transition", { status: "delivered", action: "advance" }));
    expect(await advanceOrder("ckorder1051")).toEqual({
      ok: false,
      error: { kind: "conflict", code: "invalid_transition" },
    });
  });

  it("reports missing orders, missing sessions and network failures", async () => {
    fetchMock.mockResolvedValueOnce(apiError(404, "order_not_found"));
    expect(await advanceOrder("gone")).toEqual({ ok: false, error: { kind: "not-found" } });

    fetchMock.mockResolvedValueOnce(apiError(401, "invalid_session"));
    expect(await advanceOrder("ckorder1051")).toEqual({ ok: false, error: { kind: "unauthorized" } });

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await advanceOrder("ckorder1051")).toEqual({ ok: false, error: { kind: "network" } });

    fetchMock.mockResolvedValueOnce(jsonResponse(500, { statusCode: 500 }));
    expect(await advanceOrder("ckorder1051")).toEqual({ ok: false, error: { kind: "unknown" } });
  });
});

describe("cancelOrder", () => {
  it("posts the reason in the API's snake_case", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ...API_ORDER, status: "cancelled", cancellationReason: "customer_request" }),
    );

    const result = await cancelOrder("ckorder1051", "customer-request");

    expect(fetchMock).toHaveBeenCalledWith("/api/orders/ckorder1051/cancel", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "customer_request" }),
    });
    expect(result.ok && result.value.cancellationReason).toBe("customer-request");
  });
});

describe("createOrder", () => {
  const input = {
    tableNumber: 3,
    customerName: "Martina",
    note: null,
    lines: [{ productId: "prod-latte", quantity: 1, optionIds: ["opt-1"], note: null }],
  };

  it("posts the new order and answers it", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, API_ORDER));

    const result = await createOrder(input);

    expect(fetchMock).toHaveBeenCalledWith("/api/orders", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    expect(result.ok && result.value.number).toBe(1051);
  });

  it("returns the issues of a rejected order", async () => {
    fetchMock.mockResolvedValue(
      apiError(400, "invalid_order", {
        issues: [{ path: "lines.0.optionIds", code: "required_group", groupId: "g-1" }, { bogus: true }],
      }),
    );
    expect(await createOrder(input)).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ path: "lines.0.optionIds", code: "required_group", groupId: "g-1" }] },
    });
  });

  it("reports disabled tables and products that cannot be ordered", async () => {
    fetchMock.mockResolvedValueOnce(apiError(409, "table_disabled", { tableNumber: 3 }));
    expect(await createOrder(input)).toEqual({ ok: false, error: { kind: "conflict", code: "table_disabled" } });

    fetchMock.mockResolvedValueOnce(apiError(409, "product_not_orderable", { productId: "p", reason: "archived" }));
    expect(await createOrder(input)).toEqual({
      ok: false,
      error: { kind: "conflict", code: "product_not_orderable", productId: "p" },
    });

    fetchMock.mockResolvedValueOnce(apiError(409, "something_new"));
    expect(await createOrder(input)).toEqual({ ok: false, error: { kind: "unknown" } });
  });
});
