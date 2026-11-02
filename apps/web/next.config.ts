import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { readEnvironment } from "./src/lib/config";

readEnvironment(process.env);

const imageBase = process.env.PUBLIC_PRIZE_IMAGE_BASE_URL;
const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [];
if (imageBase) {
  const url = new URL(imageBase);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname === "/" || /[*]/.test(imageBase)) throw new Error("PUBLIC_PRIZE_IMAGE_BASE_URL debe ser un directorio HTTPS público específico, sin comodines.");
  remotePatterns.push({ protocol: "https", hostname: url.hostname, port: url.port, pathname: `${url.pathname.replace(/\/$/, "")}/**`, search: "" });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: fileURLToPath(new URL("../..", import.meta.url)) },
  transpilePackages: ["@sorteos/api-client"],
  images: { remotePatterns },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};
export default nextConfig;
