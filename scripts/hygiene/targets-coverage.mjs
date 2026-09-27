// Coverage guard (audit B03): every source file under the scan targets must be covered by the profile's language
// (and the workflow's python input). A TypeScript file in a JS-only profile, or a Python file without the python
// input, is a silent gap in the ESLint / ruff runs — this check turns it into a FAIL that names the files.
// Usage: node targets-coverage.mjs --profile <md> --targets "src bin" [--python true] [--cwd .]
import { join } from "node:path";
import { main, readProfile, trackedFiles, extensionOf, LANGUAGE_EXTENSIONS, report } from "./lib.mjs";

const CHECK = "targets-coverage";
const CODE_EXTENSIONS = new Set([...LANGUAGE_EXTENSIONS.ts, ...LANGUAGE_EXTENSIONS.python]);

function run(args) {
  const cwd = args.cwd || process.cwd();
  const profile = readProfile(join(cwd, args.profile || ".shirube/hygiene-profile.md"), { today: args.today });
  const targets = String(args.targets || "src").split(/\s+/).filter(Boolean);
  const include = targets.map((t) => (t === "." ? "**" : `${t.replace(/\/$/, "")}/**`));
  const covered = new Set(LANGUAGE_EXTENSIONS[profile.language]);
  if (String(args.python) === "true") for (const e of LANGUAGE_EXTENSIONS.python) covered.add(e);
  const files = trackedFiles(cwd, { include, exclude: [...profile.lines.exclude, ...profile.exclude_generated] });
  const uncovered = files.filter((f) => CODE_EXTENSIONS.has(extensionOf(f)) && !covered.has(extensionOf(f)));
  return report(CHECK, uncovered.length ? "FAIL" : "PASS", { language: profile.language, files: files.length, uncovered });
}

main(CHECK, run);
