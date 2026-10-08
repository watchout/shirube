// Shirube U2 continuation core (progression-contract §3/§5/§7 @ 5be3527682c28982ff3475abc793771dcb091859).
// Design: docs/design/shirube-v1-u2-detailed-design.md (PR35, head 207d426f) §3〜§8.
// Ports only: store, executor, clock. No LLM, CLI or GitHub calls. The LLM reply is kept as text
// and never changes state. Physical schema, transactions and the executor's "not_started is
// final" contract are not fixed yet, so this core never re-sends on not_started (§5.2-3).

const IN_FLIGHT = new Set(["sending", "sent", "unknown"]);
const STOP_AFTER = 3; // consecutive non-progress backstop (contract §5)
const EXECUTION_OWNER = "execution-manager"; // 実行管理担当 (contract §4 / §5-6)

const requestIdOf = (action) => `R:${action.id}`;

const BLOCK_DETAIL = {
  WAITING: (w, deps) => ({ owner: "dependency", releaseCondition: `VERIFIED: ${deps.join(", ")}` }),
  HUMAN_REQUIRED: (w) => ({ owner: "human", releaseCondition: `answer to the question for ${w.id}` }),
  UNRESOLVED: (w) => ({ owner: "decision-owner", releaseCondition: `a decision that covers ${w.id}` }),
  CONTRACT_MISSING: (w) => ({ owner: "connection-contract", releaseCondition: `start deadline fixed for ${w.id}` }),
};

export function createProgression({ store, executor, clock }) {
  const latestAttempt = (work) => store.attempts.findLast((a) => a.work === work);
  const startOf = (attempt) =>
    store.nextActions.find((n) => n.attempt === attempt.id && n.kind === "start");

  function evaluate(work) {
    const deps = work.dependsOn.map(latestAttempt);
    if (deps.some((a) => a?.state !== "VERIFIED")) return "WAITING";
    if (work.needsHuman) return "HUMAN_REQUIRED";
    if (!work.decision) return "UNRESOLVED";
    if (!Number.isFinite(work.startDeadlineMs)) return "CONTRACT_MISSING";
    return "ELIGIBLE";
  }

  // One record per Work, overwritten in place: why it does not start and what releases it (§5.4/§7).
  function block(work, verdict) {
    if (verdict === "ELIGIBLE") {
      store.blocks.delete(work.id);
      return;
    }
    const waitingOn = work.dependsOn.filter((id) => latestAttempt(id)?.state !== "VERIFIED");
    store.blocks.set(work.id, { work: work.id, reason: verdict, ...BLOCK_DETAIL[verdict](work, waitingOn) });
  }

  function ask(work) {
    const key = `${work.id}:${work.decision ?? "none"}`;
    if (store.questions.some((q) => q.key === key)) return;
    store.questions.push({ key, work: work.id, at: clock.now() });
  }

  function open(work) {
    if (latestAttempt(work.id)) return;
    const attempt = { id: `A-${work.id}-1`, work: work.id, state: "START_REQUESTED" };
    const action = { id: `N-${work.id}-1`, work: work.id, attempt: attempt.id, kind: "start",
      status: "recorded", nonProgress: 0 };
    store.attempts.push(attempt);
    store.nextActions.push(action);
  }

  function send(action) {
    action.status = "sending"; // saved before the executor sees it (§4.1 ①)
    action.sentAt = clock.now();
    let result;
    try {
      result = executor.send({ id: requestIdOf(action), work: action.work, attempt: action.attempt,
        kind: action.kind });
    } catch {
      result = undefined;
    }
    if (result?.accepted === true) action.status = "sent";
    else if (result?.accepted === false) action.status = "rejected";
    else action.status = "unknown";
  }

  function reconcileAction(start) {
    const key = `${start.id}:reconcile`;
    let action = store.nextActions.find((n) => n.key === key);
    if (!action) {
      action = { id: `N-${start.work}-reconcile`, key, work: start.work, attempt: start.attempt,
        kind: "reconcile", request: requestIdOf(start), nonProgress: 0 };
      store.nextActions.push(action);
    }
    return action;
  }

  // Every accepted start (query answer or executor observation) also closes that start's reconcile; its query
  // history (lastAnswer, nonProgress) is kept.
  function markStarted(attemptId) {
    const attempt = store.attempts.find((a) => a.id === attemptId);
    if (attempt.state === "START_REQUESTED") attempt.state = "RUNNING";
    const start = startOf(attempt);
    if (!start) return;
    start.status = "started";
    const reconcile = store.nextActions.find((n) => n.key === `${start.id}:reconcile`);
    if (reconcile) reconcile.status = "done";
  }

  function query(start) {
    const action = reconcileAction(start);
    let answer;
    try {
      const reply = executor.query(requestIdOf(start));
      answer = reply?.request === requestIdOf(start) ? reply.state : "unmatched";
    } catch {
      answer = "unreachable";
    }
    action.lastAnswer = answer;
    if (answer === "running") {
      markStarted(start.attempt);
      return;
    }
    action.unconfirmed = true;
    action.owner = EXECUTION_OWNER;
    action.target = executor.id;
    action.releaseCondition = `${executor.id} answers query(${requestIdOf(start)}) with a definitive state`;
    action.nonProgress += 1;
    if (action.nonProgress >= STOP_AFTER) action.status = "stopped";
  }

  const pendingStarts = (pred) =>
    store.nextActions.filter((n) => n.kind === "start" && pred(n) && latestAttempt(n.work)?.state === "START_REQUESTED");

  function overdue(start) {
    const work = store.works.get(start.work);
    return clock.now() - start.sentAt > work.startDeadlineMs;
  }

  function reconcileStopped(start) {
    return store.nextActions.some((n) => n.key === `${start.id}:reconcile` && n.status === "stopped");
  }

  function tick(queried = new Set()) {
    const verdicts = new Map();
    for (const work of store.works.values()) {
      const verdict = evaluate(work);
      verdicts.set(work.id, verdict);
      block(work, verdict);
      if (verdict === "ELIGIBLE") open(work);
      else if (verdict === "HUMAN_REQUIRED") ask(work);
    }
    for (const action of pendingStarts((n) => n.status === "recorded")) {
      if (verdicts.get(action.work) === "ELIGIBLE") send(action); // else kept unsent; the block says why
    }
    for (const start of pendingStarts((n) => IN_FLIGHT.has(n.status))) {
      if (!queried.has(start.id) && overdue(start) && !reconcileStopped(start)) query(start);
    }
  }

  function recover() {
    const queried = new Set();
    for (const start of pendingStarts((n) => IN_FLIGHT.has(n.status))) {
      if (reconcileStopped(start)) continue;
      query(start); // query before any re-send (§5.3-1)
      queried.add(start.id);
    }
    tick(queried);
  }

  function applyObservation(fact) {
    const start = store.nextActions.find((n) => n.kind === "start" && requestIdOf(n) === fact.request);
    const key = `${fact.issuer}|${fact.request}|${fact.kind}|${fact.report ?? ""}`;
    const duplicate = store.observations.some((o) => o.key === key);
    const accepted = Boolean(start) && fact.issuer === executor.id && !duplicate;
    store.observations.push({ ...fact, key, held: !accepted });
    if (!accepted) return;
    if (fact.kind === "started") markStarted(start.attempt);
    if (fact.kind === "finished") {
      const attempt = store.attempts.find((a) => a.id === start.attempt);
      if (attempt.state === "RUNNING") attempt.state = "RESULT_RECEIVED";
    }
  }

  function record(fact) {
    if (fact.type === "llm_reply") store.replies.push(fact.text);
    else if (fact.type === "observation") applyObservation(fact);
    // verified / decision_answered need the condition check (contract §2.1) and the answer
    // entry point (iyasaka-arc#57), which are not fixed; refuse instead of guessing.
    else throw new Error(`unsupported fact type: ${fact.type}`);
  }

  function status(workId) {
    const attempt = latestAttempt(workId);
    const actions = store.nextActions.filter((n) => n.work === workId && n.status !== "done");
    const reconcile = actions.find((n) => n.kind === "reconcile");
    const nextAction = reconcile ?? actions.at(-1) ?? null;
    return { state: attempt?.state ?? "PLANNED", nextAction, unconfirmed: Boolean(reconcile?.unconfirmed),
      stopped: reconcile?.status === "stopped", blocked: store.blocks.get(workId) ?? null };
  }

  return { record, tick: () => tick(), recover, status };
}
