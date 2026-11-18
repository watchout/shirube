// 観測値・回答が共有する判定の関数（LC3 が持つ末端の純粋な関数）。他の部品を import しない。
// この file が valueType ごとの許される形式の表の唯一の持ち主（S3）。項目状態（LC3）の invalid の判定と
// 回答の検査（LC5）は、表を複製せずこの関数を通して使う。BR5.2 の秘密らしさの判定も同じ file が持ち、外から来る文字列は全部、
// この file の唯一の門（exposesText）を通る。門は生の文字列全体に (a)〜(d) を先に当て、(e) は門の種類が許す時だけ当て、
// 例外（読める名前・形の説明）は門を通った後でだけ (e) を外す。例外は「正しい形か」を決めるだけで、秘密らしさの判定を飛ばさない（Owner の決定 95）。
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
// 語の中のどこに埋まっていても当てる（区切り・引用符・括弧・URL の利用者情報・設定の対の = の後ろ・別の語の末尾の . の後ろ）。
// (b) は直前が英数字でない所（先頭を含む）か %XX（URL の符号化した区切り）の直後にある接頭辞、(c) は直前が英数字でない所の Bearer、(d) は直前が名前の文字でない所から始まる 3 つの部分
// （後ろにも名前の文字・. が続かない。直前の条件は当たる・当たらないを変えず、長い連なりで各位置から数え直す二乗の時間を防ぐ性能の守り）、(e) は語の中の 20 文字以上の連なり。
const KEY_HEADER_RE = /-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----/;
const TOKEN_PREFIXES = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_", "AKIA", "sk-", "xoxb-", "xoxp-"];
const TOKEN_PREFIX_RE = new RegExp(`(?:(?<![A-Za-z0-9])|(?<=%[0-9A-Fa-f]{2}))(?:${TOKEN_PREFIXES.join("|")})`);
const BEARER_RE = new RegExp(`(?<![A-Za-z0-9])Bearer\\s+\\S{${BEARER_WORD_MIN},}`);
const JWT_RE = new RegExp(`(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{${JWT_PART_MIN},}\\.[A-Za-z0-9_-]{${JWT_PART_MIN},}\\.[A-Za-z0-9_-]*(?![A-Za-z0-9_.-])`);
const RUN_RE = new RegExp(`[A-Za-z0-9+/_=-]{${SECRET_RUN_MIN},}`);

// (e) の例外: 読める名前。* を除いて / . - _ で分けた部品（英数字以外の文字を含む部品は読める語にならず、全体も読める名前にならない）が、19 文字以下の小文字・数字だけ、大文字・数字だけ、
// または先頭だけ大文字の語で、さらに数字と英字が混ざった 4 文字以上の部品（16 進・乱数らしい部品）の長さの合計が DENSE_TOTAL_MAX 以下の時。
// 20 文字以上の 1 語・大小文字が混ざった乱数らしい語・UUID のように混ざった部品を区切って並べた形は説明できない。
// 読める path = さらに / か . を含む語（拡張子つきの名前・path。- と _ だけで続く 1 語の名前は含めない）。* は glob の印で、部品の長さに数えない。
const READABLE_WORD_RE = /^(?:[a-z0-9]{1,19}|[A-Z0-9]{1,19}|[A-Z][a-z0-9]{0,18})$/;
const DENSE_PIECE_RE = /^(?=.*[0-9])(?=.*[A-Za-z])[A-Za-z0-9]{4,}$/;
const DENSE_TOTAL_MAX = 16;
function isReadableName(word) {
  const pieces = word.replaceAll("*", "").split(/[/._-]/u).filter((piece) => piece !== "");
  if (!pieces.every((piece) => READABLE_WORD_RE.test(piece))) return false;
  return pieces.filter((piece) => DENSE_PIECE_RE.test(piece)).reduce((total, piece) => total + piece.length, 0) <= DENSE_TOTAL_MAX;
}
const isReadablePath = (word) => /[/.]/.test(word) && isReadableName(word);

const isText = (value, pattern) => typeof value === "string" && pattern.test(value);
const isString = (value) => typeof value === "string";

// (e) に通す語の分け方（門が (a)〜(d) の後で呼ぶ。値の形ごとの例外はここにだけある）。文字列を語に分け、読める名前の語（例外）を外した、
// 連なりを調べる語の並びを返す。
const FREE_WORDS = (text) => text.split(/\s/u).filter((word) => !isReadablePath(word));
// 設定の対は = で分けた key と value を別々の語として調べる（形が全体を説明する例外にしない）。value は - と _ でつないだ読める名前も通す。
const PAIR_WORDS = (text) => text.split("=").filter((word) => !isReadableName(word));
// 参照（<項目>|<出典>|<位置>|<時刻>、<項目>@<出典>:<位置>）は区切りで分けた部品を別々の語として調べる。部品の分け方はここ 1 か所が持つ。
// 参照・案内の文に出る項目名（項目名の形で、読める名前）は連なりに数えない（項目名の門 ITEM_WORDS と同じ判定。長い正当な項目名が参照・案内に出るため）。
export const ITEM_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;
const isItemShaped = (word) => ITEM_NAME_RE.test(word) && isReadableName(word);
const REF_WORDS = (text) => text.split(/[|@:\s]/u).filter((word) => !isReadablePath(word) && !isItemShaped(word));
// 形そのものが 40 文字の連なり（commit-oid）。形に合った全体は連なりに数えない（意図した限界: 40 桁の 16 進は何でも通る）。
const OID_WORDS = (text) => (COMMIT_OID_RE.test(text) ? [] : FREE_WORDS(text));
// 項目名は 1 語。読める名前（`_` で分けた部品が 19 文字以下で、数字混じりの部品の合計が 16 以下）なら連なりに数えず、そうでなければ語全体を調べる。
const ITEM_WORDS = (text) => (isReadableName(text) ? [] : [text]);

// 要素の形ごとの列の規則。最小の個数・最大の個数・要素の検査・(e) に通す語の分け方。
const LIST_RULES = new Map([
  ["string", { min: 0, max: TEXT_MAX, element: (e) => isText(e, STRING_RE), words: FREE_WORDS }],
  ["setting-pair", { min: 1, max: 64, element: (e) => isText(e, SETTING_PAIR_RE), words: (text) => (SETTING_PAIR_RE.test(text) ? PAIR_WORDS(text) : FREE_WORDS(text)) }],
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

// 判定の対象の文字列（文字列でない値は対象にしない）。配列は添字で複製してから調べる（isListOf と同じ読み方。元の配列の
// filter・every・iterator の差し替えに左右されない）。
const stringParts = (value) => (typeof value === "string" ? [value] : []);
const listCopy = (value) => Array.from({ length: value.length }, (_, i) => value[i]);
const listParts = (value) => (Array.isArray(value) ? listCopy(value).filter(isString) : []);

// valueType ごとの形（closed = 形式が閉じていて秘密らしい値と区別できる、open = 区別できない）と検査。1 つの表。
// parts = 秘密らしさを調べる文字列、words = (e) に通す語の分け方（門が (a)〜(d) の後で呼ぶ）。
// typed = 値の型が形として合うか（回答を拒む時の理由 invalid_type の根拠。形式の検査 check とは別に、型だけを見る）。
const FORMATS = new Map([
  ["string", { form: "open", check: (v) => isText(v, STRING_RE), typed: isString, parts: stringParts, words: FREE_WORDS }],
  ["version", { form: "closed", check: (v) => isText(v, VERSION_RE), typed: isString, parts: stringParts, words: FREE_WORDS }],
  ["commit-oid", { form: "closed", check: (v) => isText(v, COMMIT_OID_RE), typed: isString, parts: stringParts, words: OID_WORDS }],
  [
    "list",
    {
      form: "open",
      check: (v, shape) => LIST_RULES.has(shape) && isListOf(v, LIST_RULES.get(shape)),
      typed: (v) => Array.isArray(v) && listCopy(v).every(isString),
      parts: listParts,
      words: (t, shape) => LIST_RULES.get(shape).words(t),
      knows: (shape) => LIST_RULES.has(shape),
    },
  ],
  ["boolean", { form: "closed", check: (v) => v === true || v === false || v === "true" || v === "false", typed: (v) => typeof v === "boolean" || isString(v), parts: stringParts, words: FREE_WORDS }],
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
  try {
    return FORMATS.get(valueType).check(value, elementShape) === true; // 未知の valueType は undefined の check で例外になり、下の catch が false にする（失敗側の道は 1 つ）
  } catch {
    return false;
  }
}

// 固定の分類。入力から作らない定数で、値の一部も例外の文面も含まない。
export const VALUE_CLASSIFICATIONS = Object.freeze(["valid", "invalid_format", "secret_like"]);
const [VALID, INVALID_FORMAT, SECRET_LIKE] = VALUE_CLASSIFICATIONS;

// 文字列が (a) 秘密鍵・証明書の見出し、(b) 既知の token の接頭辞（先頭か英数字でない文字の直後）、(c) Bearer + 長い語、(d) JWT の形のどれかを、
// どこかに含むか。長い連なり (e) は見ない（識別・符号・手で作った構造体は、正当な長い名前・UUID を持つので、(e) は門の種類が許す時にだけ門の中で当てる）。
// 文字列でない物は調べられないので秘密らしい（失敗側）。この 1 つの条件が、門・参照・構造体の全部の「文字列でない」を持つ。
export const hasSecretShape = (text) => typeof text !== "string" || KEY_HEADER_RE.test(text) || BEARER_RE.test(text) || TOKEN_PREFIX_RE.test(text) || JWT_RE.test(text);

// 唯一の門。外から来る文字列は全部ここを通る。種類ごとに (e) を当てるか決める（理由は種類ごとにここ 1 か所）:
//   answer = 回答・観測した値、name = 位置・対象の名前・表示する参照（どちらも (e) を当てる）、
//   ref = 呼出側が渡す識別・参照・項目名・符号（正当な長い名前・UUID があるので (e) を当てない）、
//   structure = 手で作った構造体の中の文字列と key（同じ理由で (e) を当てない）。
// 順: (1) 未知の種類・文字列でない物（hasSecretShape が持つ）は秘密らしい（失敗側）、(2) 生の文字列全体に (a)〜(d)、(3) (e) を当てる種類だけ、読める名前・形の説明（wordsOf）を
// 通した語ごとに 20 文字以上の連なりを調べる。例外 (3) は (2) を飛ばさない。
const GATE_RUN = new Map([["answer", true], ["name", true], ["ref", false], ["structure", false]]);
export const GATE_CLASSES = Object.freeze([...GATE_RUN.keys()]);
export function exposesText(gateClass, text, wordsOf = FREE_WORDS) {
  const applyRun = GATE_RUN.get(gateClass);
  if (applyRun === undefined || hasSecretShape(text)) return true;
  if (!applyRun) return false;
  return wordsOf(text).some((word) => RUN_RE.test(word));
}

// 表示する参照（区切りで分けた部品ごとに (e) を調べる）が秘密らしいか。
export const isSecretLikeRefText = (text) => exposesText("name", text, REF_WORDS);

// 呼出側が渡す識別・対象・参照・符号として受けてよい文字列か（空でなく、(a)〜(d) の形を持たず、区切りで分けた部品が読める名前でない 20 文字以上の連なりを持たない）。
// 呼出側の値は写る道が多いので、(e) も当てる（決定 95 の 2 回目の追い指示）。UUID・長い混ざった 16 進の識別は、読める部品でないので断る（意図した限界）。
export const isRefName = (value) => value !== "" && !isSecretLikeRefText(value);

// 案内の文（結論・次の操作・全文）として受けてよい文字列か。案内の文は表示する値・参照を含むので、区切り・空白で分けた語ごとに (e) を調べ、
// 形が 40 桁の 16 進そのもの（commit の表示値）の語は連なりに数えない（OID_WORDS と同じ意図した限界）。
const GUIDANCE_WORDS = (text) => text.split(/[|@:\s]/u).filter((word) => !isReadablePath(word) && !isItemShaped(word) && !COMMIT_OID_RE.test(word));
export const isGuidanceText = (value) => typeof value === "string" && value !== "" && !exposesText("name", value, GUIDANCE_WORDS);

// 回答の値（wire に渡る値）として受けてよいか。真偽・文字列・文字列の列だけで、文字列ごとに (e) まで門を通す（40 桁の 16 進そのものと設定の対は、値の形の表と同じ分け方）。
// 形式の検査（項目一覧の項目の形式）は回答の受付が済ませている。ここは手で作った draft の値を写す前の、門の 1 か所。
const ANSWER_WORDS = (text) => (SETTING_PAIR_RE.test(text) ? PAIR_WORDS(text) : OID_WORDS(text));
const isAnswerText = (text) => typeof text === "string" && !exposesText("answer", text, ANSWER_WORDS);
export const isAnswerValue = (value) => typeof value === "boolean" || isAnswerText(value) || (Array.isArray(value) && listCopy(value).every(isAnswerText) && Object.keys(value).length === value.length);

// 項目名として受けてよい文字列か（空でなく、(a)〜(d) の形を持たず、読める名前でない 20 文字以上の連なりを持たない）。項目名は name の種類で (e) を当てる（決定 95）。
export const isItemKeyText = (value) => value !== "" && !exposesText("name", value, ITEM_WORDS);

const DEEP_MAX = 8;
const KNOWN_PROTOTYPES = new Set([Object.prototype, null, Array.prototype, Map.prototype, Set.prototype]);
// 入れ物の自分の key と値の並び。getter・setter は呼ばずに例外にする（含む側）。symbol の key は並びに入り、carriesIn が含む側にする。
function ownFieldsOf(container) {
  const fields = [];
  for (const key of Reflect.ownKeys(container)) {
    const descriptor = Object.getOwnPropertyDescriptor(container, key);
    if (!("value" in descriptor)) throw new TypeError("accessor");
    fields.push(key, descriptor.value);
  }
  return fields;
}
// 入れ物の中身（調べる key と値の並び）。知らない入れ物は例外にする（含む側）。Map・Set は組み込みの読み方で key と値を出す。
function childrenOf(container) {
  const prototype = Object.getPrototypeOf(container);
  if (!KNOWN_PROTOTYPES.has(prototype)) throw new TypeError("unknown container");
  const fields = ownFieldsOf(container);
  if (prototype === Map.prototype) return [...fields, ...Map.prototype.entries.call(container)];
  return prototype === Set.prototype ? [...fields, ...Set.prototype.values.call(container)] : fields;
}
function carriesIn(value, depth, seen) {
  if (typeof value === "string") return exposesText("structure", value);
  if (typeof value === "function" || typeof value === "symbol") return true;
  if (typeof value !== "object" || value === null) return false;
  if (depth >= DEEP_MAX) return true;
  if (seen.has(value)) return false;
  seen.add(value);
  return childrenOf(value).some((child) => carriesIn(child, depth + 1, seen));
}
// 手で作った構造体（回答の値・案内・回答の列）の中のどこかの文字列・key が、(a)〜(d) の形を含むか。
// 知っている入れ物（配列・素の object・Map・Set）の外・getter・確かめきれない深さ・例外は含む側（失敗側。失敗側の道は下の catch の 1 つ）。同じ入れ物は 1 回だけ調べる。
export function carriesSecretShape(value) {
  try {
    return carriesIn(value, 0, new Set());
  } catch {
    return true;
  }
}

// 観測値・回答が共有する判定。値の分類（valid | invalid_format | secret_like）だけを返し、入力は写さない（BR5.2・BR3.4）。
// 秘密らしい形は形式に合っていても secret_like（先に勝つ）。判定できない（未知の valueType・未知の要素の形・例外）時は
// secret_like（fail closed）。型違い・範囲外・形の違いで秘密らしくない時は invalid_format。
export function classifyValue(valueType, value, elementShape = "string") {
  try {
    const format = FORMATS.get(valueType);
    if (format.knows?.(elementShape) === false) return SECRET_LIKE; // 未知の valueType は format が undefined で例外になり、下の catch が SECRET_LIKE にする
    if (format.parts(value).some((text) => exposesText("answer", text, (t) => format.words(t, elementShape)))) return SECRET_LIKE;
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
