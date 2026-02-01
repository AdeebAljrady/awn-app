import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, // أو '.'
  },
  typescript: {
    // تخطي أخطاء TypeScript أثناء البناء
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
