import type { MetadataRoute } from "next";

// Search engines may crawl everything but the API. Crawlers that collect pages to train AI
// models are turned away: each of their visits to a stock page rebuilds it on the server,
// which spends the free plan's CPU allowance for nobody. AI search engines that send
// readers back (OAI-SearchBot, PerplexityBot) stay allowed like Google and Bing.
// Temporarily off at the owner's request (2026-11-09): every crawler is allowed. Set back to true to block again.
const BLOCK_AI_TRAINING = false;
const AI_TRAINING = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended", "Bytespider", "meta-externalagent", "Amazonbot", "cohere-ai", "Diffbot", "Timpibot", "omgili"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...(BLOCK_AI_TRAINING ? [{ userAgent: AI_TRAINING, disallow: "/" }] : []),
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: "https://arkanumdata.vercel.app/sitemap.xml",
  };
}
