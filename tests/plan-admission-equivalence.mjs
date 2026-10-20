// KIT-ADF E PR-3 comparison tool (iyasaka-arc#57 6230190519 §2, 6287945980): runs one input set through the pinned ADF and through planAdmission,
// compares them, and counts which of ADF's PLAN_ADMISSION positions the inputs reached. It reads the ADF checkout and never changes it.
// usage: node tests/plan-admission-equivalence.mjs --adf <ADF checkout> [--table]      exit 0 PASS / 1 FAIL / 2 cannot observe
import { createHash } from "node:crypto";
import inspector from "node:inspector";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { git, parseArgs, report } from "../scripts/hygiene/lib.mjs";
import { planAdmission } from "../scripts/sds/plan-admission.mjs";

const CHECK = "plan-admission-equivalence";
const data = (name) => JSON.parse(readFileSync(new URL(`./fixtures/plan-admission/${name}`, import.meta.url), "utf8"));
const { base, pin, documents, cases, triggers, unrealizable } = data("cases.json"), sites = data("sites.json"), dogfood = data("adf-self-dogfood.json");
const clone = (v) => JSON.parse(JSON.stringify(v));
const norm = (p) => p.replace(/\[\d+\]/g, "[#]");
const PINS = { same: () => clone(pin), missing: () => undefined, partial: () => ({}), different: () => ({ ...pin, framework_version: "9.9.9" }), expected: (doc) => doc.self_application?.expected };

function apply(doc, ops) {
  for (const [op, path, value] of ops) {
    const keys = path.match(/[^.[\]]+/g), last = keys.pop(), parent = keys.reduce((o, k) => o[k], doc);
    if (op === "set") parent[last] = clone(value);
    else if (op === "del") delete parent[last];
    else parent[last].push(clone(value));
  }
  return doc;
}

function* subsets(names, max, from = 0, chosen = []) {
  if (chosen.length > 0) yield chosen;
  if (chosen.length < max) for (let i = from; i < names.length; i += 1) yield* subsets(names, max, i + 1, [...chosen, names[i]]);
}

// (a) a plan that passes, (b) one input per position and per meaning rule, (c) pin cases, (d) ADF's own plan, (e) every single, pair and triple of reasons.
function inputs() {
  const out = [{ id: "valid", doc: clone(base) }, { id: "adf-self-dogfood", doc: clone(dogfood), pin: "expected" }];
  documents.forEach((doc, i) => out.push({ id: `document-${i}`, doc }));
  for (const c of cases) out.push({ id: c.id, doc: apply(clone(base), c.ops), pin: c.pin });
  for (const g of sites.groups.filter((x) => x.sample)) out.push({ id: `break-${g.id}`, doc: apply(clone(base), [["set", g.sample, null]]) });
  for (const set of subsets(Object.keys(triggers), 3)) out.push({ id: `combo-${set.join("+")}`, doc: apply(clone(base), set.flatMap((n) => triggers[n])), combo: set });
  return out;
}

// Fail closed unless the checkout is exactly the pinned ADF, and the position list still describes its file.
function pinned(adf) {
  const { commit, file, sha256 } = sites.adf, head = git(adf, ["rev-parse", "HEAD"]).trim();
  if (head !== commit) throw new Error(`ADF HEAD is ${head}, not ${commit}`);
  const bytes = readFileSync(join(adf, file));
  if (createHash("sha256").update(bytes).digest("hex") !== sha256) throw new Error(`${file} differs from the pinned bytes`);
  const lines = bytes.toString("utf8").split("\n"), starts = lines.map((_, i) => lines.slice(0, i).reduce((n, l) => n + l.length + 1, 0));
  const offsets = {};
  for (const g of sites.groups) {
    const ok = g.kind === "literal" ? lines[g.line - 1].includes('block("PLAN_ADMISSION"') : g.lines.every((n, i) => lines[n - 1].includes(`${g.helpers[i]}(`) && lines[n - 1].includes('"PLAN_ADMISSION"'));
    if (!ok) throw new Error(`the position list does not match ${file} at ${g.id}; regenerate it`);
    if (g.kind === "literal") offsets[g.id] = starts[g.line - 1] + lines[g.line - 1].indexOf('block("PLAN_ADMISSION"');
  }
  return { href: pathToFileURL(realpathSync(join(adf, file))).href, offsets }; // V8 names the module by its real path, so a symlinked --adf must be resolved
}

async function load(href) {
  const s = new inspector.Session();
  s.connect();
  const post = (m, p) => new Promise((ok, no) => s.post(m, p, (e, r) => (e ? no(e) : ok(r))));
  await post("Profiler.enable");
  await post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
  const adf = await import(href);
  const take = async () => (await post("Profiler.takePreciseCoverage")).result.find((r) => r.url === href)?.functions.flatMap((f) => f.ranges) ?? [];
  if ((await take()).length === 0) throw new Error("V8 reported no coverage for the ADF module"); // what loading it counted is not an input
  return { adf, take, close: () => s.disconnect() };
}

const key = (fs) => new Set(fs.map((f) => `${f.reason}\u0000${f.path}`));
const sameResult = (a, b) => a.verdict === b.verdict && a.reason === b.reason && key(a.findings).size === key(b.findings).size && [...key(a.findings)].every((k) => key(b.findings).has(k));
const innermost = (ranges, at) => ranges.filter((r) => r.startOffset <= at && at < r.endOffset).sort((a, b) => a.endOffset - a.startOffset - (b.endOffset - b.startOffset))[0];
const reasonOf = (name) => name.replace(/_(freshness|status)$/, "");

async function main(args) {
  if (!args.adf) return report(CHECK, "SKIPPED", { reason: "--adf <ADF checkout> was not given; nothing was compared" }) ?? 0;
  const { href, offsets } = pinned(args.adf), run = await load(href), tally = { compared: 0, mismatches: [], adfThrew: 0, notBlock: [], unexplained: [], listedButRealizable: [] };
  const hits = Object.fromEntries(sites.groups.map((g) => [g.id, { count: 0, inputs: [] }]));
  const items = inputs();
  for (const item of items) {
    const actualSelfPin = item.doc && PINS[item.pin ?? "same"](item.doc);
    let adf = null;
    try { adf = run.adf.buildDeliveryPlanValidationReport(clone(item.doc), { actualSelfPin }).decisions.PLAN_ADMISSION; } catch { tally.adfThrew += 1; }
    const ranges = await run.take(), mine = (() => { try { return planAdmission(clone(item.doc), { actualSelfPin }); } catch { return null; } })();
    if (!adf) { if (mine?.verdict !== "BLOCK") tally.notBlock.push(item.id); continue; }
    tally.compared += 1;
    if (!mine || !sameResult(adf, mine)) tally.mismatches.push(item.id);
    for (const g of sites.groups) {
      const reached = g.kind === "literal" ? innermost(ranges, offsets[g.id])?.count > 0 : adf.findings.some((f) => new RegExp(g.pattern).test(norm(f.path)));
      if (reached) { hits[g.id].count += 1; if (hits[g.id].inputs.length < 3) hits[g.id].inputs.push(item.id); }
    }
    if (item.combo) {
      const missing = item.combo.map(reasonOf).filter((r) => !adf.findings.some((f) => f.reason === r)), name = item.combo.join("+");
      if (missing.length > 0 && !unrealizable[name]) tally.unexplained.push(name);
      if (missing.length === 0 && unrealizable[name]) tally.listedButRealizable.push(name);
    }
  }
  run.close();
  const missed = sites.groups.filter((g) => hits[g.id].count === 0 && !g.unreached).map((g) => g.id);
  if (args.table) for (const g of sites.groups) process.stdout.write(`${g.id}\t${g.kind}\t${(g.lines ?? [g.line]).join("+")}\t${hits[g.id].count}\t${hits[g.id].inputs.join(", ")}${g.unreached ? `\tUNREACHED: ${g.unreached}` : ""}\n`);
  const details = { adf: sites.adf.commit, inputs: items.length, compared: tally.compared, mismatches: tally.mismatches, adf_threw: tally.adfThrew, shirube_not_block_where_adf_threw: tally.notBlock,
    groups: sites.groups.length, groups_reached: sites.groups.filter((g) => hits[g.id].count > 0).length, groups_missed_without_reason: missed, combos_unexplained: tally.unexplained, combos_listed_but_realizable: tally.listedButRealizable };
  const ok = [tally.mismatches, tally.notBlock, missed, tally.unexplained, tally.listedButRealizable].every((x) => x.length === 0);
  return report(CHECK, ok ? "PASS" : "FAIL", details);
}

main(parseArgs(process.argv.slice(2))).then((code) => process.exit(code), (e) => process.exit(report(CHECK, "UNOBSERVABLE", { reason: e.message })));
