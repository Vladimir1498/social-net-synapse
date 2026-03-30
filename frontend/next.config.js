/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  ...(isStaticExport && { output: "export" }),
  reactStrictMode: true,
  ...(basePath && { basePath, assetPrefix: basePath + "/" }),
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  },
};

module.exports = nextConfig;
