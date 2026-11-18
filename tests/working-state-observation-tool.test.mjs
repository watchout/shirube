// U2 観測の解釈（LC2）のうち、道具の確かめ: ある・無い・非対応の版・起動できない・応答しないの区別と、版の適合の 3 値。BR2.2・BR2.3。
// 宣言（manifest・必要な版の写し）だけで対応済みにしない。必要な版は呼出側が実際の対象の pin・契約から読んで渡す入力。
import assert from "node:assert/strict";
import test from "node:test";
import { availabilityOf, goodReads, observe, probeRead, unit } from "./working-state-fixtures.mjs";

const probeResult = (over, tool = "node", output = "v24.22.3\n", extra = {}) =>
  observe({ reads: goodReads().map((r) => (r.locator === tool ? probeRead(tool, output, over) : r)), ...extra });
const nodeItem = (result) => unit(result, "tool_node", "tool_probe");
const assertCause = (item, cause) => {
  assert.equal(availabilityOf(item), "unavailable");
  assert.equal(item.unobservableCause, cause);
  for (const key of ["presence", "value", "valueDigest", "withheld", "targetMatch"]) assert.equal(key in item, false, key);
};

test("T2.2+ 起動できて正常に終わった道具は、出力から取り出した版を値として持つ（出力の全文は持たない）", () => {
  const item = nodeItem(probeResult({}, "node", "v24.22.3\n"));
  assert.deepEqual([availabilityOf(item), item.presence, item.targetMatch, item.value, item.valueDigest !== undefined], ["observed", "value", "matches", "24.22.3", true]);
  assert.equal(JSON.stringify(item).includes("v24"), false);
  assert.equal(unit(probeResult({}, "aidlc", "aidlc 2.11.1\n"), "tool_aidlc", "tool_probe").value, "2.11.1");
});

test("T2.2+ 実行ファイルが無い = tool_missing（PATH の欠落が無い時）。起動できない = tool_cannot_start。作業 directory が使えない = tool_cannot_start", () => {
  assertCause(nodeItem(probeResult({ launch: "not_found" })), "tool_missing");
  assertCause(nodeItem(probeResult({ launch: "cannot_start" })), "tool_cannot_start");
  assertCause(nodeItem(probeResult({ launch: "cwd_unusable" })), "tool_cannot_start");
});

test("T2.2+ 応答しない = timed_out、出力の上限 = budget_exceeded。止めたことの確認の有無は原因を変えない", () => {
  for (const confirmed of [true, false]) {
    assertCause(nodeItem(probeResult({ stop: { reason: "timeout", confirmed } })), "timed_out");
    assertCause(nodeItem(probeResult({ stop: { reason: "output_limit", confirmed } })), "budget_exceeded");
  }
});

test("T2.2+ 予算: 経過時間が宣言を超えたら timed_out、読んだ大きさ・回数が超えたら budget_exceeded。等しい間は通る", () => {
  assertCause(nodeItem(probeResult({ measured: { elapsedMs: 5001, bytesRead: 1, requests: 1 } })), "timed_out");
  assertCause(nodeItem(probeResult({ measured: { elapsedMs: 1, bytesRead: 65537, requests: 1 } })), "budget_exceeded");
  assertCause(nodeItem(probeResult({ measured: { elapsedMs: 1, bytesRead: 1, requests: 9 } })), "budget_exceeded");
  assert.equal(nodeItem(probeResult({ measured: { elapsedMs: 5000, bytesRead: 65536, requests: 8 } })).value, "24.22.3");
  assertCause(nodeItem(probeResult({ budget: null })), "malformed");
});

test("T2.2- 終了コードが 0 でない・未知の launch・launch が無い・stop の理由が未知は、正常として読まない（成功にしない）", () => {
  assertCause(nodeItem(probeResult({ exitCode: 1 })), "tool_cannot_start");
  assertCause(nodeItem(probeResult({ exitCode: undefined })), "tool_cannot_start");
  assertCause(nodeItem(probeResult({ launch: "unknown" })), "tool_cannot_start");
  assertCause(nodeItem(probeResult({ launch: undefined })), "tool_cannot_start");
  assertCause(nodeItem(probeResult({ stop: { reason: "other", confirmed: true } })), "timed_out");
});

test("T2.2+ PATH の欄が落とされて見つからない時は tool_missing と断定せず tool_cannot_start とし、落とした数と種類（辞書順）を probeNotes に残す（暫定の対応）", () => {
  const item = nodeItem(probeResult({ launch: "not_found", dropped: { count: 2, kinds: ["relative", "empty"] } }));
  assertCause(item, "tool_cannot_start");
  assert.deepEqual(item.probeNotes, { droppedCount: 2, droppedKinds: ["empty", "relative"] });
  const found = nodeItem(probeResult({ dropped: { count: 1, kinds: ["relative"] } }));
  assert.equal(found.value, "24.22.3");
  assert.equal("probeNotes" in found, false);
});

test("T2.2- dropped が無い・形が不正（数が負・小数・kinds が未知の値・配列でない）でも落ちず、見つからない時は tool_missing と断定せず tool_cannot_start（失敗側）", () => {
  for (const dropped of [undefined, null, { count: -1, kinds: [] }, { count: 1.5, kinds: [] }, { count: 1, kinds: ["weird"] }, { count: 1, kinds: "relative" }]) {
    const item = nodeItem(probeResult({ launch: "not_found", dropped }));
    assertCause(item, "tool_cannot_start");
  }
});

test("T2.3+ 必要な版以上なら観測として使う。下回れば tool_unsupported_version（版の比べは version-compare。文字列の見た目ではない）", () => {
  const ok = nodeItem(probeResult({}, "node", "v24.22.3\n", { requiredVersions: { tool_node: "22.0.0" } }));
  assert.equal(ok.value, "24.22.3");
  assert.equal(nodeItem(probeResult({}, "node", "v24.22.3\n", { requiredVersions: { tool_node: "24.22.3" } })).value, "24.22.3");
  assertCause(nodeItem(probeResult({}, "node", "v24.22.3\n", { requiredVersions: { tool_node: "24.22.4" } })), "tool_unsupported_version");
  assertCause(nodeItem(probeResult({}, "node", "v9.0.0\n", { requiredVersions: { tool_node: "10.0.0" } })), "tool_unsupported_version");
  assert.equal(nodeItem(probeResult({}, "node", "v10.0.0\n", { requiredVersions: { tool_node: "9.0.0" } })).value, "10.0.0");
});

test("T2.3+ 必要な版が渡されない項目は比べない（宣言を写して補わない）。別の項目の必要な版は影響しない", () => {
  const result = probeResult({}, "node", "v24.22.3\n", { requiredVersions: { tool_aidlc: "99.0.0" } });
  assert.equal(nodeItem(result).value, "24.22.3");
  assertCause(unit(result, "tool_aidlc", "tool_probe"), "tool_unsupported_version");
});

test("T2.3- 必要な版が版として読めない時は比べられず malformed（成功にも不一致にもしない）", () => {
  for (const required of ["", "latest", "1.x", 22, null, {}]) {
    assertCause(nodeItem(probeResult({}, "node", "v24.22.3\n", { requiredVersions: { tool_node: required } })), "malformed");
  }
});

test("T2.3- 観測した版が取り出せない出力は、版の比べに使わない（withheld = invalid_format のまま）", () => {
  const item = nodeItem(probeResult({}, "node", "no version here\n", { requiredVersions: { tool_node: "22.0.0" } }));
  assert.deepEqual([availabilityOf(item), item.withheld], ["observed", "invalid_format"]);
});

test("T2.3- 必要な版はファイルの出典の項目には当てない（道具の確かめだけの規則）", () => {
  const result = observe({ requiredVersions: { aidlc_version: "99.0.0", kit_version: "99.0.0" } });
  assert.equal(unit(result, "aidlc_version", "aidlc_version").value, "2.11.1");
  assert.equal(unit(result, "kit_version", "sds_pin").value, "0.1.0");
});
