// Fallback for owner alerts when the site can't deliver them (site down, renamed, or
// rejecting the job): open a GitHub issue, which the GitHub app pushes to the owner's phone.
// One issue stays open per alert title; later failures add a comment instead of a new issue.
const OWNER = "maximaripov";

export async function issueAlert({ title, body, url }, { repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN, fetchImpl = fetch } = {}) {
  if (!repo || !token) { console.log("No GitHub token: can't open an issue for:", title); return null; }
  const api = `https://api.github.com/repos/${repo}/issues`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
  const text = `${body}${url ? `\n\n${url}` : ""}\n\n(The phone notification couldn't be sent through the site, so this issue was opened instead.)`;
  const open = await fetchImpl(`${api}?state=open&labels=alert&per_page=50`, { headers });
  const existing = open.ok ? (await open.json()).find((i) => i.title === title) : null;
  if (existing) {
    const r = await fetchImpl(`${api}/${existing.number}/comments`, { method: "POST", headers, body: JSON.stringify({ body: text }) });
    console.log("Issue comment:", r.status);
    return r.ok ? { comment: existing.number } : null;
  }
  const r = await fetchImpl(api, { method: "POST", headers, body: JSON.stringify({ title, body: `@${OWNER} ${text}`, labels: ["alert"] }) });
  console.log("Issue:", r.status);
  return r.ok ? { issue: (await r.json()).number } : null;
}
