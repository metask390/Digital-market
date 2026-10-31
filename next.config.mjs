/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: all data access is client-side Supabase (RLS + RPC protected).
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? 'dist' : '.next',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  allowedDevOrigins: ['*.manus.computer', '*.manuspre.computer', '*.manus-asia.computer', '*.manuscomputer.ai', '*.manusvm.computer'],
}
export default nextConfig
