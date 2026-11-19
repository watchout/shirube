// U2 入力の欄の表（決定 95 の 2 回目の追い指示 2）の試験が共有する部品。公開の関数の入口が受ける呼出側の欄を 1 欄 = 1 行にし、
// 64 文字の乱数らしい連なり（LEAK。架空）を入れても、返り値・draft・案内・C02 の wire・例外の文面のどこにも現れないこと（JSON.stringify に含まれない）と、
// 外側が固定の形（断る・読めなかった単位・既定の扱い）で返ることを、正しい値の対照とともに確かめる。行のデータは試験の file と分け、表の生成から読めるようにする。
import assert from "node:assert/strict";
import test from "node:test";
import { CONTROLS } from "./working-state-field-controls.mjs";

// 架空の 64 文字。大小文字・数字が混ざり、読める単語に分けられない（門の (e) に当たる）。16 進だけの形・小文字だけの形は別に持つ。
export const LEAK = "Zk3Qw9XvL1m7Rt5Yp2Nb8Hd4Gs6Jf0Ca9Bv7Cx5DPq4Lm8Xc2Rt6vB1nZ3hY9kF5";
export const LEAK_LOWER = "k3j9x0q2m7v1z8w4n6b5c3d2f1g0h9j8k7l6m5n4b3v2c1x0z9a8s7d6f5g4h3j2";
export const LEAK_UPPER = "ZK3QW9XVL1M7RT5YP2NB8HD4GS6JF0CA9BV7CX5DPQ4LM8XC2RT6VB1NZ3HY9KF5";
export const LEAK_HEX = "3fa91c0b7de24a58f6c109bd7e3a52c84f1d6a903fa91c0b7de24a58f6c109bd".slice(0, 64);

// 欄の種類: A = 閉じた一覧（比べる・引くだけで写さない）、B = 固定の形（数・時刻・桁の決まった形）、C = 唯一の門（文字列は門に通した物だけ写す）。
export const CLASSES = Object.freeze(["A", "B", "C"]);

// 呼び出しの結果（例外も文面ごと）を、返り値と同じに走査できる形にする。
export function outputsOf(run) {
  try {
    return { value: run() };
  } catch (error) {
    return { thrown: String(error), message: String(error?.message), stack: String(error?.stack) };
  }
}

export const exposed = (leak, outputs) => JSON.stringify(outputs).includes(leak);

// 入力の複製の 1 欄を差し替える（path は欄の名前の列。value が undefined ならその欄を無くす）。元の入力は凍結されていても変えない。
export const getIn = (value, path) => path.reduce((inner, key) => inner?.[key], value);
export function cloneWith(source, path, value) {
  const copy = structuredClone(source);
  const parent = getIn(copy, path.slice(0, -1));
  const key = path.at(-1);
  if (value === undefined) delete parent[key];
  else parent[key] = value;
  return copy;
}
export const json = (value) => JSON.stringify(value);

// 1 行 = 1 つの試験。row: { id, entry, field, cls, check, legit, run(value), ok(result), refused(result), leak? }。
// 正しい値の対照（legit）が ok を満たす（守りが何でも断る形でないこと）、leak が写らない、外側が refused を満たす、の 3 つを確かめる。
export function fieldTest(planned) {
  const row = { ...planned, ...CONTROLS.get(planned.id) }; // 結果の値そのものを決める行は、対照の表（working-state-field-controls.mjs）が ok・refused を置き換える
  assert.ok(["A", "B", "C"].includes(row.cls), row.id);
  const leak = row.leak ?? LEAK;
  const verb = { A: "閉じた一覧の外", B: "固定の形の外", C: "門を通らない値" }[row.cls];
  test(`${row.id}+ ${row.entry} の ${row.field}（${row.cls}）: ${verb}（64 文字の乱数らしい連なり）は返り値・例外のどこにも写らず、決まった形で外れる。正しい値は通る`, () => {
    const control = outputsOf(() => row.run(row.legit));
    assert.equal(control.thrown, undefined, `control threw: ${control.message}`);
    assert.equal(row.ok(control.value), true, "legit value is accepted");
    const leaked = outputsOf(() => row.run(leak));
    assert.equal(exposed(leak, leaked), false, "no leak in the result or the error text");
    if (leaked.thrown === undefined) assert.equal(row.refused(leaked.value), true, "the outside is refused in the fixed form");
    else assert.equal(row.throws === true, true, `unexpected throw: ${leaked.message}`);
  });
}
