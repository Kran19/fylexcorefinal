import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/preload',

  async redirects() {
    return [
      {
        source: '/customer/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
