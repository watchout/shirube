// The current stage k of a delivery plan (iyasaka-arc#57 6306257668 §3.3): the lowest stage that still has a terminal acceptance ID
// the Owner has not accepted (terminal_acceptance.satisfied_predicates). A COMPLETE node is work done, not acceptance, so it never counts.
// Pure: no clock, randomness, environment or network (S4). What cannot be read, or contradicts itself, throws a reason (S8).
const STAGE = /^S([1-4])-/;
function ids(list, what, pick = (x) => x) {
  if (!Array.isArray(list)) throw new Error(`${what} must be an array`);
  return list.map((x) => {
    const id = pick(x);
    if (typeof id !== "string") throw new Error(`${what} has an entry without a string id`);
    return id;
  });
}
function stageOf(id) {
  const m = STAGE.exec(id);
  if (!m) throw new Error(`${id} has no stage prefix S1- to S4-`);
  return Number(m[1]);
}
// "S1".."S4", or null when every terminal predicate is satisfied (the plan is closed).
export function currentStage(plan) {
  const terminal = ids(plan?.owner_outcome?.terminal_predicates, "owner_outcome.terminal_predicates", (x) => x?.id);
  const stages = terminal.map(stageOf); // every terminal ID has a stage prefix, satisfied or not
  const done = ids(plan?.terminal_acceptance?.satisfied_predicates ?? [], "terminal_acceptance.satisfied_predicates");
  const stray = done.find((id) => !terminal.includes(id));
  if (stray !== undefined) throw new Error(`satisfied_predicates names ${stray}, which is not a terminal predicate`);
  const open = stages.filter((_, i) => !done.includes(terminal[i]));
  return open.length === 0 ? null : `S${Math.min(...open)}`;
}
