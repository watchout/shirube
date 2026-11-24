// The CI-cost pattern for a repository's ci.yml, checked by machine (CI-COST-REDUCE). Text-based, read-only, fail closed:
// a file it cannot read as the expected shape is a FAIL (P7), never a pass. It judges the file's text only; it runs nothing.
//   P1 a pull request's older run is cancelled and a push to main is not     P2 every setup-node step caches its dependencies
//   (P2 asks only a job that installs dependencies.)
//   P3 the required check names stay                                        P4 a required job has no job-level if
//   P5 no paths / paths-ignore filter (a required check would stay pending)  P6 ci-scope is pinned to a commit and guards a step
//   P7 the file is readable and has jobs and required names
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const finding = (id, message) => ({ id, message });
const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");

// jobs: id, displayed name (name: when present, else the id), job-level if, and the step chunks (a step starts with "- " under steps:).
function parseJobs(lines) {
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start < 0) return [];
  const jobs = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const header = /^ {2}([\w-]+):\s*$/.exec(line);
    if (header) jobs.push({ id: header[1], lines: [] });
    else if (jobs.length) jobs.at(-1).lines.push(line);
  }
  return jobs.map((job) => {
    const name = job.lines.map((line) => /^ {4}name:\s*(.+)$/.exec(line)?.[1]).find(Boolean);
    return { ...job, shown: name ? unquote(name) : job.id, hasIf: job.lines.some((line) => /^ {4}if:/.test(line)), reusable: job.lines.some((line) => /^ {4}uses:/.test(line)), steps: stepChunks(job.lines) };
  });
}

function stepChunks(lines) {
  const at = lines.findIndex((line) => /^ +steps:\s*$/.test(line));
  if (at < 0) return null;
  const dash = `${" ".repeat(lines[at].search(/\S/) + 2)}- `;
  const chunks = [];
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith(dash)) chunks.push([line]);
    else if (chunks.length) chunks.at(-1).push(line);
  }
  return chunks.map((chunk) => chunk.join("\n"));
}

const p1 = (lines) => {
  const values = lines.filter((line) => /^\s*cancel-in-progress:/.test(line));
  const ok = values.length > 0 && values.every((line) => /pull_request/.test(line));
  return ok ? [] : [finding("P1", "cancel-in-progress must exist and be true only for a pull_request (never for a push to main)")];
};
const INSTALL = /run:\s*(?:npm (?:ci|install)|bun install|pnpm install|yarn install)\b/;
// Only a job that installs dependencies has anything to cache; a job that runs a script with no install is not asked for a cache.
const p2 = (jobs) => jobs.filter((job) => (job.steps ?? []).some((step) => INSTALL.test(step))).flatMap((job) => job.steps.filter((step) => /uses:\s*actions\/setup-node@/.test(step) && !/^\s+cache:\s*\S/m.test(step)).map(() => finding("P2", `job ${job.id}: installs dependencies but a setup-node step has no cache:`)));
const p3 = (jobs, required) => required.filter((name) => !jobs.some((job) => job.shown === name || job.shown.startsWith(`${name} (`))).map((name) => finding("P3", `no job shows the required check name ${JSON.stringify(name)}`));
const p4 = (jobs, required) => jobs.filter((job) => job.hasIf && required.some((name) => job.shown === name || job.shown.startsWith(`${name} (`))).map((job) => finding("P4", `job ${job.id} is required and has a job-level if`));
const p5 = (lines, jobsAt) => lines.slice(0, jobsAt).some((line) => /^\s+paths(?:-ignore)?:/.test(line)) ? [finding("P5", "a paths or paths-ignore filter leaves a required check pending")] : [];

function p6(jobs) {
  const found = [];
  for (const job of jobs) {
    const scopeSteps = (job.steps ?? []).filter((step) => /uses:\s*\S*ci-scope@/.test(step));
    for (const step of scopeSteps) {
      const id = /^\s+(?:- )?id:\s*(\S+)/m.exec(step)?.[1];
      if (!/ci-scope@[0-9a-f]{40}\s*$/m.test(step)) found.push(finding("P6", `job ${job.id}: ci-scope must be pinned to a 40-hex commit`));
      if (!id) found.push(finding("P6", `job ${job.id}: the ci-scope step needs an id to read its answer`));
      else if (!job.steps.some((other) => other !== step && new RegExp(`^\\s+(?:- )?if:.*steps\\.${id}\\.outputs\\.scope == 'code'`, "m").test(other))) found.push(finding("P6", `job ${job.id}: no step runs only when ${id}'s scope is 'code'`));
    }
  }
  return found;
}

export function checkPattern(text, { required } = {}) {
  const fail = (findings) => ({ verdict: findings.length ? "FAIL" : "PASS", findings });
  if (typeof text !== "string" || text.trim() === "") return fail([finding("P7", "the file is empty or unreadable")]);
  if (!Array.isArray(required) || required.length === 0 || !required.every((name) => typeof name === "string" && name !== "")) return fail([finding("P7", "give the required check names (--required a,b)")]);
  const lines = text.split("\n");
  const jobs = parseJobs(lines);
  const bad = jobs.filter((job) => !job.reusable && !job.steps);
  if (jobs.length === 0 || bad.length) return fail([finding("P7", jobs.length === 0 ? "no jobs were found" : `job ${bad[0].id} has neither steps nor a reusable workflow`)]);
  const jobsAt = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  return fail([...p1(lines), ...p2(jobs), ...p3(jobs, required), ...p4(jobs, required), ...p5(lines, jobsAt), ...p6(jobs)]);
}

function cli(argv) {
  const [file, flag, names] = argv;
  if (!file || flag !== "--required" || !names || argv.length !== 3) throw new Error("usage: pattern-check.mjs <ci.yml> --required <name,name,...>");
  return checkPattern(readFileSync(file, "utf8"), { required: names.split(",").map((name) => name.trim()) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = cli(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify({ check: "ci-pattern", ...result })}\n`);
    if (result.verdict !== "PASS") process.exitCode = 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ check: "ci-pattern", verdict: "ERROR", reason: error.message })}\n`);
    process.exitCode = 2;
  }
}
