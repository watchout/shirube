// Builds tests/fixtures/plan-admission/sites.json: every place the pinned ADF can report PLAN_ADMISSION (iyasaka-arc#57 6287945980).
// usage: node tests/plan-admission-gen-sites.mjs --adf <ADF checkout> > tests/fixtures/plan-admission/sites.json   (run it again when the ADF commit moves)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { git, parseArgs } from "../scripts/hygiene/lib.mjs";

const FILE = "scripts/shirube/validate-delivery-plan.mjs", CLI_ONLY = "failureReport"; // failureReport is reached from the CLI's main() only
const CALL = /\b(objectShape|unknownKeys|arrayOfObjects|stringArray|nonEmptyStrings|nonEmptyString|exact|oneOf|pattern|gitSha|digest|dateTime|positiveInteger|booleanValue)\(.*?,\s*("(?:[^"\\]|\\.)*"|`[^`]*`|[A-Za-z_$][\w$]*)\s*,\s*"PLAN_ADMISSION"/;
const base = JSON.parse(readFileSync(new URL("./fixtures/plan-admission/cases.json", import.meta.url), "utf8")).base;
const walk = (v, at = "") => (v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [Array.isArray(v) ? `${at}[${k}]` : at ? `${at}.${k}` : k, ...walk(x, Array.isArray(v) ? `${at}[${k}]` : at ? `${at}.${k}` : k)]) : []);
const concrete = walk(base);

const { adf = "" } = parseArgs(process.argv.slice(2));
if (!adf) throw new Error("--adf <ADF checkout> is required");
const bytes = readFileSync(join(adf, FILE)), lines = bytes.toString("utf8").split("\n");
const pathVar = (n) => { for (let i = n; i > 0; i -= 1) { const m = /const path = (`[^`]*`);/.exec(lines[i - 1]); if (m) return m[1].slice(1, -1); } };
const strings = (list) => [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const consts = new Map(lines.flatMap((t) => { const m = /^const (\w+) = (\[.*\]);/.exec(t); return m ? [[m[1], strings(m[2])]] : []; }));
// The values a `${name}` takes: the array of the nearest `for (const name of …)` above the call. No loose wildcard: an unresolved name stops the run.
function loopValues(name, n) {
  for (let i = n; i > Math.max(0, n - 12); i -= 1) {
    const m = new RegExp(`for \\(const ${name} of (\\[[^\\]]*\\]|\\w+)\\)`).exec(lines[i - 1]);
    if (m) return m[1].startsWith("[") ? strings(m[1]) : consts.get(m[1]);
  }
  throw new Error(`line ${n}: cannot expand \${${name}}`);
}
// A path expression becomes a pattern over the finding's path, with [n] written [#] and each ${name} replaced by the values its loop gives.
function toPattern(expr, n, helper) {
  const text = (expr === "path" ? `\`${pathVar(n)}\`` : expr).slice(1, -1).replace(/\$\{path\}/g, pathVar(n) ?? "").replace(/\[\$\{index\}\]/g, "[#]");
  const body = text.split(/(\$\{[^}]+\})/).map((part) => (/^\$\{/.test(part) ? `(?:${loopValues(part.slice(2, -1), n).join("|")})` : part.replace(/[.*+?^${}()|\\[\]]/g, "\\$&"))).join("");
  return helper === "unknownKeys" ? "^\\$\\.[^.]+$" : `^${body}$`;
}

const literal = [], helper = new Map();
let fn = "";
lines.forEach((text, i) => {
  fn = /^(?:export )?(?:async )?function (\w+)/.exec(text)?.[1] ?? fn;
  const n = i + 1, call = CALL.exec(text);
  if (text.includes('block("PLAN_ADMISSION"') && fn !== CLI_ONLY) literal.push({ id: `L${n}`, kind: "literal", line: n });
  if (call && !text.includes("block(")) {
    const pattern = toPattern(call[2], n, call[1]), g = helper.get(pattern) ?? { id: `H${n}`, kind: "helper", lines: [], helpers: [], exprs: [], pattern };
    g.lines.push(n); g.helpers.push(call[1]); g.exprs.push(call[2]); helper.set(pattern, g);
  }
});
const sample = (g) => (g.helpers[0] === "unknownKeys" ? "extra" : concrete.find((p) => new RegExp(g.pattern).test(p.replace(/\[\d+\]/g, "[#]"))) ?? null);
const groups = [...literal, ...[...helper.values()].map((g) => ({ ...g, sample: sample(g) }))];
const row = (g) => `    ${JSON.stringify(g)}`;
process.stdout.write(`{\n  "adf": ${JSON.stringify({ commit: git(adf, ["rev-parse", "HEAD"]).trim(), file: FILE, sha256: createHash("sha256").update(bytes).digest("hex") })},\n  "groups": [\n${groups.map(row).join(",\n")}\n  ]\n}\n`);
