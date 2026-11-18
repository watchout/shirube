// U2 表示の escape（LC6、adapter）。外から来た文字列を、表示先ごとにデータとして出せる形に直すだけを持つ。
// 文言の意味は持たず、他の部品を import しない。核（LC2〜LC5）はこの file を import せず、表示の直前に呼出側が通す。
// 表示先が不明な時は、生の文字列を出さず例外にする。例外の文面は固定で、入力も表示先も写さない。
// 保証の範囲: 構文としての markup・制御・不可視の文字・行の追加。表示する側の機能（自動 link・@ の通知・絵文字の短縮名など）は保証しない。

// 制御・書式・surrogate・私用・未割当の文字（\p{C}）と、行・段落の区切り。見える escape に直す対象。
const UNSAFE = /[\p{C}\u{2028}\u{2029}]/gu;
const SHORT_FORMS = new Map([["\n", "\\n"], ["\r", "\\r"], ["\t", "\\t"]]);
const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/g;

const hexOf = (ch) => ch.codePointAt(0).toString(16);

// 平文: backslash を重ね（入力の 2 文字「\n」と本物の改行を区別する）、危険な文字を \u{hex} か \n・\r・\t に直す。1 行のまま出る。
function toPlain(text) {
  return text.replaceAll("\\", "\\\\").replace(UNSAFE, (ch) => SHORT_FORMS.get(ch) ?? `\\u{${hexOf(ch)}}`);
}

// markdown: 平文の出力の ASCII の記号を、全部 backslash で escape する（CommonMark は任意の ASCII の記号を escape できる）。
// 1 行の中（段落・箇条書き・表の欄）に埋め込む前提で、code span・HTML の属性の中は対象にしない。
function toMarkdown(text) {
  return toPlain(text).replace(ASCII_PUNCTUATION, "\\$&");
}

// JSON: 文字列の literal（引用符つき）。JSON.stringify の escape に、< > & と UNSAFE の文字を \uXXXX で足す（HTML・script への埋め込みでも壊れない）。
const JSON_EXTRA = /[<>&\p{C}\u{2028}\u{2029}]/gu;
const unit = (n) => `\\u${n.toString(16).padStart(4, "0")}`;

function jsonUnits(ch) {
  const code = ch.codePointAt(0);
  if (code <= 0xffff) return unit(code);
  const offset = code - 0x10000;
  return unit(0xd800 + (offset >> 10)) + unit(0xdc00 + (offset & 0x3ff));
}

function toJson(text) {
  return JSON.stringify(text).replace(JSON_EXTRA, jsonUnits);
}

const ESCAPERS = new Map([["plain", toPlain], ["markdown", toMarkdown], ["json", toJson]]);

export const DISPLAY_DESTINATIONS = Object.freeze([...ESCAPERS.keys()]);

export function escapeForDisplay(destination, text) {
  const escaper = ESCAPERS.get(destination);
  if (escaper === undefined) throw new RangeError("unknown display destination");
  if (typeof text !== "string") throw new TypeError("display text must be a string");
  return escaper(text);
}
