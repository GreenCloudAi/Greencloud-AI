/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    serverComponentsExternalPackages: ['@prisma/client'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/**/*'],
    },
  },
}

module.exports = nextConfig
