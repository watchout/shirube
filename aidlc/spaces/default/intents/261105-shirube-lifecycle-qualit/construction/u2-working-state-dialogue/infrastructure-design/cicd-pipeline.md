# U2 u2-working-state-dialogue — 配送の流れ（cicd-pipeline）

## Sources

- 入力: [infrastructure-specification](infrastructure-specification.md)、[monitoring-design](monitoring-design.md)、[questions](infrastructure-design-questions.md)（Q1〜Q5）、NFR 設計 7 文書、team.md の「Way of Working」「Testing Posture」「Deployment」、設計・実装の標準 S1〜S9。
- 実物の観測は `origin/main`（head `7fa98d1`、`f2d509b` で job 名・`npm test` の glob・`hygiene` の `secrets` の step を読み直して同じ）。本書は設計であり、CI の実行結果ではない。この設計は workflow・`.shirube/**`・`package.json`・契約 `.v2` を変えない。変える必要が出た時は、実装を止めて Owner の判断を仰ぐ。

## 流れ

U2 は配備する物を持たない。「配送」は、1 単位 = 1 PR で統合されるまでの流れである。

| 順 | 段 | 内容 | 関門（通らなければ進まない） |
|---|---|---|---|
| 1 | 設計の PR | 守る物（セキュリティ）に触れる単位なので、設計記録だけの PR を先に出し、独立の設計監査を 1 回出す。code は設計監査の PASS の後に書く | 設計監査の PASS と作者の受領（返却を待つ間も、Code Generation の計画と試験の手順は書いて承認を受けてよい） |
| 2 | 試験を先に書く（Red） | `tests/working-state-*.test.mjs` に、規則（BR1〜BR9 の 43 規則）ごとの正例 `T<x.y>+` と負例 `T<x.y>-`、追加の負例（T1.1u・T3.2o・T3.4o・T5.2o・T6.4o・T8.3o・T8.3p・T3.4p と観測値の負例）、構造の試験、子の起動の負例を書き、失敗を確かめる | 失敗の確認の記録（TDD） |
| 3 | 実装（Green） | `scripts/working-state/` に実装を書き、試験を通す | `npm test`（`node --test tests/*.test.mjs tests/u2/*.test.mjs`）と CI の `test` job（同じ glob に `--experimental-test-coverage` と `scripts/**` の 80% の床が付く。`npm test` には 80% の床が無く、別の関門）が失敗 0。skip・todo の 0 は LC7 の記録の試験が数える（下の関門の表） |
| 4 | 網羅率の記録 | 試験の中で Node の lcov を解析し、機械可読な記録（LC7）を作る | 行の網羅率 100%、分母 1 file 以上、未計測は失敗 |
| 5 | CI | 既存の `test`・`hygiene` の job（秘密の検査は `hygiene` の中の `secrets` の step）を、実装の head で流す | 全部 success。skip・timeout・未実行は成功に数えない |
| 6 | 実装監査の依頼 | 作者が `sds-audit-request/1` を watchout 名義で投稿し、固定の checker の `--preflight` で `READY_FOR_REVIEW` を確かめて渡す | 前検査 |
| 7 | 独立の実装監査 | devauditor・codex-audit・org-auditor のうち空いている席。KY の表で差し戻しを決める | PASS と作者の受領（`--review` の `RECEIPT_ACCEPTED`） |
| 8 | Owner の対象 head の承認 | R3 以上は、統合の前に Owner の exact-head。arc 経由 | 公開された Owner の決定（url と SHA-256 つき） |
| 9 | 統合 | 作者と別の席（suite-lead）が、GitHub の merge commit で統合する（squash はしない） | 必須の検査・監査・受領・Owner の承認がそろう |

### stage と関門の対応

| 検査 | 実行する場所 | 対応する要件 |
|---|---|---|
| 規則ごとの正例・負例、AC 由来の入力の差 | `npm test`（`tests/working-state-*.test.mjs`） | NFR1.2 |
| 核の構造（`Date`・乱数・UUID・環境変数・file・子 process・network が無い、理由コードの定義が無い、import に循環が無い） | 同上の構造の試験 | NFR5.1・NFR5.1a・NFR5.2、BR8.4 |
| 子の起動の負例（同名の実行ファイル・環境変数・出力の枠・shell の特殊文字・cwd が OS の根） | 同上 | NFR2.1・NFR3.2・NFR6.1a、Q4 = A、Q7 = A |
| 観測値の取り扱いの負例（T1.1u・T3.2o・T3.4o・T5.2o・T6.4o・T8.3o・T8.3p・T3.4p・T6.2m・T6.2n・T6.2o・T6.2p〔BR6.2・BR6.3 の判定の順: 閉じた形で値が一致し全出典が同じ値なら一致を確認を先に判定、それ以外で観測が変われば無効〕、秘密らしい・形式に合わない架空の観測値、開いた形の値が保持・digest・表示に現れない、開いた形の分類だけの変化で digest が変わり古い回答・draft が無効になる、withheld の不変条件と例外でも値が出ない、中身だけの変化を検出と扱わない、対象を名指さない出典は観測不能、判定の関数が LC2・LC5 で同じ 1 つ） | 同上 | NFR2.2・NFR2.6・NFR2.6a・NFR4.2・NFR6.1（PF4）、Owner の決定 116・120 |
| 開いた形の生の値の経路（LC1 の返り値が診断・記録・案内へ流れる経路が無い、判定の関数が何も import しない、比較のための追加の読取り・子の起動が無い） | 同上の構造の試験 | NFR2.6・NFR6.1（PF4） |
| 行の網羅率 100%（LC7） | 試験の中で子 process に Node の lcov | NFR1.1・NFR1.1b |
| 構造・重複・guard・依存方向・未使用 | CI の `hygiene` job（`lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage`・dependency-cruiser・knip）。knip は `--production` で、production の entry を `knip.jsonc` に 1 件足す（Q6 = A、同じ PR。infrastructure-specification の「knip の production の entry」）。足す前後の knip の実行結果を PR 本文に書く | NFR10.1 |
| 秘密の検査 | CI の `hygiene` job の中の `secrets` の step（gitleaks。`id: secrets`） | NFR2.2・NFR2.4 |
| `scripts/**` の行の網羅率の床 80% | CI の `test` job（`--test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80`。Node 26 で動く） | U2 の 100%（LC7）とは別の、既存の床。U2 の file も数えに入る |
| own-code の予算（OWN-01） | CI の `test` job の step（`own-code-budget.mjs`）。現在の上限は 20,000 行で、買いだめの停止であって予算ではない（profile の記述）。U2 の追加で上限に近づくかは Code Generation で実測する | NFR10.1。上限を上げる変更は同じ PR に混ぜない |
| 新しい file 300 行（`tests/**` も対象） | `hygiene` job の `hygiene:lines`（`lines-baseline.mjs`。profile の `lines` は `tests/**` を含む） | NFR10.1。規則 43 件の正例・負例の試験は、1 file 300 行以内の複数の `tests/working-state-*.test.mjs` に分ける前提 |
| 新しい依存が無い（機械の部分） | 構造の試験: `scripts/working-state/` の全 file の import が `node:` の組込みと相対 path だけで、bare specifier（npm の package 名）が無い | NFR2.5。実行時 npm 依存が増えない機械の確認。`package.json`・lockfile の差分そのものを機械で止める仕組みは、実物（`origin/main` `f2d509b`）に無い |
| 新しい依存が無い（人の部分） | 作者の PR 本文の確認と独立監査の項目: `package.json`・lockfile・契約 `.v2`・workflow・`.shirube/**` の差分 0。**機械の関門ではない**（`.shirube/sds-pin.json` の `protected_paths` に `package.json`・lockfile・契約 `.v2` は入っていない。実物で確認） | NFR2.5。人の確認であり、機械で止まると書かない |
| 必須工程が失敗を隠していない（機械の部分） | LC7 の記録の試験が、子の `node --test` の結果から skip・todo・cancelled・timeout の件数を数え、0 でなければ失敗にする。報告の形が取れない版も失敗 | NFR10.2。`check:no-failure-hiding` は `origin/main`（`f2d509b`）の Shirube に無い（`git grep` で出るのは `docs/sds/engineering-standards.md` の記述だけ）ので、既存の検査を担保にしない。CI の `test` job 自体は node:test の skip を止めない（skip があっても終了コード 0）。この試験の細部は Code Generation で決める |
| 必須工程が失敗を隠していない（人の部分） | 独立監査の項目: `|| true`・`continue-on-error`・無条件 PASS・表明の無い試験が無い | NFR10.2。機械の検査が入るまでは report-only（標準の「適用の順序」） |

## 権限と秘密

- 新しい資格情報・secret を足さない。試験・汎用の build の job に、書ける資格情報を渡さない（S9）。書ける資格情報の配布先は、PR の投稿など既存の経路に限る。
- 子 process には token・資格情報の名前を渡さない（Q4 = A）。試験では、環境に架空の token を置き、それが子へ渡らないことを確かめる。
- 公開 repo の fixture・出力は架空の対象（sample-work）と架空の値だけにする。秘密らしい形の fixture は、gitleaks に拾われない形で作る。
- PR に `audit/`・`.aidlc-engine/` を含めない。他 repo の非公開の記録を公開 Shirube へ写さない（NFR2.4）。

## 戻し方と段階

- 戻し方: PR を revert する（merge commit の revert）。U2 はどの workflow・入口にも配線されない（口は U3）ので、戻しても動いている系への影響は無い。schema・DB・永続の状態が無いので、新旧が同居する期間の宣言は要らない（S6 は非該当）。
- 段階: 環境の昇格（staging・production）・feature flag・canary を持たない。配備する物が無い。利用先への配布は、後続の単位（U3 以降）と、既存の限定的な版上げ（team.md の P6 の条件）の話であり、この設計の範囲外。
- 外への効果が 0 であることを構造の試験で確かめる（NFR7、S7 は非該当）。

## 確かめの記録

- 試験の結果・網羅率の記録は、実測した値だけを記録する。観測できなかった物（未実施の環境・未計測の値）は「観測できなかった」と書き、成功とは書かない。
- 実行環境の版（Node の具体の版・OS）は、実行した版を記録に書く。`engines.node >=22` の宣言だけで全環境の動作を保証したとしない（NFR8.1a）。
- 行の網羅率の記録は、手で書き写さず、試験の中で作る。報告の形が取れない版は失敗にする。
- 子の起動の負例の実行結果は、この段では未実施である。Code Generation の記録で実測する。

## Assumptions & Open Questions

### Assumptions

- LC7（網羅率の記録）の子 process は、CI の `test` job（Node 26）で動かす前提とする。`hygiene`（Node 22）では動かさない。Node 22 での LC7 の動作は未確認で、確認するまで「未確認」と書く（infrastructure-specification の A-INF-4a）。LC7 の子が流す試験 file の集合と、LC7 の試験自身を再び起動しない（再帰しない）方法は、環境変数でなく子へ渡す引数で決める（Owner の決定 106 の環境変数の許可名と整合）。細部は Code Generation の確認項目とし、再帰しないことを試験で確かめる。
- 既存の CI の job 名（`test`・`hygiene`）、`hygiene` の中の `secrets` の step 名、`tests/*.test.mjs` の glob が `origin/main`（head `7fa98d1`）のまま変わらない。変わった時は、この表を先に直す。
- 守る物（セキュリティ）に触れる単位として、設計の PR と実装の PR を分けず、同じ PR に実装を足す形をとる（team.md のとおり）。
- この単位のリスクの区分は、子 process の起動というセキュリティの設計を含むので R3 を想定する。実際の区分は PR を出す時に決め、Owner の承認の要否はその区分に従う。

### Open Questions

None。

（要約確認 Looks correct（2 回目。arc が決定 95 により入力）の後に保存し直した。決定 116・120・対象の結びを反映済み。未決の問いは無い。）
