// U2 行の網羅率の記録（LC7。NFR1.1・NFR1.1b・NFR7・A-INF-3・A-INF-4a）。試験の中で子 process に Node の lcov を流して解析し、機械が読める記録を作る。
// 分母は scripts/working-state/**/*.mjs をディスクから列挙して決める（lcov が載せた file からは決めない）。手で書き写さない。申告された値は証拠にしない（S5）。
// 子が流す試験は tests/working-state-*.test.mjs のうちこの file を除いたもの。再起動しない方法は、子へ渡す引数（file の一覧）で決める（環境変数は使わない）。
// 名前空間で受けるので、未実装の間も import では落ちず、呼んだ試験だけが失敗する。
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const lc7 = await import("./working-state-coverage-record.mjs").catch(() => ({}));
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const A = "scripts/working-state/a.mjs";
const B = "scripts/working-state/b.mjs";
const OK_RUN = Object.freeze({ exitCode: 0, signal: null, timedOut: false });

const lcovOf = (entries) => `TN:\n${entries.map(([file, found, hit]) => [`SF:${file}`, ...Array.from({ length: found }, (_, i) => `DA:${i + 1},${i < hit ? 1 : 0}`), `LH:${hit}`, `LF:${found}`, "end_of_record"].join("\n")).join("\n")}\n`;
const tapOf = ({ tests = 3, fail = 0, cancelled = 0, skipped = 0, todo = 0, timeouts = 0 } = {}) => [
  "TAP version 13", ...Array.from({ length: timeouts }, () => "  failureType: 'testTimeoutFailure'"),
  `# tests ${tests}`, "# suites 0", `# pass ${tests - fail - cancelled - skipped - todo}`, `# fail ${fail}`, `# cancelled ${cancelled}`, `# skipped ${skipped}`, `# todo ${todo}`, "# duration_ms 12.5", ""].join("\n");
const judged = (over = {}) => lc7.judgeRun({ denominator: [A, B], lcovText: lcovOf([[A, 4, 4], [B, 2, 2]]), tapText: tapOf(), run: OK_RUN, ...over });
const causesOf = (result) => result.causes.join(" | ");

test("T12.l1+ 分母の全 file が lcov に現れ、全部 100%、子の試験が全部通り skip・todo・cancelled・timeout が 0 の時だけ pass（観測できた記録）", () => {
  const result = judged();
  assert.deepEqual([result.verdict, result.causes, result.observation], ["pass", [], "observed"]);
  assert.deepEqual(result.files.map((file) => [file.path, file.found, file.hit]), [[A, 4, 4], [B, 2, 2]]);
});

test("T12.l1- 失敗にする条件: 分母が 0 件・lcov に現れない file（未計測）・100% 未満・行が 0 の file・分母の外の file だけが lcov にある", () => {
  const cases = [
    [{ denominator: [] }, "empty_denominator"],
    [{ lcovText: lcovOf([[A, 4, 4]]) }, `unmeasured:${B}`],
    [{ lcovText: lcovOf([[A, 4, 4], [B, 10, 9]]) }, `below_floor:${B}`],
    [{ lcovText: lcovOf([[A, 4, 4], [B, 0, 0]]) }, `no_lines:${B}`],
    [{ lcovText: lcovOf([["scripts/working-state/other.mjs", 4, 4]]) }, `unmeasured:${A}`],
  ];
  for (const [over, expected] of cases) {
    const result = judged(over);
    assert.equal(result.verdict, "fail", expected);
    assert.equal(causesOf(result).includes(expected), true, `${expected} <- ${causesOf(result)}`);
  }
});

test("T12.l1- 子の結果が成功に読み替えられない: skip・todo・cancelled・timeout・失敗・試験 0 件・子の終了コード・子の時間切れ・signal は全部失敗", () => {
  const cases = [
    [{ tapText: tapOf({ skipped: 1 }) }, "skipped:1"], [{ tapText: tapOf({ todo: 2 }) }, "todo:2"], [{ tapText: tapOf({ cancelled: 1 }) }, "cancelled:1"],
    [{ tapText: tapOf({ timeouts: 1, fail: 1 }) }, "timeout:1"], [{ tapText: tapOf({ fail: 1 }) }, "failed:1"], [{ tapText: tapOf({ tests: 0 }) }, "no_tests"],
    [{ run: { exitCode: 1, signal: null, timedOut: false } }, "child_exit:1"], [{ run: { exitCode: null, signal: "SIGTERM", timedOut: true } }, "child_timeout"],
    [{ run: { exitCode: null, signal: "SIGKILL", timedOut: false } }, "child_signal:SIGKILL"],
  ];
  for (const [over, expected] of cases) {
    const result = judged(over);
    assert.equal(result.verdict, "fail", expected);
    assert.equal(causesOf(result).includes(expected), true, `${expected} <- ${causesOf(result)}`);
  }
});

test("T12.l2- 報告の形が取れない（空・壊れた行・知らない種類・行の数が合わない・閉じていない・TAP の集計が無い）ものは失敗にし、観測できなかったと記録する", () => {
  const broken = ["", "not an lcov report\n", `TN:\nSF:${A}\nDA:x,1\nend_of_record\n`, `TN:\nSF:${A}\nDA:1,1\nLH:1\nLF:2\nend_of_record\n`, `TN:\nSF:${A}\nDA:1,1\nLH:1\nLF:1\n`,
    `TN:\nSF:${A}\nUNKNOWN:1\nDA:1,1\nLH:1\nLF:1\nend_of_record\n`, `TN:\nDA:1,1\nend_of_record\n`];
  for (const lcovText of broken) {
    const result = judged({ lcovText });
    assert.deepEqual([result.verdict, result.observation], ["fail", "not_observed"], JSON.stringify(lcovText));
    assert.equal(causesOf(result).includes("unreadable_lcov"), true);
  }
  const noTap = judged({ tapText: "TAP version 13\nok 1 - x\n" });
  assert.deepEqual([noTap.verdict, noTap.observation], ["fail", "not_observed"]);
  assert.equal(causesOf(noTap).includes("unreadable_tap"), true);
  assert.equal(judged({ tapText: "" }).verdict, "fail");
});

test("T12.l3+ 分母はディスクから列挙する（入れ子の dir も含む。lcov ではなく列挙が決める）。実物は index.mjs を含む", () => {
  const temp = mkdtempSync(path.join(tmpdir(), "ws-cov-denominator-"));
  try {
    mkdirSync(path.join(temp, "scripts", "working-state", "nested"), { recursive: true });
    for (const name of ["b.mjs", "a.mjs", "nested/c.mjs"]) writeFileSync(path.join(temp, "scripts", "working-state", name), "export {};\n");
    writeFileSync(path.join(temp, "scripts", "working-state", "notes.txt"), "x\n");
    assert.deepEqual(lc7.denominatorOf(temp), ["scripts/working-state/a.mjs", "scripts/working-state/b.mjs", "scripts/working-state/nested/c.mjs"]);
    assert.deepEqual(lc7.denominatorOf(path.join(temp, "no-such-root")), []);
  } finally { rmSync(temp, { recursive: true, force: true }); }
  const real = lc7.denominatorOf(ROOT);
  assert.equal(real.includes("scripts/working-state/index.mjs"), true);
  assert.equal(real.length >= 25, true);
});

test("T12.l4+ 子の試験の集合は tests/working-state-*.test.mjs からこの file を除いたもの。環境変数は引き継がず、子へ渡す引数で決める", () => {
  assert.equal(lc7.SELF, path.basename(fileURLToPath(import.meta.url)));
  const files = lc7.childFilesOf(path.join(ROOT, "tests"));
  assert.equal(files.length > 10, true);
  assert.equal(files.every((file) => /working-state-[^/]+\.test\.mjs$/.test(file)), true);
  assert.equal(files.some((file) => file.endsWith(lc7.SELF)), false);
  assert.equal(files.some((file) => file.endsWith("working-state-index.test.mjs")), true);
  const env = lc7.childEnvOf({ PATH: "/usr/bin", HOME: "/home/x", NODE_V8_COVERAGE: "/tmp/cov", NODE_TEST_CONTEXT: "child-v8", NODE_OPTIONS: "--x", SECRET_TOKEN: "s", WS_COVERAGE_CHILD: "1" });
  assert.deepEqual(Object.keys(env).sort(), ["HOME", "PATH"]);
  const command = lc7.childCommandOf(files, { lcovPath: "/x/out.lcov", tapPath: "/x/out.tap" });
  assert.equal(command.args.includes("--experimental-test-coverage"), true);
  assert.equal(command.args.some((arg) => arg.includes("working-state-coverage.test.mjs")), false);
});

test("T12.l4- 再び起動しない: 同じ名前の file が集合にあっても子は流さない（引数の一覧から外れ、印の file が作られない）", () => {
  const temp = mkdtempSync(path.join(tmpdir(), "ws-cov-recursion-"));
  try {
    writeFileSync(path.join(temp, "working-state-fake.test.mjs"), 'import test from "node:test";\ntest("fake", () => {});\n');
    writeFileSync(path.join(temp, lc7.SELF), `import { writeFileSync } from "node:fs";\nimport test from "node:test";\ntest("recursion", () => writeFileSync(${JSON.stringify(path.join(temp, "ran.txt"))}, "ran"));\n`);
    const files = lc7.childFilesOf(temp);
    assert.deepEqual(files.map((file) => path.basename(file)), ["working-state-fake.test.mjs"]);
    const child = lc7.runCoverageChild({ cwd: temp, files });
    assert.deepEqual([child.run.exitCode, lc7.parseTap(child.tapText).counts.tests], [0, 1]);
    assert.equal(existsSync(path.join(temp, "ran.txt")), false);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test("T12.l5- 子の本物の結果から skip・todo・timeout を数える（Node の出力の形で確かめる）。数える範囲はこの子の実行だけ", () => {
  const temp = mkdtempSync(path.join(tmpdir(), "ws-cov-counts-"));
  try {
    const body = 'import test from "node:test";\ntest("ok", () => {});\ntest.skip("skipped", () => {});\ntest.todo("todo", () => {});\ntest("slow", { timeout: 50 }, () => new Promise((resolve) => setTimeout(resolve, 600)));\n';
    writeFileSync(path.join(temp, "working-state-counts.test.mjs"), body);
    const child = lc7.runCoverageChild({ cwd: temp, files: lc7.childFilesOf(temp) });
    const { counts } = lc7.parseTap(child.tapText);
    assert.deepEqual([counts.skipped, counts.todo, counts.timeouts >= 1, counts.fail >= 1], [1, 1, true, true]);
    const result = lc7.judgeRun({ denominator: [A], lcovText: lcovOf([[A, 1, 1]]), tapText: child.tapText, run: child.run });
    assert.equal(result.verdict, "fail");
    for (const expected of ["skipped:1", "todo:1", "timeout:"]) assert.equal(causesOf(result).includes(expected), true, expected);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test("T12.l6+ U2 の試験の全体を子 process で 1 回流し、行の網羅率が分母の全 file で 100%・skip・todo・cancelled・timeout が 0 であることを記録する", { timeout: 300000 }, (t) => {
  const files = lc7.childFilesOf(path.join(ROOT, "tests"));
  const child = lc7.runCoverageChild({ cwd: ROOT, files });
  const result = lc7.judgeRun({ denominator: lc7.denominatorOf(ROOT), lcovText: child.lcovText, tapText: child.tapText, run: child.run });
  const record = lc7.recordOf(result, { node: process.version, childFiles: files.length });
  t.diagnostic(JSON.stringify(record));
  assert.deepEqual([result.verdict, result.causes, result.observation], ["pass", [], "observed"]);
  assert.equal(record.schema, "working-state-coverage/1");
  assert.equal(record.files.length, lc7.denominatorOf(ROOT).length);
  assert.equal(record.files.every((file) => file.found > 0 && file.hit === file.found), true);
  assert.equal(record.tests.tests > 0, true);
});
