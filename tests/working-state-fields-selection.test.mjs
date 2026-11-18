// U2 入力の欄の表（選択と C02 の wire）: 行のデータ（working-state-field-rows-selection.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { SELECTION_ROWS } from "./working-state-field-rows-selection.mjs";

for (const row of SELECTION_ROWS) fieldTest(row);
