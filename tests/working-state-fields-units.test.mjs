// U2 入力の欄の表（観測の単位の欄）: 行のデータ（working-state-field-rows-units.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { UNIT_ROWS } from "./working-state-field-rows-units.mjs";

for (const row of UNIT_ROWS) fieldTest(row);
