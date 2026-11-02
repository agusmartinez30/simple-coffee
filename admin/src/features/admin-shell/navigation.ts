import { BookOpen, ClipboardList, Package, QrCode, Settings, Tags, type LucideIcon } from "lucide-react";

export const BRAND_NAME = "Café Central";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Top bar layout of the module's export; defaults to the 10A section title. */
  topbar?: TopbarVariant;
  /** Title of a `catalog` top bar (08 "Organización de la carta"). */
  topbarTitle?: string;
};

/**
 * `section`: 10A top bar ("Café Central · Carta digital", connection pill, compact profile).
 * `live-location`: 03 top bar (branch and shift plus an "En vivo" pill and 12/10px profile copy).
 * `admin-location`: 06 top bar, the branch without the shift plus an "Administrador" pill and a
 *   notifications button without the unread dot.
 * `catalog`: 07 top bar, "Café Central · Carta digital" with a "Sincronizado" pill and the dot-less
 *   bell of 06; 08 reuses it titled "Café Central · Organización de la carta" (`topbarTitle`).
 */
export type TopbarVariant = "section" | "live-location" | "admin-location" | "catalog";

/** Branch and shift shown by the `live-location` top bar. */
export const TOPBAR_LOCATION = `${BRAND_NAME} · Sede Centro · Turno mañana`;

/** Title of the `catalog` top bar. */
export const TOPBAR_CATALOG = `${BRAND_NAME} · Carta digital`;

/** Title of the 08 `catalog` top bar. */
export const TOPBAR_MENU_ORGANIZATION = `${BRAND_NAME} · Organización de la carta`;

/** Branch alone, as the `admin-location` top bar shows it. */
export const TOPBAR_BRANCH = `${BRAND_NAME} · Sede Centro`;

/** Sidebar modules in the order of the 10A export. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "orders", label: "Pedidos", href: "/orders", icon: ClipboardList, topbar: "live-location" },
  { id: "menu", label: "Carta digital", href: "/menu", icon: BookOpen },
  { id: "products", label: "Productos", href: "/menu/products", icon: Package, topbar: "catalog" },
  {
    id: "categories",
    label: "Categorías y momentos",
    href: "/menu/categories",
    icon: Tags,
    topbar: "catalog",
    topbarTitle: TOPBAR_MENU_ORGANIZATION,
  },
  { id: "table-qr", label: "QR de mesas", href: "/tables/qr", icon: QrCode },
  // `/settings` redirects to its only section, `/settings/payments` (06), which uses the 06 top bar.
  { id: "settings", label: "Configuración", href: "/settings", icon: Settings, topbar: "admin-location" },
];

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function matchesRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav item owning `pathname`; nested routes resolve to the most specific item. */
export function findActiveNavItem(
  pathname: string,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem | null {
  const path = normalizePath(pathname);
  let best: NavItem | null = null;
  for (const item of items) {
    if (matchesRoute(path, item.href) && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best;
}

/** Top bar heading, e.g. "Café Central · Carta digital". */
export function getSectionTitle(pathname: string): string {
  const item = findActiveNavItem(pathname);
  return item ? `${BRAND_NAME} · ${item.label}` : BRAND_NAME;
}

export function getNavItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.id === id);
}

export type TopbarConfig = { variant: TopbarVariant; title: string };

export function getTopbarConfig(pathname: string): TopbarConfig {
  const item = findActiveNavItem(pathname);
  const variant = item?.topbar ?? "section";
  if (variant === "section") return { variant, title: getSectionTitle(pathname) };
  if (variant === "catalog") return { variant, title: item?.topbarTitle ?? TOPBAR_CATALOG };
  return { variant, title: variant === "admin-location" ? TOPBAR_BRANCH : TOPBAR_LOCATION };
}
