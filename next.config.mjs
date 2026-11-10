/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sharp (image resizing for next/image, which the site doesn't use) was ~48 MB of every
  // ~54 MB server function, and Vercel keeps every function of every deployment it retains:
  // that filled the 10 GB Functions Storage allowance. Leave it out of the bundles.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@img/**", "node_modules/sharp/**",
      // Read over HTTP, never from disk; the Congress member pages' folder read would otherwise
      // pull these two big files (7 MB) into their functions too.
      "public/data/congress.json", "public/data/congress-trades.json",
    ],
  },
  // Basic browser protections on every page: no framing by other sites (clickjacking), no
  // MIME sniffing, no full URLs leaked to other sites, no camera/mic/location access. A full
  // Content-Security-Policy is left out on purpose: the TradingView embeds load scripts from
  // several hosts, and a wrong policy would silently blank the charts.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ],
    }];
  },
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
