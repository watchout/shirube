// U4 2a, the PR template and the consumers list (docs/design/u4-gate-judgements.md §3.4, §3.5, §4 T22).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { status } from "../scripts/sds/kit.mjs";

const file = (p) => readFileSync(resolve(import.meta.dirname, "..", p), "utf8");
const COMMENT = /^https:\/\/github\.com\/watchout\/[\w.-]+\/(?:issues|pull)\/\d+#issuecomment-\d+$/;

test("T22 the template asks for aidlc_record, shows an optional fixes_pr in a valid sds-pr block, and explains unit designs and the audit of a design record", () => {
  const t = file("templates/PULL_REQUEST_TEMPLATE.md");
  assert.match(t, /^- aidlc_record: .*"none"/m);
  const example = JSON.parse(/```json sds-pr\n([\s\S]*?)\n```/.exec(t)[1]);
  assert.deepEqual([example.schema, typeof example.fixes_pr, Array.isArray(example.changed_paths)], ["sds-pr/1", "string", true]);
  assert.match(t, /Delete `fixes_pr`/);
  for (const word of ["placements", "approval.kind", "unit_design", "design_pr"]) assert.ok(t.includes(word), word);
  assert.match(t, /design record[^.]*\baudit\b[^.]*before it is merged/i); // a PR that merges a unit design writes its own audit first
});
test("T22 docs/sds/consumers.json keeps the five-key shape, and has shirube as adopted with the adoption record the Owner decision names", () => {
  const list = JSON.parse(file("docs/sds/consumers.json"));
  assert.equal(new Set(list.map((c) => c.repo)).size, list.length);
  for (const c of list) {
    assert.deepEqual(Object.keys(c).sort(), ["adopter", "adoption", "hygiene_profile", "repo", "state"], c.repo);
    assert.match(c.repo, /^watchout\/[\w.-]+$/); assert.ok(["none", "docs", "product"].includes(c.hygiene_profile), c.repo); assert.ok(["adopted", "planned"].includes(c.state), c.repo);
    assert.match(c.adoption.ref, COMMENT, c.repo); assert.match(c.adoption.sha256, /^[0-9a-f]{64}$/, c.repo);
  }
  const me = list.find((c) => c.repo === "watchout/shirube");
  assert.deepEqual([me?.state, me?.adopter, me?.adoption.ref, me?.adoption.sha256],
    ["adopted", "Owner", "https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379461383", "cc806f3339a39d03182ba598ce10eb2ee7a25865262929d98077cf5bfc1f4556"]);
  assert.equal(file("docs/sds/consumers.json"), `${JSON.stringify(list, null, 2)}\n`); // written the way the other rows are
});
test("status lists shirube among the consumers it reads", () => {
  const rows = status(() => { throw new Error("gh: Not Found (HTTP 404)"); });
  assert.ok(rows.some((r) => r.repo === "watchout/shirube" && r.verdict === "READ"));
});
