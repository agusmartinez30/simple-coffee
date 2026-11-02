import type { Metadata, Viewport } from "next";
import { Caveat, DM_Sans, Inter } from "next/font/google";
import { CartProvider } from "@/features/cart";
import { TableAccessProvider } from "@/features/table-access";
import { TableSessionProvider } from "@/features/table-session";
import { MobileFrame, SplashScreen } from "@/shared/ui";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Café Central",
  description: "Pedí desde tu mesa en Café Central.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F3EE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${dmSans.variable} ${caveat.variable} ${inter.variable} antialiased`}
    >
      <body className="bg-cream font-sans text-ink">
        <SplashScreen />
        <TableSessionProvider>
          <TableAccessProvider>
            <CartProvider>
              <MobileFrame>{children}</MobileFrame>
            </CartProvider>
          </TableAccessProvider>
        </TableSessionProvider>
      </body>
    </html>
  );
}
