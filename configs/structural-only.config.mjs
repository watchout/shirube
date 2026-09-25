// Structural check (anti-bloat v5 §4.1): function length and cyclomatic complexity as errors.
// Inline `eslint-disable` comments WITH a description are allowed here (the guard-only run polices them).
// Plugins and parsers resolve from the consumer repository (process.cwd()), not from this file's location.
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const FUNCTION_LINES = Number(process.env.SHIRUBE_MAX_LINES_PER_FUNCTION || 50); // 社内予算 (SRC-W1-04)
const COMPLEXITY = Number(process.env.SHIRUBE_MAX_COMPLEXITY || 10); // 社内予算; upstream default is 20

function tsParser() {
  try { return require("@typescript-eslint/parser"); } catch { return null; }
}

const parser = tsParser();
const base = {
  files: ["**/*.{js,mjs,cjs}"],
  rules: {
    "max-lines-per-function": ["error", { max: FUNCTION_LINES, skipBlankLines: true, skipComments: true }],
    complexity: ["error", { max: COMPLEXITY }],
  },
};

export default parser
  ? [base, { ...base, files: ["**/*.{ts,tsx}"], languageOptions: { parser } }]
  : [base];
