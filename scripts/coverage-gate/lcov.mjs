// Converts the text of an lcov file into line records. Pure: no file or clock access.
// Only SF (file), DA (line hit) and the LF/LH totals are used; every other record kind is ignored.
import { posix } from "node:path";
import { sortPaths } from "./order.mjs";

/** @public */
export const LCOV_MAX_BYTES = 64 * 1024 * 1024;

export function isLcovTooLarge(bytes) {
  return bytes > LCOV_MAX_BYTES;
}

const FAILED = Object.freeze({ ok: false, cause: "failed", detail: "The coverage record is broken." });
const NO_RECORDS = Object.freeze({ ok: false, cause: "no_records", detail: "The coverage record has no line records." });
const DA_PATTERN = /^DA:(\d+),(\d+)(?:,[^,]*)?$/u;
const COUNT_PATTERN = /^L[FH]:(\d+)$/u;

// A repo-relative path, or null when the path is outside the working directory.
export function relativeToCwd(raw, cwd) {
  const collapsed = raw.replace(/\/{2,}/gu, "/");
  const rel = posix.isAbsolute(collapsed) ? posix.relative(cwd, collapsed) : posix.normalize(collapsed);
  if (rel === "" || rel === ".." || rel.startsWith("../") || posix.isAbsolute(rel)) return null;
  return rel;
}

function parseDa(line) {
  const match = DA_PATTERN.exec(line);
  if (match === null) return null;
  const lineNumber = Number(match[1]);
  const hitCount = Number(match[2]);
  if (!Number.isSafeInteger(lineNumber) || !Number.isSafeInteger(hitCount) || lineNumber < 1) return null;
  return { lineNumber, hitCount };
}

function startRecord(state, rawPath, cwd) {
  if (state.current !== null) return false;
  state.current = { path: relativeToCwd(rawPath, cwd), lines: [], lf: null, lh: null };
  return true;
}

function addLine(state, text) {
  const da = parseDa(text);
  if (state.current === null || da === null) return false;
  state.current.lines.push(da);
  return true;
}

function setCount(state, text) {
  const match = COUNT_PATTERN.exec(text);
  if (state.current === null || match === null) return false;
  state.current[text.startsWith("LF") ? "lf" : "lh"] = Number(match[1]);
  return true;
}

function totalsAgree(current) {
  const hit = current.lines.filter((l) => l.hitCount > 0).length;
  return (current.lf === null || current.lf === current.lines.length) && (current.lh === null || current.lh === hit);
}

function endRecord(state) {
  const { current } = state;
  if (current === null || !totalsAgree(current)) return false;
  state.current = null;
  if (current.path === null) return true;
  const known = state.files.get(current.path) ?? new Map();
  state.files.set(current.path, known);
  for (const { lineNumber, hitCount } of current.lines) {
    if (known.has(lineNumber)) return false;
    known.set(lineNumber, hitCount);
  }
  return true;
}

function handleLine(state, line, cwd) {
  if (line.startsWith("SF:")) return startRecord(state, line.slice(3), cwd);
  if (line.startsWith("DA:")) return addLine(state, line);
  if (line.startsWith("LF:") || line.startsWith("LH:")) return setCount(state, line);
  if (line === "end_of_record") return endRecord(state);
  return true;
}

function toRecords(files) {
  const measuredPaths = sortPaths([...files.keys()]);
  const records = [];
  for (const path of measuredPaths) {
    const lines = [...files.get(path).entries()].sort((a, b) => a[0] - b[0]);
    for (const [lineNumber, hitCount] of lines) records.push({ path, lineNumber, hitCount });
  }
  return { records, measuredPaths };
}

export function parseLcov(text, cwd) {
  const state = { current: null, files: new Map() };
  for (const line of text.split(/\r?\n/u)) {
    if (!handleLine(state, line, cwd)) return FAILED;
  }
  if (state.current !== null) return FAILED;
  const { records, measuredPaths } = toRecords(state.files);
  if (records.length === 0) return NO_RECORDS;
  return { ok: true, records, measuredPaths };
}
