import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Who may crawl, by kind:
// - Search engines and AI search and answer engines (they send readers back with a link): every
//   page but the API, named explicitly so a rule written for someone else can never catch them.
// - Bulk crawlers that collect pages to train AI models: turned away. Each visit to a stock
//   page rebuilds it on the server, which spends the free plan's CPU allowance for nobody.
// Google-Extended and Applebot-Extended are not crawlers (Googlebot and Applebot do the
// fetching), so allowing them costs nothing and lets Gemini and Apple Intelligence use the site.
const SEARCH = [
  "Googlebot", "Googlebot-Image", "Google-Extended", "Bingbot", "DuckDuckBot", "Applebot", "Applebot-Extended", "YandexBot", "Baiduspider",
  "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "Claude-SearchBot", "Claude-User", "MistralAI-User", "DuckAssistBot",
];
const AI_TRAINING = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Bytespider", "meta-externalagent", "Amazonbot", "cohere-ai", "Diffbot", "Timpibot", "omgili"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SEARCH, allow: "/", disallow: "/api/" },
      { userAgent: AI_TRAINING, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
