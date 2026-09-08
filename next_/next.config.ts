import type { NextConfig } from "next";

const nextConfig: NextConfig = {

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
