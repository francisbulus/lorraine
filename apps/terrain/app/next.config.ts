import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  transpilePackages: ['lorraine'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@engine': path.resolve(__dirname, '../../../engine'),
      '@engine-services': path.resolve(__dirname, '../../../engine/services'),
      '@llm': path.resolve(__dirname, '../../../llm'),
      '@domains': path.resolve(__dirname, '../../../domains'),
    };

    // The engine and llm packages use nodenext module resolution with .js
    // extensions in imports (e.g. './decay.js' → './decay.ts'). Tell webpack
    // to try .ts/.tsx before .js so these resolve correctly under bundler mode.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };

    return config;
  },
};

export default nextConfig;
