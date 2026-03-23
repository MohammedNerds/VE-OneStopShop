/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "getnerdio.com",
      },
    ],
  },
  // Security: prevent source maps in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
