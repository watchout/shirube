// NFR3 / TD-5: the 100% line floor on the checker is measured here, from the lcov that Node itself prints for the tests,
// not copied by hand. Unmeasured, zero lines, a failed child or an unreadable report all fail. The only lines allowed to stay
// uncovered are two ranges named by the SHA-256 of their content (not by line number), so a changed range fails.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)), TARGET = "scripts/hygiene/audit-admission.mjs";
// R1: the `gh api` wrapper (needs a real GitHub). R2: the command-line entry body (needs a real process). Content hashes of the base file.
const ALLOWED = new Set(["93804d44400ca198f8bda0061dda2ee0e5f0f7d6682edcd63e46bfc7e71a4ae7", "c9424673d1663dae3b883f57e814e4342fc09ea3d2e0ba7a48a3594f947abf08"]);
const SUITE = ["tests/audit-admission.test.mjs", "tests/audit-counterexamples.test.mjs", "tests/audit-intake-extra.test.mjs", "tests/audit-intake-extra-proof.test.mjs", "tests/audit-intake-extra-derive.test.mjs"];
const sha = (s) => createHash("sha256").update(s).digest("hex");

// The DA lines of the target's record: [line, hits]. Returns null when the report has no record or no counts for the target.
function lineCounts(lcov) {
  const rec = lcov.split("end_of_record").find((r) => new RegExp(`^SF:${TARGET.replaceAll(".", "\\.")}$`, "m").test(r));
  const lines = rec ? [...rec.matchAll(/^DA:(\d+),(\d+)/gm)].map((m) => [Number(m[1]), Number(m[2])]) : [];
  const lf = /^LF:(\d+)$/m.exec(rec ?? ""), lh = /^LH:(\d+)$/m.exec(rec ?? "");
  return lines.length > 0 && lf && lh && Number(lf[1]) === lines.length ? { lines, hit: Number(lh[1]) } : null;
}
// Groups the uncovered line numbers into runs of consecutive lines.
function runs(zero) {
  return zero.reduce((acc, n) => { const last = acc.at(-1); (last && last.at(-1) === n - 1 ? last : acc[acc.push([]) - 1]).push(n); return acc; }, []);
}
// reasons = why the floor is not met; empty means met.
export function judge(lcov, source) {
  const counts = lineCounts(lcov);
  if (!counts) return ["no readable line counts for the checker (unmeasured or unknown report format)"];
  const zero = counts.lines.filter(([, hits]) => hits === 0).map(([n]) => n), text = source.split("\n"), why = [];
  if (counts.hit !== counts.lines.length - zero.length) why.push("LH does not equal the lines with hits");
  for (const run of runs(zero)) if (!ALLOWED.has(sha(text.slice(run[0] - 1, run.at(-1)).join("\n")))) why.push(`uncovered lines ${run[0]}-${run.at(-1)} are not an allowed range`);
  return why;
}
export function childFailure(result) {
  return result.error || result.signal || result.status !== 0 ? `child failed: ${result.error?.message ?? result.signal ?? result.status}` : null;
}
const lcovFor = (source, zeros) => `TN:\nSF:${TARGET}\n${source.split("\n").map((_, i) => `DA:${i + 1},${zeros.includes(i + 1) ? 0 : 1}`).join("\n")}\nLF:${source.split("\n").length}\nLH:${source.split("\n").length - zeros.length}\nend_of_record\n`;
const SOURCE = readFileSync(new URL(`../${TARGET}`, import.meta.url), "utf8");
const at = (needle) => SOURCE.split("\n").findIndex((l) => l.startsWith(needle)) + 1;

test("NFR3.4: the checker's lines are all covered except the two named ranges (measured by a child process)", () => {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; // a child that inherits it would not run as a test runner
  const args = ["--test", "--experimental-test-coverage", `--test-coverage-include=${TARGET}`, "--test-reporter=lcov", ...SUITE];
  const res = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: "utf8", timeout: 180000, maxBuffer: 64e6 });
  assert.equal(childFailure(res), null, res.stderr);
  assert.deepEqual(judge(res.stdout, SOURCE), []);
});

test("NFR3.5 negative: the judge refuses an uncovered line, a changed allowed range, a merged range, and no or odd reports", () => {
  const gh = at("function github("), cli = at("if (process.argv[1]"), allowed = [gh, gh + 1, gh + 2, gh + 3, cli + 1, cli + 2, cli + 3];
  assert.deepEqual(judge(lcovFor(SOURCE, allowed), SOURCE), []);
  assert.equal(judge(lcovFor(SOURCE, [...allowed, 10]), SOURCE).length, 1);
  assert.equal(judge(lcovFor(SOURCE, [...allowed, gh + 4]), SOURCE).length, 1);
  assert.equal(judge(lcovFor(SOURCE, allowed.slice(1)), SOURCE).length, 1);
  assert.equal(judge(lcovFor(SOURCE, allowed), SOURCE.replace("gh", "xx")).length, 1);
  for (const lcov of ["", "garbage", `TN:\nSF:other.mjs\nDA:1,1\nLF:1\nLH:1\nend_of_record\n`, `SF:${TARGET}\nLF:0\nLH:0\nend_of_record\n`, `SF:${TARGET}\nDA:1,1\nend_of_record\n`, `SF:${TARGET}\nDA:1,1\nLF:2\nLH:1\nend_of_record\n`]) {
    assert.ok(judge(lcov, SOURCE).length > 0, lcov);
  }
  assert.ok(judge(lcovFor(SOURCE, allowed).replace(/LH:\d+/, "LH:1"), SOURCE).length > 0);
});

test("NFR3.5 negative: a child that failed, timed out, was killed or could not start is a failure", () => {
  assert.equal(childFailure({ status: 0 }), null);
  for (const res of [{ status: 1 }, { status: null, signal: "SIGTERM" }, { status: null, error: new Error("ETIMEDOUT") }]) assert.match(childFailure(res), /child failed/);
});
