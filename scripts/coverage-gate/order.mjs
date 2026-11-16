// The one place that orders paths. Code-point order = UTF-8 byte order, so the comparison is on bytes
// (a plain string comparison is UTF-16 order and differs for characters outside the BMP). Pure.

export function compareCodePoint(a, b) {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

// Builds each byte string once, not once per comparison.
export function sortPaths(paths) {
  return paths
    .map((path) => ({ path, bytes: Buffer.from(path, "utf8") }))
    .sort((x, y) => Buffer.compare(x.bytes, y.bytes))
    .map((entry) => entry.path);
}
