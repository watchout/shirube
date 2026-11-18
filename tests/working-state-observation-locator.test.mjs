// U2 観測の位置（locator）。秘密らしい位置の読取りは、参照（observationId・sourceRef・candidateRef・observationRefs）を作る前の 1 か所で
// 使えない観測（既存の原因 malformed）にし、位置を含む参照を作らない。案内の文面・draft・C02 の wire・選択のどこにも写らない。
// 通常の位置（初期の項目一覧の位置）の挙動は変えない。試験の秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。
import assert from "node:assert/strict";
import test from "node:test";
import * as ws from "../scripts/working-state/index.mjs";
import { LOCATORS, NOW, OID_B, callerText, fileRead, goodReads, pinText, unit } from "./working-state-fixtures.mjs";
import { CATALOG, observeWith, withContent } from "./working-state-answer-fixtures.mjs";
import { builtDraft, createSelection } from "./working-state-draft-fixtures.mjs";
import { guided } from "./working-state-guidance-fixtures.mjs";

const SECRET_LOCATORS = ["gh" + "p_" + "u".repeat(12), "s" + "k" + "-" + "v".repeat(24), "AK" + "IA" + "W".repeat(16), "q".repeat(24)];
const readsWithPinAt = (locator, reads = goodReads()) => reads.map((read) => (read.sourceKind === "sds_pin" ? fileRead("sds_pin", pinText(), { locator }) : read));
const everywhere = (secret, ...values) => values.map((value) => JSON.stringify(value)).every((text) => !text.includes(secret));

test("T2.l1+ 秘密らしい位置の読取りは、位置を含む参照を作らず、使えない観測（malformed）になる", () => {
  for (const secret of SECRET_LOCATORS) {
    const result = observeWith(CATALOG, readsWithPinAt(secret));
    assert.equal(everywhere(secret, result), true, secret);
    const pin = unit(result, "sds_commit", "sds_pin");
    assert.equal(pin.observation.availability, "unavailable");
    assert.equal(pin.unobservableCause, "malformed");
    assert.equal(pin.sourceRef.locator, "sds_pin");
    assert.equal(pin.observation.observationId.includes(secret), false);
    assert.equal(pin.observation.sourceRef, "sds_pin:sds_pin");
  }
});

test("T2.l2+ 秘密らしい位置の読取りが同じ単位に複数あっても、1 つの使えない観測になる（位置で単位を増やさない）", () => {
  const [first, second] = SECRET_LOCATORS;
  const reads = [...readsWithPinAt(first), fileRead("sds_pin", pinText(), { locator: second })];
  const result = observeWith(CATALOG, reads);
  const pins = result.items.filter((item) => item.itemKey === "sds_commit" && item.sourceRef.sourceKind === "sds_pin");
  assert.equal(pins.length, 1);
  assert.equal(pins[0].unobservableCause, "malformed");
});

test("T2.l3+ 通常の位置の読取りは今までどおり観測され、位置が参照に入る（挙動を変えない）", () => {
  const result = observeWith(CATALOG, goodReads());
  const pin = unit(result, "sds_commit", "sds_pin");
  assert.equal(pin.observation.availability, "observed");
  assert.equal(pin.sourceRef.locator, LOCATORS.sds_pin);
  assert.equal(pin.observation.observationId, ["sds_commit", "sds_pin", LOCATORS.sds_pin, NOW].join("|"));
  assert.equal(pin.observation.sourceRef, `sds_pin:${LOCATORS.sds_pin}`);
  const caller = unit(result, "sds_commit", "workflow_caller");
  assert.equal(caller.observation.availability, "observed");
  assert.equal(caller.sourceRef.locator, LOCATORS.workflow_caller);
});

test("T7.7- 秘密らしい位置は案内の文面（根拠の参照を含む）・draft・C02 の wire・候補の参照のどこにも写らない", () => {
  for (const secret of SECRET_LOCATORS) {
    const observed = observeWith(CATALOG, readsWithPinAt(secret, goodReads()));
    const draft = builtDraft({ observedItems: observed.items });
    const { guidance } = guided(draft);
    const wire = ws.draftToC02Wire(draft);
    assert.equal(wire.status, "converted");
    assert.equal(everywhere(secret, draft, guidance, wire), true, secret);
    assert.equal(guidance.text.includes(secret), false);
  }
});

test("T7.7- 秘密らしい位置の出典と通常の出典が食い違っても、その位置を指す候補の参照では選択を作れず、位置はどこにも写らない", () => {
  for (const secret of SECRET_LOCATORS) {
    const observed = observeWith(CATALOG, readsWithPinAt(secret, withContent(goodReads(), "workflow_caller", callerText(OID_B))));
    const draft = builtDraft({ observedItems: observed.items });
    const refused = createSelection(draft, { candidateRef: `sds_commit@sds_pin:${secret}` });
    assert.notEqual(refused.status, "created", secret);
    assert.equal(everywhere(secret, draft, refused), true, secret);
  }
});
