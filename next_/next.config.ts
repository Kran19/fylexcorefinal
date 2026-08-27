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
      {
        source: '/order-confirmation',
        destination: '/thank-you',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
