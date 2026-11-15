import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { graphql } from "../scripts/sds/gate.mjs";

// The one GraphQL read of the unit-design judgment, run against a stand-in `gh` that records its arguments.
test("graphql reads the two nodes through one `gh api graphql` call and parses the JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "sds-gate-graphql-")), saved = process.env.PATH;
  try {
    const log = join(dir, "args.txt");
    writeFileSync(join(dir, "gh"), `#!/bin/sh\nprintf '%s\\n' "$@" > '${log}'\nprintf '{"data":{"nodes":[]}}'\n`);
    chmodSync(join(dir, "gh"), 0o755);
    process.env.PATH = `${dir}:${saved}`;
    assert.deepEqual(graphql(["NODE_A", "NODE_B"]), { data: { nodes: [] } });
    const args = readFileSync(log, "utf8").split("\n");
    assert.deepEqual([args[0], args[1]], ["api", "graphql"]);
    assert.equal(args.includes("ids[]=NODE_A") && args.includes("ids[]=NODE_B"), true);
    assert.equal(args.some((a) => a.startsWith("query=query($ids:[ID!]!)")), true);
  } finally { process.env.PATH = saved; rmSync(dir, { recursive: true, force: true }); }
});
