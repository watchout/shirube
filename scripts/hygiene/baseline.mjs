// Numeric baseline shared by the checks that freeze existing excess at introduction (anti-bloat v5 §4.1
// "既存超過の扱い": what is over the limit today must not grow, and only goes down; extended from file length to
// function violations / clones / unused code by owner decision D0, third example -> one helper, S2).
// Rules, for a table { key: value }:
//   a key not in the baseline must be <= newKeyLimit (new_file_lines for files, 0 for violation counts);
//   a key in the baseline must be <= its value (0 is valid); a value above today's measurement is stale -> FAIL
//   unless --ratchet writes the lower value; a key that no longer exists is stale the same way (--ratchet removes it);
//   the number of entries must not exceed maxEntries (set at introduction);
//   --init writes today's over-limit measurements when no baseline exists yet (introduction PR only, reviewed).
// Raising a value or adding an entry by hand is an owner line (verified by W3 later). The helper never raises.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readJson } from "./lib.mjs";

export function loadBaseline(path) {
  if (!existsSync(path)) return {};
  const b = readJson(path);
  for (const [k, v] of Object.entries(b)) {
    if (!Number.isInteger(v) || v < 0) throw new Error(`baseline ${k}: value must be a non-negative integer`);
  }
  return b;
}

function write(path, table) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(table, null, 2)}\n`);
}

function initialize(current, baselinePath, newKeyLimit) {
  const table = Object.fromEntries([...current].filter(([, v]) => v > newKeyLimit).sort());
  write(baselinePath, table);
  return { failures: [], entries: Object.keys(table).length, ratcheted: [], initialized: true };
}

function compare(current, baseline, newKeyLimit, noun) {
  const failures = [];
  const lowered = {};
  for (const [k, v] of current) {
    if (!(k in baseline)) { if (v > newKeyLimit) failures.push({ [noun]: k, value: v, max: newKeyLimit, why: `new ${noun} over limit` }); }
    else if (v > baseline[k]) failures.push({ [noun]: k, value: v, max: baseline[k], why: "grew past baseline" });
    else if (v < baseline[k]) lowered[k] = v;
  }
  return { failures, lowered };
}

// Stale entries (value above today's measurement, or key gone): --ratchet lowers / removes them, otherwise they fail.
function settleStale({ baselinePath, baseline, lowered, gone, noun, ratchet, failures }) {
  const stale = [...Object.keys(lowered), ...gone];
  if (!stale.length) return stale;
  if (!ratchet) {
    failures.push({ keys: stale, why: `${noun} measurement went down or the ${noun} no longer exists, but the baseline was not lowered (run with --ratchet)` });
    return stale;
  }
  const next = { ...baseline, ...lowered };
  for (const k of gone) delete next[k];
  write(baselinePath, next);
  return stale;
}

// current: Map<key, integer> measured now. Returns { failures, entries, ratcheted, initialized }.
export function judgeBaseline({ current, baselinePath, newKeyLimit, maxEntries, limitName, noun, ratchet = false, init = false }) {
  if (init && !existsSync(baselinePath)) return initialize(current, baselinePath, newKeyLimit);
  const baseline = loadBaseline(baselinePath);
  const { failures, lowered } = compare(current, baseline, newKeyLimit, noun);
  const gone = Object.keys(baseline).filter((k) => !current.has(k));
  const entries = Object.keys(baseline).length;
  if (entries > maxEntries) failures.push({ why: `baseline has ${entries} entries, more than ${limitName}=${maxEntries}` });
  const stale = settleStale({ baselinePath, baseline, lowered, gone, noun, ratchet, failures });
  return { failures, entries, ratcheted: ratchet ? stale : [], initialized: false };
}
