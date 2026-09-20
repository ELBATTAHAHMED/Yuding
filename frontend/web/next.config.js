/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        // Public edge prefix /api/* rewritten to Gateway /*
        source: '/api/:path*',
        destination: `${process.env.GATEWAY_INTERNAL_URL || 'http://localhost:8888'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
