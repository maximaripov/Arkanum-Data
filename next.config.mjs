/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Insiders moved to the homepage; old links (with their filters) still work.
  async redirects() {
    return [{ source: "/insiders", destination: "/", permanent: true }];
  },
};
export default nextConfig;
