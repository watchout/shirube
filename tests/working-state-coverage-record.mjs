// U2 LC7 行の網羅率の記録（試験の部品。NFR1.1・NFR1.1b・A-INF-3・A-INF-4a）。試験の中で子 process に Node の lcov・TAP を流し、解析して判定する。
// 分母は scripts/working-state/**/*.mjs をディスクから列挙して決める（lcov が載せた file からは決めない）。解析・判定は純粋な関数で、子の起動だけが I/O。
// 報告の形が取れない（Node の版が lcov を出さない・壊れている）ものは失敗にし、観測できなかったと記録する。申告された値・exit 0 だけは証拠にしない（S5・S8）。
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const SELF = "working-state-coverage.test.mjs";
const SOURCE_DIR = "scripts/working-state";
const ENV_KEYS = ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "SystemRoot"];
// 子の試験 file の同時の数。親（npm test）の他の試験と同時に走るので、時間の枠を測る試験（probe）を遅らせない程度に絞る。
const CHILD_CONCURRENCY = 1;
const COUNT_KEYS =["tests", "pass", "fail", "cancelled", "skipped", "todo"];
const LCOV_KINDS = new Set(["TN", "SF", "FN", "FNDA", "FNF", "FNH", "BRDA", "BRF", "BRH", "DA", "LH", "LF"]);
const UNREADABLE = Object.freeze({ ok: false });

// 分母: 根の下の scripts/working-state/**/*.mjs（入れ子を含む）。根・dir が無ければ空。
export function denominatorOf(root) {
  try {
    return readdirSync(path.join(root, SOURCE_DIR), { recursive: true })
      .filter((name) => name.endsWith(".mjs") && statSync(path.join(root, SOURCE_DIR, name)).isFile())
      .map((name) => `${SOURCE_DIR}/${name.split(path.sep).join("/")}`).sort();
  } catch {
    return [];
  }
}

// 子が流す試験: tests/working-state-*.test.mjs からこの file を除いたもの。子へ渡す引数（file の一覧）で再び起動しないことを決める。
export const childFilesOf = (testsDir) => readdirSync(testsDir).filter((name) => /^working-state-.+\.test\.mjs$/.test(name) && name !== SELF).sort().map((name) => path.join(testsDir, name));

// 子の環境は許す名前だけ。親が足す NODE_V8_COVERAGE・NODE_TEST_CONTEXT（子を試験 file として動かしてしまう）や秘密を引き継がない。
export function childEnvOf(env) {
  return Object.fromEntries(ENV_KEYS.filter((key) => typeof env[key] === "string").map((key) => [key, env[key]]));
}

export function childCommandOf(files, { lcovPath, tapPath, include = `${SOURCE_DIR}/**/*.mjs` }) {
  const reporters = ["--test-reporter=lcov", `--test-reporter-destination=${lcovPath}`, "--test-reporter=tap", `--test-reporter-destination=${tapPath}`];
  return { file: process.execPath, args: ["--test", `--test-concurrency=${CHILD_CONCURRENCY}`, "--experimental-test-coverage", `--test-coverage-include=${include}`, ...reporters, ...files] };
}

const readText = (file) => { try { return readFileSync(file, "utf8"); } catch { return ""; } };

// 子を 1 回流す。出力は一時 dir の file に集め、返すのは結果の事実だけ（標準出力・標準エラーは捨てる）。
export function runCoverageChild({ cwd, files, include, timeoutMs = 300000, env = process.env }) {
  const temp = mkdtempSync(path.join(tmpdir(), "ws-coverage-"));
  try {
    const lcovPath = path.join(temp, "out.lcov");
    const tapPath = path.join(temp, "out.tap");
    const command = childCommandOf(files, { lcovPath, tapPath, include });
    const result = spawnSync(command.file, command.args, { cwd, env: childEnvOf(env), timeout: timeoutMs, killSignal: "SIGKILL", stdio: "ignore" });
    const run = { exitCode: result.status, signal: result.signal, timedOut: result.error?.code === "ETIMEDOUT" };
    return { run, lcovText: readText(lcovPath), tapText: readText(tapPath) };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// lcov の 1 つの record（SF から end_of_record）。DA から数えた行数と、宣言された LF・LH が合わなければ読めない形。
function closeRecord(record, files) {
  const declared = record.declaredFound === record.found && record.declaredHit === record.hit;
  if (!declared || files.has(record.path)) return false;
  files.set(record.path, { found: record.found, hit: record.hit });
  return true;
}

function readLine(line, current) {
  const colon = line.indexOf(":");
  const kind = colon < 0 ? line : line.slice(0, colon);
  const value = colon < 0 ? "" : line.slice(colon + 1);
  if (!LCOV_KINDS.has(kind) || (current === null && kind !== "TN" && kind !== "SF")) return false;
  if (kind === "DA") {
    const match = /^(\d+),(\d+)(?:,.*)?$/.exec(value);
    if (match === null) return false;
    current.found += 1;
    current.hit += Number(match[2]) > 0 ? 1 : 0;
  }
  if (kind === "LF" || kind === "LH") {
    if (!/^\d+$/.test(value)) return false;
    current[kind === "LF" ? "declaredFound" : "declaredHit"] = Number(value);
  }
  return true;
}

// lcov の text → { ok: true, files: Map(path → { found, hit }) }。形が取れなければ { ok: false }（成功に読み替えない）。
export function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const line of text.split("\n").filter((entry, index, all) => entry !== "" || index < all.length - 1)) {
    if (line === "end_of_record") {
      if (current === null || !closeRecord(current, files)) return UNREADABLE;
      current = null;
    } else if (line.startsWith("SF:")) {
      if (current !== null || line.length === 3) return UNREADABLE;
      current = { path: line.slice(3), found: 0, hit: 0, declaredFound: null, declaredHit: null };
    } else if (!readLine(line, current)) {
      return UNREADABLE;
    }
  }
  return current === null && files.size > 0 ? { ok: true, files } : UNREADABLE;
}

// TAP の集計（# tests・pass・fail・cancelled・skipped・todo）と、時間切れの失敗の件数。集計が取れなければ { ok: false }。
export function parseTap(text) {
  const counts = {};
  for (const key of COUNT_KEYS) {
    const match = new RegExp(`^# ${key} (\\d+)$`, "m").exec(text);
    if (match === null) return UNREADABLE;
    counts[key] = Number(match[1]);
  }
  return { ok: true, counts: { ...counts, timeouts: (text.match(/failureType: 'testTimeoutFailure'/g) ?? []).length } };
}

function runCauses(run) {
  if (run.timedOut) return ["child_timeout"];
  if (run.signal) return [`child_signal:${run.signal}`];
  return run.exitCode === 0 ? [] : [`child_exit:${run.exitCode}`];
}

function tapCauses(counts) {
  const labels = [["fail", "failed"], ["cancelled", "cancelled"], ["skipped", "skipped"], ["todo", "todo"], ["timeouts", "timeout"]];
  return [...(counts.tests === 0 ? ["no_tests"] : []), ...labels.filter(([key]) => counts[key] > 0).map(([key, label]) => `${label}:${counts[key]}`)];
}

function fileCauses(denominator, parsed) {
  const files = [];
  const causes = denominator.length === 0 ? ["empty_denominator"] : [];
  for (const file of denominator) {
    const measured = parsed.files.get(file);
    if (measured === undefined) causes.push(`unmeasured:${file}`);
    else files.push({ path: file, ...measured });
    if (measured?.found === 0) causes.push(`no_lines:${file}`);
    else if (measured !== undefined && measured.hit < measured.found) causes.push(`below_floor:${file}`);
  }
  return { files, causes };
}

// 判定。pass は、分母が空でなく・全 file が lcov に現れ行があり 100%・子が正常に終わり・試験が 1 件以上あり・失敗 / cancelled / skip / todo / timeout が 0 の時だけ。
export function judgeRun({ denominator, lcovText, tapText, run }) {
  const lcov = parseLcov(lcovText);
  const tap = parseTap(tapText);
  const measured = lcov.ok ? fileCauses(denominator, lcov) : { files: [], causes: [...(denominator.length === 0 ? ["empty_denominator"] : []), "unreadable_lcov"] };
  const causes = [...measured.causes, ...(tap.ok ? tapCauses(tap.counts) : ["unreadable_tap"]), ...runCauses(run)];
  return { verdict: causes.length === 0 ? "pass" : "fail", causes, observation: lcov.ok && tap.ok ? "observed" : "not_observed", files: measured.files, tests: tap.ok ? tap.counts : null };
}

// 機械が読める記録。観測できなかったものは unobserved に書き、値を作らない。
export function recordOf(result, { node, childFiles }) {
  const percent = (file) => (file.found === 0 ? null : Math.floor((file.hit * 10000) / file.found) / 100);
  return { schema: "working-state-coverage/1", node, childFiles, verdict: result.verdict, observation: result.observation, causes: result.causes, floorPercent: 100,
    files: result.files.map((file) => ({ ...file, percent: percent(file) })), tests: result.tests ?? { tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0, timeouts: 0 },
    unobserved: result.observation === "observed" ? [] : ["観測できなかった"] };
}
