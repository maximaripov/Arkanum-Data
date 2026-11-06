import { test } from "node:test";
import assert from "node:assert/strict";
import { issueAlert } from "../scripts/lib/issue-alert.mjs";

const fake = (openIssues) => {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? "GET", body: opts.body && JSON.parse(opts.body) });
    if (!opts.method) return { ok: true, json: async () => openIssues };
    return { ok: true, status: 201, json: async () => ({ number: 7 }) };
  };
  return { calls, fetchImpl };
};
const env = { repo: "o/r", token: "t" };

test("opens a labelled issue that mentions the owner", async () => {
  const { calls, fetchImpl } = fake([]);
  assert.deepEqual(await issueAlert({ title: "Job failed", body: "Failed: digest.", url: "https://x" }, { ...env, fetchImpl }), { issue: 7 });
  const post = calls.at(-1);
  assert.equal(post.url, "https://api.github.com/repos/o/r/issues");
  assert.deepEqual(post.body.labels, ["alert"]);
  assert.match(post.body.body, /^@maximaripov Failed: digest\.\n\nhttps:\/\/x/);
});

test("comments on the open issue with the same title instead of opening another", async () => {
  const { calls, fetchImpl } = fake([{ number: 3, title: "Other" }, { number: 5, title: "Job failed" }]);
  assert.deepEqual(await issueAlert({ title: "Job failed", body: "Again." }, { ...env, fetchImpl }), { comment: 5 });
  assert.equal(calls.at(-1).url, "https://api.github.com/repos/o/r/issues/5/comments");
});

test("does nothing without a token", async () => {
  const { calls, fetchImpl } = fake([]);
  assert.equal(await issueAlert({ title: "x", body: "y" }, { repo: "o/r", token: "", fetchImpl }), null);
  assert.equal(calls.length, 0);
});
