/**
 * Fixture menu for tests and the seeded table orders (`mocks/table.ts`). The customer app
 * reads its real menu from the API (`features/menu`).
 */
import type { Category, Menu, OptionGroup, Product } from "./types";

const img = (slug: string) => `/images/products/${slug}.webp`;

export const CATEGORIES: Category[] = [
  { id: "cafes", label: "Cafés" },
  { id: "desayunos", label: "Desayunos" },
  { id: "comidas", label: "Comidas" },
  { id: "bebidas", label: "Bebidas" },
  { id: "postres", label: "Postres" },
];

const cappuccinoOptions: OptionGroup[] = [
  {
    id: "tamano",
    name: "Tamaño",
    title: "Elegí el tamaño",
    required: true,
    selection: "single",
    defaultChoiceId: "mediano",
    priceDisplay: "absolute",
    choices: [
      { id: "chico", label: "Chico", priceDelta: -700 },
      { id: "mediano", label: "Mediano", priceDelta: 0 },
      { id: "grande", label: "Grande", priceDelta: 700 },
    ],
  },
  {
    id: "leche",
    name: "Leche",
    title: "Tipo de leche",
    required: true,
    selection: "single",
    defaultChoiceId: "entera",
    priceDisplay: "delta",
    choices: [
      { id: "entera", label: "Leche entera", priceDelta: 0 },
      { id: "descremada", label: "Leche descremada", priceDelta: 0 },
      { id: "almendras", label: "Leche de almendras", priceDelta: 900 },
    ],
  },
  {
    id: "extras",
    name: "Extras",
    title: "Agregale algo rico",
    required: false,
    selection: "multiple",
    priceDisplay: "delta",
    choices: [
      { id: "canela", label: "Canela", priceDelta: 300 },
      { id: "shot-espresso", label: "Shot extra de espresso", priceDelta: 1200 },
      { id: "crema-batida", label: "Crema batida", priceDelta: 800 },
    ],
  },
];

const breadOptions: OptionGroup[] = [
  {
    id: "pan",
    name: "Pan",
    title: "Elegí el pan",
    required: true,
    selection: "single",
    defaultChoiceId: "campo",
    priceDisplay: "delta",
    choices: [
      { id: "campo", label: "Pan de campo", priceDelta: 0 },
      { id: "molde", label: "Pan de molde", priceDelta: 0 },
    ],
  },
];

export const PRODUCTS: Product[] = [
  // Cafés
  {
    id: "cappuccino",
    slug: "cappuccino",
    name: "Cappuccino",
    description: "Espresso, leche y espuma",
    longDescription: "Espresso intenso, leche vaporizada y una suave capa de espuma cremosa.",
    price: 4500,
    category: "cafes",
    image: img("cappuccino"),
    badge: "Favorito",
    optionGroups: cappuccinoOptions,
  },
  {
    id: "espresso-doble",
    slug: "espresso-doble",
    name: "Espresso doble",
    description: "Intenso y aromático",
    price: 3200,
    category: "cafes",
    image: img("espresso-doble"),
  },
  {
    id: "cafe-con-leche",
    slug: "cafe-con-leche",
    name: "Café con leche",
    description: "Espresso suave con leche caliente",
    price: 3900,
    category: "cafes",
    image: img("cappuccino"),
  },
  {
    id: "cortado",
    slug: "cortado",
    name: "Cortado",
    description: "Espresso con un toque de leche",
    price: 3300,
    category: "cafes",
    image: img("espresso-doble"),
  },
  {
    id: "latte",
    slug: "latte",
    name: "Latte",
    description: "Mucha leche, espresso y espuma fina",
    price: 4400,
    category: "cafes",
    image: img("cappuccino"),
  },
  {
    id: "flat-white",
    slug: "flat-white",
    name: "Flat white",
    description: "Doble ristretto y leche sedosa",
    price: 4700,
    category: "cafes",
    image: img("cappuccino"),
    badge: "Nuevo",
  },
  {
    id: "lagrima",
    slug: "lagrima",
    name: "Lágrima",
    description: "Leche caliente con unas gotas de café",
    price: 3500,
    category: "cafes",
    image: img("cappuccino"),
  },
  {
    id: "americano",
    slug: "americano",
    name: "Café americano",
    description: "Espresso alargado con agua caliente",
    price: 3000,
    category: "cafes",
    image: img("espresso-doble"),
  },
  // Desayunos
  {
    id: "medialunas",
    slug: "medialunas",
    name: "Medialunas de manteca",
    shortName: "Medialunas",
    description: "Dos unidades de manteca",
    price: 3800,
    category: "desayunos",
    image: img("medialunas"),
    badge: "Favorito",
  },
  {
    id: "tostadas-de-campo",
    slug: "tostadas-de-campo",
    name: "Tostadas de campo",
    description: "Masa madre, manteca y mermelada",
    price: 4800,
    category: "desayunos",
    image: img("tostadas-de-campo"),
    badge: "Favorito",
  },
  {
    id: "huevos-revueltos",
    slug: "huevos-revueltos",
    name: "Huevos revueltos",
    description: "Cremosos, con tostada de campo",
    price: 6200,
    category: "desayunos",
    image: img("huevos-revueltos"),
    badge: "Nuevo",
  },
  {
    id: "croissant",
    slug: "croissant",
    name: "Croissant de manteca",
    description: "Hojaldrado, dorado y recién hecho",
    price: 3200,
    category: "desayunos",
    image: img("croissant"),
  },
  {
    id: "combo-central",
    slug: "combo-central",
    name: "Combo Central",
    description: "Café, jugo y tostadas a elección",
    price: 8900,
    category: "desayunos",
    image: img("combo-central"),
    badge: "Combo",
  },
  {
    id: "tostadas-con-palta",
    slug: "tostadas-con-palta",
    name: "Tostadas con palta",
    description: "Pan de campo, palta y semillas",
    price: 5600,
    category: "desayunos",
    image: img("tostadas-de-campo"),
  },
  {
    id: "omelette",
    slug: "omelette",
    name: "Omelette de jamón y queso",
    description: "Tres huevos, jamón cocido y queso",
    price: 6800,
    category: "desayunos",
    image: img("huevos-revueltos"),
  },
  {
    id: "combo-medialunas",
    slug: "combo-medialunas",
    name: "Combo medialunas",
    description: "Café con leche y dos medialunas",
    price: 6900,
    category: "desayunos",
    image: img("medialunas"),
    badge: "Combo",
  },
  // Comidas
  {
    id: "tostado-jamon-queso",
    slug: "tostado-jamon-queso",
    name: "Tostado de jamón y queso",
    description: "Jamón cocido y queso fundido",
    price: 6900,
    category: "comidas",
    image: img("tostado-jamon-queso"),
    optionGroups: breadOptions,
  },
  {
    id: "sandwich-caprese",
    slug: "sandwich-caprese",
    name: "Sándwich caprese",
    description: "Tomate, mozzarella y albahaca",
    price: 7400,
    category: "comidas",
    image: img("tostado-jamon-queso"),
    badge: "Nuevo",
  },
  // Bebidas
  {
    id: "jugo-de-naranja",
    slug: "jugo-de-naranja",
    name: "Jugo de naranja",
    description: "Exprimido en el momento",
    price: 3600,
    category: "bebidas",
    image: img("combo-central"),
  },
  {
    id: "limonada",
    slug: "limonada",
    name: "Limonada",
    description: "Con menta y jengibre",
    price: 3400,
    category: "bebidas",
    image: img("combo-central"),
  },
  // Postres
  {
    id: "alfajor-de-maicena",
    slug: "alfajor-de-maicena",
    name: "Alfajor de maicena",
    description: "Dulce de leche y coco rallado",
    price: 2200,
    category: "postres",
    image: img("croissant"),
  },
  {
    id: "budin-de-limon",
    slug: "budin-de-limon",
    name: "Budín de limón",
    description: "Porción con glaseado cítrico",
    price: 2900,
    category: "postres",
    image: img("croissant"),
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

/** The fixture products as a menu, with the moment membership of the original designs. */
export const MOCK_MENU: Menu = {
  categories: CATEGORIES,
  products: PRODUCTS,
  momentProductIds: {
    "para-desayunar": [
      "tostadas-de-campo",
      "huevos-revueltos",
      "croissant",
      "combo-central",
      "medialunas",
      "tostadas-con-palta",
      "omelette",
      "combo-medialunas",
    ],
    "para-merendar": ["cappuccino", "medialunas", "croissant", "alfajor-de-maicena", "budin-de-limon", "latte"],
    "para-cenar": ["tostado-jamon-queso", "sandwich-caprese", "omelette", "limonada"],
    "para-tomar": ["espresso-doble", "cappuccino", "flat-white", "cafe-con-leche", "jugo-de-naranja", "limonada"],
  },
};

// Pricing helpers live with the menu feature; re-exported for the fixtures and their tests.
export { describeChoices, getDefaultChoiceIds, getUnitPrice } from "@/features/menu/product-pricing";
