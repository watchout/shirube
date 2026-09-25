// Guard-only check (anti-bloat v5 §4.1 "例外管理 — 専用検査"). Run with:
//   eslint --no-inline-config --max-warnings 0 --config guard-only.config.mjs <targets>
// --no-inline-config makes `/* eslint rule: off */` and inline weakening ineffective for THIS run,
// so an expired exception cannot be hidden by a comment (SRC-W1-04, SRC-W1-06, AB-07, AB-12).
// Rules here are deliberately not repeated in the structural run.
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const commentsModule = require("@eslint-community/eslint-plugin-eslint-comments");
const unicornModule = require("eslint-plugin-unicorn"); // ESM package: require() returns the namespace
const comments = commentsModule.default ?? commentsModule;
const unicorn = unicornModule.default ?? unicornModule;

function tsParser() {
  try { return require("@typescript-eslint/parser"); } catch { return null; }
}

// Disabling the expiry check or the comment guards themselves is the only forbidden disable.
// Rule ids as written in disable comments: the unicorn rule and every rule of this plugin.
const RESTRICTED = ["unicorn/expiring-todo-comments", "@eslint-community/eslint-comments/*"];

const parser = tsParser();
const base = {
  files: ["**/*.{js,mjs,cjs}"],
  plugins: { "@eslint-community/eslint-comments": comments, unicorn },
  rules: {
    "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }],
    "@eslint-community/eslint-comments/no-unlimited-disable": "error",
    "@eslint-community/eslint-comments/no-restricted-disable": ["error", ...RESTRICTED],
    // Expiry works only with BOTH options; without checkDatesOnPullRequests the PR CI would exit 0 (SRC-W1-06).
    "unicorn/expiring-todo-comments": ["error", { checkDates: true, checkDatesOnPullRequests: true, terms: ["todo", "fixme", "xxx"], allowWarningComments: true }],
  },
};

export default parser
  ? [base, { ...base, files: ["**/*.{ts,tsx}"], languageOptions: { parser } }]
  : [base];
