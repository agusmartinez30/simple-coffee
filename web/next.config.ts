import type { NextConfig } from "next";

/**
 * Base URL of the Café Central API (server-only, read when the config loads: `next dev`,
 * `next build`). Defaults to the API's local `PORT` 3001.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Same-origin proxy to the public API, so the browser never needs the API's origin.
  rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
