/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 180
    }
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org"
      }
    ]
  },

  async rewrites() {
    return [
      {
        source: "/landing",
        destination: "/landing.html"
      }
    ];
  }
};

export default nextConfig;