# U5 u5-exclusions — コード生成の計画

## Summary

- Builds: 共有の網羅率の門に「除外」（`exclusions: [{path, reason}]`）を足す。path は解決した分母のソースまたは必須の試験の file と文字列で完全一致しなければ失敗（TARGET_UNRESOLVED）、分母または必須の試験が空になる除外は失敗（TARGET_EMPTY）、理由は U4 の根拠と同じ 1 行の規則に加えて決定の URL を 1 つ以上含む（形だけ。U4 と共有の関数）、同じ path の重複は失敗。除外は名指した file だけを種別（source・test・both）に応じて分母または必須の試験の集合から外し、名指さない必須の試験の NOT_RUN・未計測の扱いは変えない。結果の JSON の exclusions の要素に kind を足す（.v1 の内側）。結果の JSON・job summary（最初の行に件数と種別ごとの件数を毎回）・notice・出力値に除外を同じ 1 つの文書から出す。除外を宣言しない入力の出力は U4 とバイトまで一致する。
- Touches: 新しい `scripts/coverage-gate/exclusions.mjs`・`report-exclusions.mjs`（2 file）と、既存の `threshold.mjs`（理由の規則と決定の URL の形の規則を field の名前を受ける形で export）・`input.mjs`・`resolve.mjs`・`report.mjs`（必要なら `cli.mjs` の配線だけ）。`judge.mjs` は変更しない。新しい試験 2 file と既存の試験への足し、置き換えは既存の試験 4 件。`scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・各種の設定は変えない。
- Tests: 部品ごとに 5〜12 件（標準の方針）、合計およそ 58 件。`node:test` と `node:assert/strict`、依存の追加なし。純粋な核は単体、入口は一時の小さな git repo を使う結合。行の網羅率の床は 100%（足す・触る file すべて。門自身を門で測った観測値を機械が読める形で残す）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR9.1〜BR11.6）、[entities.md](../functional-design/entities.md)。
- 非機能の設計: [logical-components.md](../nfr-design/logical-components.md)（LC1〜LC5）、[performance-design.md](../nfr-design/performance-design.md)（PF1〜PF5）、[security-design.md](../nfr-design/security-design.md)（SC1〜SC7）、[scalability-design.md](../nfr-design/scalability-design.md)（SL1〜SL5）、[reliability-design.md](../nfr-design/reliability-design.md)（RL1〜RL13）、[observability-design.md](../nfr-design/observability-design.md)（OB1〜OB7）。
- 基盤: [infrastructure-specification.md](../infrastructure-design/infrastructure-specification.md)、[monitoring-design.md](../infrastructure-design/monitoring-design.md)、[cicd-pipeline.md](../infrastructure-design/cicd-pipeline.md)。
- 要件・単位・契約: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)（U5）、[contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 基準の実物: 実装は、公開 Shirube の clone の `origin/main` の実物から作る。設計の時点で読んだ `7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e`（U3・U4 を含む）の行数は `input.mjs` 117・`resolve.mjs` 42・`judge.mjs` 158・`report.mjs` 177・`report-exception.mjs` 64・`cli.mjs` 114・`threshold.mjs` 84。作業場の木は古いので現状の根拠に使わない。Step 2 で、その時点の `origin/main` の実物と SHA-256 で突き合わせ直す。`npm test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs`（新しい file を自動で拾う）。

## 進め方の順序（守る物の決まり）

この単位は結果の JSON と入力の契約（版 1 に値を持たせる）と、入力の検査・分母から file を外す入口を持つ。arc の答え（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830。Owner の言葉ではない）に従う:

1. 設計の記録だけの PR を先に出し、独立の設計監査を 1 回出す。code（Step 1 以降の `scripts/` と `tests/` の変更）は、設計監査の PASS と作者の受領を受けた後に書く。返却を待つ間は、この計画と試験の手順（この 2 file）を書くところまでで止まる。
2. 実装は同じ PR に足し、実装の head で CI・独立の監査・受領をそろえる。リスクの区分は R3（label も監査依頼の `risk_class` も R3）。統合の前に対象 head への Owner の exact-head（arc 経由）を確認する。
3. 環境変数の読み（門は環境変数を読まないことで満たし、拒否の文は書かない）は、設計監査で確かめる点（arc の答え）。設計監査が別の形を求めたら、設計の記録を先に直してから code に進む。
4. 作る中で設計に足りない所が見つかったら、そこで止めて 1 行で知らせ、設計を先に直す（authority-and-waiting R3）。コードで黙って埋めない。
5. 保護対象（workflow・必須の検査・branch protection・DB・資格情報・本番・料金・契約 `.v2`）は触らない。この単位は入口をどの workflow にも配線せず、DB の job も作らない（U7）。

## 手順

作業木は clone の worktree（`~/Developer/.worktrees/` の下。作業場の木ではない）に、最新の `origin/main` から作る。各部品は Red（失敗する試験を書いて失敗を確かめ、出力を記録）→ Green（通す最小の実装）→ Refactor の順で、Red と Green は別々の commit にする。葉（依存の少ない所）から上へ作る。

- [x] Step 1: 構成の骨組み。worktree を作り、`node_modules` は clone からの symlink で用意する（commit しない）。`scripts/coverage-gate/exclusions.mjs` と `report-exclusions.mjs` は、Red が「実装が無くて失敗する」ことを確かめられるよう、この段では作らない。新しい依存・設定は足さない。（NFR6.1、NFR6.2）
- [x] Step 2: 試験の実行環境と基準の確かめ。次を観測して記録する: (a) worktree の `scripts/coverage-gate/{threshold,input,resolve,judge,report,cli}.mjs`・`package.json`・`ci.yml` の SHA-256 と行数を、記録した `origin/main` の実物と突き合わせ、設計の「現状」の行数と違えば設計の記録の現状の行を実物に直す、(b) U3・U4 の試験が変更前に通る（単位の command は unit-test-instructions.md）、(c) dependency-cruiser・knip・jscpd・ESLint・OWN-01 の既存の設定を読み、新しい file に当たる条件（`input → exclusions → threshold`、`resolve → exclusions`、`report → report-exclusions` の import の向き、試験からだけ使う export の印）を記録する。成り立たない時は、書かずに設計の記録を直す。`threshold.mjs` の根拠の検査の関数の形と、`cli.mjs` を触るかを、実物を読んで決め、決めた形を logical-components に反映する。（NFR3.3、NFR7.1、NFR9.2）
- [x] Step 3: 後ろ向きの互換の golden の確かめ。U3・U4 で固定した golden（`tests/coverage-gate-golden*.mjs`、結果の JSON・summary・notice・出力値の 4 つの面、一致・不一致・観測できず・入力の失敗の 4 経路）が、変更前に通ることを確かめて記録する。この単位で変えるのは、golden の「入力の失敗」の例が `exclusions` を未知のキーにしている所だけ（Step 8 で別の未知のキーに置き換える）。ほかの文字列は 1 バイトも変えない。（RL9、NFR8.1、BR11.4）
- [x] Step 4: 理由の規則 — `threshold.mjs`。Red → Green → Refactor。内容: 根拠の 1 行の文の規則（上限・禁じる並び・制御文字・空白だけ）と、決定の URL の形の規則（空白で区切った断片のうち 1 つ以上が decisionUrlShape に完全に合い decisionUrlMaxLength 以内）を、確かめる値と失敗の時の field の名前を受ける関数として export し、U4 の `checkThreshold` はその関数を呼ぶ形にする（規則と定数の持ち主は変えない）。U4 の呼び出しの結果（理由コード・field・順）は 1 つも変わらない。試験: U4 の根拠の境界（300 / 301 文字・改行・`%0a`・`::`・`|`・バッククォート・空白だけ）が、field の名前を変えても同じ判定になる正例・負例、`threshold.rationale` の失敗の field が従来どおりであること、URL の形の関数が U4 の呼び出しと除外の呼び出しで同じ判定になること（形に合う・http・query つき・前後が日本語とつながる・空白区切りの 2 つ目に URL がある）。（BR9.3、BR9.5、NFR3.1、RL9）
- [x] Step 5: 除外の検査と集合の差 — `exclusions.mjs`（新規）。Red → Green → Refactor。内容: 除外の項目の持てるキー（path、reason）の持ち主。`checkExclusions(value)` は、配列でなければ `INPUT_FIELD_INVALID`（field `exclusions`）、要素が object でなければ `INPUT_FIELD_INVALID`（`exclusions[<i>]`）、未知のキーは符号点順で最初の 1 件を `INPUT_FIELD_UNKNOWN`（`exclusions[<i>].<キー>`）、path・reason の欠落は path が先に `INPUT_FIELD_MISSING`、path が文字列でない・空は `INPUT_FIELD_INVALID`、理由は Step 4 の関数で確かめ（1 行の規則のあと、決定の URL の形。無ければ `INPUT_FIELD_INVALID`（`exclusions[<i>].reason`））、全要素の形が通った後に重複（同じ path の 2 件目以降）を `INPUT_FIELD_INVALID`（`exclusions[<i>].path`）にする。要素の添字の昇順で最初の失敗 1 件を返す早期 return の小さな関数に分け、成功なら path の符号点順に並べ替えて返す（入力の並びに依存しない。`localeCompare` を使わない）。`subtractExclusions(denominatorPaths, requiredTestPaths, exclusions)` は、各 path を分母のソースの集合 S と必須の試験の集合 T（どちらも Set）と完全一致で照らして種別（S だけ = source、T だけ = test、両方 = both）を決め、どちらにも無い path は添字の昇順で最初の 1 件を `TARGET_UNRESOLVED`（field `exclusions[<i>].path`、detail は固定の文で path の文字列を書かず位置だけ）、分母のソースが空なら `TARGET_EMPTY`（field `exclusions`、分母の detail）、必須の試験が空なら `TARGET_EMPTY`（field `exclusions`、必須の試験の detail）、成功なら除外を引いた分母、除外を引いた必須の試験、除外の一覧（path・kind）を返す。除外が 0 件なら走査せずに分母をそのまま返す。ネットワークの module・環境変数・`Date`・乱数・file の読み書きを置かない。試験: 設計の各境界の正例と負例（配列でない・null・文字列、要素が配列・null、未知のキー、path 無し・理由無し・両方無し、path が数・空文字、理由の 301 文字・改行・`::`・`%0A`・`|`・バッククォート、決定の URL が無い理由（INPUT_FIELD_INVALID）、重複、大文字小文字違い・`./`・`..`・directory 名・wildcard・絶対 path・追跡されていない file がどちらの集合にも無いので TARGET_UNRESOLVED、分母の全部除外と必須の試験の全部除外（別の detail の TARGET_EMPTY）、種別 source・test・both の決定、入力の並びを入れ替えても同じ結果、失敗の文に path の文字列が無い、長い path や上限ちょうどの理由が線形の時間で処理される）。（BR9.1〜BR9.5、BR10.1、BR10.2、NFR1.2、NFR1.3、NFR2.3、NFR4.1、NFR4.2、NFR5.4、NFR5.6、NFR5.7、NFR9.3、PF2、PF3、RL3、RL4、RL5）
- [x] Step 6: 入力の検査 — `input.mjs`。Red → Green → Refactor。内容: 既知のキーの集合に `exclusions` を足す（`measurement` は引き続き未知、`denominator` の中の `exclusions` も未知）。検査の順は、U4 までの検査の後に `exclusions.mjs` の検査を呼ぶだけ。検査済みの入力に並べ替えた `exclusions`（なければ空の配列）を載せる。除外の無い入力の検査済みの入力は、U4 と同じ項目に `exclusions: []` だけを足した形になる。U4 の「`exclusions` は未知のキー」の試験は意図して置き換える（NFR8.4）。試験: `exclusions` の省略・空の配列・1 件・複数件が通る、各失敗の理由コードと field と順、`denominator.exclusions`・`exclusion`・`excludes`・`exclusions[i].extra` が INPUT_FIELD_UNKNOWN、失敗しても `mode`・`threshold` の検査の順が変わらない。（BR9.1、BR10.4(3)、NFR4.1、NFR5.2、NFR5.7、NFR8.4、NFR8.5、RL9、RL12）
- [x] Step 7: 分母の解決 — `resolve.mjs`。Red → Green → Refactor。内容: 既存の解決（分母と必須の試験）のあとに、`subtractExclusions` を 1 回だけ呼び、除外を引いた分母、除外を引いた必須の試験、除外した path と種別を返す。名指さない必須の試験は除外と無関係のまま。分母を決める場所はここ 1 か所で、判定の核と出力の側で別々に引かない。試験: source の除外が分母から外れて `resolvedFileCount` が減る、test の除外が必須の試験から外れて notRunPaths に出ない、both の除外が両方から外れる、source の除外だけでは同名の型の試験が必須のまま（重なりの反例。1 つの結合試験で、除外せず流さない試験が NOT_RUN で notRunPaths に出る）、名指さない試験の未実行は NOT_RUN のまま、testTargets を狭めただけは除外にならず記録が残らない、どちらの集合にも無い path で TARGET_UNRESOLVED、分母または必須の試験の全部除外で TARGET_EMPTY、除外 0 件は U4 と同じ戻り値。（BR10.1〜BR10.3、BR10.6、NFR3.3、NFR4.2、NFR4.3、NFR4.11、RL5、RL6）
- [x] Step 8: 出力 — `report-exclusions.mjs`（新規）と `report.mjs`。Red → Green → Refactor。内容: `report-exclusions.mjs` は summary の最初の行（「Excluded from the gate: N (source S, test T, both B)」）と「Excluded files (N):」の節と、notice の固定の文「Exclusions: N.」の持ち主で、一覧の上限は引数で受け値を持たず import もしない。`report.mjs` が `SUMMARY_LIST_LIMIT`（`report.mjs:7` が持つ 20）を引数として渡す。`report.mjs` が文書の `exclusions`（`{path, reason, kind}`、path の符号点順）・`exclusionCount`・`denominator.resolvedFileCount`（除外を引いた後の件数）に値を持たせ、入力の失敗の文書は U3 のまま（exclusions は空、exclusionCount は 0）。summary の節は除外が 1 件以上のときだけ、先頭の SUMMARY_LIST_LIMIT 件（20）までを「path (kind): reason」で出し、残りは件数と「全体は結果の file にある」旨の 1 行（path と理由は U3 の無害化を通す）。notice は種類を変えず固定の 1 文を添え、path・理由は載せない。出力値の名前は 7 つのまま（`exclusion-count` に件数）。除外の無い実行は Step 3 の golden とバイトまで一致する。頭の 1 行は結果の区分・動作・閾値の例外の有無に関わらず毎回出す（閾値の例外の行があればその次）。0 件では出さない。試験: 除外 0・1・20・21 件の summary の境界、頭の 1 行の有無・位置・件数（S + T + B = N）を区分 3 × 動作 2 × 閾値の例外の有無 × 除外の有無の表のすべての行で、3 区分 × 4 面、無害化（`%`・CR・LF・バッククォート・`|` を含む path と、入力の検査を通る理由）、notice の表のすべての行で種類と文面、出力値の名前の集合が U4 と等しい、kind に応じて除外した path が unmeasuredPaths・perFile（source・both）と notRunPaths（test・both）に現れず exclusions に残る、同じ文書から 4 面が作られる、入力の並びを入れ替えても出力が変わらない。（BR11.1〜BR11.6、NFR2.2、NFR4.6〜NFR4.12、NFR5.5、NFR8.1、NFR8.2、OB1〜OB5、RL2、RL9、RL10）
- [x] Step 9: 入口の配線 — `cli.mjs`（Step 2 で触ると決めた場合だけ。`emit.mjs` は変えない）。Red → Green → Refactor。内容: 解決の戻り値（除外した path と種別、除外を引いた分母、除外を引いた必須の試験）を、測定と判定の核（除外を引いた必須の試験）と出力の組み立て（除外の一覧）へ渡す配線だけ。入口は除外で分岐しない。除外した試験 file が testTargets に残って流れた場合は、失敗があれば testFailurePaths に出て隠れず、必須の集合には数えない（実装の前に measure の入力の受け方を実物で確かめ、試験にする）。終了コードは入力の失敗なら 2、そうでなければ `Number(document.shouldFail)`（U3 のまま）。結合の試験（一時の小さな git repo。架空の名前と値）: 除外の無い 4 経路が golden と一致、除外ありで割合が上がって一致（終了コード 0）、除外ありで必須の試験が流れず NOT_RUN（終了コード 1）、分母に残る file が未計測（終了コード 1）、分母に無い path と全部除外が終了コード 2、除外らしい環境変数を置いても結果・記録・終了コードが置かない時とバイトまで一致、別の引数が ENTRY_ARGUMENTS_INVALID（終了コード 2）、結果・summary・出力値の書き込みの失敗は 2。置き換える既存の試験: `coverage-gate-input.test.mjs` の未知のキーの試験、`coverage-gate-cli.test.mjs` の `exclusions: 50`、golden の入力の失敗の例（`exclusions: ["src/a.mjs"]`）、`coverage-gate-cli-modes.test.mjs` の余分なキー `exclusions: []` を、別の未知のキーに置き換え、確かめの性質（未知のキーが INPUT_FIELD_UNKNOWN になること）を保つ。（BR10.4、BR11.3、BR11.4、NFR4.4、NFR4.5、NFR5.2、NFR5.7、NFR7.4、NFR8.4、NFR8.6、RL8、RL12、RL13）
- [x] Step 10: 構造と自己の網羅率。`tests/coverage-gate-structure.test.mjs` に足す: (a) 新しい値の literal（除外の項目のキー名、`Excluded from the gate`、`Excluded files`、`Exclusions:`）が持ち主の file にだけ現れる、(b) 分母から file を引く code が `exclusions.mjs` と `resolve.mjs` の呼び出し 1 か所にしかなく、`judge.mjs` に除外の語が無い、(c) `exclusions.mjs`・`report-exclusions.mjs`・`input.mjs`・`resolve.mjs`・`report.mjs` に除外を決める code として `process.env` の読みが 0 件、ネットワークの module（`http`・`https`・`net`・`dns`・`tls`・`fetch`）と資格情報の名前の読みが無く、純粋な核に `Date`・`Math.random`・`randomUUID`・`node:fs`・`node:child_process` が現れない、(d) 新しい 2 file が 300 行以内、(e) 追加した import が Node の組込みと既存の `scripts/hygiene/lib.mjs` だけ、(f) `report-exclusions.mjs` が上限の持ち主（`report.mjs`）を import せず、`SUMMARY_LIST_LIMIT` の literal が `report.mjs` にだけ現れ、`.dependency-cruiser.cjs` の no-circular を通る。自己の網羅率（OB5）: 門で `scripts/coverage-gate/`（directory の宣言）を測った入力 JSON と結果の JSON をこの単位の記録に置き（`self-coverage-input.json`、`self-coverage-result.json`）、Node 組込みの lcov を別に計算して突き合わせる。100%、2 つの値が一致、対象が 0 件でないこと。未計測・不一致は成功に数えない。（NFR2.1、NFR3.1〜NFR3.3、NFR5.1、NFR5.2、NFR7.2、NFR7.3、NFR9.1、OB5）
- [x] Step 11: 全体の確かめ。`npm test`（全体、観測値を記録）、既存の構造の検査（`lint:structural`、`lint:guard`、`hygiene:*`、dependency-cruiser、knip、jscpd）と OWN-01 を流す。当たった場合は設定を変えず、まず file の置き方を直し、直せない時は止めて arc に伺う（検査を緩める変更を同じ PR に混ぜない）。足す export のうち試験からだけ使う物には U3 と同じ `/** @public */` の印を付ける（NFR9.2）。逆向きの確かめ（NFR8.3、RL11）: この単位の code の変更を取り消した状態の木で、U3・U4 の試験（置き換えた 4 件を除く）が全部通ることを 1 回観測する。1 秒・10 秒の時間の網（PF2・PF3）も記録する。（NFR1.1、NFR8.2、NFR8.3、NFR9.2、NFR9.3）
- [x] Step 12: 文書と追跡。`code-summary.md`、`traceability.json`、`source-manifest.json` を書く。配線された workflow での実行、Node 22 以外での CI、配線後の表示は「観測できなかった」と書き、成功とは書かない（入口は U7 まで配線されない。NFR8.6）。除外の理由の妥当性と、除外が割合を不当に上げていないかは、門が確かめず、独立の監査が入力の差分と結果の JSON を読んで確かめることを「門が保証しないこと」として PR に書く。作業場の木が古いので、追跡表の検査が探す試験 file だけを同じ内容で作業場の木に置き、記録に書く。PR の本文は `json sds-pr` を 1 つ、`risk:R3` の label を 1 つ付け、設計の参照に設計の記録だけの PR の統合の commit を書く。

## 試験の方針（標準の方針に対する適用）

- 部品ごとの件数: `exclusions` 12 件、`report-exclusions` 8 件、`threshold` に 4 件、`input` に 8 件、`resolve` に 6 件、`report` に 8 件、`cli`（結合）に 8 件、構造の試験に 4 件を足す。合計およそ 58 件。
- 正例と負例: 設計の各規則（BR9.1〜BR11.5）に正例 1 つ以上、負例（対象違い、古い記録、欠落、改変、実行不能、再実行、人待ち不要の停止）を、適用される要件に結ぶ。unit-test-instructions.md の表で規則・要件との対応を追う。
- 評価の写しではなく実物を走らせる: 入口の試験は、実際に `node --test` を子プロセスで走らせ、架空の小さな git repo の中で組込みの網羅率を得る（U3・U4 と同じ）。Node の版が保証の外の時は、その事実を観測として扱い、成功に数えない。
- 置き方: 試験は `tests/coverage-gate-<部品>.test.mjs`（既存の `npm test` が拾う）。skip・todo を置かない。fixture は架空の path と理由だけで、12 文字の英数字を `token` に入れた形を使わない（gitleaks）。公開 repo に利用先の実物・非公開の物を写さない。
- 行の網羅率の床 100%: 対象は `scripts/coverage-gate/**`（基準で 15 file、この単位で 2 file を足して 17 file）。Step 10 の自己の網羅率で観測値を残し、対象 0 件・記録なし・不一致を成功に数えない。除外が要る行があれば、PR に理由を書いて独立の監査で確認する。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: 既存 `memory/team.md` で Q3 の採択として記録された TDD を維持する。`pr34-u2-red.json` / `pr34-u2-green.json` は当時の方法を示す根拠であり、新しい変更の試験合格を示す証拠にはしない（P7 の規格維持、既存 team）。\n- **Ordering**: 各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。\n- 試験の道具は Node 組込みの `node:test` と `assert`。判定には正例・負例を用意し、対象違い、古い記録、欠落、改変、実行不能、再実行、人待ちの停止などを、適用される要件に対応付ける。\n- 行の網羅率の床は100%。統合前の CI と Build and Test で確認し、通すために弱めない。計測から除外する行が必要なら PR に理由を書き独立監査で確認する。対象集合・分母と実行コマンドは各取り組みで特定し、部分集合だけで製品全体を測れたとしない（P4）。\n- 行の網羅率の結果は、CI の成否だけで済ませず、観測した値を機械が読める形で記録し、門・監査がそれを根拠にする。未計測・実行されていない・計測不能は成功に数えない。申告された値は証拠にしない（社内標準 S5・S8。arc の答え、Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 による。Owner の言葉ではない）。記録の形・置き場・門や監査への結び付けは、この取り組みの要件と設計で定める。\n- 適用される SEC-T、依存導入前の脆弱性確認、秘密情報保護、最小権限を維持する（P1・P2・P7）。公開 repo の fixture・ログ・出力は架空データだけにする。\n- 必須工程や適用条件を満たす検証について、skip、timeout、観測不能や単なる exit0 を合格に数えない。任意工程と正式に適用外となった工程はその理由と適用条件を明示し、必須工程の未実行と混同しない。設定値や試験ファイルの存在を実測結果の代わりにしない。"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:6cba1c86da366533d3b62b88bdde582813aa3a9e2d5f928977390f00a5fb33d7",
  "contract_sha256": "sha256:58999c825ae25c8a2753c7d2d89bd127f82fe3e2bc5abdffa9801ed0918b42e4"
}
```

## 適用しない層（plan_profile に対する調整）

データモデル / DB、リポジトリ（DB への access）、フロントエンドの各層は、この単位に無い（DB の構造は変えない。DB 基準は適用外）。方法（TDD）は変えず、次のように読み替えて Red → Green → Refactor を行う: 「ビジネスロジック」= 除外の検査・集合の差・入力の検査・整形の純粋な核（Step 4〜8）、「API / endpoint」= command の入口の配線と結合の確かめ（Step 9）。分母の解決（`resolve.mjs`）は、除外を引く 1 回の呼び出しを足すだけの adapter の変更として Step 7 で扱う。

## Assumptions & Open Questions

### Assumptions

- [assumption] file の分け方（新規 2 file）は設計の案で、Step 5・8 の中で行数の見込みを見て統合・分割を決める（300 行以内・複雑さ 10 を守る方向だけに動かす。変える時は logical-components と追跡表を先に直す）。
- [assumption] `threshold.mjs` の根拠の検査を field の名前を受ける形にする変更と、`cli.mjs` を触るかは、Step 2 で実物を読んで決める。
- [assumption] dependency-cruiser・knip・jscpd・OWN-01 の既存の設定が新しい 2 file と import の向きを許す。許さない場合は設定を変えず file の置き方を直す。直せなければ止めて arc に伺う。
- [assumption] clone の `origin/main` が Step 2 の後で進んだら、進んだ後の bytes で Step 2 の突き合わせをやり直す。
- [assumption] 置き換える既存の試験は、`exclusions` を未知のキー・不正な型として扱う 4 件だけ。ほかの U3・U4 の試験は変えない。

### Open Questions

なし。リスクの区分（R3）・設計の記録だけの PR を先に出して設計監査を 1 回出す扱いは arc の答えで確定済み。環境変数の読みの扱いは設計監査で確かめる。

## 実装での差異（計画は書き換えず、実装で外れた点だけを書く）

- 計画（RL12）が数えた置き換えは 4 件（未知のキーの例を `exclusions` から `excludes` へ）。ほかに、計画が数えていない既存の試験の編集があった: `coverage-gate-resolve.test.mjs` の補助に `exclusions = []`、`coverage-gate-report.test.mjs` と `coverage-gate-golden.test.mjs` に `buildDocument` の必須の引数 `excluded` を渡す各 1 行、`coverage-gate-structure.test.mjs` の file 一覧への 2 file の追加。試験は弱めていない。
- `buildDocument` の `excluded` は、最初は既定値 `[]` を置いたが、渡し忘れが黙って除外 0 件になるため外して必須の引数にした。設計はどちらとも書いていない。親の判断を求める。
- 計画の文は、除外した試験 file が `testTargets` に残って流れるとも読める。実物の測定は除外を引いた後の必須の試験だけを流し、除外した試験 file は流れない。実物の command で確かめた。設計の文の書き方と実物の食い違いとして記録する。
- `coverage-gate-report.test.mjs` が 383 行になり、新しい file の 300 行の上限に当たったため、除外の試験を `coverage-gate-report-document-exclusions.test.mjs` に分けた（設定は変えていない）。
- Step 10 の構造の試験は、実装が先にあったため観測できる Red が無い。壊した版での失敗は手元で確かめた。
- 作業場の木に置いた物: 新しい試験 4 file（未追跡の写し。`cmp` で一致を確認）。
- 配線された workflow での実行・CI・Node 22 以外の CI・Linux の runner・`secrets` の検査・独立の監査は観測していない（code-summary.md に記載）。
