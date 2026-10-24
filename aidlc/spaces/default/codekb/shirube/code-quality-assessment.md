# コードの品質の見立て（Code Quality Assessment）: shirube

## 試験

| 項目 | 状態 |
|------|------|
| 試験の道具 | Node 組込みの `node:test` |
| 試験の file | `tests/*.test.mjs` 14 本、`tests/u2/continuation.test.mjs`、補助 3 本、fixture（計画の受付） |
| 対象 | 門（sds-gate・判定 4 の結び・判定 5）、配布キット、監査の受領と反例、計画の受付と形、衛生の検査（file の長さ・PR の大きさ・秘密）、workflow の契約、継続の核 |
| 網羅率の測定 | 無い（行の網羅率の設定が無い）。org の既定（feature は 80%）は、この repo では測っていない |
| 実行 | ci.yml が `npm test` を PR と main への push で動かす |

## lint と CI

- ESLint の 2 回の実行（構造の上限、例外の見張り）、jscpd、knip、dependency-cruiser、gitleaks を、この repo 自身にも hygiene として適用している（ci.yml の自己適用、profile は blocking）。
- own-code の予算の検査（profile の上限 2,300 行）を ci.yml で動かしている。

## 品質の見立て（3 段階）

| 観点 | 見立て | 理由 |
|------|--------|------|
| 名前の分かりやすさ | 良い | 関数名と判定の番号（4.1〜4.18、5.0〜5.8）が文書と対応している |
| 関数の大きさ | 良い | 50 行・複雑さ 10 の上限を機械で守っている |
| 誤りの扱い | 良い | fail closed が徹底。読めない時は FAIL / UNOBSERVABLE |
| 試験の有無 | 良い | 主な判定に正例・負例の試験がある |
| 重複 | 良い | jscpd を自分に適用している |
| 使われないコード | 普通 | knip を適用しているが、`src/progression/continuation.mjs` は本番の呼び出し元が無い（試験からだけ使われる） |
| 読みやすさ | 普通 | 上限を守るために 1 行に詰めた書き方が多い |

## 技術的な負債の兆し

| 兆し | 置き場 | 影響 |
|------|--------|------|
| own-code の残りが少ない（1,938 行 / 2,300 行。wc の値） | scripts・configs・workflows | 新しい機能（計測など）を足す余地が約 362 行。内訳は Owner の決定で枠が割り当て済み |
| 詰めて書かれた長い行 | gate.mjs、plan-binding.mjs、kit.mjs | 読み違い・直し間違いの危険 |
| 外部の ruby への依存 | yaml.mjs | ruby の無い環境で判定 4 が止まる |
| 未接続の継続の核 | src/progression/continuation.mjs | 使われないまま古くなる |
| 配布先の一覧の抜け | docs/sds/consumers.json | shirube・aun・onza が載っておらず、status で見られない |
| 時刻の既定値の読取り | gate の `now = Date.now()`、kit の `new Date()`、lib の `utcToday()` | どれも引数・環境変数で渡せる。核の関数は時刻を読まない |
| TODO・FIXME | 検出なし（ESLint の期限つき TODO の検査を適用） | — |

## この取り組みに関係する空き

- 成功の指標（統合までの時間・手戻りの回数・Owner の手の回数・誤って止めた回数）を数える部品は無い。門の結果は PR ごとの JSON と commit status だけで、集計されない。
- 誤って止めた件を判定して記録する部品は無い。
- 設計と実装のずれを見つける部品は無い（判定 5 は設計の版の構造だけを見る）。
- 門が AI-DLC の記録を読む橋は設計だけで、コードは無い（docs/design/aidlc-include.md §5）。
