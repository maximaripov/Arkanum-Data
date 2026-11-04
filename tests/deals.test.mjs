import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDeal, extractDeals, parseRss } from "../scripts/lib/deals.mjs";

const d = (title, summary = "") => extractDeal({ title, summary, date: "2026-11-03", link: "https://example.com/x" });

test("startup raise led by a tracked investor", () => {
  const x = d("Upscale AI Raises $200 Million Series A Led by NVentures to Build Open AI Networking");
  assert.equal(x.investor, "NVDA"); assert.equal(x.target, "Upscale AI"); assert.equal(x.amount, 200e6); assert.equal(x.round, "Series A");
});
test("investor in the summary, among others", () => {
  const x = d("Acme Robotics Closes $45M Financing", "The round was led by Sequoia Capital with participation from Intel Capital and existing investors.");
  assert.equal(x.investor, "INTC"); assert.equal(x.target, "Acme Robotics"); assert.equal(x.amount, 45e6);
});
test("investor-first headline", () => {
  const x = d("Salesforce Ventures Invests in Ironclad to Expand AI Contracting");
  assert.equal(x.investor, "CRM"); assert.equal(x.target, "Ironclad");
});
test("billions and -backed", () => {
  const x = d("SoftBank-backed Skyline Secures $1.2 Billion Series D");
  assert.equal(x.investor, "SFTBF"); assert.equal(x.amount, 1.2e9);
});
test("product mentions are not investments", () => {
  assert.equal(d("Acme Raises $5M to Expand Its Partnership With Amazon Web Services"), null);
  assert.equal(d("Beta Raises $10M Seed", "Beta's tools are available on Google Cloud Marketplace, backed by investors including Google Cloud credits."), null);
  assert.equal(d("Nvidia Announces Record Quarterly Revenue"), null);
  assert.equal(d("Intelligence Corp Raises $3M Led by Founders Fund"), null);
});
test("RSS parsing decodes entities and dates", () => {
  const [i] = parseRss(`<rss><channel><item><title><![CDATA[Foo &amp; Bar Raises $5M]]></title><link>https://x.test/a</link><pubDate>Tue, 03 Nov 2026 15:12:00 -0500</pubDate><description>&lt;p&gt;Hello&lt;/p&gt;</description></item></channel></rss>`);
  assert.equal(i.title, "Foo & Bar Raises $5M"); assert.equal(i.date, "2026-11-03"); assert.equal(i.link, "https://x.test/a");
});
test("a job title isn't the company", () => {
  assert.equal(d("ALORA Appoints Adam Helms as CEO; Secures Funding from Grantham Environmental Trust and Toyota Ventures"), null);
});
test("people at a company and funds named after it aren't the company", () => {
  assert.equal(d("Payam Music Raises Funding", "It raised funding from executives including Mark Cuban, Dara Khosrowshahi (CEO of Uber), and others."), null);
  assert.equal(d("Valor Closes Series B Round of Capital Investment", "This Series B round was led by Ladd Wilks, of Cisco; and the Moncrief family."), null);
  assert.equal(d("Sophia Space Announces $7 Million SAFE Financing", "Strategic investors include EverGreen Fund - The NVIDIA Alumni Investment Network and others."), null);
  assert.equal(d("StairMed Secures RMB 500 Million Financing", "Existing shareholders including Tencent, OrbiMed and Lilly Asia Ventures (LAV) participated."), null);
});
test("headline with a lead-in before the company", () => {
  assert.equal(d("From $100M Seed to Unicorn in Months: Upscale AI Closes Oversubscribed $200M Series A", "With participation from Intel Capital and others.").target, "Upscale AI");
});
test("every tracked investor in a round gets the deal", () => {
  const all = extractDeals({ title: "Censys Raises $70 Million in Strategic Funding", summary: "Its Series D was led by Morgan Stanley Expansion Capital, with participation from Decibel Partners, GV, Intel Capital, and others.", date: "2026-03-31", link: "x" });
  assert.deepEqual(all.map((x) => x.investor).sort(), ["GOOG", "INTC"]);
});
test("round size skips valuations, totals and other currencies", () => {
  assert.equal(d("Ricursive Intelligence Raises $300 Million Series A at $4 Billion Valuation", "Led by Lightspeed, alongside NVentures.").amount, 300e6);
  assert.equal(d("Resolve AI announces Series A Extension at a $1.5B valuation", "The round was led by DST Global and Salesforce Ventures.").amount, null);
  assert.equal(d("Cohere Announces Series E Fundraise Targeting CAD $7 Billion", "Returning investors include NVIDIA and Inovia Capital.").amount, null);
});
test("round size from the headline's main clause", () => {
  assert.equal(d("From $100M Seed to Unicorn in Months: Upscale AI Closes Oversubscribed $200M Series A", "With participation from Intel Capital.").amount, 200e6);
});
