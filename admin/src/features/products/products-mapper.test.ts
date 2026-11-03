import { describe, expect, it } from "vitest";
import type { Product } from "@/mocks/service-day";
import { createEmptyDraft, toProductDraft } from "./product-form";
import { toFormErrors, toProduct, toProductBody, toProductCategories, toProducts } from "./products-mapper";

const apiProduct = (overrides: Record<string, unknown> = {}) => ({
  id: "ckprod1",
  sku: "CAF-001",
  name: "Cappuccino",
  plural: null,
  description: "Espresso con leche.",
  price: 4600,
  categoryId: "cafes",
  image: "/images/products/cappuccino.webp",
  moments: ["desayunar", "merendar"],
  publication: "published",
  available: true,
  archived: false,
  allowCustomerNotes: true,
  position: 3,
  version: 7,
  optionGroups: [
    {
      id: "grp-size",
      title: "Tamaño",
      selection: "single",
      required: true,
      max: 1,
      defaultOptionId: "opt-medium",
      options: [
        { id: "opt-small", name: "Chico", priceDelta: 0 },
        { id: "opt-medium", name: "Mediano", priceDelta: 800 },
      ],
    },
    {
      id: "grp-extras",
      title: "Extras",
      selection: "multiple",
      required: false,
      max: null,
      defaultOptionId: null,
      options: [{ id: "opt-shot", name: "Shot extra", priceDelta: 900 }],
    },
  ],
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...overrides,
});

const CAPPUCCINO: Product = {
  id: "ckprod1",
  sku: "CAF-001",
  commercialRank: 3,
  name: "Cappuccino",
  description: "Espresso con leche.",
  price: 4600,
  categoryId: "cafes",
  image: "/images/products/cappuccino.webp",
  moments: ["desayunar", "merendar"],
  publication: "published",
  available: true,
  archived: false,
  allowCustomerNotes: true,
  optionGroups: [
    {
      id: "grp-size",
      title: "Tamaño",
      selection: "single",
      required: true,
      defaultOptionId: "opt-medium",
      options: [
        { id: "opt-small", name: "Chico", priceDelta: 0 },
        { id: "opt-medium", name: "Mediano", priceDelta: 800 },
      ],
    },
    {
      id: "grp-extras",
      title: "Extras",
      selection: "multiple",
      required: false,
      options: [{ id: "opt-shot", name: "Shot extra", priceDelta: 900 }],
    },
  ],
};

describe("toProduct", () => {
  it("maps the API product to the admin one: position → commercialRank, nulls → unset", () => {
    expect(toProduct(apiProduct())).toEqual(CAPPUCCINO);
  });

  it("keeps the plural, a multiple group's limit and drops unknown moments", () => {
    const product = toProduct(
      apiProduct({
        plural: "Cappuccinos",
        image: null,
        moments: ["tomar", "brunch"],
        optionGroups: [
          {
            id: "grp-extras",
            title: "Extras",
            selection: "multiple",
            required: false,
            max: 2,
            defaultOptionId: null,
            options: [{ id: "opt-shot", name: "Shot extra", priceDelta: 900 }],
          },
        ],
      }),
    );
    expect(product).toMatchObject({ plural: "Cappuccinos", moments: ["tomar"] });
    expect(product).not.toHaveProperty("image");
    expect(product?.optionGroups[0]).toEqual({
      id: "grp-extras",
      title: "Extras",
      selection: "multiple",
      required: false,
      max: 2,
      options: [{ id: "opt-shot", name: "Shot extra", priceDelta: 900 }],
    });
  });

  it("accepts category ids the admin mock does not know", () => {
    expect(toProduct(apiProduct({ categoryId: "brunch" }))?.categoryId).toBe("brunch");
  });

  it("rejects bodies that are not a product", () => {
    expect(toProduct(null)).toBeNull();
    expect(toProduct(apiProduct({ price: "4600" }))).toBeNull();
    expect(toProduct(apiProduct({ publication: "hidden" }))).toBeNull();
    expect(toProduct(apiProduct({ optionGroups: [{ id: "g", title: "T", selection: "some", required: true, options: [] }] }))).toBeNull();
    expect(toProducts([apiProduct(), { id: 1 }])).toBeNull();
    expect(toProducts([apiProduct()])).toEqual([CAPPUCCINO]);
  });
});

describe("toProductCategories", () => {
  it("lists the categories by position as select options", () => {
    expect(
      toProductCategories([
        { id: "tostadas", name: "Tostadas", description: "", visible: true, position: 1 },
        { id: "cafes", name: "Cafés", description: "", visible: false, position: 0 },
      ]),
    ).toEqual([
      { id: "cafes", label: "Cafés" },
      { id: "tostadas", label: "Tostadas" },
    ]);
    expect(toProductCategories([{ id: "cafes" }])).toBeNull();
    expect(toProductCategories({})).toBeNull();
  });
});

describe("toProductBody", () => {
  it("sends every editable field, keeping the ids of saved groups and options and the default by name", () => {
    expect(toProductBody(CAPPUCCINO, CAPPUCCINO)).toEqual({
      name: "Cappuccino",
      plural: null,
      description: "Espresso con leche.",
      price: 4600,
      categoryId: "cafes",
      image: "/images/products/cappuccino.webp",
      moments: ["desayunar", "merendar"],
      publication: "published",
      available: true,
      allowCustomerNotes: true,
      optionGroups: [
        {
          id: "grp-size",
          title: "Tamaño",
          selection: "single",
          required: true,
          max: null,
          defaultOption: "Mediano",
          options: [
            { id: "opt-small", name: "Chico", priceDelta: 0 },
            { id: "opt-medium", name: "Mediano", priceDelta: 800 },
          ],
        },
        {
          id: "grp-extras",
          title: "Extras",
          selection: "multiple",
          required: false,
          max: null,
          defaultOption: null,
          options: [{ id: "opt-shot", name: "Shot extra", priceDelta: 900 }],
        },
      ],
    });
  });

  it("omits the ids of groups and options the saved product does not have", () => {
    const edited: Product = {
      ...CAPPUCCINO,
      plural: "Cappuccinos",
      image: undefined,
      optionGroups: [
        {
          ...CAPPUCCINO.optionGroups[0],
          defaultOptionId: "opcion-1",
          options: [...CAPPUCCINO.optionGroups[0].options, { id: "opcion-1", name: "Grande", priceDelta: 1500 }],
        },
        { id: "grupo-1", title: "Leche", selection: "multiple", required: false, max: 2, options: [{ id: "opcion-2", name: "Avena", priceDelta: 700 }] },
      ],
    };
    const body = toProductBody(edited, CAPPUCCINO);
    expect(body).toMatchObject({ plural: "Cappuccinos", image: null });
    expect(body.optionGroups).toEqual([
      {
        id: "grp-size",
        title: "Tamaño",
        selection: "single",
        required: true,
        max: null,
        defaultOption: "Grande",
        options: [
          { id: "opt-small", name: "Chico", priceDelta: 0 },
          { id: "opt-medium", name: "Mediano", priceDelta: 800 },
          { name: "Grande", priceDelta: 1500 },
        ],
      },
      { title: "Leche", selection: "multiple", required: false, max: 2, defaultOption: null, options: [{ name: "Avena", priceDelta: 700 }] },
    ]);
  });

  it("sends no ids at all for a new product", () => {
    const body = toProductBody(CAPPUCCINO, null);
    expect(body.optionGroups.every((group) => !("id" in group))).toBe(true);
    expect(body.optionGroups.flatMap((group) => group.options).every((option) => !("id" in option))).toBe(true);
  });
});

describe("toFormErrors", () => {
  it("maps API issues to the editor fields, groups and options of the draft", () => {
    const draft = toProductDraft(CAPPUCCINO);
    expect(
      toFormErrors(
        [
          { path: "name", code: "duplicate" },
          { path: "price", code: "out_of_range" },
          { path: "categoryId", code: "unknown_category" },
          { path: "optionGroups.1.title", code: "duplicate" },
          { path: "optionGroups.0.options.1.name", code: "required" },
          { path: "moments.0", code: "unknown_moment" },
        ],
        draft,
      ),
    ).toEqual({
      name: "Ya existe un producto con ese nombre.",
      price: "Ingresá un precio válido.",
      categoryId: "La categoría ya no existe. Elegí otra.",
      optionGroups: {
        "grp-extras": { title: "El grupo ya existe." },
        "grp-size": { options: { "opt-medium": "Ingresá el nombre de la opción." } },
      },
    });
  });

  it("ignores issues it cannot place", () => {
    expect(toFormErrors([{ path: "optionGroups.4.title", code: "required" }, { path: "sku", code: "duplicate" }], createEmptyDraft())).toEqual(
      {},
    );
  });
});
