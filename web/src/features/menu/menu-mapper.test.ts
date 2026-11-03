import { describe, expect, it } from "vitest";
import type { ApiMenu, ApiMenuProduct } from "./menu-api";
import { findMenuProduct, toMenu } from "./menu-mapper";

function apiProduct(overrides: Partial<ApiMenuProduct> = {}): ApiMenuProduct {
  return {
    id: "prd_cappuccino",
    name: "Cappuccino",
    plural: null,
    description: "Espresso, leche y espuma",
    price: 4500,
    categoryId: "cafes",
    image: null,
    moments: [],
    allowCustomerNotes: true,
    optionGroups: [],
    ...overrides,
  };
}

function apiMenu(products: ApiMenuProduct[], categories?: ApiMenu["categories"]): ApiMenu {
  return {
    categories: categories ?? [
      { id: "cafes", name: "Cafés", description: "Espresso y filtrados." },
      { id: "panaderia", name: "Panadería", description: "" },
      { id: "postres", name: "Postres", description: "" },
    ],
    products,
  };
}

describe("toMenu", () => {
  it("maps the product fields the web shows", () => {
    const menu = toMenu(apiMenu([apiProduct({ plural: "Cappuccinos", image: "/images/products/cappuccino.webp" })]));
    expect(menu.products).toEqual([
      {
        id: "prd_cappuccino",
        slug: "prd_cappuccino",
        name: "Cappuccino",
        plural: "Cappuccinos",
        description: "Espresso, leche y espuma",
        price: 4500,
        category: "cafes",
        image: "/images/products/cappuccino.webp",
        allowCustomerNotes: true,
      },
    ]);
  });

  it("leaves plural and image unset when the API sends null", () => {
    const [product] = toMenu(apiMenu([apiProduct()])).products;
    expect(product.plural).toBeUndefined();
    expect(product.image).toBeUndefined();
    expect("optionGroups" in product).toBe(false);
  });

  it("drops images that are not local public paths (no remote hosts, no blob: URLs)", () => {
    const menu = toMenu(
      apiMenu([
        apiProduct({ id: "a", image: "blob:http://localhost:3002/1234" }),
        apiProduct({ id: "b", image: "https://cdn.example.com/a.webp" }),
        apiProduct({ id: "c", image: "//cdn.example.com/a.webp" }),
        apiProduct({ id: "d", image: "  " }),
      ]),
    );
    expect(menu.products.map((product) => product.image)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("keeps the notes switch of the product", () => {
    const [product] = toMenu(apiMenu([apiProduct({ allowCustomerNotes: false })])).products;
    expect(product.allowCustomerNotes).toBe(false);
  });

  it("maps option groups to the web choices, keeping the default option", () => {
    const [product] = toMenu(
      apiMenu([
        apiProduct({
          optionGroups: [
            {
              id: "grp_size",
              title: "Tamaño",
              selection: "single",
              required: true,
              max: null,
              defaultOptionId: "opt_m",
              options: [
                { id: "opt_s", name: "Chico", priceDelta: -500 },
                { id: "opt_m", name: "Mediano", priceDelta: 0 },
              ],
            },
            {
              id: "grp_extras",
              title: "Extras",
              selection: "multiple",
              required: false,
              max: 2,
              defaultOptionId: null,
              options: [{ id: "opt_shot", name: "Shot extra", priceDelta: 700 }],
            },
          ],
        }),
      ]),
    ).products;
    expect(product.optionGroups).toEqual([
      {
        id: "grp_size",
        name: "Tamaño",
        title: "Tamaño",
        required: true,
        selection: "single",
        defaultChoiceId: "opt_m",
        priceDisplay: "delta",
        choices: [
          { id: "opt_s", label: "Chico", priceDelta: -500 },
          { id: "opt_m", label: "Mediano", priceDelta: 0 },
        ],
      },
      {
        id: "grp_extras",
        name: "Extras",
        title: "Extras",
        required: false,
        selection: "multiple",
        priceDisplay: "delta",
        choices: [{ id: "opt_shot", label: "Shot extra", priceDelta: 700 }],
      },
    ]);
    expect("defaultChoiceId" in product.optionGroups![1]).toBe(false);
  });

  it("uses the API categories in order and hides the ones without products", () => {
    const menu = toMenu(
      apiMenu([
        apiProduct({ id: "medialuna", categoryId: "panaderia" }),
        apiProduct({ id: "cappuccino", categoryId: "cafes" }),
      ]),
    );
    expect(menu.categories).toEqual([
      { id: "cafes", label: "Cafés" },
      { id: "panaderia", label: "Panadería" },
    ]);
  });

  it("maps the API moment ids to the web moments, in product order", () => {
    const menu = toMenu(
      apiMenu([
        apiProduct({ id: "cappuccino", moments: ["desayunar", "merendar", "tomar"] }),
        apiProduct({ id: "medialuna", categoryId: "panaderia", moments: ["merendar", "desayunar"] }),
        apiProduct({ id: "tostado", moments: ["cenar", "brunch"] }),
      ]),
    );
    expect(menu.momentProductIds).toEqual({
      "para-desayunar": ["cappuccino", "medialuna"],
      "para-merendar": ["cappuccino", "medialuna"],
      "para-cenar": ["tostado"],
      "para-tomar": ["cappuccino"],
    });
  });

  it("returns an empty menu for an empty response", () => {
    expect(toMenu({ categories: [], products: [] })).toEqual({
      categories: [],
      products: [],
      momentProductIds: { "para-desayunar": [], "para-merendar": [], "para-cenar": [], "para-tomar": [] },
    });
  });
});

describe("findMenuProduct", () => {
  it("finds a product by id, or nothing", () => {
    const menu = toMenu(apiMenu([apiProduct()]));
    expect(findMenuProduct(menu, "prd_cappuccino")?.name).toBe("Cappuccino");
    expect(findMenuProduct(menu, "cappuccino")).toBeUndefined();
  });
});
