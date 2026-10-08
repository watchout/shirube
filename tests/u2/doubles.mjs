// MOCK test doubles for U2 (in-memory store, executor and clock).
// NOT acceptance evidence: the real PostgreSQL store, the common contract (Onza 0.2),
// the CLI/AUN executor and their failure modes are NOT_RUN. These doubles only let the
// PC-01..04 expectations run before the real connections are fixed (SDS-V2 §6 test-first).

export const EXECUTOR = "executor:local-mock";

export function store(works) {
  return {
    works: new Map(works.map((w) => [w.id, w])),
    attempts: [],
    nextActions: [],
    questions: [],
    observations: [],
    replies: [],
    holds: [],
  };
}

export function executor({ queryFails = false } = {}) {
  const requests = [];
  const queries = [];
  return {
    id: EXECUTOR,
    requests,
    queries,
    send(request) {
      requests.push(request);
      return { accepted: true, request: request.id };
    },
    query(requestId) {
      queries.push(requestId);
      if (queryFails) throw new Error("executor unreachable (mock)");
      return { request: requestId, state: "not_started" };
    },
  };
}

export function clock(start = Date.parse("2026-10-07T10:00:00Z")) {
  let now = start;
  return { now: () => now, advance: (ms) => { now += ms; } };
}

// Plan fixture: W1 is done, W2 follows W1 inside an existing decision, W3 needs a person,
// W4 is independent and ready. startDeadlineMs is fixture data, not a chosen product value.
export function plan() {
  return [
    { id: "W1", dependsOn: [], decision: "D-1", needsHuman: false, startDeadlineMs: 60_000 },
    { id: "W2", dependsOn: ["W1"], decision: "D-1", needsHuman: false, startDeadlineMs: 60_000 },
    { id: "W3", dependsOn: [], decision: null, needsHuman: true, startDeadlineMs: 60_000 },
    { id: "W4", dependsOn: [], decision: "D-1", needsHuman: false, startDeadlineMs: 60_000 },
  ];
}

// W1 verified through condition-level checks (§2.1): every required condition PASS.
export function verifiedW1(s) {
  s.attempts.push({ id: "A-W1-1", work: "W1", state: "VERIFIED",
    conditions: [{ id: "C1", result: "PASS", checker: "devauditor" }] });
}

export const startsFor = (s, work) => s.nextActions.filter((n) => n.work === work && n.kind === "start");
export const sentFor = (ex, work) => ex.requests.filter((r) => r.work === work && r.kind === "start");
