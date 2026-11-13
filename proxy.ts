import { NextResponse, type NextRequest } from "next/server";

// The site moved from arkanumdata.vercel.app to arkanumdata.com (2026-11-13). Pages on the old
// address move to the same path on the new one. Search engines get a permanent redirect (so the
// old address's ranking passes to the new one). People get a tiny page that first carries their
// watchlist, follows, saved strategies and device ID along: those live in the browser per
// address, so a plain redirect would make them look empty on the new one. The API, data files,
// the service worker and the jobs keep answering on the old address (the matcher skips them).
const NEW = "https://arkanumdata.com";
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|embed|monitor/i;

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const to = NEW + pathname + search;
  if (req.method !== "GET" || BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.redirect(to, 301);
  const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${to}"><title>Arkanum has moved</title>
<script>(function(){var d={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^(foresight|form4|arkanum)\\./.test(k))d[k]=localStorage.getItem(k)}}catch(e){}
var h=Object.keys(d).length?"#arkanum-move="+encodeURIComponent(JSON.stringify(d)):location.hash;location.replace(${JSON.stringify(to)}+h)})()</script>
<p style="font-family:monospace">Arkanum moved to <a href="${to}">arkanumdata.com</a>.</p>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export const config = {
  matcher: [{ source: "/((?!api/|_next/|data/|feeds/|sw\\.js|manifest|icon|apple-icon|favicon|opengraph-image).*)", has: [{ type: "header", key: "host", value: "arkanumdata\\.vercel\\.app" }] }],
};
