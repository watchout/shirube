// 出典ごとの取り出し（LC2 の内側の純粋な関数）。実際に読んだ中身（file の text・道具の出力）から項目の値を取り出すだけで、
// 宣言・既定値・cache を足さない（BR1.2）。読めて項目が無ければ absent、壊れている・取り出し方が無ければ malformed 側（BR3.4）。
// 取り出す値は生のまま呼び出し元へ返す。分類・保持の判断は LC2（value-exposure の 1 つの関数）が行い、ここは何も保持しない。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。

const MAX_SETTINGS_DEPTH = 8; // aidlc_settings の入れ子を key にする深さの上限（実装で決めた数値。許される key は 4 個までで、深い所は形式の不正へ回る）。

const isPlainRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOwn = (record, key) => Object.hasOwn(record, key);
const value = (v) => ({ presence: "value", value: v });
const ABSENT = Object.freeze({ presence: "absent" });
const MALFORMED = Object.freeze({ presence: "malformed" });

function parseJsonObject(content) {
  if (typeof content !== "string") return { ok: false };
  try {
    const doc = JSON.parse(content);
    return isPlainRecord(doc) ? { ok: true, doc } : { ok: false };
  } catch {
    return { ok: false };
  }
}

const parseText = (content) => (typeof content === "string" ? { ok: true, doc: content } : { ok: false });

// 入れ子の欄を `key.sub=value` の列にする。文字・数・真偽の欄だけが = を持つ。そのほか（null・列・深すぎる所）は
// = の無い要素にして、許される形式の判定で不正にする（値を作らない）。辞書順で決まった順にする。
function flattenSettings(record, prefix, depth) {
  return Object.keys(record).sort().flatMap((key) => {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    const leaf = record[key];
    if (isPlainRecord(leaf)) return depth < MAX_SETTINGS_DEPTH ? flattenSettings(leaf, path, depth + 1) : [path];
    return ["string", "number", "boolean"].includes(typeof leaf) ? [`${path}=${String(leaf)}`] : [path];
  });
}

const SDS_PIN_FIELDS = new Map([["sds_commit", "sds_commit"], ["kit_version", "kit_version"], ["protected_paths", "protected_paths"]]);
const CALLER_USES_RE = /^\s*(?:-\s+)?uses:\s*watchout\/shirube\/\.github\/workflows\/sds-gate\.yml@([^\s#]+)/;

function pickSdsPin(itemKey, doc) {
  const field = SDS_PIN_FIELDS.get(itemKey);
  if (field === undefined) return MALFORMED;
  return hasOwn(doc, field) ? value(doc[field]) : ABSENT;
}

// 実際の uses の行（comment でない行）が指す commit。別々の commit を指す呼び出しが複数あれば、どちらも選ばず malformed。
function pickWorkflowCaller(itemKey, text) {
  if (itemKey !== "sds_commit") return MALFORMED;
  const refs = new Set(text.split(/\r?\n/u).flatMap((line) => CALLER_USES_RE.exec(line)?.slice(1) ?? []));
  if (refs.size > 1) return MALFORMED;
  return refs.size === 0 ? ABSENT : value([...refs][0]);
}

// 出典の種類ごとの {解釈, 項目の取り出し}。1 つの表。表に無い種類（claude_settings・remote_metadata・tool_probe・未知）は解釈しない。
const EXTRACTORS = new Map([
  ["sds_pin", { parse: parseJsonObject, pick: pickSdsPin }],
  ["aidlc_version", { parse: parseText, pick: (itemKey, text) => (itemKey === "aidlc_version" ? value(text.replace(/\r?\n$/u, "")) : MALFORMED) }],
  ["aidlc_settings", { parse: parseJsonObject, pick: (itemKey, doc) => (itemKey === "aidlc_settings" ? value(flattenSettings(doc, "", 1)) : MALFORMED) }],
  ["workflow_caller", { parse: parseText, pick: pickWorkflowCaller }],
]);

// 読んだ中身を解釈する。解釈できなければ { ok: false }（破損・形式不備・取り出し方の無い種類）。
export function parseSourceContent(sourceKind, content) {
  return EXTRACTORS.get(sourceKind)?.parse(content) ?? { ok: false };
}

// 解釈した中身から項目 1 つを取り出す: { presence: "value", value } | { presence: "absent" } | { presence: "malformed" }。
export function pickItem(sourceKind, itemKey, doc) {
  return EXTRACTORS.get(sourceKind)?.pick(itemKey, doc) ?? MALFORMED;
}

const TOOL_VERSION_RE = /(?<![0-9A-Za-z.])v?(\d{1,9}(?:\.\d{1,9}){1,3})(?![0-9A-Za-z.])/u;

// 道具の機械可読な出力から、版の識別（数字を . でつないだ 2〜4 個）だけを取り出す。未加工の出力は返さない。取り出せなければ null。
export function extractToolVersion(output) {
  return typeof output === "string" ? (TOOL_VERSION_RE.exec(output)?.[1] ?? null) : null;
}
