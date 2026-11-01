import { describe, expect, it } from "vitest";
import { SERVICE_DAY, type ServiceDay } from "@/mocks/service-day";
import { getTableDetail } from "./table-detail";

const day = SERVICE_DAY;

describe("getTableDetail", () => {
  it("lists the products of a seated table grouped by order, with each order's kitchen status", () => {
    expect(getTableDetail(day, 2)).toEqual({
      number: 2,
      label: "Mesa 02",
      badge: { label: "Ocupada", tone: "brand" },
      total: "$16.800",
      productCount: "3 productos",
      orders: [
        {
          id: 1046,
          label: "Pedido #1046",
          status: { label: "Entregado", tone: "neutral" },
          lines: [{ id: "1046-1", quantityLabel: "1×", name: "Jugo de naranja", price: "$5.100" }],
        },
        {
          id: 1050,
          label: "Pedido #1050",
          status: { label: "En cocina", tone: "danger" },
          lines: [
            { id: "1050-1", quantityLabel: "1×", name: "Tostón de palta", price: "$7.500" },
            { id: "1050-2", quantityLabel: "1×", name: "Café latte", price: "$4.200" },
          ],
        },
      ],
      account: { label: "Cuenta abierta", tone: "danger" },
      note: "Podés sumar productos al pedido o cobrar y cerrar la mesa.",
      canCharge: true,
    });
  });

  it("marks received orders as confirmed and prices each line by its quantity", () => {
    const detail = getTableDetail(day, 3);
    const received = detail.orders.find((order) => order.id === 1051);
    expect(received?.status).toEqual({ label: "Confirmado", tone: "success" });
    expect(received?.lines[1]).toEqual({ id: "1051-2", quantityLabel: "2×", name: "Medialunas", price: "$7.800" });
  });

  it("shows how a table that asked for the bill wants to pay", () => {
    const detail = getTableDetail(day, 10);
    expect(detail.badge).toEqual({ label: "Cuenta solicitada", tone: "danger" });
    expect(detail.account).toEqual({ label: "Pago por transferencia", tone: "danger" });
    expect(getTableDetail(day, 7).account.label).toBe("Pago en caja");
  });

  it("describes a free table with no account to charge", () => {
    expect(getTableDetail(day, 1)).toMatchObject({
      label: "Mesa 01",
      badge: { label: "Disponible", tone: "success" },
      total: "$0",
      productCount: "0 productos",
      orders: [],
      account: { label: "Sin cuenta abierta", tone: "neutral" },
      note: "La mesa está libre: cargá un pedido para abrir la cuenta.",
      canCharge: false,
    });
  });

  it("leaves cancelled orders out and counts a single product in singular", () => {
    const custom: ServiceDay = {
      ...day,
      orders: day.orders.map((order) => (order.id === 1046 ? { ...order, status: "cancelled" } : order)),
    };
    const detail = getTableDetail(custom, 2);
    expect(detail.orders.map((order) => order.id)).toEqual([1050]);
    expect(detail).toMatchObject({ total: "$11.700", productCount: "2 productos" });
    expect(getTableDetail(day, 6).productCount).toBe("1 producto");
  });
});
