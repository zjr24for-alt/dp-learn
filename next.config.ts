import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Set to your GitHub repo name for GitHub Pages
  // e.g. if repo is "dp-learn", basePath is "/dp-learn"
  // For custom domain or user page (username.github.io), set to ""
  basePath: process.env.NODE_ENV === "production" ? "/dp-learn" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
