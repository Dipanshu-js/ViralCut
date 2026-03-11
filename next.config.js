/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: '**.pexels.com' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Vercel-safe: serverActions allowedOrigins should be dynamic
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Required for Vercel: ensure server components can use node APIs
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', '@prisma/client', 'prisma'],
};

module.exports = nextConfig;
