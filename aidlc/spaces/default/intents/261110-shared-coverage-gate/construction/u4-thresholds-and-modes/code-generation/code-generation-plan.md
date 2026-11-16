# U4 u4-thresholds-and-modes — コード生成の計画

## Summary

- Builds: 共有の網羅率の門に「閾値の例外」（決定の URL・下げる値・根拠の 3 つそろいの入力と、その検査）と「動作」（`enforce` / `record-only`）を足す。判定の核が落とすかどうかを 1 か所で決め、結果の JSON・job summary・notice・出力値に例外と動作を同じ 1 つの文書から出す。例外も動作も指定しない入力の出力は U3 とバイトまで一致する。
- Touches: 新しい `scripts/coverage-gate/threshold.mjs`・`report-exception.mjs`（2 file）と、既存の `input.mjs`・`judge.mjs`・`report.mjs`・`cli.mjs`（配線だけ）。新しい試験 2 file（`tests/coverage-gate-threshold.test.mjs`、`tests/coverage-gate-report-exception.test.mjs`）と、既存の試験 5 file への足し。追加の順の変更のみで、`scripts/hygiene`・`scripts/sds`・`.github/workflows`・`kit`・`package.json`・各種の設定は変えない。
- Tests: 部品ごとに 5〜12 件（標準の方針）、合計およそ 60 件。`node:test` と `node:assert/strict`、依存の追加なし。純粋な核は単体、入口は一時の小さな git repo を使う結合。行の網羅率の床は 100%（足す・触る file すべて。門自身を門で測った観測値を機械が読める形で残す）。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR6.1〜BR8.6）、[entities.md](../functional-design/entities.md)。
- 非機能の設計: [logical-components.md](../nfr-design/logical-components.md)（LC1〜LC5）、[performance-design.md](../nfr-design/performance-design.md)、[security-design.md](../nfr-design/security-design.md)、[scalability-design.md](../nfr-design/scalability-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)（RL1〜RL6）、[observability-design.md](../nfr-design/observability-design.md)。
- 基盤: [infrastructure-specification.md](../infrastructure-design/infrastructure-specification.md)、[monitoring-design.md](../infrastructure-design/monitoring-design.md)、[cicd-pipeline.md](../infrastructure-design/cicd-pipeline.md)。
- 要件・単位・契約: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)（U4）、[contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- 設計の版の照らし（記録した事実）: この単位の設計の記録 22 file の git blob id を、PR #106（設計の記録だけの PR。統合の commit `e1c2aea0`、設計監査 2 回目 PASS）の木と突き合わせた。20 file は一致。違うのは `functional-design/traceability.json`（u3 の規則を土台として引いた行 12 件を「適用外」の行に足した）と `nfr-design/traceability.json`（u3 の要件 NFR1.8・NFR2.5・NFR5.8 を土台として引いた行 3 件を足した）の 2 file だけで、どちらも追跡表の検査を通すための行の追加であり、設計の本文は #106 のまま。
- 基準の実物: 実装は、公開 Shirube の clone の `origin/main`（記録した時点で `43819a56222b68c2e4c4c028d0f6644b288c33c7`。U3 の #104 と audit-intake-extra の設計の #107 が統合済み）の実物から作る。作業場の木は古いので現状の根拠に使わない。U3 の実物（`scripts/coverage-gate/` 13 file）は `input.mjs` 94 行・`judge.mjs` 138 行・`report.mjs` 168 行・`cli.mjs` 106 行を読んだ。`npm test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs`（新しい file を自動で拾う）。

## 進め方の順序（守る物の決まり）

この単位は結果の JSON と入力の契約（版 1 に値を持たせる）と、入力の検査（セキュリティの設計 SC）を持つ。arc の答え（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830。Owner の言葉ではない）に従う:

1. 設計の記録だけの PR は PR #106 で済んでいる（設計監査 PASS・統合済み）。同じ設計で設計監査を出し直さず、この計画 → TDD で code へ進む。
2. 実装の PR はリスクの区分 R3（label も監査依頼の `risk_class` も最初から R3）。統合の前に対象 head への Owner の exact-head（arc 経由）を確認する。audit-intake-extra の実装の PR とは別の PR。
3. 作る中で設計に足りない所が見つかったら、そこで止めて 1 行で知らせ、設計を先に直す（authority-and-waiting R3）。コードで黙って埋めない。
4. 保護対象（workflow・必須の検査・branch protection・DB・資格情報・本番・料金・契約 `.v2`）は触らない。この単位は入口をどの workflow にも配線しない（U7）。

## 手順

作業木は clone の worktree（`~/Developer/.worktrees/` の下。作業場の木ではない）に、最新の `origin/main` から作る。各部品は Red（失敗する試験を書いて失敗を確かめ、出力を記録）→ Green（通す最小の実装）→ Refactor の順で、Red と Green は別々の commit にする。葉（依存の少ない所）から上へ作る。

- [x] Step 1: 構成の骨組み。worktree を作り、`node_modules` は clone からの symlink で用意する（commit しない）。`scripts/coverage-gate/threshold.mjs` と `report-exception.mjs` は、Red が「実装が無くて失敗する」ことを確かめられるよう、この段では作らない（試験が import する名前だけを Step 3 以降で足す）。新しい依存・設定は足さない。（NFR6.1、NFR6.2）
- [x] Step 2: 試験の実行環境と基準の確かめ。次を観測して記録する: (a) worktree の `scripts/coverage-gate/{input,judge,report,cli}.mjs`・`package.json`・`ci.yml` の SHA-256 が、記録した `origin/main` の実物と一致する、(b) U3 の試験が変更前に通る（単位の command は unit-test-instructions.md）、(c) dependency-cruiser・knip・jscpd・ESLint・OWN-01 の既存の設定を読み、新しい file に当たる条件（`input → threshold`、`report → report-exception` の import の向き、試験からだけ使う export の印）を記録する。一致しない・成り立たない時は、書かずに設計の記録を直す。（NFR3.3、NFR7.1、NFR9.2）
- [x] Step 3: 後ろ向きの互換の golden を先に固定する。**U3 のコードを 1 行も変える前に**、例外も動作も無い入力で、一致・不一致・観測できず・入力の失敗の 4 経路について、結果の JSON・job summary・notice・出力値の 4 つの面の文字列を `tests/` の fixture に書き出す（`tests/coverage-gate-fixtures.mjs` か別の補助 file。試験として走らない名前）。この golden が、U4 の変更の後も 1 バイトも変わらないことが NFR8.1・BR8.5 の証拠になる。（RL6、NFR8.1、BR8.5）
- [x] Step 4: 判定の核 — `judge.mjs`。Red → Green → Refactor。内容: `MODES`（`enforce`、`record-only`）と `DEFAULT_MODE` を足す。`judge` が `mode` と `threshold`（null か検査済みの例外）を明示の入力として受ける（省略時は `DEFAULT_MODE` と null。U3 の試験が通り続けるため）。実際の閾値は、例外があればその値、無ければ `DEFAULT_THRESHOLD_HUNDREDTHS`。比較は整数どうしで、既存の `coveredLines * 10000 < totalLines * 実際の閾値`。`shouldFail = (outcome !== "match") && (mode === "enforce")` をここ 1 か所に置く。例外は早期の観測できずの経路（`unobservableVerdict`）より前に verdict へ載せる。verdict の `mode`、`effectiveThresholdHundredths`、`thresholdException`（`decisionUrl`、`claimedHundredths`、`rationale`）を入力から決める。`MODE` の U3 の定数は、同じ値を 2 か所に書かない形に直す。試験: 6 通りの（区分 × mode）で shouldFail、record-only でも outcome と reasonCodes が enforce と同じ、例外あり 100% 超でも「例外を使った」事実が残る、観測できずでも例外が載る、既定より厳しくならない、同じ入力で同じ出力、核に `Date`・乱数・環境・file が現れない。（BR7.2、BR7.4〜BR7.6、NFR2.1、NFR2.2、NFR3.1、NFR3.3、NFR4.1、NFR4.6、NFR4.7、RL1、RL4）
- [x] Step 5: 例外の検査 — `threshold.mjs`（新規）。Red → Green → Refactor。内容: 例外の検査の定数（`rationaleMaxLength` 300、`rationaleForbidden` の 5 つ、`decisionUrlMaxLength` 300、`decisionUrlShape`、許すキー 3 つ）の持ち主。`checkThreshold(value)` は、object でないなら `INPUT_FIELD_INVALID`（field `threshold`）、キーの欠落は `percent`、`decisionUrl`、`rationale` の順で最初の 1 件を `INPUT_FIELD_MISSING`（field `threshold.<キー>`）、未知のキーは `INPUT_FIELD_UNKNOWN`（field `threshold.<キー>`）。percent は JSON の数で 0 以上・`DEFAULT_THRESHOLD_HUNDREDTHS / 100` 未満・小数第 2 位まで（`-0` は 0。文字列 `"95"` は失敗）、整数（hundredths）に正規化する。decisionUrl は長さを先に確かめ、完全一致の形（owner 1〜39 文字の英数字と `-`、repo 1〜100 文字の英数字と `._-` で `.`・`..` だけは不可、番号は先頭 0 でない 1〜12 桁、`issues` か `pull`）だけ。rationale は長さを先に確かめ、空白だけ・制御文字・禁止の並び（`::`、`%0A`・`%0D` は大文字小文字を区別しない、バッククォート、`|`）を失敗にし、入力のとおり保存する。最初の失敗を返す早期 return の小さな関数に分け、複雑さ 10・関数 50 行に収める。ネットワークの module と環境変数を読まない。試験: 設計の各境界（99.99・100・0・-0・負・NaN 相当・3 桁の小数・文字列、URL の別 host・http・query・user@host・空白・0 始まりの番号・13 桁、根拠の 300 / 301 文字・改行・`%0a`・`::`・`|`）の正例と負例、長い入力が線形の時間で拒まれること。（BR6.1〜BR6.6、NFR1.3、NFR3.1、NFR4.5、NFR5.1、NFR5.2、NFR5.4、NFR9.3、SC）
- [x] Step 6: 入力の検査 — `input.mjs`。Red → Green → Refactor。内容: 既知のキーの集合に `threshold` と `mode` を足す（`exclusions`・`measurement` は引き続き未知）。検査の順は、期限と総予算（U3 の BR1.8）の後に `mode`（BR7.1。完全一致、省略は `DEFAULT_MODE`、それ以外の値・null・数・真偽は `INPUT_FIELD_INVALID`（field `mode`））→ `threshold`（`threshold.mjs` を呼ぶだけ）。検査済みの入力に `mode` と `threshold`（null か `ThresholdException`）を載せる。U3 の「`threshold`・`mode` は未知のキー」の試験は意図して置き換える（NFR8.4、NFR7.3）。試験: `mode` の 2 値と、`fail`・`Enforce`・`record`・空白つき・null・数・真偽、`threshold` の各失敗の理由コードと field と順、`record-only` でも入力の失敗の文書が出る入力、例外も動作も無い入力の検査済みの入力が U3 と同じ項目に `mode: "enforce"`・`threshold: null` だけを足した形になること。（BR6.1、BR6.2、BR7.1、NFR4.2、NFR4.5、NFR5.3、NFR5.6、NFR8.4）
- [x] Step 7: 出力 — `report-exception.mjs`（新規）と `report.mjs`。Red → Green → Refactor。内容: `report-exception.mjs` は例外・動作の表示の文型（最初の行の旗、表の閾値の欄の差、`Threshold exception` の節、record-only の 1 行、見出しの `Not observable (計測不能)`、notice の注釈の種類の表）の持ち主。`report.mjs` の `judgmentFields` が `mode`・`thresholdException`（`decisionUrl`、`claimedPercent`、`rationale` の順）・`effectiveThresholdPercent` に verdict の値を持たせ、入力の失敗の文書は U3 のまま（3 項目が null）。summary は、例外があるとき最初の行に「閾値を 100.00% より低い NN.NN% に下げている」旨を成功の見出しより前に置く。notice は BR8.3 の表（入力の失敗 error、match 例外なし notice、match 例外あり warning、match でなく enforce は error、match でなく record-only は warning）で、実際の閾値を含み、例外ありは `threshold lowered by exception` と決定の URL を含み、根拠は載せない。例外なしで enforce の観測できない結果は U3 の文面のまま。URL と根拠は U3 の無害化を通す。例外も動作も無い実行は Step 3 の golden とバイトまで一致する。出力値の名前は 7 つのまま。試験: 例外あり × 3 区分 × 4 面、record-only × 3 区分、例外なし enforce の golden、無害化（`%`・CR・LF・バッククォート・`|` を含む根拠は入口で拒むが、出口の無害化の二重の防御も 1 件確かめる）、同じ文書から 4 面が作られること、`Record-only mode: this result is recorded and does not fail the job.` の旨の 1 行、成功とは書かない。（BR8.1〜BR8.6、NFR2.3、NFR4.8〜NFR4.12、NFR5.4、NFR5.5、NFR8.1、OB、RL4、RL6）
- [x] Step 8: 入口の配線 — `cli.mjs`（`emit.mjs` は変えない）。Red → Green → Refactor。内容: `produceDocument` が検査済みの `mode` と `threshold` を `judge` へ渡すだけ。入口は `mode` で分岐しない。終了コードは入力の失敗なら 2、そうでなければ `Number(document.shouldFail)`（U3 のまま）。結合の試験（一時の小さな git repo。架空の名前と値）: 例外も動作も無い 4 経路が golden と一致、`record-only` で閾値未満・未計測・NOT_RUN・観測できずがいずれも終了コード 0 で結果の JSON に `mode: "record-only"` と区分が残る、`record-only` でも入力の失敗は終了コード 2 で `mode` が null、例外あり 100% 以上の一致でも `thresholdException` が残り終了コード 0、例外の値より低い網羅率は終了コード 1、結果・summary・出力値の書き込みの失敗は record-only でも 2（先に書けた結果は書き直さない）、入口の引数・環境変数で例外を指定できないこと。（BR7.2〜BR7.4、BR7.3、BR8.5、BR8.6、NFR4.3、NFR4.4、NFR5.3、NFR8.5、RL3）
- [x] Step 9: 構造と自己の網羅率。`tests/coverage-gate-structure.test.mjs` に足す: (a) 新しい値の literal（`enforce`、`record-only`、`300`、URL の形、禁止の並び）が持ち主の file にだけ現れる、(b) `shouldFail` を決める code が `judge.mjs` にだけある（他の file の中身を調べる）、(c) `threshold.mjs`・`report-exception.mjs`・`input.mjs`・`judge.mjs`・`report.mjs` にネットワークの module（`http`・`https`・`net`・`dns`・`tls`・`fetch`）と資格情報の名前の読み取りが無く、`Date`・`Math.random`・`randomUUID`・`process.env`・`node:fs`・`node:child_process` が現れない、(d) 新しい 2 file が 300 行以内、(e) 追加した import が Node の組込みと既存の `scripts/hygiene/lib.mjs` だけ。自己の網羅率（OB5）: 門で `scripts/coverage-gate/`（directory の宣言）を測った入力 JSON と結果の JSON をこの単位の記録に置き（`self-coverage-input.json`、`self-coverage-result.json`）、Node 組込みの lcov を別に計算して突き合わせる。100%、2 つの値が一致、対象が 0 件でないこと。未計測・不一致は成功に数えない。（NFR2.1、NFR3.1〜NFR3.3、NFR5.1、NFR7.2、NFR9.1、BR6.6、OB5）
- [x] Step 10: 全体の確かめ。`npm test`（全体、観測値を記録）、既存の構造の検査（`lint:structural`、`lint:guard`、`hygiene:*`、dependency-cruiser、knip、jscpd）と OWN-01 を流す。当たった場合は設定を変えず、まず file の置き方を直し、直せない時は止めて arc に伺う（検査を緩める変更を同じ PR に混ぜない）。足す export のうち試験からだけ使う物には U3 と同じ `/** @public */` の印を付ける（NFR9.2）。逆向きの確かめ（NFR8.3）: この単位の code の変更を取り消した状態の木で、U3 の試験（置き換えた 1 件を除く）が全部通ることを 1 回観測する。Node 22・24・26 で試験と網羅率が一致することを作った側の実測として記録する（Node 22 以外は保証ではなく観測）。（NFR1.1、NFR8.2、NFR8.3、NFR9.2、NFR9.3）
- [x] Step 11: 文書と追跡。`code-summary.md`、`traceability.json`、`source-manifest.json` を書く。配線された workflow での実行、Node 22 以外での CI は「観測できなかった」と書き、成功とは書かない（入口は U7 まで配線されない。NFR8.5）。決定の URL の実在・書き手・本文は門が確かめず、独立の監査が確かめることを「門が保証しないこと」として PR に書く（BR6.6）。作業場の木が古いので、追跡表の検査が探す試験 file だけを同じ内容で作業場の木に置き、記録に書く。PR の本文は `json sds-pr` を 1 つ、`risk:R3` の label を 1 つ付け、設計の参照に #106 の統合の commit を書く。

## 試験の方針（標準の方針に対する適用）

- 部品ごとの件数: `threshold` 12 件、`report-exception` 8 件、`judge` に 8 件、`input` に 10 件、`report` に 8 件、`cli`（結合）に 6 件、構造の試験に 4 件を足す。合計およそ 56 件。
- 正例と負例: 設計の各規則（BR6.1〜BR8.6）に正例 1 つ以上、負例（対象違い、古い記録、欠落、改変、実行不能、再実行、人待ち不要の停止）を、適用される要件に結ぶ。unit-test-instructions.md の表で規則・要件との対応を追う。
- 評価の写しではなく実物を走らせる: 入口の試験は、実際に `node --test` を子プロセスで走らせ、架空の小さな git repo の中で組込みの網羅率を得る（U3 と同じ）。Node の版が保証の外の時は、その事実を観測として扱い、成功に数えない。
- 置き方: 試験は `tests/coverage-gate-<部品>.test.mjs`（既存の `npm test` が拾う）。skip・todo を置かない。fixture は架空の owner・repo・番号の URL と架空の根拠だけで、12 文字の英数字を `token` に入れた形を使わない（gitleaks）。公開 repo に利用先の実物・非公開の物を写さない。
- 行の網羅率の床 100%: 対象は `scripts/coverage-gate/**`（この単位で 15 file）。Step 9 の自己の網羅率で観測値を残し、対象 0 件・記録なし・不一致を成功に数えない。除外が要る行があれば、PR に理由を書いて独立の監査で確認する。

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

データモデル / DB、リポジトリ（DB への access）、フロントエンドの各層は、この単位に無い（DB の構造は変えない。DB 基準は適用外）。方法（TDD）は変えず、次のように読み替えて Red → Green → Refactor を行う: 「ビジネスロジック」= 判定・入力の検査・整形の純粋な核（Step 4〜7）、「API / endpoint」= command の入口の配線（Step 8）。この単位に「リポジトリ / data access」に当たる新しい adapter は無い（`resolve`・`runner`・`measure-node`・`emit` は変えない）。

## Assumptions & Open Questions

### Assumptions

- [assumption] file の分け方（新規 2 file）は設計の案で、Step 5・7 の中で行数の見込みを見て統合・分割を決める（300 行以内・複雑さ 10 を守る方向だけに動かす。変える時は logical-components と追跡表を先に直す）。
- [assumption] `cli.mjs` の変更は `produceDocument` が `mode` と `threshold` を `judge` へ渡す数行だけで済む（U3 の実物で確認済みの構造）。`emit.mjs` は変えない。
- [assumption] dependency-cruiser・knip・jscpd・OWN-01 の既存の設定が新しい 2 file と import の向きを許す。許さない場合は設定を変えず file の置き方を直す。直せなければ止めて arc に伺う。
- [assumption] clone の `origin/main` が Step 2 の後で進んだら、進んだ後の bytes で Step 2 の突き合わせをやり直す。
- [assumption] U3 の試験のうち `threshold`・`mode` を未知のキーとする 1 件だけを置き換える。ほかの U3 の試験は変えない。

### Open Questions

なし。リスクの区分（R3）・設計の PR は済み・設計監査は出し直さない、は arc の答えで確定済み（記録した事実の節）。

## 実装での差異（計画は書き換えず、実装で外れた点だけを書く）

（まだ無い）
