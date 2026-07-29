import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { isServer }) => {
    // MediaPipe WASM / worker support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    // Prevent webpack from trying to process .wasm files as JS
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // MediaPipe uses workers — silence the worker compilation for client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
