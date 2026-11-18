// 観測値・回答が共有する判定の関数（LC3 が持つ末端の純粋な関数）。他の部品を import しない。
// この file が valueType ごとの許される形式の表の唯一の持ち主（S3）。項目状態（LC3）の invalid の判定と
// 回答の検査（LC5）は、表を複製せずこの関数を通して使う。BR5.2 の秘密らしさの判定も同じ file に足す。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。

// 文字列の境界: 空白と制御・書式・私用・未割当・単独の surrogate を含まない 1〜256 文字（code point で数える）。
const STRING_RE = /^[^\s\p{C}]{1,256}$/u;
// 版: 数字（1〜9 桁）を . でつないだ 2〜4 個と、任意の接尾辞 1 つ（英数字で始まり、英数字・.・- の 32 文字まで）。
const VERSION_RE = /^[0-9]{1,9}(?:\.[0-9]{1,9}){1,3}(?:[-+][0-9A-Za-z][0-9A-Za-z.-]{0,31})?$/;
const COMMIT_OID_RE = /^[0-9a-fA-F]{40}$/;
// 設定の対（A-08）: key は . でつなぐ 1〜4 個（小文字で始まる英数字、各 32 文字まで）、value は英数字と . _ - の 1〜64 文字。
const SETTING_PAIR_RE = /^[a-z][A-Za-z0-9]{0,31}(?:\.[a-z][A-Za-z0-9]{0,31}){0,3}=[A-Za-z0-9._-]{1,64}$/;

const isText = (value, pattern) => typeof value === "string" && pattern.test(value);

// 要素の形ごとの列の規則。最小の個数・最大の個数・要素の検査。
const LIST_RULES = new Map([
  ["string", { min: 0, max: 256, element: (e) => isText(e, STRING_RE) }],
  ["setting-pair", { min: 1, max: 64, element: (e) => isText(e, SETTING_PAIR_RE) }],
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

// valueType ごとの形（closed = 形式が閉じていて秘密らしい値と区別できる、open = 区別できない）と検査。1 つの表。
const FORMATS = new Map([
  ["string", { form: "open", check: (v) => isText(v, STRING_RE) }],
  ["version", { form: "closed", check: (v) => isText(v, VERSION_RE) }],
  ["commit-oid", { form: "closed", check: (v) => isText(v, COMMIT_OID_RE) }],
  ["list", { form: "open", check: (v, shape) => LIST_RULES.has(shape) && isListOf(v, LIST_RULES.get(shape)) }],
  ["boolean", { form: "closed", check: (v) => v === true || v === false || v === "true" || v === "false" }],
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
