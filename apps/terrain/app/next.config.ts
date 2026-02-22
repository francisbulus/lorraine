import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['lorraine'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@engine': path.resolve(__dirname, '../../../engine'),
      '@engine-services': path.resolve(__dirname, '../../../engine/services'),
      '@llm': path.resolve(__dirname, '../../../llm'),
    };
    return config;
  },
};

export default nextConfig;
