/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Insiders moved to the homepage; old links (with their filters) still work.
  async redirects() {
    return [
      { source: "/insiders", destination: "/", permanent: true },
      // The screener and calendar were retired; send old links somewhere useful.
      { source: "/screener", destination: "/stakes", permanent: false },
      { source: "/calendar", destination: "/markets", permanent: false },
    ];
  },
};
export default nextConfig;
