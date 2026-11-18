// U2 構造の試験の部品（Step 12）。scripts/working-state/ の全 file をディスクから列挙して読み、構造の規則の違反を文字列の一覧で返す。
// 違反の 1 件 = "<file>: <内容>"。判定は純粋な関数（入力は file 名 → 本文の Map）で、読むのは loadSources・loadWorkTexts・resolvesOnDisk だけ。
// 注釈の取り除きは簡易（行頭の // と /* */、引用符が偶数個の後ろの //）。分類の無い file は失敗にする（新しい file を黙って見逃さない）。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SOURCE_DIR = "scripts/working-state";
const CLASSES = {
  lc1: ["read-file", "probe-path", "probe-run", "probe-tool"], lc6: ["escape"], index: ["index"],
  lc2: ["observation", "observation-fields", "read-check", "source-extract"], lc3: ["item-state", "catalog", "value-exposure", "observed-unit"], lc4: ["guidance", "guidance-actions"],
  lc5: ["answers", "answer-match", "answer-status", "observation-facts", "draft", "selection", "guidance-copy", "c02-wire"], leaf: ["canonical", "instant", "normalize"],
};
const CLASS_OF = new Map(Object.entries(CLASSES).flatMap(([name, files]) => files.map((file) => [`${file}.mjs`, name])));
const OUTSIDE_CORE = new Set(["lc1", "lc6", "index"]);
const classOf = (file) => CLASS_OF.get(file) ?? null;
const isCore = (file) => !OUTSIDE_CORE.has(classOf(file));
const entries = (map) => [...map].sort(([a], [b]) => (a < b ? -1 : 1));
const lineCount = (text) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
const specOf = (spec) => spec.replace(/^\.\//u, "");

// 読み込み（I/O はここだけ）。
const listMjs = (dir) => readdirSync(path.join(ROOT, dir), { recursive: true }).filter((name) => name.endsWith(".mjs")).map((name) => name.split(path.sep).join("/")).sort();
export const loadSources = () => new Map(listMjs(SOURCE_DIR).map((name) => [name, readFileSync(path.join(ROOT, SOURCE_DIR, name), "utf8")]));
export function loadWorkTexts() {
  const tests = readdirSync(path.join(ROOT, "tests")).filter((name) => /^working-state-.+\.mjs$/u.test(name)).sort().map((name) => `tests/${name}`);
  return new Map([...listMjs(SOURCE_DIR).map((name) => `${SOURCE_DIR}/${name}`), ...tests].map((file) => [file, readFileSync(path.join(ROOT, file), "utf8")]));
}
export const resolvesOnDisk = (from, spec) => existsSync(path.resolve(ROOT, path.dirname(from), spec));

// 注釈の取り除き（行数は保つ）。
function stripComments(text) {
  const lines = text.replace(/^\s*\/\*[\s\S]*?\*\//gmu, (block) => block.replace(/[^\n]/gu, "")).split("\n");
  return lines.map((line) => {
    for (let at = line.indexOf("//"); at >= 0; at = line.indexOf("//", at + 2)) {
      const before = line.slice(0, at);
      if (["\"", "'", "`"].every((quote) => before.split(quote).length % 2 === 1)) return before;
    }
    return line;
  }).join("\n");
}
const codeOf = (map) => entries(map).map(([file, text]) => [file, stripComments(text)]);
const hits = (map, rules, only = () => true) => codeOf(map).filter(([file]) => only(file)).flatMap(([file, code]) => rules.filter(([pattern]) => pattern.test(code)).map(([, label]) => `${file}: ${label}`));

// 静的な import / export-from の specifier（行頭から始まる文だけ。試験の中の文字列の例は拾わない）。
const STATIC_FORMS = [/^\s*(?:import|export)\b[^"'\n;]*?\bfrom\s*["']([^"']+)["']/gmu, /^\s*\}\s*from\s*["']([^"']+)["']/gmu, /^\s*import\s*["']([^"']+)["']/gmu];
const staticSpecs = (code) => STATIC_FORMS.flatMap((form) => [...code.matchAll(form)].map((match) => match[1]));
const relativeSpecs = (code) => staticSpecs(code).filter((spec) => spec.startsWith("./")).map(specOf);

export const unclassifiedFiles = (map) => entries(map).filter(([file]) => classOf(file) === null).map(([file]) => `${file}: どの部品にも分類されていない`);

const CORE_EFFECTS = [[/\bDate\b/u, "Date（時刻を自分で取る）"], [/\bMath\.random\b|\b(?:randomUUID|randomBytes|randomInt|getRandomValues)\b/u, "乱数・UUID"], [/\bprocess\.(?:env|argv|hrtime)\b|\bperformance\.now\b/u, "環境変数・時計"],
  [/(?:\bfrom|\bimport\s*\(|\brequire\s*\()\s*["'](?:node:)?(?:fs|fs\/promises|child_process|http|https|http2|net|tls|dns|dgram|worker_threads|os|cluster|vm)["']/u, "file・子 process・network の import"], [/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/u, "network"]];
export const coreEffectViolations = (map) => hits(map, CORE_EFFECTS, isCore);

const CAUSES = ["budget_exceeded", "timed_out", "out_of_boundary", "changed_during_read", "wrong_target", "tool_missing", "permission_denied", "malformed", "conflict", "unobservable"];
const JUDGES = ["classifyValue", "valueFormOf", "isAllowedFormat", "rejectionReasonOf", "evaluateItem", "evaluateItems", "interpretFile", "interpretProbe", "normalizeValue", "buildGuidance"];
const WORD_RULES = [...CAUSES, ...JUDGES].map((word) => [new RegExp(`\\b${word}\\b`, "u"), `分類・判定の語 ${word}`]);
export const adapterWordViolations = (map) => hits(map, WORD_RULES, (file) => ["lc1", "lc6"].includes(classOf(file)));

const GROUP_KILL = [[/\bdetached\s*:\s*true\b/u, "detached: true で起動していない"], [/\bprocess\.kill\(\s*-/u, "group 宛て（負の pid）の signal が無い"]];
export function groupKillViolations(map) {
  if (!map.has("probe-run.mjs")) return ["probe-run.mjs: file が無い"];
  const code = stripComments(map.get("probe-run.mjs"));
  return GROUP_KILL.filter(([pattern]) => !pattern.test(code)).map(([, label]) => `probe-run.mjs: ${label}`);
}

const BUDGET_NAME = /\bbudget\b/u;
const BUDGET_VALUE = /\b(?:maxBytes|maxElapsedMs|maxRequests)\b/u;
const LC2_FILES = new Set(CLASSES.lc2.map((name) => `${name}.mjs`));
function budgetLineOk(line) {
  const named = [...line.matchAll(/(\S{0,5})\bbudget\b/gu)].every((match) => /read\.$/u.test(match[1]));
  const valued = !BUDGET_VALUE.test(line) || /\bbudget\.(?:maxBytes|maxElapsedMs|maxRequests)\b|BUDGET_KEYS/u.test(line);
  return named && valued;
}
export function budgetFlowViolations(map) {
  const bad = codeOf(map).filter(([file]) => LC2_FILES.has(file)).flatMap(([file, code]) => code.split("\n").filter((line) => (BUDGET_NAME.test(line) || BUDGET_VALUE.test(line)) && !budgetLineOk(line)).map((line) => `${file}: 予算の名前を LC1 の事実の外から使う（${line.trim()}）`));
  return bad;
}

// 大文字の理由コードの形は LC1 の外だけ（LC1 は環境変数の名前 LC_ALL を持つ）。U1 の REASONS の値は全 file で禁止。
const REASON_LITERAL = /["'`]([A-Z][A-Z0-9]*_[A-Z0-9_]+)["'`]/gu;
export function reasonCodeViolations(map, reasons) {
  return codeOf(map).flatMap(([file, code]) => [...code.matchAll(REASON_LITERAL)].filter((match) => reasons.includes(match[1]) || classOf(file) !== "lc1")
    .map((match) => `${file}: 理由コードの形の文字列 ${match[1]}${reasons.includes(match[1]) ? "（U1 の REASONS の値）" : ""}`));
}

const OWNERS = { "value-exposure.mjs": ["classifyValue", "valueFormOf", "isAllowedFormat", "rejectionReasonOf"], "item-state.mjs": ["evaluateItem", "evaluateItems"], "answer-match.mjs": ["closedMatches", "closedMatchesItem"],
  "normalize.mjs": ["lengthBucketOf", "compareVersions", "normalizeValue"], "instant.mjs": ["parseInstant"], "canonical.mjs": ["digestOf", "sha256Hex", "canonicalJson"], "read-check.mjs": ["interpretFile", "interpretProbe"],
  "observation.mjs": ["observeAll"], "observation-fields.mjs": ["interpretItem"], "observation-facts.mjs": ["isObservationStale", "factsOf"], "answers.mjs": ["reconcileAnswers", "receiveAnswer"], "draft.mjs": ["buildDraft"],
  "selection.mjs": ["createSelection"], "guidance.mjs": ["buildGuidance"], "guidance-actions.mjs": ["questionsOf", "strongestAction"], "escape.mjs": ["escapeForDisplay"] };
const RULE_VALUES = [[/\b256\b/u, "value-exposure.mjs", "文字数の上限 256"], [/\{40\}/u, "value-exposure.mjs", "commit の長さ {40}"], [/\b(?:SECRET_RUN_MIN|BEARER_WORD_MIN|JWT_PART_MIN)\b/u, "value-exposure.mjs", "秘密らしさの長さの名前"],
  [/\b(?:shortMax|mediumMax)\b/u, "normalize.mjs", "長さの区分の境界"], [/\bMAX_DEPTH\b/u, "canonical.mjs", "入れ子の上限"], [/\b(?:maxBytes|maxElapsedMs|maxRequests)\s*:\s*\d/u, "", "予算の数値の literal"]];
const definesName = (code, name) => new RegExp(`(?:\\bfunction\\*?\\s+|\\b(?:const|let|var|class)\\s+)${name}\\b`, "u").test(code);
const REGEX_LITERAL = /(?<=[=(,:[!&|?]\s*)\/((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\n\\[])+)\/[a-z]*/gu;
function symbolOwnership(codes) {
  const out = [];
  for (const [owner, names] of Object.entries(OWNERS)) {
    for (const name of names) {
      if (codes.has(owner) && !definesName(codes.get(owner), name)) out.push(`${owner}: 持ち主なのに ${name} を定義していない`);
      for (const [file, code] of codes) if (file !== owner && definesName(code, name)) out.push(`${file}: ${name} の定義が持ち主 ${owner} の外にある`);
    }
  }
  return out;
}
function regexDuplicates(codes) {
  const where = new Map();
  for (const [file, code] of codes) for (const match of code.matchAll(REGEX_LITERAL)) if (match[1].length >= 12) where.set(match[1], new Set([...(where.get(match[1]) ?? []), file]));
  return [...where].filter(([, files]) => files.size > 1).flatMap(([source, files]) => [...files].map((file) => `${file}: 同じ正規表現 ${source} が ${files.size} file にある`));
}
export function ownershipViolations(map) {
  const codes = new Map(codeOf(map));
  const values = [...codes].flatMap(([file, code]) => RULE_VALUES.filter(([pattern, owner]) => owner !== file && pattern.test(code)).map(([, owner, label]) => `${file}: 規則の値（${label}）が持ち主${owner === "" ? "のない場所" : ` ${owner}`}の外にある`));
  return [...symbolOwnership(codes), ...values, ...regexDuplicates(codes)];
}

export function cycleViolations(map) {
  const graph = new Map(codeOf(map).map(([file, code]) => [file, relativeSpecs(code).filter((spec) => map.has(spec))]));
  const found = new Set();
  const walk = (file, trail) => {
    if (trail.includes(file)) return found.add(`${file}: import の循環 ${[...trail.slice(trail.indexOf(file)), file].join(" -> ")}`);
    return (graph.get(file) ?? []).forEach((next) => walk(next, [...trail, file]));
  };
  [...graph.keys()].forEach((file) => walk(file, []));
  return [...found];
}

const LC1_ALLOWED = (spec) => spec.startsWith("node:") || CLASSES.lc1.includes(specOf(spec).replace(/\.mjs$/u, "")) || specOf(spec) === "canonical.mjs";
const LC3_FORBIDDEN = new Set([...CLASSES.lc4, ...CLASSES.lc5].map((name) => `${name}.mjs`));
export function importDirectionViolations(map) {
  return codeOf(map).flatMap(([file, code]) => staticSpecs(code).flatMap((spec) => {
    const target = specOf(spec);
    const own = classOf(file);
    const why = [[isCore(file) && /(^|\/)tests\//u.test(spec), "核が試験を import している"], [isCore(file) && classOf(target) !== null && OUTSIDE_CORE.has(classOf(target)), "核が LC1・LC6・index を import している"],
      [own === "lc3" && LC3_FORBIDDEN.has(target), "LC3 が回答・案内の部品を import している"], [own === "lc2" && target === "item-state.mjs", "LC2 が項目状態を import している"],
      [["value-exposure.mjs", "instant.mjs"].includes(file), "末端が何かを import している"], [file === "canonical.mjs" && !spec.startsWith("node:"), "canonical が相対 path を import している"],
      [own === "lc1" && !LC1_ALLOWED(spec), "LC1 が LC1 と canonical 以外を import している"], [own === "lc6" && !spec.startsWith("node:"), "LC6 が相対 path を import している"]];
    return why.filter(([bad]) => bad).map(([, label]) => `${file}: ${label}（${spec}）`);
  }));
}

const EFFECTS = [[/\b(?:writeFile|appendFile|createWriteStream|rmdir|unlink|mkdir|rename|copyFile|truncate|symlink|chmod|chown|utimes)\w*\s*\(/u, "file への書込み・作成・削除"], [/\.rm(?:Sync)?\s*\(/u, "削除"],
  [/\bgit\s+push\b/u, "git push"], [/["'`]gh\s/u, "gh による投稿"], [/\bconsole\.\w+|\bprocess\.(?:stdout|stderr)\b/u, "標準出力・標準エラーへの書込み"], [/\bshell\s*:\s*true\b/u, "shell: true"], [/(?<![.\w])exec(?:Sync|File|FileSync)?\s*\(/u, "exec"]];
const openWithoutReadOnly = (code) => [...code.matchAll(/\.open\s*\(([^)]*)\)/gu)].filter((match) => !match[1].includes("O_RDONLY")).length > 0;
export function effectPathViolations(map) {
  const opens = codeOf(map).filter(([, code]) => openWithoutReadOnly(code)).map(([file]) => `${file}: open が読み取り専用（O_RDONLY）でない`);
  return [...hits(map, EFFECTS), ...opens];
}

export const sizeViolations = (map) => entries(map).filter(([, text]) => lineCount(text) > 300).map(([file, text]) => `${file}: ${lineCount(text)} 行（上限 300）`);

const DYNAMIC = /\bimport\s*\(\s*(?:(["'])([^"']+)\1\s*\)|)/gu;
function dynamicSpecs(code) {
  const found = [...code.matchAll(DYNAMIC)].map((match) => ({ spec: match[2] ?? null }));
  return [...found, ...[...code.matchAll(/\brequire\s*\(/gu)].map(() => ({ spec: null, require: true }))];
}
function specProblem(file, spec, resolves) {
  if (spec.startsWith("node:")) return isBuiltin(spec) ? null : `存在しない組込み ${spec}`;
  if (spec.startsWith("./") || spec.startsWith("../")) return resolves(file, spec) ? null : `実在しない相対 path ${spec}`;
  return `bare specifier ${spec}`;
}
export function importSpecifierViolations(map, resolves) {
  return codeOf(map).flatMap(([file, code]) => {
    const onlyStatic = !file.startsWith(`${SOURCE_DIR}/`);
    const dynamic = onlyStatic ? [] : dynamicSpecs(code).map((item) => (item.spec === null ? { problem: item.require ? "require" : "動的な import（literal でない）" } : { spec: item.spec }));
    const all = [...staticSpecs(code).map((spec) => ({ spec })), ...dynamic];
    return all.map((item) => item.problem ?? specProblem(file, item.spec, resolves)).filter((problem) => problem !== null).map((problem) => `${file}: ${problem}`);
  });
}

const THROW_OK = /^new [A-Za-z]+\("[^"\\]*"\)$/u;
export function openFormStaticViolations(map) {
  const codes = new Map(codeOf(map));
  const exposure = codes.has("value-exposure.mjs") ? staticSpecs(codes.get("value-exposure.mjs")).map((spec) => `value-exposure.mjs: 何も import しない file が ${spec} を import している`) : [];
  const callers = codes.has("value-exposure.mjs") ? ["observation-fields.mjs", "answers.mjs"].filter((file) => codes.has(file) && !staticSpecs(codes.get(file)).includes("./value-exposure.mjs")).map((file) => `${file}: 判定の file（value-exposure.mjs）を import していない`) : [];
  const throws = [...codes].flatMap(([file, code]) => [...code.matchAll(/\bthrow\b([^;\n]*)/gu)].filter((match) => !THROW_OK.test(match[1].trim())).map((match) => `${file}: 例外の文面が固定の literal でない（throw${match[1]}）`));
  return [...exposure, ...callers, ...throws];
}
