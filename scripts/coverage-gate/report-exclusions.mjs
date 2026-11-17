// The wording of the exclusions in the outputs. Pure: it takes the one result document and returns lines or a sentence.
// It decides nothing about the run; the document already says which files were excluded and of what kind. The list
// limit is given by the caller, so this file holds no number of its own. Free text goes through the same sanitizing as file names.
import { EXCLUSION_KINDS } from "./exclusions.mjs";
import { summaryPath } from "./sanitize.mjs";

const countOf = (document, kind) => document.exclusions.filter((item) => item.kind === kind).length;

// The line that says how many files were left out and of which kind. The counts are made again from the list in the
// document. It follows the threshold line when there is one, so the lead is the head without its closing blank line.
export function headWithExclusions(head, document) {
  if (document.exclusions.length === 0) return [...head];
  const lead = head.length === 0 ? [] : head.slice(0, -1);
  const counts = EXCLUSION_KINDS.map((kind) => `${kind} ${countOf(document, kind)}`).join(", ");
  return [...lead, `Excluded from the gate: ${document.exclusions.length} (${counts})`, ""];
}

export function exclusionSection(document, limit) {
  const items = document.exclusions;
  if (items.length === 0) return [];
  const shown = items.slice(0, limit).map(({ path, kind, reason }) => `- ${summaryPath(path)} (${kind}): ${summaryPath(reason)}`);
  const rest = items.length - limit;
  return ["", `Excluded files (${items.length}):`, ...shown, ...(rest > 0 ? [`- and ${rest} more (the full list is in the result file)`] : [])];
}

// One fixed sentence with the count only, added after the notice's own text. The reason is never in a notice.
export function exclusionNotice(document) {
  return document.exclusions.length === 0 ? "" : ` Exclusions: ${document.exclusions.length}.`;
}
