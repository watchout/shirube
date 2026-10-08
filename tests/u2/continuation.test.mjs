// U2 PC-01..04 (progression-contract §7 @ 5be3527) — written before the implementation (Red).
// Uses MOCK doubles only (tests/u2/doubles.mjs); passing here is not acceptance of the real
// DB/CLI/common connection, which stays NOT_RUN.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProgression } from "../../src/progression/continuation.mjs";
import { EXECUTOR, clock, executor, plan, sentFor, startsFor, store, verifiedW1 } from "./doubles.mjs";

function setup(opts = {}) {
  const s = store(plan());
  const ex = executor(opts);
  const c = clock();
  return { s, ex, c, p: createProgression({ store: s, executor: ex, clock: c }) };
}

test("PC-01: a bare '進みます' still leads to a recorded, sent and observed start without a human command", () => {
  const { s, ex, p } = setup();
  verifiedW1(s);
  p.record({ type: "llm_reply", text: "進みます" });
  p.tick();
  assert.equal(startsFor(s, "W2").length, 1, "one start NextAction for W2");
  assert.equal(sentFor(ex, "W2").length, 1, "start request sent to the executor");
  assert.equal(s.questions.filter((q) => q.work === "W2").length, 0, "no extra start question for W2 (W3's own question is PC-04)");
  assert.equal(p.status("W2").state, "START_REQUESTED", "sent is not running");
  const [request] = sentFor(ex, "W2");
  p.record({ type: "observation", issuer: EXECUTOR, request: request.id, kind: "ack" });
  assert.equal(p.status("W2").state, "START_REQUESTED", "ACK alone is not a start");
  p.record({ type: "observation", issuer: EXECUTOR, request: request.id, kind: "started" });
  assert.equal(p.status("W2").state, "RUNNING");
});

test("PC-01 negative: text without a verified predecessor starts nothing", () => {
  const { s, ex, p } = setup();
  p.record({ type: "llm_reply", text: "W1 は完了しました。進みます" });
  p.tick();
  assert.equal(startsFor(s, "W2").length, 0);
  assert.equal(sentFor(ex, "W2").length, 0);
  assert.equal(p.status("W2").state, "PLANNED");
});

function startedRequest(opts) {
  const ctx = setup(opts);
  verifiedW1(ctx.s);
  ctx.p.tick();
  const [request] = sentFor(ctx.ex, "W2");
  assert.ok(request, "precondition: W2 start was sent");
  ctx.p.record({ type: "observation", issuer: EXECUTOR, request: request.id, kind: "ack" });
  return { ...ctx, request };
}

test("PC-02: ACK without a real start past the deadline goes to reconcile, not RUNNING", () => {
  const { s, ex, c, p, request } = startedRequest();
  c.advance(60_001);
  p.tick();
  assert.notEqual(p.status("W2").state, "RUNNING");
  assert.equal(s.nextActions.filter((n) => n.work === "W2" && n.kind === "reconcile").length, 1);
  // W4 (independent, also started in this fixture) is reconciled too; check W2's own query.
  assert.deepEqual(ex.queries.filter((id) => id === request.id), [request.id], "W2's request is queried once");
  assert.ok(ex.queries.every((id) => ex.requests.some((r) => r.id === id)), "only already-sent requests are queried");
  assert.equal(sentFor(ex, "W2").length, 1, "no new start id");
});

test("PC-02: unreachable executor shows unconfirmed with owner and release condition", () => {
  const { c, p } = startedRequest({ queryFails: true });
  c.advance(60_001);
  p.tick();
  const st = p.status("W2");
  assert.equal(st.unconfirmed, true);
  assert.ok(st.nextAction?.owner, "next owner named");
  assert.ok(st.nextAction?.releaseCondition, "release condition named");
});

test("PC-02 negative: a start claimed by a non-executor issuer is not RUNNING", () => {
  const { p, request } = startedRequest();
  p.record({ type: "observation", issuer: "llm:self-report", request: request.id, kind: "started" });
  assert.notEqual(p.status("W2").state, "RUNNING");
});

function restart(s, ex, c) {
  return createProgression({ store: s, executor: ex, clock: c });
}

test("PC-03: stop between verification and NextAction save is recovered once", () => {
  const { s, ex, c } = setup();
  verifiedW1(s); // stopped here: no NextAction saved yet
  const p = restart(s, ex, c);
  p.recover();
  p.recover();
  assert.equal(startsFor(s, "W2").length, 1);
  assert.equal(sentFor(ex, "W2").length, 1);
});

test("PC-03: stop after NextAction save, before sending, sends exactly once", () => {
  const { s, ex, c } = setup();
  verifiedW1(s);
  s.attempts.push({ id: "A-W2-1", work: "W2", state: "START_REQUESTED" });
  s.nextActions.push({ id: "N-W2-1", work: "W2", attempt: "A-W2-1", kind: "start", status: "recorded" });
  const p = restart(s, ex, c);
  p.recover();
  p.recover();
  assert.equal(sentFor(ex, "W2").length, 1);
  assert.equal(startsFor(s, "W2").length, 1, "no second NextAction");
});

test("PC-03: stop after the real start never starts twice", () => {
  const { s, ex, c } = setup();
  verifiedW1(s);
  s.attempts.push({ id: "A-W2-1", work: "W2", state: "RUNNING" });
  s.nextActions.push({ id: "N-W2-1", work: "W2", attempt: "A-W2-1", kind: "start", status: "started" });
  const p = restart(s, ex, c);
  p.recover();
  assert.equal(sentFor(ex, "W2").length, 0);
  assert.equal(startsFor(s, "W2").length, 1);
  assert.equal(p.status("W2").state, "RUNNING");
});

// PC-03 stop points added with Green (U2 design §8/§9): the record says "sending" or "sent",
// so recover() must query the same request before any send, and must not send again.
function inFlight(status, { delivered }) {
  const { s, ex, c } = setup();
  verifiedW1(s);
  s.attempts.push({ id: "A-W2-1", work: "W2", state: "START_REQUESTED" });
  s.nextActions.push({ id: "N-W2-1", work: "W2", attempt: "A-W2-1", kind: "start", status, sentAt: c.now() });
  if (delivered) ex.requests.push({ id: "R:N-W2-1", work: "W2", attempt: "A-W2-1", kind: "start" });
  const sendsBefore = sentFor(ex, "W2").length;
  const p = restart(s, ex, c);
  const order = [];
  const { send, query } = ex;
  ex.send = (r) => { order.push(`send:${r.id}`); return send(r); };
  ex.query = (id) => { order.push(`query:${id}`); return query(id); };
  p.recover();
  p.recover();
  return { s, ex, p, order, sendsBefore };
}

for (const [label, status, delivered] of [
  ["after saving 'sending', before send", "sending", false],
  ["after send was accepted, before saving the result", "sending", true],
  ["after saving the send result", "sent", true],
]) {
  test(`PC-03: stop ${label} queries first and never sends again`, () => {
    const { s, ex, p, order, sendsBefore } = inFlight(status, { delivered });
    assert.equal(order[0], "query:R:N-W2-1", "the same request is queried first");
    assert.equal(order.filter((o) => o.startsWith("send:R:N-W2")).length, 0, "no send for W2 after restart");
    assert.equal(sentFor(ex, "W2").length, sendsBefore, "executor send count unchanged");
    assert.equal(startsFor(s, "W2").length, 1, "no second NextAction");
    assert.notEqual(p.status("W2").state, "RUNNING", "not_started is not a start");
    assert.equal(p.status("W2").unconfirmed, true);
  });
}

test("PC-04: one question for the human-gated work, the independent work still starts", () => {
  const { s, ex, p } = setup();
  p.tick();
  p.tick();
  p.tick();
  assert.equal(s.questions.filter((q) => q.work === "W3").length, 1, "asked once");
  assert.equal(sentFor(ex, "W3").length, 0, "no empty run while waiting");
  assert.equal(s.holds.length, 0, "no periodic hold records");
  assert.equal(sentFor(ex, "W4").length, 1, "independent W4 proceeds");
  assert.equal(sentFor(ex, "W2").length, 0, "W2 still waits for W1");
});
