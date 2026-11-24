// CI-COST-REDUCE (1): a pull request that changes only documents skips the heavy tests. The judgment is made by scripts/ci/scope.mjs
// and exposed by the composite action .github/actions/ci-scope. Fail closed: docs only when EVERY changed path is proven a document;
// an empty list, an unreadable diff, an odd path or a path no allow glob names runs the full tests (scope "code").
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { classify, DEFAULT_ALLOW, globToRegExp, parseRaw } from "../scripts/ci/scope.mjs";

const root = resolve(import.meta.dirname, "..");
// An entry is a path with its git mode before and after (100644 = a plain file); a bare path is a plain file changed in place.
const entries = (paths) => (Array.isArray(paths) ? paths.map((path) => ({ path, old: "100644", new: "100644" })) : paths);
const scope = (paths, allow = DEFAULT_ALLOW) => classify(entries(paths), allow).scope;

test("S1 only documents: every path is allowed and none is code", () => {
  assert.equal(scope(["docs/sds/audit-method.md", "README.md", "aidlc/spaces/default/x.md", "docs/img/a.png"]), "docs");
});

test("S2 one code path makes the whole change code, wherever the documents are", () => {
  for (const code of ["scripts/sds/gate.mjs", "tests/a.test.mjs", "src/x.ts", "package.json", "package-lock.json", "docs/tool.mjs", "docs/run.sh", "docs/a.yml"]) {
    assert.equal(scope(["docs/a.md", code]), "code", code);
  }
});

test("S3 protected and tool directories are code even when a glob names them, and so is a root dotfile", () => {
  for (const path of [".github/workflows/ci.yml", ".shirube/hygiene-profile.md", ".claude/rules/a.md", ".codex/a.md", "CODEOWNERS", ".gitignore"]) {
    assert.equal(scope([path], ["**", "*.md", ".*"]), "code", path);
  }
});

test("S4 fail closed: nothing, an unreadable value, or a path no glob names is code", () => {
  assert.equal(scope([]), "code");
  assert.equal(scope(undefined), "code");
  assert.equal(scope(["docs/a.md"], []), "code");
  assert.equal(classify(entries(["docs/a.md"]), undefined).scope, "code", "classify itself has no default allow list");
  assert.equal(scope(["lib/notes.md"]), "code");
  assert.equal(scope([""]), "code");
  assert.equal(scope([42]), "code");
});

test("S5 odd paths are code: a parent segment, an absolute path, a backslash, a control character, a newline", () => {
  for (const path of ["docs/../src/a.mjs", "../docs/a.md", "/docs/a.md", "docs\\a.md", "docs/a\u0000.md", "docs/a\nb.md", "docs//a.md", "./docs/a.md"]) {
    assert.equal(scope([path]), "code", JSON.stringify(path));
  }
});

test("S6 a bad allow glob (parent, absolute, empty, not a string) makes the change code, never docs", () => {
  for (const glob of ["../docs/**", "/docs/**", "", 7, "docs/../x/**"]) assert.equal(scope(["docs/a.md"], [glob, "docs/**"]), "code", String(glob));
});

test("S7 globs: ** crosses directories, * stays inside one, and nothing else is special", () => {
  assert.equal(globToRegExp("docs/**").test("docs/a/b/c.md"), true);
  assert.equal(globToRegExp("docs/*").test("docs/a/b.md"), false);
  assert.equal(globToRegExp("*.md").test("README.md"), true);
  assert.equal(globToRegExp("*.md").test("docs/README.md"), false);
  assert.equal(globToRegExp("docs/a.b").test("docs/aXb"), false);
  assert.equal(globToRegExp("docs/(a)+").test("docs/(a)+"), true);
});

test("S8 the reason names what decided the scope (the first code path, or the count of documents)", () => {
  assert.match(classify(entries(["docs/a.md", "src/x.mjs"]), DEFAULT_ALLOW).reason, /src\/x\.mjs/);
  assert.match(classify(entries(["docs/a.md", "docs/b.md"]), DEFAULT_ALLOW).reason, /2 document/);
  assert.match(classify(entries([]), DEFAULT_ALLOW).reason, /no changed path/);
});

// Review F-02: the allow glob names a place, not a kind. A path is a document only when its KIND is one (an allowed extension).
test("S2b a path under docs/ is code unless its kind is a document: source, scripts, binaries, manifests, data, svg, no extension", () => {
  for (const path of ["docs/sample.c", "docs/plugin.php", "docs/run.ps1", "docs/app.wasm", "docs/package.dev.json", "docs/items.json", "docs/a.svg", "docs/LICENSE", "docs/a.md.sh", "docs/md", "docs/.hidden.md", "docs/.vuepress/a.md"]) {
    assert.equal(scope([path]), "code", path);
  }
  for (const path of ["docs/a.md", "docs/a.MD", "docs/guide.mdx", "docs/n.txt", "docs/r.rst", "docs/i.adoc", "docs/a.png", "docs/p.JPG", "docs/p.jpeg", "docs/g.gif", "docs/w.webp", "docs/p.pdf"]) {
    assert.equal(scope([path]), "docs", path);
  }
});

// Review F-01: the diff's modes say whether a changed path is a plain file. Only 100644 (or the absent side of an add or a delete) is.
test("S2c a mode other than a plain file, on either side, is code: executable, symlink, submodule, a type change, no side at all", () => {
  const one = (old, now) => classify([{ path: "docs/a.md", old, new: now }], DEFAULT_ALLOW).scope;
  assert.equal(one("100644", "100644"), "docs");
  assert.equal(one("000000", "100644"), "docs", "a document added");
  assert.equal(one("100644", "000000"), "docs", "a document deleted");
  for (const [old, now] of [["100755", "100755"], ["100644", "100755"], ["100755", "100644"], ["120000", "120000"], ["100644", "120000"], ["120000", "100644"], ["000000", "160000"], ["000000", "100755"], ["000000", "000000"], ["100664", "100644"], [undefined, "100644"], ["100644", null]]) {
    assert.equal(one(old, now), "code", `${old} -> ${now}`);
  }
  assert.equal(classify([null], DEFAULT_ALLOW).scope, "code");
  assert.equal(classify([{ old: "100644", new: "100644" }], DEFAULT_ALLOW).scope, "code", "an entry with no path");
  assert.match(classify([{ path: "docs/run.md", old: "100755", new: "100755" }], DEFAULT_ALLOW).reason, /not a plain regular file.*100755/);
});

// The command, against a real git history.
const git = (cwd, ...args) => {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
};
function repo(commits) {
  const dir = mkdtempSync(join(tmpdir(), "ci-scope-"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "t@example.invalid");
  git(dir, "config", "user.name", "t");
  const shas = [];
  for (const files of commits) {
    for (const [path, text] of Object.entries(files)) {
      if (text === null) git(dir, "rm", "-q", path);
      else { mkdirSync(join(dir, path, ".."), { recursive: true }); writeFileSync(join(dir, path), text); git(dir, "add", path); }
    }
    git(dir, "commit", "-q", "-m", "c");
    shas.push(git(dir, "rev-parse", "HEAD"));
  }
  return { dir, shas };
}
const cli = (cwd, args, env = {}) => spawnSync(process.execPath, [join(root, "scripts/ci/scope.mjs"), ...args], { cwd, encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: "", ...env } });
const verdict = (r) => JSON.parse(r.stdout.trim().split("\n").at(-1));

test("S9 the command: a documents-only pull request is docs, a code one is code, a rename out of code is code", () => {
  const { dir, shas } = repo([
    { "docs/a.md": "a\n", "src/x.mjs": "x\n" },
    { "docs/b.md": "b\n" },
    { "docs/c.md": "c\n", "src/x.mjs": "y\n" },
  ]);
  try {
    const run = (base, head) => verdict(cli(dir, ["--event", "pull_request", "--base", base, "--head", head]));
    assert.equal(run(shas[0], shas[1]).scope, "docs");
    assert.equal(run(shas[1], shas[2]).scope, "code");
    git(dir, "mv", "src/x.mjs", "docs/x.md");
    git(dir, "commit", "-q", "-m", "rename");
    const renamed = verdict(cli(dir, ["--event", "pull_request", "--base", shas[2], "--head", git(dir, "rev-parse", "HEAD")]));
    assert.equal(renamed.scope, "code", "the old path src/x.mjs is listed too (--no-renames)");
    assert.match(renamed.reason, /src\/x\.mjs/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Review F-01 against a real history: an executable bit and symlinks change no content the old name-only listing could show.
test("S9b the command reads the real modes: an executable bit, a symlink added, retargeted or swapped for a file is code; a plain edit is docs", () => {
  const { dir, shas } = repo([{ "docs/run.md": "echo hi\n", "docs/a.md": "a\n", "docs/b.md": "b\n" }]);
  const commit = (message) => { git(dir, "commit", "-q", "-m", message); shas.push(git(dir, "rev-parse", "HEAD")); };
  const run = (from, to) => verdict(cli(dir, ["--event", "pull_request", "--base", shas[from], "--head", shas[to]]));
  try {
    git(dir, "update-index", "--chmod=+x", "docs/run.md");
    commit("exec bit");
    symlinkSync("a.md", join(dir, "docs/cur.md"));
    git(dir, "add", "docs/cur.md");
    commit("symlink added");
    git(dir, "rm", "-q", "-f", "docs/cur.md");
    symlinkSync("b.md", join(dir, "docs/cur.md"));
    git(dir, "add", "docs/cur.md");
    commit("symlink retargeted");
    git(dir, "rm", "-q", "-f", "docs/a.md");
    symlinkSync("b.md", join(dir, "docs/a.md"));
    git(dir, "add", "docs/a.md");
    commit("file swapped for a symlink");
    writeFileSync(join(dir, "docs/b.md"), "b2\n");
    git(dir, "add", "docs/b.md");
    commit("plain edit");
    for (const [from, to, why] of [[0, 1, /docs\/run\.md.*100644 -> 100755/], [1, 2, /docs\/cur\.md.*000000 -> 120000/], [2, 3, /docs\/cur\.md.*120000 -> 120000/], [3, 4, /docs\/a\.md.*100644 -> 120000/]]) {
      const r = run(from, to);
      assert.equal(r.scope, "code", String(to));
      assert.match(r.reason, why);
    }
    assert.equal(run(4, 5).scope, "docs", "a plain edit of a plain document");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("S9c the raw diff reader takes whole records only: a cut record, an odd count, an unknown status or a malformed record throws (so the answer is code)", () => {
  const rec = (meta, path) => `${meta}\0${path}\0`;
  const sha = "a".repeat(40);
  const ok = `:100644 100644 ${sha} ${sha} M`;
  assert.deepEqual(parseRaw(rec(ok, "docs/a.md")), [{ path: "docs/a.md", old: "100644", new: "100644" }]);
  assert.deepEqual(parseRaw(""), []);
  for (const bad of [`${ok}\0docs/a.md`, `${ok}\0`, rec(`:100644 100644 ${sha} ${sha} R100`, "docs/a.md"), rec(`:100644 100644 ${sha} ${sha} C`, "docs/a.md"), rec("100644 100644 x y M", "docs/a.md"), rec(":10064 100644 a b M", "docs/a.md"), rec(`${ok} extra`, "docs/a.md")]) {
    assert.throws(() => parseRaw(bad), /git diff --raw/, JSON.stringify(bad));
  }
});

test("S10 the command fails closed: a push, an unknown event, a missing or unknown commit, no arguments", () => {
  const { dir, shas } = repo([{ "docs/a.md": "a\n" }, { "docs/b.md": "b\n" }]);
  try {
    const cases = [
      ["--event", "push", "--base", shas[0], "--head", shas[1]],
      ["--event", "workflow_dispatch", "--base", shas[0], "--head", shas[1]],
      ["--event", "pull_request", "--base", "0".repeat(40), "--head", shas[1]],
      ["--event", "pull_request", "--base", shas[0]],
      ["--event", "pull_request", "--base", "--head", shas[1]],
      ["--event", "pull_request", "--base", "not a sha; echo x", "--head", shas[1]],
      ["--unknown"],
      [],
    ];
    for (const args of cases) {
      const r = cli(dir, args);
      assert.equal(r.status, 0, args.join(" "));
      assert.equal(verdict(r).scope, "code", args.join(" "));
    }
    assert.equal(verdict(cli(dir, ["--event", "pull_request", "--base", shas[0], "--head", shas[1]])).scope, "docs");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("S11 the command takes the allow globs from --allow (one per line) and writes scope and reason to GITHUB_OUTPUT", () => {
  const { dir, shas } = repo([{ "docs/a.md": "a\n" }, { "notes/b.md": "b\n" }]);
  const out = join(dir, "out.txt");
  try {
    const none = verdict(cli(dir, ["--event", "pull_request", "--base", shas[0], "--head", shas[1]]));
    assert.equal(none.scope, "code", "notes/ is not allowed by default");
    const r = cli(dir, ["--event", "pull_request", "--base", shas[0], "--head", shas[1], "--allow", "docs/**\nnotes/**"], { GITHUB_OUTPUT: out });
    assert.equal(verdict(r).scope, "docs");
    assert.match(readFileSync(out, "utf8"), /^scope=docs\nreason=[^\n]+\n$/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// The action: a step in the caller's own job (no new job, no new minute) that passes every input through env, never into the script text.
const action = readFileSync(join(root, ".github/actions/ci-scope/action.yml"), "utf8");
test("S12 the action is a composite step: inputs go through env, the script path is the action's own, outputs are scope and reason", () => {
  assert.match(action, /using: composite/);
  const runs = action.split("\n").filter((line) => /^\s+run:/.test(line) || /^\s{10,}\S/.test(line)).join("\n");
  assert.doesNotMatch(runs, /\$\{\{\s*inputs\./, "no input is written into the script text");
  assert.match(action, /node "\$\{\{ github\.action_path \}\}\/\.\.\/\.\.\/\.\.\/scripts\/ci\/scope\.mjs"/);
  assert.match(action, /outputs:\n\s+scope:\n[\s\S]*?\n\s+reason:/);
  assert.doesNotMatch(action, /continue-on-error|\|\|\s*true|--if-present/);
});
