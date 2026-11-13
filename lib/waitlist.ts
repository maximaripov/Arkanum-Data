// The API early-access list (/developers): email, what they'd use it for, and when. Kept in
// the same private Blob store as the alert devices, read and written only by the server.
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";

export type Signup = { email: string; use: string; plan: string; at: string };
const PATH = "waitlist/developers.json";
const MAX = 5000;

async function read(): Promise<{ list: Signup[]; etag: string | null }> {
  const r = await get(PATH, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return { list: [], etag: null };
  return { list: JSON.parse(await new Response(r.stream).text()) as Signup[], etag: r.blob.etag };
}

export const readSignups = async () => (await read()).list;

/** Adds a sign-up (an email already on the list is updated, not repeated). Returns the list size. */
export async function addSignup(s: Signup): Promise<{ total: number; isNew: boolean }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { list, etag } = await read();
    const i = list.findIndex((x) => x.email === s.email);
    const isNew = i < 0;
    if (isNew && list.length >= MAX) return { total: list.length, isNew: false };
    if (isNew) list.push(s); else list[i] = { ...list[i], use: s.use || list[i].use, plan: s.plan || list[i].plan };
    try {
      await put(PATH, JSON.stringify(list), { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json", ...(etag ? { ifMatch: etag } : {}) });
      return { total: list.length, isNew };
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise((r) => setTimeout(r, 150 * 2 ** attempt)); // someone signed up at the same moment
    }
  }
  throw new Error("busy, try again");
}
