import { describe, expect, it } from "vitest";
import { NAV_ITEMS, findActiveNavItem, getSectionTitle, getTopbarConfig } from "./navigation";

describe("NAV_ITEMS", () => {
  it("lists every admin module in the sidebar order of the designs", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Pedidos",
      "Carta digital",
      "Productos",
      "Categorías y momentos",
      "QR de mesas",
      "Configuración",
    ]);
  });

  it("gives every module a unique route", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("findActiveNavItem", () => {
  it("matches no module on the root path, which redirects to the orders", () => {
    expect(findActiveNavItem("/")).toBeNull();
    expect(findActiveNavItem("/orders")?.id).toBe("orders");
  });

  it("prefers the most specific nested route", () => {
    expect(findActiveNavItem("/menu")?.id).toBe("menu");
    expect(findActiveNavItem("/menu/categories")?.id).toBe("categories");
    expect(findActiveNavItem("/menu/products/42")?.id).toBe("products");
    expect(findActiveNavItem("/settings/payments")?.id).toBe("settings");
    expect(findActiveNavItem("/tables/qr")?.id).toBe("table-qr");
  });

  it("ignores trailing slashes and partial segment matches", () => {
    expect(findActiveNavItem("/orders/")?.id).toBe("orders");
    expect(findActiveNavItem("/ordersx")).toBeNull();
  });
});

describe("getSectionTitle", () => {
  it("prefixes the active module with the brand name", () => {
    expect(getSectionTitle("/menu")).toBe("Café Central · Carta digital");
    expect(getSectionTitle("/orders")).toBe("Café Central · Pedidos");
  });

  it("titles the table QR module", () => {
    expect(getSectionTitle("/tables/qr")).toBe("Café Central · QR de mesas");
  });

  it("falls back to the brand name alone", () => {
    expect(getSectionTitle("/unknown")).toBe("Café Central");
  });
});

describe("getTopbarConfig", () => {
  it("keeps the section title of 10A by default", () => {
    expect(getTopbarConfig("/unknown")).toEqual({ variant: "section", title: "Café Central" });
    expect(getTopbarConfig("/menu")).toEqual({
      variant: "section",
      title: "Café Central · Carta digital",
    });
  });

  it("shows the branch without the shift and the administrator pill on the 06 payment settings", () => {
    expect(getTopbarConfig("/settings/payments")).toEqual({
      variant: "admin-location",
      title: "Café Central · Sede Centro",
    });
    expect(getTopbarConfig("/settings").variant).toBe("admin-location");
  });

  it("adds the live pill and the compact profile on the 03 orders screen", () => {
    expect(getTopbarConfig("/orders")).toEqual({
      variant: "live-location",
      title: "Café Central · Sede Centro · Turno mañana",
    });
  });

  it("shows the catalogue title and the synced pill on the 07 products screen only", () => {
    expect(getTopbarConfig("/menu/products")).toEqual({
      variant: "catalog",
      title: "Café Central · Carta digital",
    });
    expect(getTopbarConfig("/menu").variant).toBe("section");
  });

  it("titles the 08 categories and moments screen as the menu organization", () => {
    expect(getTopbarConfig("/menu/categories")).toEqual({
      variant: "catalog",
      title: "Café Central · Organización de la carta",
    });
  });
});
