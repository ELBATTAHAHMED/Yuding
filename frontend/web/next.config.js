const path = require('path');
const fs = require('fs');
const mod = require('module');

// Fallback chunk resolution for Next.js internal server chunks on Windows
if (typeof mod._resolveFilename === 'function') {
  const originalResolveFilename = mod._resolveFilename;
  mod._resolveFilename = function (request, parent, isMain, options) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (err) {
      if (
        err &&
        err.code === 'MODULE_NOT_FOUND' &&
        parent &&
        parent.filename &&
        parent.filename.includes('.next') &&
        typeof request === 'string' &&
        request.startsWith('./')
      ) {
        const parentDir = path.dirname(parent.filename);
        const candidate = path.join(parentDir, 'chunks', request.slice(2));
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      throw err;
    }
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: '**.liteapi.travel',
      },
      {
        protocol: 'https',
        hostname: '**.hotelbeds.com',
      },
    ],
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
