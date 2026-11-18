// U2 項目の一覧（initialCatalog）と、一覧の読み方の既定（失敗側）。項目の一覧は 1 か所だけが持つ（S3）。
// 許される形式の検査は value-exposure.mjs が持つ。ここは項目・出典・正規化・答えやすさだけを持つ純粋な値。
// 時刻・乱数・環境変数・file・子 process・network を使わない（S4）。
import { deepFreeze } from "./canonical.mjs";
import { ELEMENT_SHAPES } from "./value-exposure.mjs";

export const SOURCE_KINDS = Object.freeze(["sds_pin", "aidlc_version", "aidlc_settings", "claude_settings", "workflow_caller", "tool_probe", "remote_metadata"]);
export const TARGET_BINDINGS = Object.freeze(["by-location", "named"]);
export const NORMALIZATIONS = Object.freeze(["exact", "lowercase-hex", "version-compare"]);

const DEFAULT_NORMALIZATION = "exact";
const DEFAULT_ELEMENT_SHAPE = "string";
const DEFAULT_TARGET_BINDING = "named";

// 初期の項目は、どの出典も必須で、対象の根の下の位置で読む（設計の initialCatalog）。
const source = (kind) => ({ kind, requiredForConfirmed: true, targetBinding: "by-location" });
const item = (itemKey, valueType, kinds, rest) => ({ itemKey, valueType, sources: kinds.map(source), ...rest });
const version = (itemKey, kind) => item(itemKey, "version", [kind], { normalization: "version-compare", userAnswerable: false });

export const INITIAL_CATALOG = deepFreeze([
  item("sds_commit", "commit-oid", ["sds_pin", "workflow_caller"], { normalization: "lowercase-hex", userAnswerable: false }),
  version("kit_version", "sds_pin"),
  version("aidlc_version", "aidlc_version"),
  item("aidlc_settings", "list", ["aidlc_settings"], { userAnswerable: true, elementShape: "setting-pair" }),
  item("protected_paths", "list", ["sds_pin"], { userAnswerable: false }),
  version("tool_node", "tool_probe"),
  version("tool_aidlc", "tool_probe"),
]);

// 一覧に入れず、確認済みとも示さない項目（Q5 = A）。扱う単位と出典は別に決める。
export const NOT_HANDLED_BY_U2 = deepFreeze([
  { itemKey: "required_checks", reason: "出典の割当（workflow_caller と sds_pin）が実物の位置・形式と突き合わせられていない。扱う単位と出典は、別に決める" },
]);

const ITEMS = new Map(INITIAL_CATALOG.map((entry) => [entry.itemKey, entry]));
const NOT_HANDLED = new Map(NOT_HANDLED_BY_U2.map((entry) => [entry.itemKey, entry]));

// Map で引くので、継承された名前（__proto__・constructor など）や型違いの名前は項目として返らない。
export const findItem = (itemKey) => ITEMS.get(itemKey);
export const findNotHandled = (itemKey) => NOT_HANDLED.get(itemKey);

// 書かれていない・不正な requiredForConfirmed は必須（false と明記された時だけ任意）。
export const isRequiredSource = (sourceEntry) => sourceEntry?.requiredForConfirmed !== false;

// 書かれていない・不正な targetBinding は named（出典が対象を名指す必要がある側）。
export const targetBindingOf = (sourceEntry) => (sourceEntry?.targetBinding === "by-location" ? "by-location" : DEFAULT_TARGET_BINDING);

// 書かれていない・不正な normalization は exact（最も厳しい比べ方）。
export const normalizationOf = (entry) => (NORMALIZATIONS.includes(entry?.normalization) ? entry.normalization : DEFAULT_NORMALIZATION);

// 書かれていない・未知の要素の形は string（list の既定）。
export const elementShapeOf = (entry) => (ELEMENT_SHAPES.includes(entry?.elementShape) ? entry.elementShape : DEFAULT_ELEMENT_SHAPE);
