// FR3.3 / NFR7: the field name and the cap are owned by one constant in the checker; the two docs copy them and this test
// fails when the three places differ. The docs never feed the decision.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as admission from "../scripts/hygiene/audit-admission.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const METHOD = "docs/sds/audit-method.md", SKILL = "kit/skills/sds-audit/SKILL.md", CORE = "scripts/hygiene/audit-admission.mjs";

// The docs must name the field, the cap, and the "not guaranteed" statement; `name` and `max` come from the checker's constants.
export function docsAgree({ name, max }, method, skill) {
  const gaps = [];
  const has = (label, text, part) => { if (!text.includes(part)) gaps.push(`${label}: ${part}`); };
  has("method", method, name); has("method", method, `最大${max}件`); has("method", method, "保証しないこと"); has("method", method, "sds-audit-request/1");
  has("skill", skill, name); has("skill", skill, `at most ${max} entries`); has("skill", skill, "the schema stays `/1`");
  return gaps;
}

test("NFR7.2: the checker exports the field name and the cap as the single source", () => {
  assert.equal(admission.EXTRA_FIELD, "extra_checkouts");
  assert.equal(admission.EXTRA_MAX, 4);
});

test("FR3.3/BR4.1: both docs carry the same field name and cap as the checker", () => {
  assert.deepEqual(docsAgree({ name: admission.EXTRA_FIELD, max: admission.EXTRA_MAX }, read(METHOD), read(SKILL)), []);
});

test("BR4.2: the method doc states the rules, the limits of the checker, and that the schema stays /1", () => {
  const m = read(METHOD);
  for (const part of ["同じcommitの重複", "5件目以降は拒否","ちょうど1つ", "完全一致で出て", "再試行しない", "完全一致と実在だけ", "独立の監査席"]) assert.ok(m.includes(part), part);
});

test("BR3.7: both docs say a declared commit must not derive from the target's base or head", () => {
  for (const part of ["base・headに由来してはならない", "両親のどれかがbase・head"]) assert.ok(read(METHOD).includes(part), part);
  for (const part of ["must not derive from the target's base or head", "one of its parents is"]) assert.ok(read(SKILL).includes(part), part);
});

test("NFR7.2 negative: a doc with another name or another cap is reported", () => {
  const ok = { name: admission.EXTRA_FIELD, max: admission.EXTRA_MAX }, method = read(METHOD), skill = read(SKILL);
  assert.ok(docsAgree(ok, method.replaceAll(ok.name, "extra_checkout"), skill).length > 0);
  assert.ok(docsAgree(ok, method.replaceAll("最大4件", "最大5件"), skill).length > 0);
  assert.ok(docsAgree(ok, method, skill.replaceAll(ok.name, "extras")).length > 0);
  assert.ok(docsAgree(ok, method, skill.replaceAll("at most 4 entries", "at most 5 entries")).length > 0);
  assert.ok(docsAgree(ok, method.replaceAll("保証しないこと", ""), skill).length > 0);
  assert.ok(docsAgree({ name: ok.name, max: 5 }, method, skill).length > 0);
});

test("NFR7.1: the field name is written once in the checker, as the constant's definition", () => {
  const code = read(CORE);
  assert.equal(code.split("extra_checkouts").length - 1, 1);
  assert.equal([...code.matchAll(/EXTRA_MAX/g)].length >= 2, true);
});
