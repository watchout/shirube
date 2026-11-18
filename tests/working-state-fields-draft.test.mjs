// U2 入力の欄の表（draft と案内の入口）: 行のデータ（working-state-field-rows-draft.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { DRAFT_ROWS } from "./working-state-field-rows-draft.mjs";

for (const row of DRAFT_ROWS) fieldTest(row);
