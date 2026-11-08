/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sharp (image resizing for next/image, which the site doesn't use) was ~48 MB of every
  // ~54 MB server function, and Vercel keeps every function of every deployment it retains:
  // that filled the 10 GB Functions Storage allowance. Leave it out of the bundles.
  outputFileTracingExcludes: { "*": ["node_modules/@img/**", "node_modules/sharp/**"] },
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
