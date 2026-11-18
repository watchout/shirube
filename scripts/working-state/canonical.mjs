// 正規の JSON と SHA-256（末端の純粋な関数。LC2・LC5 が観測の事実の digest を作るのに使う）。
// キーを辞書順に並べ、余計な空白を置かない。JSON で表せない値・普通でない object・深すぎる入れ子は例外にし、
// 黙って別の形にしない。例外の文面に入力は写さない。時刻・乱数・環境変数・file を使わない（S4）。
import { createHash } from "node:crypto";

const MAX_DEPTH = 32;

const isScalar = (value) => value === null || typeof value === "boolean" || typeof value === "string" || (typeof value === "number" && Number.isFinite(value));

const isPlainObject = (value) => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

function encodeObject(value, depth) {
  const members = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${encode(value[key], depth + 1)}`);
  return `{${members.join(",")}}`;
}

function encode(value, depth) {
  if (depth > MAX_DEPTH) throw new RangeError("canonical json nesting is too deep");
  if (isScalar(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, (element) => encode(element, depth + 1)).join(",")}]`;
  if (isPlainObject(value)) return encodeObject(value, depth);
  throw new TypeError("value is not representable as canonical json");
}

export function canonicalJson(value) {
  return encode(value, 0);
}

export function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// 入れ子の object・配列をすべて凍結する（出力を後から書き換えられない形にする）。
export function deepFreeze(value) {
  for (const inner of Object.values(value)) {
    if (typeof inner === "object" && inner !== null) deepFreeze(inner);
  }
  return Object.freeze(value);
}

// 値の digest = 正規の JSON の SHA-256。
export function digestOf(value) {
  return sha256Hex(canonicalJson(value));
}
