import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { target, NOW, HEAD, BASE } from "./ci-record-fixtures.mjs";
const api = await import("../scripts/sds/ci-record-evidence.mjs").catch((error) => { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; return {}; });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const oid = (b) => createHash("sha1").update(Buffer.from(`blob ${b.length}\0`)).update(b).digest("hex");
function fixture() {
  const blobs = new Map([["docs/a.md", Buffer.from("abc")], ["docs/b.md", Buffer.from("\ufeffx\r\n")]]);
  const value = { paths: [...blobs.keys()], calls: [], clock: 0, mutate: (x) => x, response: null, prReads: 0, blobs };
  value.transport = async (route) => {
    value.calls.push(route);
    if (value.response) return value.response(route);
    let body;
    if (/pulls\/7$/.test(route)) { value.prReads += 1; body = { number: 7, head: { sha: HEAD }, base: { sha: BASE }, changed_files: 2, commits: 1 }; }
    else if (route.includes("/files?")) body = [...blobs.keys()].map((filename) => ({ filename, status: "added" }));
    else if (route.includes("/commits?")) body = [{ sha: HEAD }];
    else if (route.includes("/git/commits/")) body = { sha: HEAD, tree: { sha: "e".repeat(40) } };
    else if (route.includes("/git/trees/")) body = { sha: "e".repeat(40), truncated: false, tree: [...blobs].map(([path, b]) => ({ path, mode: "100644", type: "blob", sha: oid(b), size: b.length })) };
    else if (route.includes("/git/blobs/")) { const b = [...blobs.values()].find((x) => route.endsWith(oid(x))); body = { sha: oid(b), encoding: "base64", size: b.length, content: b.toString("base64") }; }
    else throw Error("unexpected synthetic route");
    return new Response(JSON.stringify(value.mutate(body, route)), { status: 200 });
  };
  return value;
}
function reader(f) { assert.equal(typeof api.createReader, "function", "BR8.1 requires bounded read observations"); return api.createReader({ transport: f.transport, clock: () => f.clock }); }
async function collect(f) { return api.collectEvidence({ target: target(), number: 7, head: HEAD, requiredPaths: f.paths, recordPath: "records.json", observationId: "public:observation-1", now: NOW, reader: reader(f) }); }
test("U1-EV01 complete PR pages tree blobs and final head", async () => {
  const f = fixture(), result = await collect(f);
  assert.equal(result.prObservation.complete, true); assert.equal(result.artifacts.length, 2); assert.equal(f.prReads, 2);
  assert.equal(result.observation.availability, "observed"); assert.equal(JSON.stringify(result.observation).includes("content"), false);
  const pages = fixture(); pages.response = (route) => new Response(JSON.stringify(Array.from({ length: route.endsWith("page=1") ? 100 : 1 }, (_, i) => ({ filename: `docs/page-${route.at(-1)}-${i}.md` }))));
  assert.equal((await api.readPages(reader(pages), "repos/watchout/example/pulls/7/files")).length, 101); assert.equal(pages.calls.length, 2);
});
test("U1-EV02 raw bytes and independent known digest", async () => {
  const f = fixture(), result = await collect(f);
  assert.equal(result.artifacts[0].sha256, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(result.artifacts[1].bytes, f.blobs.get("docs/b.md").length);
  const rows = result.artifacts.map((e) => JSON.stringify([e.path, e.bytes, e.sha256]) + "\n").join("");
  assert.equal(result.artifactSetDigest, hash(rows));
});
test("U1-EV03 missing page truncated tree or required path never partial success", async () => {
  for (const mutate of [(b, r) => r.endsWith("/7") ? { ...b, changed_files: 3 } : b, (b, r) => r.includes("/trees/") ? { ...b, truncated: true } : b, (b, r) => r.includes("/trees/") ? { ...b, tree: b.tree.slice(1) } : b]) {
    const f = fixture(); f.mutate = mutate; await assert.rejects(() => collect(f)); assert.equal(f.prReads, 1);
  }
});
test("U1-EV04 five budgets exact boundaries exceeded and interrupted stream", async () => {
  const f = fixture(); f.response = async () => new Response("{}"); const r = reader(f);
  for (let i = 0; i < 100; i += 1) await r.json("repos/watchout/example/pulls/7");
  await assert.rejects(() => r.json("repos/watchout/example/pulls/7")); assert.equal(f.calls.length, 100);
  const elapsed = fixture(); const re = reader(elapsed); elapsed.clock = 120000; await assert.rejects(() => re.json("repos/watchout/example/pulls/7")); assert.equal(elapsed.calls.length, 0);
  for (const size of [8000000, 8000001]) {
    const bytes = fixture(); bytes.response = async () => new Response(Buffer.alloc(size, 32)); const rb = reader(bytes);
    if (size === 8000000) assert.equal((await rb.bytes("repos/watchout/example/pulls/7")).length, size);
    else await assert.rejects(() => rb.bytes("repos/watchout/example/pulls/7"));
  }
  const slow = fixture(); slow.response = async () => { slow.clock += 20001; return new Response("{}"); };
  const rs = reader(slow); await assert.rejects(() => rs.json("repos/watchout/example/pulls/7")); await assert.rejects(() => rs.json("repos/watchout/example/pulls/7")); assert.equal(slow.calls.length, 1);
  const broken = fixture(); broken.response = async () => new Response(new ReadableStream({ start(c) { c.error(Error("synthetic stream interruption")); } }));
  await assert.rejects(() => reader(broken).json("repos/watchout/example/pulls/7"));
});
test("U1-EV05 access denied missing and malformed JSON stop without echo retry", async () => {
  for (const response of [() => new Response("SYNTHETIC_SECRET", { status: 403 }), () => new Response("missing", { status: 404 }), () => new Response("{"), () => { throw Error("SYNTHETIC_SECRET"); }]) {
    const f = fixture(); f.response = response;
    await assert.rejects(() => collect(f), (e) => !e.message.includes("SYNTHETIC_SECRET")); assert.equal(f.calls.length, 1);
  }
});
test("U1-EV06 head or base changed during observation cannot emit old assessment", async () => {
  for (const field of ["head", "base"]) {
    const f = fixture(); f.mutate = (b, r) => r.endsWith("/7") && f.prReads === 2 ? { ...b, [field]: { sha: "d".repeat(40) } } : b;
    await assert.rejects(() => collect(f), /TARGET_MISMATCH/);
  }
});
test("U1-EV07 rename and unclassified addition are not silently excluded", async () => {
  const f = fixture(); f.mutate = (b, r) => r.includes("/files?") ? b.map((x, i) => i ? x : { ...x, status: "renamed", previous_filename: "docs/old.md" }) : b;
  await assert.rejects(() => collect(f), /ARTIFACT_SET_MISMATCH/);
});
test("U1-EV08 order-equivalent inputs and fresh independent collection", async () => {
  const f = fixture(), first = await collect(f); f.paths.reverse(); const second = await collect(f);
  assert.equal(first.artifactSetDigest, second.artifactSetDigest); assert.equal(f.prReads, 4);
  f.blobs.set("docs/a.md", Buffer.from("abd")); const changed = await collect(f); assert.notEqual(first.artifactSetDigest, changed.artifactSetDigest);
});
