/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir больше не нужен в Next.js 15+
  output: 'standalone', // Для Docker
}

module.exports = nextConfig
