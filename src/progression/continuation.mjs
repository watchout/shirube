// Shirube U2 continuation (progression-contract §5). PRE-IMPLEMENTATION PLACEHOLDER.
// It reproduces the defect PC-01..04 describe: the LLM reply is kept, but nothing records,
// sends, reconciles or recovers the next action. The U2 tests must fail against it (Red).
// Contract: docs/design/shirube-v1-progression-contract.md @ 5be3527682c28982ff3475abc793771dcb091859 §3/§5/§7.

export function createProgression({ store }) {
  return {
    record(fact) {
      if (fact.type === "llm_reply") store.replies.push(fact.text);
    },
    tick() {},
    recover() {},
    status(workId) {
      const attempt = store.attempts.findLast((a) => a.work === workId);
      return { state: attempt?.state ?? "PLANNED", nextAction: null, unconfirmed: false };
    },
  };
}
