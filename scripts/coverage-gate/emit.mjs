// Writes the outputs. Each write reports success or failure as a value; nothing here decides what a failure means.
// The result file goes through a new temporary name and a rename, so a half-written result is never left behind and
// a link or file already in the way is never written through. The result path is judged by what it really is
// (real folder, link or not, same file as the input, tracked or not), never by how it is spelled.
import { randomBytes } from "node:crypto";
import { appendFileSync, closeSync, constants, existsSync, fsyncSync, lstatSync, openSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { renderJson, renderNotice, renderOutputs, renderSummary } from "./report.mjs";

const CREATE_NEW_NO_LINKS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;

// Creates the file only if nothing is at that name (a link or a file is never opened), private to the owner, flushed to disk.
function createNew(path, text) {
  const descriptor = openSync(path, CREATE_NEW_NO_LINKS, 0o600);
  let flushed = false;
  try {
    writeFileSync(descriptor, text);
    fsyncSync(descriptor);
    flushed = true;
  } finally {
    closeSync(descriptor);
    if (!flushed) rmSync(path, { force: true });
  }
}

export const FILE_IO = Object.freeze({ write: createNew, append: appendFileSync, rename: renameSync, remove: rmSync, exists: existsSync, token: () => randomBytes(8).toString("hex") });

function attempt(action) {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}

const orNull = (read) => {
  try {
    return read();
  } catch {
    return null;
  }
};

// The real path of the folder plus the file name, or null when the folder is missing or is not a folder.
function realTarget(cwd, path) {
  const absolute = resolve(cwd, path);
  const folder = orNull(() => realpathSync(dirname(absolute)));
  return folder !== null && statSync(folder).isDirectory() ? join(folder, basename(absolute)) : null;
}

function sameFile(a, b) {
  const [x, y] = [orNull(() => statSync(a)), orNull(() => statSync(b))];
  return x !== null && y !== null && x.dev === y.dev && x.ino === y.ino;
}

function isTracked(root, target, tracked) {
  const inside = relative(root, target);
  return inside !== ".." && !inside.startsWith(`..${sep}`) && tracked().includes(inside.split(sep).join("/"));
}

// Returns the real path the result may be written to, or null. Refused: a missing folder, a path that is already a
// link or a folder, the input itself (by name or by file identity), and any tracked file of the repository.
export function guardResultPath({ cwd, input, result, tracked }) {
  const target = realTarget(cwd, result);
  const root = orNull(() => realpathSync(cwd));
  if (target === null || root === null) return null;
  const existing = orNull(() => lstatSync(target));
  const refused = (existing !== null && !existing.isFile()) || target === realTarget(cwd, input) || sameFile(target, resolve(cwd, input)) || isTracked(root, target, tracked);
  return refused ? null : target;
}

// Removes the result of an earlier run. True only when the file is gone afterwards.
export function removeOldResult(path, io = FILE_IO) {
  return attempt(() => io.remove(path, { force: true })) && !io.exists(path);
}

/** @public */
export function writeResult(path, text, io = FILE_IO) {
  const temporary = `${path}.${(io.token ?? FILE_IO.token)()}.tmp`;
  let created = false;
  if (attempt(() => { io.write(temporary, text); created = true; io.rename(temporary, path); })) return true;
  if (created) attempt(() => io.remove(temporary, { force: true }));
  return false;
}

function appendTo(path, text, io) {
  return attempt(() => io.append(path, text));
}

// Writes every output that can be written, in a fixed order, and names each one that failed.
export function emitOutputs({ document, resultPath, summaryPath, outputPath, writeNotice, io = FILE_IO }) {
  const steps = [
    ["result", () => writeResult(resultPath, renderJson(document), io)],
    ["summary", () => summaryPath === null || appendTo(summaryPath, renderSummary(document), io)],
    ["outputs", () => outputPath === null || appendTo(outputPath, renderOutputs(document), io)],
    ["notice", () => attempt(() => writeNotice(`${renderNotice(document)}\n`))],
  ];
  return { failed: steps.filter(([, run]) => !run()).map(([name]) => name) };
}
