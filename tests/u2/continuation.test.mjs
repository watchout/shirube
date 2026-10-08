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

// PC-03 stop points (U2 design §8/§9), taken from the real send path: the store is copied at the
// moment the core calls executor.send for W2 (before or after the executor accepts it) or after the
// result is saved, and a new core recovers from that copy.
function stopDuringSend(point) {
  const { s, ex, c, p } = setup();
  verifiedW1(s);
  let copy;
  const { send } = ex;
  ex.send = (r) => {
    if (r.work === "W2" && point === "before send") copy = structuredClone(s);
    const result = send(r);
    if (r.work === "W2" && point === "accepted, before result") copy = structuredClone(s);
    return result;
  };
  p.tick();
  if (point === "after result") copy = structuredClone(s);
  const ex2 = executor();
  if (point !== "before send") ex2.requests.push(...ex.requests.filter((r) => r.work === "W2"));
  const order = [];
  const { send: send2, query } = ex2;
  ex2.send = (r) => { order.push(`send:${r.id}`); return send2(r); };
  ex2.query = (id) => { order.push(`query:${id}`); return query(id); };
  const before = sentFor(ex2, "W2").length;
  const p2 = restart(copy, ex2, c);
  p2.recover();
  p2.recover();
  return { copy, ex2, p2, order, before };
}

for (const point of ["before send", "accepted, before result", "after result"]) {
  test(`PC-03: stop ${point} (taken from the send path) queries first and never sends again`, () => {
    const { copy, ex2, p2, order, before } = stopDuringSend(point);
    assert.equal(order[0], "query:R:N-W2-1", "the same request is queried first");
    assert.equal(order.filter((o) => o === "send:R:N-W2-1").length, 0, "no send for W2 after restart");
    assert.equal(sentFor(ex2, "W2").length, before, "executor send count unchanged");
    assert.equal(startsFor(copy, "W2").length, 1, "no second NextAction");
    assert.equal(p2.status("W2").state, "START_REQUESTED", "not_started is not a start");
    assert.equal(p2.status("W2").unconfirmed, true);
  });
}

// F01: a query answer moves W2 to RUNNING only when it names the stored request.
for (const [label, reply, running] of [
  ["the same request", (id) => ({ request: id, state: "running" }), true],
  ["another request", () => ({ request: "R:another", state: "running" }), false],
  ["no request", () => ({ state: "running" }), false],
]) {
  test(`PC-02: a running answer for ${label} ${running ? "is" : "is not"} a start`, () => {
    const { ex, c, p } = startedRequest();
    ex.query = (id) => { ex.queries.push(id); return reply(id); };
    c.advance(60_001);
    p.tick();
    assert.equal(p.status("W2").state === "RUNNING", running);
    assert.equal(p.status("W2").unconfirmed, !running);
  });
}

// F02: a recorded, unsent start is re-checked against the current conditions before it is sent.
for (const [label, change, sends] of [
  ["conditions unchanged", () => {}, 1],
  ["W2 now needs a person", (s) => { s.works.get("W2").needsHuman = true; }, 0],
  ["W2 lost its decision", (s) => { s.works.get("W2").decision = null; }, 0],
  ["W2 has no start deadline", (s) => { delete s.works.get("W2").startDeadlineMs; }, 0],
  ["W1 was returned", (s) => { s.attempts[0].state = "RETURNED"; }, 0],
]) {
  test(`PC-03: recovering an unsent start with ${label} sends ${sends}`, () => {
    const { s, ex, c } = setup();
    verifiedW1(s);
    s.attempts.push({ id: "A-W2-1", work: "W2", state: "START_REQUESTED" });
    s.nextActions.push({ id: "N-W2-1", work: "W2", attempt: "A-W2-1", kind: "start", status: "recorded" });
    change(s);
    const p = restart(s, ex, c);
    p.recover();
    assert.equal(sentFor(ex, "W2").length, sends);
    assert.equal(p.status("W2").blocked === null, sends === 1, "a held start shows why");
  });
}

// F04: unconfirmed answers that change label are still non-progress; the stop survives a restart.
for (const [label, answers] of [["unknown only", ["unknown"]], ["unknown / not_started", ["unknown", "not_started"]]]) {
  test(`PC-14: ${label} answers stop the reconcile after 3 queries`, () => {
    const asked = new Map(); // alternate per request: W4 is reconciled in the same ticks
    const answer = (id) => { asked.set(id, (asked.get(id) ?? -1) + 1); return answers[asked.get(id) % answers.length]; };
    const { s, ex, c, p, request } = startedRequest({ answer });
    c.advance(60_001);
    for (let i = 0; i < 6; i += 1) p.tick();
    const w2 = () => ex.queries.filter((id) => id === request.id).length;
    assert.equal(w2(), 3);
    assert.equal(p.status("W2").stopped, true);
    restart(s, ex, c).recover();
    assert.equal(w2(), 3, "no query after restart once stopped");
  });
}

// F05: a Work that does not start says why and what releases it.
test("status: each reason a Work does not start is kept with its release condition", () => {
  const { s, p } = setup();
  s.works.get("W4").decision = null;
  s.works.set("W5", { id: "W5", dependsOn: [], decision: "D-1", needsHuman: false });
  p.tick();
  const reasons = ["W2", "W3", "W4", "W5"].map((w) => p.status(w).blocked);
  assert.deepEqual(reasons.map((b) => b.reason), ["WAITING", "HUMAN_REQUIRED", "UNRESOLVED", "CONTRACT_MISSING"]);
  assert.ok(reasons.every((b) => b.owner && b.releaseCondition));
  assert.equal(p.status("W1").blocked, null);
});

// F06: a valid started observation after unconfirmed reconciles closes the reconcile, also after a restart.
for (const [label, ticks, issuer, running] of [
  ["after one unconfirmed query", 1, EXECUTOR, true],
  ["after the reconcile stopped", 3, EXECUTOR, true],
  ["from another issuer", 1, "llm:self-report", false],
]) {
  test(`PC-02: a started observation ${label} ${running ? "closes the reconcile" : "leaves it unconfirmed"}`, () => {
    const { s, ex, c, p, request } = startedRequest();
    c.advance(60_001);
    for (let i = 0; i < ticks; i += 1) p.tick();
    p.record({ type: "observation", issuer, request: request.id, kind: "started", report: "valid-start-1" });
    const p2 = restart(structuredClone(s), ex, c);
    p2.recover();
    p2.tick();
    const st = p2.status("W2");
    assert.equal(st.state === "RUNNING", running);
    assert.equal(st.unconfirmed, !running);
    if (running) assert.equal(st.stopped, false);
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
