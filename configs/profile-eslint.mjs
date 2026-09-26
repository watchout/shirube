// Shared glue for the two ESLint configs: the same profile decides files, ignores and parser for BOTH runs
// (anti-bloat v5 §4.1: "対象一覧・parser・除外は両実行とも同じ profile"; audit B03).
// Plugins and parsers resolve from the consumer repository (process.cwd()), never from this file's location.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const consumerRequire = createRequire(join(process.cwd(), "package.json"));

const PROFILE = process.env.SHIRUBE_PROFILE || ".shirube/hygiene-profile.md";
const JS = ["**/*.{js,mjs,cjs,jsx}"];
const TS = ["**/*.{ts,tsx,mts,cts}"];

function readProfileBlock() {
  const m = readFileSync(join(process.cwd(), PROFILE), "utf8").match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`profile has no \`\`\`json block: ${PROFILE}`);
  return JSON.parse(m[1]);
}

// Returns config objects: one for JS, and one for TS when the profile adopts TypeScript (parser required, fail closed).
export function profileConfigs(rules) {
  const p = readProfileBlock();
  const ignores = [...(p.lines?.exclude || []), ...(p.exclude_generated || []), "node_modules/**", ".shirube-tools/**"];
  // basePath: patterns are relative to the consumer repository, not to this config file's directory
  // (the configs live in .shirube-tools/configs when called from a consumer).
  // A config object with only `ignores` is a GLOBAL ignore; `ignores` next to `files` would only scope that object.
  const globalIgnores = { basePath: process.cwd(), ignores };
  // JSX is in the covered set (LANGUAGE_EXTENSIONS), so the default parser must accept it (review R03).
  const jsx = { ecmaFeatures: { jsx: true } };
  const base = { basePath: process.cwd(), files: JS, languageOptions: { parserOptions: jsx }, rules };
  if (p.language !== "ts") return [globalIgnores, base];
  let parser;
  try { parser = consumerRequire("@typescript-eslint/parser"); } catch { throw new Error("profile.language is ts but @typescript-eslint/parser is not installed in the consumer repository"); }
  return [globalIgnores, base, { ...base, files: TS, languageOptions: { parser, parserOptions: jsx } }];
}
