// 値の正規化・版の比較・長さの区分（末端の純粋な関数）。長さの区分の境界はこの file の 1 か所だけが持つ（S3）。
// 比べるための正規化は、同じ値の出典どうしに同じ結果を返すための物で、値の保持ではない（開いた形の値は呼び出しの中で捨てる。Owner の決定 120）。
// 例外の文面に入力は写さない。時刻・乱数・環境変数・file を使わない（S4）。
import { isAllowedFormat } from "./value-exposure.mjs";

// 長さの区分の境界（実装で決めた数値）: 0 = empty、1〜shortMax = short、shortMax+1〜mediumMax = medium、それより長い = long。
export const LENGTH_BUCKET_BOUNDS = Object.freeze({ shortMax: 16, mediumMax: 64 });

// 長さの区分の固定の集合（返す値の全部。表示する側は、この集合に入る値だけを示す）。
export const LENGTH_BUCKETS = Object.freeze(["empty", "short", "medium", "long"]);
const [EMPTY, SHORT, MEDIUM, LONG] = LENGTH_BUCKETS;

export function lengthBucketOf(length) {
  if (!Number.isInteger(length) || length < 0) throw new TypeError("length must be a non-negative integer");
  if (length === 0) return EMPTY;
  if (length <= LENGTH_BUCKET_BOUNDS.shortMax) return SHORT;
  return length <= LENGTH_BUCKET_BOUNDS.mediumMax ? MEDIUM : LONG;
}

// 測る量は valueType ごとに 1 つ: string = code point の数、list = 要素の数。
export function lengthOf(valueType, value) {
  if (valueType === "string" && typeof value === "string") return [...value].length;
  if (valueType === "list" && Array.isArray(value)) return value.length;
  throw new TypeError("value has no length for this valueType");
}

const VERSION_PARTS_RE = /^([0-9.]+)(?:([-+])(.+))?$/;

// 版を（数の列、前置きの接尾辞 | null）に分ける。+ 以降は比べない。形式は呼び出す前に確かめる。
function parseVersion(text) {
  const [, numbers, mark, suffix] = VERSION_PARTS_RE.exec(text);
  return { numbers: numbers.split(".").map(Number), pre: mark === "-" ? suffix : null };
}

const canonicalVersion = (text) => {
  const [, numbers, mark = "", suffix = ""] = VERSION_PARTS_RE.exec(text);
  return `${numbers.split(".").map((part) => String(Number(part))).join(".")}${mark}${suffix}`;
};

const orderOf = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// 3 値の版の比較: -1・0・1。どちらかが版の形でなければ null（比べられない。一致にも不一致にも読み替えない）。
export function compareVersions(a, b) {
  if (!isAllowedFormat("version", a) || !isAllowedFormat("version", b)) return null;
  const left = parseVersion(a);
  const right = parseVersion(b);
  const width = Math.max(left.numbers.length, right.numbers.length);
  for (let i = 0; i < width; i += 1) {
    const order = orderOf(left.numbers[i] ?? 0, right.numbers[i] ?? 0);
    if (order !== 0) return order;
  }
  if (left.pre === right.pre) return 0;
  if (left.pre === null) return 1;
  return right.pre === null ? -1 : orderOf(left.pre, right.pre);
}

const NORMALIZERS = new Map([
  ["lowercase-hex", (value) => value.toLowerCase()],
  ["version-compare", canonicalVersion],
]);

// 形式に合うと判定された値を、比べるための形にする。未知の normalization は何も変えない（比べる側が厳しくなる）。
export function normalizeValue(valueType, normalization, value) {
  if (valueType === "boolean") return String(value);
  if (valueType === "list") return [...value];
  const normalizer = NORMALIZERS.get(normalization);
  return normalizer === undefined ? value : normalizer(value);
}
