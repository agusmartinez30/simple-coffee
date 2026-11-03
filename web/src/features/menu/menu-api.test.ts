import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMenu, type ApiMenu } from "./menu-api";

function mockFetch(impl: (input: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MENU: ApiMenu = {
  categories: [{ id: "cafes", name: "Cafés", description: "" }],
  products: [
    {
      id: "prd_cappuccino",
      name: "Cappuccino",
      plural: null,
      description: "Espresso, leche y espuma",
      price: 4500,
      categoryId: "cafes",
      image: "/images/products/cappuccino.webp",
      moments: ["merendar"],
      allowCustomerNotes: true,
      optionGroups: [
        {
          id: "grp_size",
          title: "Tamaño",
          selection: "single",
          required: true,
          max: null,
          defaultOptionId: "opt_m",
          options: [{ id: "opt_m", name: "Mediano", priceDelta: 0 }],
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMenu", () => {
  it("calls the proxied public menu endpoint without caching", async () => {
    const fetch = mockFetch(async () => json(MENU));
    await fetchMenu();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/catalog/menu");
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("returns the menu the API answers", async () => {
    mockFetch(async () => json(MENU));
    await expect(fetchMenu()).resolves.toEqual({ ok: true, menu: MENU });
  });

  it("reports a network error when the request fails", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(fetchMenu()).resolves.toEqual({ ok: false, error: "network" });
  });

  it("reports a network error for server errors", async () => {
    mockFetch(async () => json({ error: "internal" }, 500));
    await expect(fetchMenu()).resolves.toEqual({ ok: false, error: "network" });
  });

  it("reports a network error for a non-JSON body", async () => {
    mockFetch(async () => new Response("<html>", { status: 200 }));
    await expect(fetchMenu()).resolves.toEqual({ ok: false, error: "network" });
  });

  it("reports a network error for an unexpected body", async () => {
    mockFetch(async () => json({ categories: [], products: [{ id: "x", price: "4500" }] }));
    await expect(fetchMenu()).resolves.toEqual({ ok: false, error: "network" });
  });
});
