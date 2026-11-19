// LC5 閉じた形の回答と再観測した実際の設定の一致の判定（BR6.2 の判定の順 (1)、BR6.3）。判定の持ち主はここ 1 か所で、
// 回答の無効化（answers.mjs の reconcileAnswers）と回答の言い方（answer-status.mjs）が同じ関数を呼ぶ（S3）。
// 一致 = 閉じた形（valueForm = closed）の項目で、項目の全出典の BR3.1 の評価が confirmed（全出典が値を持ち回答と同じ値）か、
// 回答が「選ばなかった」（keep-absent）で missing。wrong_target・invalid・conflict・unobservable の出典が 1 つでもあれば一致でない。
// 開いた形は値を保持せず比べられないので一致にならない（Owner の決定 120）。順は arc の読み（決定 95）で、Owner の言葉ではない。
// 時刻・乱数・環境変数・file を使わない（S4）。
import { digestOf } from "./canonical.mjs";
import { evaluateItem } from "./item-state.mjs";
import { valueFormOf } from "./value-exposure.mjs";

const isObject = (value) => typeof value === "object" && value !== null;

// 評価済みの項目（LC3 の項目状態）が回答と一致するか。読めない入力（answer・item が無い・object でない）は TypeError で、見える失敗（隠さない。一致とは読み替えない）。
// 同じ形: answerStatusOf()（引数なし）・unitFits(entry, null)・itemObservationDigestOf("k", null)。例外を false にして隠すのは、下の closedMatches（外へ出る入口）だけ。
export function closedMatchesItem(answer, item) {
  if (item.state === "missing") return answer.kind === "keep-absent";
  return item.state === "confirmed" && answer.kind === "value" && digestOf(item.confirmedValue) === answer.valueDigest;
}

// 項目の定義と再観測（LC2 の項目）から、回答が実際の設定と一致するか。定義が無い・開いた形・例外を起こす入力は false。
export function closedMatches(answer, entry, observedItems) {
  try {
    if (!isObject(entry) || valueFormOf(entry.valueType) !== "closed") return false;
    return closedMatchesItem(answer, evaluateItem(entry, observedItems));
  } catch {
    return false;
  }
}
