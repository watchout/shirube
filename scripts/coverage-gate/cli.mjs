// The entry point: node scripts/coverage-gate/cli.mjs --input <path> --result <path>
// Order is fixed: check the arguments, read the run id, remove the old result, check the input, measure, judge, write.
// Exit 0 = nothing to fail on, 1 = a verdict that fails, 2 = no verdict was reached (bad input, bad invocation, an
// output that could not be written, an unexpected exception). An entry failure is one JSON line on stderr and no result.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { trackedFiles } from "../hygiene/lib.mjs";
import { FILE_IO, emitOutputs, removeOldResult } from "./emit.mjs";
import { checkInput } from "./input.mjs";
import { judge } from "./judge.mjs";
import { measureNode } from "./measure-node.mjs";
import { MESSAGES, buildDocument, buildInputFailureDocument } from "./report.mjs";
import { resolveInput } from "./resolve.mjs";

const RUN_ID_PART = /^\d+$/u;
const RUN_ID_MAX_LENGTH = 64;
const OPTION_NAMES = new Set(["--input", "--result"]);

class EntryError extends Error {
  constructor(code, message = MESSAGES[code]) {
    super(message);
    this.code = code;
  }
}

// Exactly "--input <value> --result <value>", in either order, each once, each value non-empty and not an option.
function parseArguments(argv) {
  if (argv.length !== 4) throw new EntryError("ENTRY_ARGUMENTS_INVALID");
  const found = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const [name, value] = [argv[i], argv[i + 1]];
    if (!OPTION_NAMES.has(name) || found.has(name) || value === "" || value.startsWith("--")) throw new EntryError("ENTRY_ARGUMENTS_INVALID");
    found.set(name, value);
  }
  return { input: found.get("--input"), result: found.get("--result") };
}

// The result path is deleted at the start, so it must never be the input or a tracked file, and its folder must exist.
function checkResultPath({ cwd, input, result }) {
  const resultPath = resolve(cwd, result);
  const parent = dirname(resultPath);
  const inside = relative(cwd, resultPath);
  const tracked = !inside.startsWith("..") && trackedFiles(cwd).includes(inside);
  const parentOk = existsSync(parent) && statSync(parent).isDirectory();
  if (resultPath === resolve(cwd, input) || tracked || !parentOk) throw new EntryError("ENTRY_ARGUMENTS_INVALID");
  return resultPath;
}

function readRunId(env) {
  const [id, attempt] = [env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT];
  if (id === undefined && attempt === undefined) return "local";
  const runId = `${id}-${attempt}`;
  if (!RUN_ID_PART.test(id ?? "") || !RUN_ID_PART.test(attempt ?? "") || runId.length > RUN_ID_MAX_LENGTH) throw new EntryError("ENTRY_ENVIRONMENT_INVALID");
  return runId;
}

function readTextOrNull(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

const destination = (value) => (value === undefined || value === "" ? null : value);

// Produces the document for this run: an input failure, or the judged measurement.
async function produceDocument({ cwd, runId, inputPath, measure }) {
  const checked = checkInput(readTextOrNull(inputPath));
  if (!checked.ok) return buildInputFailureDocument({ runId, failure: checked.failure });
  const resolved = resolveInput(cwd, checked.input);
  if (!resolved.ok) return buildInputFailureDocument({ runId, failure: resolved.failure });
  const { denominatorPaths, requiredTestPaths } = resolved;
  const measurement = await measure({ cwd, runId, input: checked.input, requiredTestPaths });
  const verdict = judge({ denominatorPaths, requiredTestPaths, measurement });
  return buildDocument({ runId, declaredTargets: checked.input.declaredTargets, denominatorPaths, measurement, verdict });
}

function entryFailure(stderr, error) {
  const known = error instanceof EntryError;
  const code = known ? error.code : "ENTRY_ENVIRONMENT_INVALID";
  const message = known ? error.message : `${MESSAGES[code]} Unexpected ${error?.name ?? "error"}.`;
  stderr.write(`${JSON.stringify({ code, message })}\n`);
  return 2;
}

export async function runCli({ argv, env, cwd, stdout, stderr, measure = measureNode, io = {} }) {
  const files = { ...FILE_IO, ...io };
  try {
    const args = parseArguments(argv);
    const resultPath = checkResultPath({ cwd, ...args });
    const runId = readRunId(env);
    if (!removeOldResult(resultPath, files)) throw new EntryError("ENTRY_OUTPUT_FAILED");
    const document = await produceDocument({ cwd, runId, inputPath: resolve(cwd, args.input), measure });
    const emitted = emitOutputs({ document, resultPath, summaryPath: destination(env.GITHUB_STEP_SUMMARY), outputPath: destination(env.GITHUB_OUTPUT), writeNotice: (line) => stdout.write(line), io: files });
    if (emitted.failed.length > 0) throw new EntryError("ENTRY_OUTPUT_FAILED", `${MESSAGES.ENTRY_OUTPUT_FAILED} (${emitted.failed.join(", ")})`);
    return document.inputFailure !== null ? 2 : Number(document.shouldFail);
  } catch (error) {
    return entryFailure(stderr, error);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli({ argv: process.argv.slice(2), env: process.env, cwd: process.cwd(), stdout: process.stdout, stderr: process.stderr });
}
