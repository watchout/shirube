import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNotice, sanitizeSummaryText, summaryPath } from "../scripts/coverage-gate/sanitize.mjs";

test("a plain path passes through unchanged", () => {
  assert.equal(sanitizeNotice("src/a.mjs"), "src/a.mjs");
  assert.equal(summaryPath("src/a.mjs"), "`src/a.mjs`");
});

test("notice: percent, CR and LF use the GitHub escapes", () => {
  assert.equal(sanitizeNotice("a%b"), "a%25b");
  assert.equal(sanitizeNotice("a\nb"), "a%0Ab");
  assert.equal(sanitizeNotice("a\rb"), "a%0Db");
  assert.equal(sanitizeNotice("100%0A"), "100%250A");
});

test("notice: other control characters become a question mark", () => {
  assert.equal(sanitizeNotice("a\u0001b\u007fc\u0085d"), "a?b?c?d");
});

test("notice: a hostile name never produces a second line", () => {
  const out = sanitizeNotice("x\n::error::fake\r\n::warning::more");
  assert.ok(!/[\r\n]/.test(out));
  assert.ok(!out.includes("\n::"));
});

test("summary path: backticks cannot break the code span", () => {
  assert.equal(summaryPath("a`b`c"), "`a'b'c`");
  assert.ok(!summaryPath("`` ` ``").slice(1, -1).includes("`"));
});

test("summary path: control characters and line breaks become a question mark", () => {
  assert.equal(summaryPath("a\nb\rc\u0000d\u009fe"), "`a?b?c?d?e`");
});

test("summary path: non-BMP characters and 1,000 characters are kept", () => {
  assert.equal(summaryPath("a\u{1F600}b"), "`a\u{1F600}b`");
  const long = "x".repeat(1000);
  assert.equal(summaryPath(long), `\`${long}\``);
});

test("summary text: control characters become a question mark and nothing else changes", () => {
  assert.equal(sanitizeSummaryText("field\nname\u0007"), "field?name?");
  assert.equal(sanitizeSummaryText("plain `text`"), "plain `text`");
});

test("an empty string stays empty", () => {
  assert.equal(sanitizeNotice(""), "");
  assert.equal(summaryPath(""), "``");
});
