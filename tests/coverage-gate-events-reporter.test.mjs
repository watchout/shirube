import assert from "node:assert/strict";
import test from "node:test";
import reporter from "../scripts/coverage-gate/events-reporter.mjs";

async function* source(events) {
  yield* events;
}

async function collect(events) {
  const lines = [];
  for await (const line of reporter(source(events))) lines.push(line);
  return lines;
}

const data = (over) => ({ file: "/repo/t/a.test.mjs", name: "adds", nesting: 0, line: 5, column: 1, details: { type: "test" }, ...over });

test("writes one JSON line per pass or fail event", async () => {
  const lines = await collect([{ type: "test:pass", data: data({}) }, { type: "test:fail", data: data({ name: "bad", details: { type: "test", error: new Error("x") } }) }]);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => l.endsWith("\n") && l.indexOf("\n") === l.length - 1));
  assert.deepEqual(JSON.parse(lines[0]), { type: "test:pass", file: "/repo/t/a.test.mjs", name: "adds", nesting: 0, line: 5, column: 1, detailsType: "test", skip: false, todo: false });
  assert.equal(JSON.parse(lines[1]).type, "test:fail");
});

test("skip and todo (a flag or a reason text) become booleans", async () => {
  const lines = await collect([{ type: "test:pass", data: data({ skip: "not now" }) }, { type: "test:pass", data: data({ todo: true }) }]);
  assert.deepEqual(lines.map((l) => [JSON.parse(l).skip, JSON.parse(l).todo]), [[true, false], [false, true]]);
});

test("other event types are not forwarded", async () => {
  const lines = await collect([{ type: "test:start", data: data({}) }, { type: "test:stdout", data: { message: "hi" } }, { type: "test:diagnostic", data: {} }]);
  assert.deepEqual(lines, []);
});

test("a pass or fail event without usable data is written as a malformed marker, never dropped", async () => {
  const lines = await collect([{ type: "test:pass" }, { type: "test:fail", data: null }, { type: "test:pass", data: "text" }]);
  assert.deepEqual(lines.map((l) => JSON.parse(l)), [{ type: "malformed" }, { type: "malformed" }, { type: "malformed" }]);
});

test("a missing details object leaves detailsType unset", async () => {
  const [line] = await collect([{ type: "test:pass", data: data({ details: undefined }) }]);
  assert.equal(JSON.parse(line).detailsType, undefined);
});
