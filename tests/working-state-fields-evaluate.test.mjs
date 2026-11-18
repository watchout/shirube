// U2 入力の欄の表（項目の評価）: 行のデータ（working-state-field-rows-evaluate.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { EVALUATE_ROWS } from "./working-state-field-rows-evaluate.mjs";

for (const row of EVALUATE_ROWS) fieldTest(row);
