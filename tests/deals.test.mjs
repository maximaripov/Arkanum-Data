import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDeal, parseRss } from "../scripts/lib/deals.mjs";

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
