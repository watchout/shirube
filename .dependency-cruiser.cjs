// Self-application of the dependency-direction check (profile "core boundary"):
// scripts/hygiene/*.mjs import only ./lib.mjs and Node built-ins; no cycles anywhere.
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "checks-import-only-lib-and-node",
      severity: "error",
      comment: "a check may depend on lib.mjs and Node built-ins only (no runtime dependencies, handover v5 §1 W1)",
      from: { path: "^scripts/hygiene/(?!lib\\.mjs$)" },
      to: { pathNot: "^(scripts/hygiene/lib\\.mjs$|node:)", dependencyTypesNot: ["core"] },
    },
  ],
  options: { doNotFollow: { path: "node_modules" }, exclude: { path: "(node_modules|tests/fixtures|\\.shirube-tools)" } },
};
