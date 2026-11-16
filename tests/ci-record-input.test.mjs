import test from "node:test";
import assert from "node:assert/strict";
const api = await import("../scripts/sds/ci-record-input.mjs").catch((error) => {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  return {};
});
const target = () => ({ repo: "watchout/example", workspace: "example", space: "default", intent: "261105-example", unit: "u1-example", stage: "code-generation", attempt: "attempt-1" });
const projection = () => ({ schema: "shirube-pr-records/1", target: target(), rulesetVersion: "shirube-u1-functional-rules/1",
  artifacts: [{ path: "docs/example.md", bytes: 0, sha256: "a".repeat(64) }], artifactSetDigest: "b".repeat(64),
  stages: [{ stage: "code-generation", unit: "u1-example", attempt: "attempt-1", artifactPaths: ["docs/example.md"], approvals: [{ kind: "plan", choice: "Approve Plan", recordRef: "public:plan-1" }], review: null }] });
function parse(text) {
  assert.equal(typeof api.parseRecordJson, "function", "BR6.2 requires bounded duplicate-aware JSON input");
  return api.parseRecordJson(text);
}
test("U1-IN01 /1 public shape and required types", () => {
  const p = projection(); assert.deepEqual(parse(JSON.stringify(p)), p); assert.deepEqual(api.validateProjection(p), p);
  for (const key of ["target", "stages", "artifactSetDigest"]) { const v = projection(); delete v[key]; assert.throws(() => api.validateProjection(v)); }
});
test("U1-IN02 unknown major and critical fields cannot redefine meaning", () => {
  parse("{}");
  for (const change of [(p) => { p.schema = "shirube-pr-records/2"; }, (p) => { p.required = []; }, (p) => { p.extensions = { authorization: "GRANTED" }; }]) {
    const p = projection(); change(p); assert.throws(() => api.validateProjection(p));
  }
});
test("U1-IN03 same-object escaped duplicate keys are refused before overwrite", () => {
  parse("{}");
  for (const text of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"x":{"a":1,"a":1}}']) assert.throws(() => parse(text), /DUPLICATE_RECORD/);
  assert.deepEqual(parse('{"x":{"a":1},"y":{"a":2}}'), { x: { a: 1 }, y: { a: 2 } });
});
test("U1-IN04 partial broken oversized or excessive-depth JSON fails closed", () => {
  parse("{}");
  for (const text of ["", "{", '"unterminated', "[1,]", "{}x", " ".repeat(8000001), "[".repeat(600) + "0" + "]".repeat(600)]) assert.throws(() => parse(text));
});
test("U1-IN05 absolute empty dot dotdot backslash and NUL paths refused", () => {
  parse("{}");
  for (const path of ["", "/a", "C:/a", "a//b", "a/./b", "a/../b", "a\\b", "a\0b"]) assert.throws(() => api.validatePath(path));
});
test("U1-IN06 symlink submodule and private paths never traversed", () => {
  parse("{}");
  for (const entry of [{ path: "docs/a", mode: "120000", type: "blob" }, { path: "docs/a", mode: "160000", type: "commit" }]) assert.throws(() => api.validateTreeEntry(entry));
  for (const path of ["audit/raw.md", "x/.aidlc-engine/raw.json", "x/memory.md"]) assert.throws(() => api.validatePublicPath(path));
  assert.equal(api.validatePublicPath("docs/audit/example-design.json"), "docs/audit/example-design.json");
  assert.equal(api.validateTreeEntry({ path: "audit/private.md", mode: "100644", type: "blob" }).path, "audit/private.md");
});
test("U1-IN07 Unicode newline quotes and bytes retain exact identity", () => {
  const value = { path: 'docs/日本語\n"e\u0301.md', content: "\ufeffx\r\n" };
  assert.deepEqual(parse(JSON.stringify(value)), value);
  assert.equal(api.validatePath(value.path), value.path);
  assert.notEqual(api.validatePath("docs/e\u0301.md"), api.validatePath("docs/é.md"));
});
test("U1-IN08 logical refs duplicate records and target types", () => {
  parse("{}"); assert.deepEqual(api.validateTarget(target()), target());
  for (const ref of ["", "/private/approval", "file:///tmp/a", "x/.aidlc-engine/a", "public:secret\nbody"]) assert.throws(() => api.validateRef(ref));
  const p = projection(); p.stages.push(structuredClone(p.stages[0])); assert.throws(() => api.validateProjection(p), /DUPLICATE_RECORD/);
  const t = target(); t.attempt = 1; assert.throws(() => api.validateTarget(t));
  const linked = projection(); linked.control_source_ref = { url: "https://github.com/watchout/example/pull/7#issuecomment-3", sha256: "c".repeat(64) };
  assert.deepEqual(api.validateProjection(linked), linked); linked.control_source_ref.sha256 = "invalid"; assert.throws(() => api.validateProjection(linked));
});
