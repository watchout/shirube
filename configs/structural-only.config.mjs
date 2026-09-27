// Structural check (anti-bloat v5 §4.1): function length and cyclomatic complexity as errors.
// Inline `eslint-disable` comments WITH a description are allowed here (the guard-only run polices them).
// Files, ignores and parser come from the profile via profile-eslint.mjs (same set as the guard-only run).
import { profileConfigs } from "./profile-eslint.mjs";

const FUNCTION_LINES = Number(process.env.SHIRUBE_MAX_LINES_PER_FUNCTION || 50); // 社内予算 (SRC-W1-04)
const COMPLEXITY = Number(process.env.SHIRUBE_MAX_COMPLEXITY || 10); // 社内予算; upstream default is 20

export default profileConfigs({
  "max-lines-per-function": ["error", { max: FUNCTION_LINES, skipBlankLines: true, skipComments: true }],
  complexity: ["error", { max: COMPLEXITY }],
});
