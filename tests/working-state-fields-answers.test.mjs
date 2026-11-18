// U2 入力の欄の表（回答の入口）: 行のデータ（working-state-field-rows-answers.mjs）の 1 行ごとに、乱数らしい 64 文字を入れても写らないことを確かめる。
import { fieldTest } from "./working-state-field-fixtures.mjs";
import { ANSWER_ROWS } from "./working-state-field-rows-answers.mjs";

for (const row of ANSWER_ROWS) fieldTest(row);
