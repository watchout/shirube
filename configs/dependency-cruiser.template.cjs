// Template for the consumer repository's .dependency-cruiser.cjs (anti-bloat v5 §4.2 "中核の境界").
// depcruise --config .dependency-cruiser.cjs <targets>  exits with the number of `error` violations (SRC-W1-03).
// Replace `core` / `adapters` / `bin` with the repository's own layer paths; keep both rules as `error`.
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "core-must-not-import-adapters-or-bin",
      severity: "error",
      comment: "the core decides; adapters and entry points depend on it, never the reverse (Ports & Adapters, T5)",
      from: { path: "^src/core/" },
      to: { path: "^(src/adapters/|bin/)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(generated|fixtures)" },
    tsPreCompilationDeps: true,
    reporterOptions: { text: { highlightFocused: true } },
  },
};
