import type { NextConfig } from "next";

// STATIC_EXPORT=true 时启用静态导出（用于 GitHub Pages），
// 否则保留 API 路由能力（next dev / Vercel / 其他 serverful 部署）
const isStaticExport = process.env.STATIC_EXPORT === "true";

// Windows 本地开发时 .next 目录存在 ENOENT bug，改用 build 目录绕过
// Vercel / GitHub Pages 部署时用默认 .next
const isWinDev = process.env.NODE_ENV === "development" && process.platform === "win32";

const nextConfig: NextConfig = {
  ...(isWinDev ? { distDir: "build" } : {}),
  // 仅明确要求静态导出时才启用（GitHub Pages 部署）
  ...(isStaticExport ? { output: "export" as const } : {}),
  basePath: isStaticExport ? "/dp-learn" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
