// 観測値・回答が共有する判定の関数（LC3 が持つ末端の純粋な関数）。他の部品を import しない。
// この file が valueType ごとの許される形式の表の唯一の持ち主（S3）。項目状態（LC3）の invalid の判定と
// 回答の検査（LC5）は、表を複製せずこの関数を通して使う。BR5.2 の秘密らしさの判定（classifyValue）も同じ file が持つ。
// 開いた形の固定の分類（withheld = invalid_format | secret_like）の持ち主もここ: Owner の決定 116・120・122
// （決定 122: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6964964182 、本文 SHA-256 `6662e49d5146bd9846a0bf304044293261a04faf18dfaa8f85da3052313b9304`）。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。

// 文字列の境界: 空白と制御・書式・私用・未割当・単独の surrogate を含まない 1〜256 文字（code point で数える）。
const TEXT_MAX = 256;
const STRING_RE = new RegExp(`^[^\\s\\p{C}]{1,${TEXT_MAX}}$`, "u");
const UNSAFE_CHAR_RE = /[\s\p{C}]/u;
// 版: 数字（1〜9 桁）を . でつないだ 2〜4 個と、任意の接尾辞 1 つ（英数字で始まり、英数字・.・- の 32 文字まで）。
const VERSION_RE = /^[0-9]{1,9}(?:\.[0-9]{1,9}){1,3}(?:[-+][0-9A-Za-z][0-9A-Za-z.-]{0,31})?$/;
const COMMIT_OID_RE = /^[0-9a-fA-F]{40}$/;
// 設定の対（A-08）: key は . でつなぐ 1〜4 個（小文字で始まる英数字、各 32 文字まで）、value は英数字と . _ - の 1〜64 文字。
const SETTING_PAIR_RE = /^[a-z][A-Za-z0-9]{0,31}(?:\.[a-z][A-Za-z0-9]{0,31}){0,3}=[A-Za-z0-9._-]{1,64}$/;

// BR5.2 の秘密らしさの集合の数値（実装で決めた数値。集合の文面は「長い」「連なり」とだけ書いていて、数を決めていない）。
const SECRET_RUN_MIN = 20; // (e) 空白を含まない英数字・記号（+ / _ - =）だけの語の長さ。設計の文面の 20 文字。
const BEARER_WORD_MIN = 16; // (c) `Bearer ` に続く語の長さ。
const JWT_PART_MIN = 10; // (d) JWT の形の先の 2 つの部分の長さ。3 つ目は空でもよい（署名の無い形）。
// (a) 秘密鍵・証明書の見出し行。(b) 既知の token の接頭辞で始まる語。(c) Bearer + 長い語。(d) 3 つの部分を . でつないだ形。(e) 長い連なり。
const KEY_HEADER_RE = /-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----/;
const TOKEN_PREFIXES = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_", "AKIA", "sk-", "xoxb-", "xoxp-"];
const BEARER_RE = new RegExp(`(?:^|\\s)Bearer\\s+\\S{${BEARER_WORD_MIN},}`);
const JWT_RE = new RegExp(`^[A-Za-z0-9_-]{${JWT_PART_MIN},}\\.[A-Za-z0-9_-]{${JWT_PART_MIN},}\\.[A-Za-z0-9_-]*$`);
const RUN_RE = new RegExp(`^[A-Za-z0-9+/_=-]{${SECRET_RUN_MIN},}$`);

const isText = (value, pattern) => typeof value === "string" && pattern.test(value);

// 要素の形ごとの列の規則。最小の個数・最大の個数・要素の検査。
// structural = 要素の形が構造を持ち、(e) の長い連なりがその形で説明できる（自由な文字列の形は構造を持たない）。
const LIST_RULES = new Map([
  ["string", { min: 0, max: TEXT_MAX, structural: false, element: (e) => isText(e, STRING_RE) }],
  ["setting-pair", { min: 1, max: 64, structural: true, element: (e) => isText(e, SETTING_PAIR_RE) }],
]);

// 配列そのもの（穴・余計な値のある配列は受けない）と、個数の範囲と、全要素の検査。
function isListOf(value, rule) {
  if (!Array.isArray(value)) return false;
  const count = value.length;
  if (count < rule.min || count > rule.max || Object.keys(value).length !== count) return false;
  for (let i = 0; i < count; i += 1) {
    if (!rule.element(value[i])) return false;
  }
  return true;
}

// 判定の対象の文字列（文字列でない値は対象にしない。写しも作らない）。
const stringParts = (value) => (typeof value === "string" ? [value] : []);
const listParts = (value) => (Array.isArray(value) ? Array.from(value).filter((e) => typeof e === "string") : []);
const never = () => false;
const isString = (value) => typeof value === "string";

// valueType ごとの形（closed = 形式が閉じていて秘密らしい値と区別できる、open = 区別できない）と検査。1 つの表。
// parts = 秘密らしさを調べる文字列、explains = (e) の長い連なりを項目の許される形式が説明できるか（構造のある形だけ）。
// typed = 値の型が形として合うか（回答を拒む時の理由 invalid_type の根拠。形式の検査 check とは別に、型だけを見る）。
const FORMATS = new Map([
  ["string", { form: "open", check: (v) => isText(v, STRING_RE), typed: isString, parts: stringParts, explains: never }],
  ["version", { form: "closed", check: (v) => isText(v, VERSION_RE), typed: isString, parts: stringParts, explains: (t) => VERSION_RE.test(t) }],
  ["commit-oid", { form: "closed", check: (v) => isText(v, COMMIT_OID_RE), typed: isString, parts: stringParts, explains: (t) => COMMIT_OID_RE.test(t) }],
  [
    "list",
    {
      form: "open",
      check: (v, shape) => LIST_RULES.has(shape) && isListOf(v, LIST_RULES.get(shape)),
      typed: (v) => Array.isArray(v) && Array.from(v).every(isString),
      parts: listParts,
      explains: (t, shape) => LIST_RULES.get(shape).structural && LIST_RULES.get(shape).element(t),
      knows: (shape) => LIST_RULES.has(shape),
    },
  ],
  ["boolean", { form: "closed", check: (v) => v === true || v === false || v === "true" || v === "false", typed: (v) => typeof v === "boolean" || isString(v), parts: stringParts, explains: (t) => t === "true" || t === "false" }],
]);

export const VALUE_TYPES = Object.freeze([...FORMATS.keys()]);
export const ELEMENT_SHAPES = Object.freeze([...LIST_RULES.keys()]);

// 閉じた形（形式に合う値だけ保持・digest の対象）か、開いた形（保持・digest・表示をしない。Owner の決定 120）か。
// 未知の valueType は開いた形（保持しない側）として扱う。
export function valueFormOf(valueType) {
  return FORMATS.get(valueType)?.form ?? "open";
}

// 値が許される形式か。未知の valueType・未知の要素の形・型違い・例外を起こす入力は、どれも false（失敗側）。
// 例外の文面は値を含みうるので、捕まえて捨て、結果を false にするだけにする（入力は写さない）。
export function isAllowedFormat(valueType, value, elementShape = "string") {
  const format = FORMATS.get(valueType);
  if (format === undefined) return false;
  try {
    return format.check(value, elementShape) === true;
  } catch {
    return false;
  }
}

// 固定の分類。入力から作らない定数で、値の一部も例外の文面も含まない。
export const VALUE_CLASSIFICATIONS = Object.freeze(["valid", "invalid_format", "secret_like"]);
const [VALID, INVALID_FORMAT, SECRET_LIKE] = VALUE_CLASSIFICATIONS;

// 1 つの文字列が秘密らしいか（BR5.2 の (a)〜(e)）。explained = 項目の許される形式（構造のある形）が文字列全体を説明する時 (e) だけ外す。
function looksSecret(text, explained) {
  if (KEY_HEADER_RE.test(text) || BEARER_RE.test(text)) return true;
  return text.split(/\s+/u).some((word) => TOKEN_PREFIXES.some((prefix) => word.startsWith(prefix)) || JWT_RE.test(word) || (!explained && RUN_RE.test(word)));
}

// 観測値・回答が共有する判定。値の分類（valid | invalid_format | secret_like）だけを返し、入力は写さない（BR5.2・BR3.4）。
// 秘密らしい形は形式に合っていても secret_like（先に勝つ）。判定できない（未知の valueType・未知の要素の形・例外）時は
// secret_like（fail closed）。型違い・範囲外・形の違いで秘密らしくない時は invalid_format。
export function classifyValue(valueType, value, elementShape = "string") {
  try {
    const format = FORMATS.get(valueType);
    if (format === undefined || format.knows?.(elementShape) === false) return SECRET_LIKE;
    if (format.parts(value).some((text) => looksSecret(text, format.explains(text, elementShape)))) return SECRET_LIKE;
    return format.check(value, elementShape) === true ? VALID : INVALID_FORMAT;
  } catch {
    return SECRET_LIKE;
  }
}

// 秘密らしい（判定できない場合も含む）か。呼ぶ側が分類の並び順や名前を持たず、判定の持ち主（この file）の 1 か所に問う。
export const isSecretLike = (valueType, value, elementShape = "string") => classifyValue(valueType, value, elementShape) === SECRET_LIKE;

// 回答を拒む理由の固定の分類（BR5.1・BR5.2）。入力から作らない定数で、入力の一部も写さない。
// 回答の受付の分類（stale_answer・duplicate_conflict）は値の検査の外なので、回答の部品が持つ。
export const VALUE_REJECTION_REASONS = Object.freeze(["secret_like", "invalid_type", "too_long", "invalid_character", "invalid_format", "out_of_boundary"]);
const [, INVALID_TYPE, TOO_LONG, INVALID_CHARACTER, , OUT_OF_BOUNDARY] = VALUE_REJECTION_REASONS;

const DRIVE_RE = /^[A-Za-z]:[\\/]/;
// 対象の根の外へ出る path: 区切りで始まる・drive 付き・`..` の段を含む（BR5.1 の path の境界）。
const escapesRoot = (text) => /^[\\/]/.test(text) || DRIVE_RE.test(text) || text.split(/[\\/]/u).includes("..");

// 形式に合わない値の理由を、型 → 長さ → 文字 → 形の順で 1 つに絞る。
function refine(format, value, elementShape) {
  if (!format.typed(value)) return INVALID_TYPE;
  const limit = LIST_RULES.get(elementShape)?.max ?? Number.POSITIVE_INFINITY;
  const texts = format.parts(value);
  if (texts.some((text) => [...text].length > TEXT_MAX) || (Array.isArray(value) && value.length > limit)) return TOO_LONG;
  return texts.some((text) => UNSAFE_CHAR_RE.test(text)) ? INVALID_CHARACTER : INVALID_FORMAT;
}

// 回答の値を受け入れてよいか。受け入れてよければ null、だめなら固定の理由を 1 つ返す。分類は classifyValue の 1 回だけ
// （秘密らしさ・許される形式の表の持ち主はこの file の 1 か所）。判定できない・例外を起こす入力は secret_like（失敗側）。
export function rejectionReasonOf(valueType, value, elementShape = "string") {
  const classification = classifyValue(valueType, value, elementShape);
  if (classification === SECRET_LIKE) return SECRET_LIKE;
  try {
    const format = FORMATS.get(valueType);
    if (classification === VALID) return format.parts(value).some(escapesRoot) ? OUT_OF_BOUNDARY : null;
    return refine(format, value, elementShape);
  } catch {
    return SECRET_LIKE;
  }
}
