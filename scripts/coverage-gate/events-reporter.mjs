// A Node test reporter (loaded by the child with --test-reporter). It writes one JSON line per test:pass / test:fail
// event, and nothing from the tests' own output, so the gate counts events and never reads printed text.
const FORWARDED = new Set(["test:pass", "test:fail"]);

export function mapEvent(event) {
  if (!FORWARDED.has(event.type)) return null;
  const { data } = event;
  if (data === null || typeof data !== "object") return { type: "malformed" };
  return {
    type: event.type,
    file: data.file,
    name: data.name,
    nesting: data.nesting,
    line: data.line,
    column: data.column,
    detailsType: data.details?.type,
    skip: Boolean(data.skip),
    todo: Boolean(data.todo),
  };
}

export default async function* reporter(source) {
  for await (const event of source) {
    const line = mapEvent(event);
    if (line !== null) yield `${JSON.stringify(line)}\n`;
  }
}
