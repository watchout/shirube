# U2 u2-gate-trigger-narrowing — 試験の手順

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 計画: [code-generation-plan.md](./code-generation-plan.md)。設計: [security-design.md](../nfr-design/security-design.md) の試験の表（P1・P2・N1〜N7・逆向き・同居）。

## 試験の道具と設定

- 道具: Node 組込みの `node:test` と `assert/strict`（実行時の npm 依存を足さない。NFR6.1）。
- 設定: 追加なし。`package.json` の `test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs` で、新しい試験 file を自動で拾う。`ci.yml` の `test` job も同じ試験を拾う（この単位は `scripts/` に code を足さない）。
- 前提: Node 22 以上（`package.json` の `engines`）。手作業の準備は要らない。Ruby は使わない（`scripts/sds/yaml.mjs` の `parseYaml` は Ruby を呼ぶので、試験の読み手には使わない）。実装の作業木は clone の worktree で、`kit/sds-gate-caller.yml` の SHA-256 が base の `e6eaa2eb…` と一致することを最初に観測する。

## この単位の試験の実行 command（単位に絞った形）

- 新しい試験: `node --test tests/sds-gate-caller-trigger.test.mjs`
- 関連する既存の試験（変更前のまま通ること）: `node --test tests/sds-gate.test.mjs`
- 全体の確かめ（Step 6 で 1 回）: `npm test`

最初の Red の前に、作業木の caller の SHA-256 が base の `e6eaa2eb…` と一致することと、設計が「現在の file」として書いた事実が `origin/main` の bytes で成り立つことを観測し、続けて `node --test tests/sds-gate.test.mjs` を流して通ることを確かめ、実行数・合格数・失敗数を記録する。

## 試験の一覧（8 件、標準の方針の 5〜8 件の範囲）

| ID | 種類 | 確かめること | 設計の表の行 | 対応する要件 |
|---|---|---|---|---|
| T1 | 正例 | `if:` の `contains()` の印の集合が、`audit-admission.mjs` の依頼の schema 名、返却の schema 名、`plan-binding.mjs` の計画の印と、過不足なく一致する。印は試験に書き写さず、`scripts/` の該当 file から取り出す | P1 | FR10.1、NFR3.1、NFR4.5 |
| T2 | 前提 | `gate.mjs` の判定 1 が `p.labels` から `risk:` を取っている間、`pull_request_target` の types に `labeled`・`unlabeled` が残っている | P2 | FR10.2、NFR4.5、NFR8.4 |
| T3 | 負例 | 起動の種類・`pull_request_target` の types 7 つ・`issue_comment` 以外に起動が無いこと・権限 6 つ・`uses:` の形・`with.pr` が変わっていない（広げないための上限だけを固定し、絞りの規則は持たない） | N1、N6 | NFR5.1、NFR8.2、NFR8.4 |
| T4 | 負例 | 評価器で `if:` を読む。印を含まない `created` は偽、PR でない issue のコメントは偽、`pull_request_target` の各 action は真 | N2 | FR10.1、NFR4.5、NFR4.6 |
| T5 | 負例 | 印を含む `created` は 3 つの印のそれぞれで真（大文字小文字の違いでも真）。本文が空文字・欠落・null の `created` は真（式の `!github.event.comment.body` の節。SD11）。空白だけの本文は空でないので、印が無ければ偽。評価器は欠落と null を空文字として扱い、`!` の扱いは評価器の中に 1 か所だけ置く | N4 | NFR4.2、NFR4.5 |
| T6 | 負例 | `edited` と `deleted` は本文が印を含まなくても真。式が `github.event.changes` を参照していない | N3 | NFR4.3、NFR4.5 |
| T7 | 負例 | 足した行に失敗を隠す記述が無く、`run:`・`with:` に `github.event.comment` が渡らない。読めない・解釈できない `if:`（空、閉じていない括弧、未知の関数、印の節が無い、2 つある）は例外になり、真・偽に読み替えない | N5、N7 | NFR4.1、NFR4.5、NFR5.2 |
| T8 | 逆向き・同居 | 足した `if:` の節と注記 2 行を取り除いた文字列を読み手が「絞りなし」と判定し、取り除いた後の `on:`・権限・`uses:`・`with:` の節が変更後と一致する | 逆向き、同居 | NFR8.2、NFR8.3 |

## Red の記録

- Step 3 で 8 件を書いたら、変更前の caller に対して `node --test tests/sds-gate-caller-trigger.test.mjs` を流す。T1・T4・T7 の一部（絞りの節を読むもの）が失敗することを確かめ、失敗の出力を記録する。T2・T3 は変更前から通りうる（前提と上限の確かめ）。T5・T6 の「真になる」向きの確かめは、変更前の式（PR のコメントは常に真）でも真になるので変更前から通りうる。これらは Red の失敗に数えず、記録に「変更前から通る」と書く。T5 の空・欠落・null の確かめは、式から `!github.event.comment.body` の節だけを除いた式を評価器に与えて偽になる（節が働いている）ことを、反例として別に確かめ、記録する。T8 は取り除く節が無いので、読み手が「節なし」で失敗するか、取り除いても同じ文字列で通るかを、書いた時に実測して記録する。評価器の入力の試験（T7 の読めない `if:`）は変更前でも通りうる。
- すべて通ってしまった場合は、試験が規則を確かめていないので、書き直す。

## Green・Refactor の記録

- Step 4 の後、`node --test tests/sds-gate-caller-trigger.test.mjs` と `node --test tests/sds-gate.test.mjs` が通ることを確かめる。実行数・合格数・失敗数を記録する（実行されなかった・時間切れは成功に数えない）。あわせて、足した節と注記を取り除いた結果の SHA-256 が base の `e6eaa2eb…` と一致することを 1 回観測して記録する。
- Step 5 の後も同じ command を流して、通る状態が保たれていることを確かめる。

## 網羅率の目標

- この単位は新しい実行用の code を `scripts/` に足さない。確認コマンドの網羅率の対象（`scripts/coverage-gate/**`）は 0 件で、空のまま 100% と出て通る。U2 の合否の根拠にしない。保証するのは、既存の試験と、この単位の試験が通ることだけ。
- 観測した値（実行数・合格数・失敗数）は、Build and Test の記録に書く。申告された値は写さない（S5）。

## 模擬と試験データ

- 外の service は使わない。模擬は要らない。
- 試験データは、実際の `kit/sds-gate-caller.yml` と `scripts/` の実物、および試験 file の中に書く架空の短い文字列（壊れた `if:` の例、印を含む・含まないコメントの本文）だけ。実在の識別子・秘密は使わない。12 文字の英数字を値にした `token:` の形は使わない（秘密の検査に拾われる）。

## 実行しない・実行できない試験

- `if:` の GitHub 上の評価、skip された job が `sds-gate` の commit status を変えないこと、流れる回数の変化は、この PR の Actions では観測できない（kit の caller は利用先に写されるひな形。Shirube 自身の門は `sds-gate-self.yml`）。Code Generation と Build and Test では「観測できなかった」と記録し、成功とは書かない。利用先への導入の後に観測する（設計 6）。
