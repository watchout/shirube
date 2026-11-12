// Writes the outputs. Each write reports success or failure as a value; nothing here decides what a failure means.
// The result file goes through a temporary name and a rename, so a half-written result is never left behind.
import { appendFileSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { renderJson, renderNotice, renderOutputs, renderSummary } from "./report.mjs";

export const FILE_IO = Object.freeze({ write: writeFileSync, append: appendFileSync, rename: renameSync, remove: rmSync, exists: existsSync });

function attempt(action) {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}

// Removes the result of an earlier run. True only when the file is gone afterwards.
export function removeOldResult(path, io = FILE_IO) {
  return attempt(() => io.remove(path, { force: true })) && !io.exists(path);
}

/** @public */
export function writeResult(path, text, io = FILE_IO) {
  const temporary = `${path}.tmp`;
  if (attempt(() => { io.write(temporary, text); io.rename(temporary, path); })) return true;
  attempt(() => io.remove(temporary, { force: true }));
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
