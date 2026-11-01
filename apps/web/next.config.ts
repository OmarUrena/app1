import type { NextConfig } from "next";
import { readEnvironment } from "./src/lib/config";

readEnvironment(process.env);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  transpilePackages: ["@sorteos/api-client"],
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
