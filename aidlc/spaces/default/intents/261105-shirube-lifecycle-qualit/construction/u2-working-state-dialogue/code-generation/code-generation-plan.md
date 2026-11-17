# U2 u2-working-state-dialogue — コード生成の計画

## Summary

- Builds: 実物に基づく導入状態・設定・規格の対話の核（観測の解釈 LC2・項目状態 LC3・質問と案内 LC4・回答と draft と選択 LC5）と、2 つの adapter（観測の読取り LC1 = file の読取りと子 process による道具の観測、表示の escape LC6）、module の export を集約する 1 file。入口（CLI・bin）は作らない（Q2 = A）。
- Touches: 新しい `scripts/working-state/*.mjs`（核 5・adapter 3 前後・集約 1 を想定。1 file 300 行以内）と、`knip.jsonc` の `entry` に 1 件（Q6 = A）。`.github/workflows`・`.shirube/**`・`package.json`・lockfile・契約 `.v2`・`scripts/hygiene` は変えない。同じ PR で `functional-design/entities.md`・`rules.md` に aidlc_settings の要素の形（A-08）を足す。
- Tests: 新しい `tests/working-state-*.test.mjs`（1 file 300 行以内に分ける）。`node:test` と `node:assert/strict`、依存の追加なし。規則 BR1〜BR9 の 42 件に正例・負例、構造の試験、子の起動の負例、網羅率の記録（LC7）。行の網羅率の床は 100%（`scripts/working-state/**/*.mjs` をディスクの列挙で決めた分母）。

## Sources

- [desc] Initial description: 開発の質（lifecycle quality）を上げる取り組みの 1 単位として、実物に基づく導入状態・設定・規格の対話を作る（取り組み 261105-shirube-lifecycle-qualit）。
- [scope] Workflow-selected scope: feature
- 機能の設計: [functional-spec.md](../functional-design/functional-spec.md)、[rules.md](../functional-design/rules.md)（BR1.1〜BR9.4、42 件）、[entities.md](../functional-design/entities.md)。
- 非機能の設計: [logical-components.md](../nfr-design/logical-components.md)（LC1〜LC7）、[security-design.md](../nfr-design/security-design.md)（SC1〜SC6）、[reliability-design.md](../nfr-design/reliability-design.md)（RL1〜RL6）、[performance-design.md](../nfr-design/performance-design.md)、[scalability-design.md](../nfr-design/scalability-design.md)、[observability-design.md](../nfr-design/observability-design.md)。
- 基盤: [infrastructure-specification.md](../infrastructure-design/infrastructure-specification.md)（置き場・分母・子 process の条件 1〜6・knip の entry）、[cicd-pipeline.md](../infrastructure-design/cicd-pipeline.md)、[monitoring-design.md](../infrastructure-design/monitoring-design.md)、見直し [review-02.md](../infrastructure-design/reviews/review-02.md)。
- 要件・単位・契約: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)（U2）、[contract-summary.md](../../../inception/contract-design/contract-summary.md)。
- Owner の決定: 子 process の環境と探索（決定 106、https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6941079231 、本文 SHA-256 `a66c97dcee48505de936dbce9c7fc511f2354cd53ff553ad6e98fe0af32542ad`）、子の cwd = OS の根（決定 111、https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6942847653 、本文 SHA-256 `3ecb0ea0934655ad1e904914a6ee379d18edcfef5785f6200567f7518a6891e1`）、次の単位の設計は前の PR の待ちの間に進めてよく code は前の単位の統合後（決定 61、https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6940671975）。arc が決定 95（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6934340758）により入力した答えは Owner の言葉ではない。
- 基準の実物: 実装は公開 Shirube の clone の `origin/main` の実物から作る。設計の時点で読んだ head は `7fa98d1`。U5（#111）の統合の後は `f2d509b2` が最新で、Step 2 で実物と SHA-256 を突き合わせ直す。作業場の木と共有の CodeKB は現状の根拠に使わない。

## 進め方の順序（守る物の決まり）

この単位は子 process の起動（セキュリティの設計）を含み、R3 を想定する（実際の区分は PR を出す時に決める）。arc の答え（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 、Owner の言葉ではない）と決定 61 に従う:

1. 設計の記録だけの PR を先に出し、独立の設計監査を 1 回出す。code（`scripts/` と `tests/` と `knip.jsonc` の変更）は、設計監査の PASS と作者の受領を受けた後に書く。返却を待つ間は、この計画と試験の手順を書いて承認を受けるところまでにする。設計の PR を作る時の base は、統合済みの新しい `main`（U5 の merge commit `f2d509b2` 以降）にする。
2. 前の単位（U5、#111）は統合済み（merge commit `f2d509b2`）。したがって「前の単位の統合後に作る段へ入る」の条件は満たしている。
3. 実装は同じ PR に足し、実装の head で CI・独立の監査・受領をそろえる。統合の前に対象 head への Owner の exact-head（arc 経由。R3 以上）。
4. 作る中で設計に足りない所が見つかったら、そこで止めて 1 行で知らせ、設計を先に直す（authority-and-waiting R3）。コードで黙って埋めない。
5. 保護対象（workflow・必須の検査・branch protection・DB・資格情報・本番・料金・契約 `.v2`・新しい外部の依存・セキュリティの設計の変更）は触らない。`knip.jsonc` は `protected_paths` に入らないことを実物で確認済み（Step 1 で再確認）。

## 設計の見直しで残った Minor 5 件の扱い（review-02）

| ID | 内容 | 扱い |
|---|---|---|
| R-08 | cicd-pipeline の「`lint:lines` 系」は `hygiene:lines`（`hygiene` job の `lines` の step）が正しい | Step 14 で文書の名前を直す（誤記の訂正で、設計の中身は変えない） |
| R-09 | knip の集約 file が再 export する範囲 | Step 2 で決める。既定の案: 集約 file は、試験が使う記号を含め公開の記号を全部再 export し、試験は集約 file 経由で import する。export 単位の未使用の検出が弱まる点は許容し、file 単位の未使用は引き続き検出される。Step 1・Step 11 の knip の実測で確かめ、結果を PR 本文に書く |
| R-10 | monitoring-design の「保護対象への変更」の行が、機械が止める物と人・監査が見る物を分けていない | Step 14 で文書を直す（機械が止める物 = `protected_paths` の path、人と独立監査が見る物 = `package.json`・lockfile・契約 `.v2`） |
| R-11 | 子の起動の観測不能の原因の値と、捨てた件数の運び先 | Step 2 で決める。既定の案: 原因は既存の `tool_cannot_start`（cwd が使えない時と、PATH を絞って 1 件以上捨てて見つからない時）を使い、機能設計の `UnobservableCause` は増やさない。件数と種別は LC2 が組み立てる Observation の理由の欄ではなく、案内の生成へ渡す別の値（`probeNotes`）として運ぶ。この形が機能設計・契約と合わなければ止めて arc に伺う（原因の値の新設は契約に触れうる） |
| R-12 | 3 文書の Sources が Q1〜Q5 のまま | Step 14 で Q1〜Q7 に直す（Q6 は arc が決定 95 により入力、Q7 は Owner の原文） |

## 手順

作業木は clone `~/Developer/shirube` の worktree（`~/Developer/.worktrees/` の下。作業場の木ではない）に、最新の `origin/main` から作る。各部品は Red（失敗する試験を書いて失敗を確かめ、出力を記録）→ Green（通す最小の実装）→ Refactor の順で、Red と Green は別々の commit にする。葉（依存の少ない所）から上へ作る。この単位に DB・Repository・API・画面は無いので、計画の型にある「Data model / database」「Repository / data access」「API / endpoint」「Frontend behavior」の Red・Green・Refactor は対象外（理由: U2 は何も永続化せず、入口も画面も持たない。Q2 = A）で、作る物は Business logic の層と、その周りの adapter の層だけ。

- [ ] Step 1: 構成の骨組みと knip の実測。設計の PR の設計監査が PASS し受領した後に、worktree を作り、`node_modules` は clone からの symlink で用意する（commit しない）。`scripts/working-state/` はまだ作らない。(a) 基準の実物（`knip.jsonc`・`package.json`・`.github/workflows/ci.yml`・`hygiene.yml`）の SHA-256 を記録し、設計の記述（job 名・step 名・glob・knip の entry）と食い違えば文書を先に直す。(b) 最初の Red の前に、`knip --production --config knip.jsonc` を実際に流す（hygiene の step が走らせる形。Step 2 で確かめる）。入口を作らない前提で未使用と出る見込みは、ここでは `scripts/working-state/` が無いので再現できない。そこで、空に近い 1 file（最初の核の module）を足した時点の実行を Step 11 の「前」とし、足した後を「後」として記録する。この設計の読みは未確認のまま Step 11 まで置く。（NFR10.1、NFR2.5、R-01）
- [ ] Step 2: 試験の実行環境・基準の確かめと、残る決め事。(a) 試験の単位の command を観測して記録する（`node --test tests/working-state-*.test.mjs`）。既存の試験（`npm test`）が変更前に全部通ることを、依存を入れた環境で確かめて記録する（通らない状態で網羅率の値を読まない）。(b) 実物を読んで決める: `aidlc.settings.json` の実物の形から aidlc_settings の要素の形（A-08。狭く取り、迷えば rejected）、`.aidlc-version` の中身の形式、`.shirube/sds-pin.json` の欄（`sds_commit`・`kit_version`・`protected_paths`）。(c) file の分け方（LC と file の対応表）を決め、`logical-components`・`infrastructure-specification` の対応表と食い違うなら先に直す。(d) R-09・R-11 の決め事（上の表）。(e) dependency-cruiser・knip・jscpd・ESLint・OWN-01・300 行の既存の設定を読み、新しい file に当たる条件を記録する。成り立たない時は書かずに設計の記録を直す。（NFR1.2、NFR8.1a、NFR10.1、A-08、R-09、R-11）
- [ ] Step 3: 項目の一覧と形式の持ち主（`catalog.mjs`）。Red → Green → Refactor。initialCatalog（sds_commit・kit_version・aidlc_version・aidlc_settings・protected_paths・tool_node・tool_aidlc）、各項目の valueType・normalization・userAnswerable・出典と requiredForConfirmed、valueType ごとの許される形式の検査（commit-oid = 40 桁の 16 進、version、boolean、string、list）、notHandledByU2（required_checks）。項目一覧は 1 か所だけが持つ（S3）。試験: 各 valueType の正例・負例、requiredForConfirmed の記載が無い出典が必須として扱われること、required_checks が項目に入らず「U2 では確認しない」になること。（BR3.5、BR5.1、BR4.4、Q5）
- [ ] Step 4: 表示の escape（LC6、`escape.mjs`）。Red → Green → Refactor。表示先（平文・markdown・機械可読 JSON）ごとの escape だけを持つ。文言の意味・判定を持たない。escape 先が不明なら生の文字列を出さず失敗にする。試験: 制御文字・markup・命令文・改行・バッククォート・`|` を含む入力が壊れない、escape 先が不明で失敗。（BR8.2、BR7.2、NFR3.1、SC4）
- [ ] Step 5: 観測の解釈（LC2、`observation.mjs`）。Red → Green → Refactor。LC1 の生の事実と呼出側の明示入力（targetRef・予算の値・now）から Observation（observed / unavailable）を組み立てる。BR1.1 の対象の指定の有無と wrong_target、BR1.2 宣言・cache・既定値を写さない、BR1.3 の 3 値、BR1.4 の予算超過の分類（budget_exceeded・timed_out。予算の数値を持たず、渡された値と測った値を比べる）、BR1.5 の根の内外・同じ実体・付随ファイル（out_of_boundary）、BR1.6 の前後の digest の比較（changed_during_read）、BR2.1 の未導入の確定（親が読めて無いと分かる時だけ。404 だけ・権限拒否・取得失敗は観測不能）、BR2.2・BR2.3 の道具の分類と 3 値の版の比較、BR3.4 の file の破損（malformed）、BR9.1 の同じ項目の観測が複数なら observedAt が最新の 1 つ。止められなかった・止めたか確かめられなかった事実は観測不能にする。核は `Date`・乱数・UUID・環境変数・file・子 process・network を使わない。試験: 規則ごとの正例・負例、同じ入力で 2 回実行してバイト一致、観測の値だけを変えた入力で結果が変わる（宣言の写しでない）。（BR1.1〜BR1.6、BR2.1〜BR2.3、BR3.4、BR9.1、NFR5.1、NFR5.1a、NFR6.1a、RL1〜RL3）
- [ ] Step 6: 項目状態（LC3、`item-state.mjs`）。Red → Green → Refactor。出典ごとの観測を value・absent・unavailable・wrong_target・invalid に分け、決める順（wrong_target → invalid → conflict → unobservable → missing → confirmed）で項目状態をちょうど 1 つ決める。requiredForConfirmed、candidates（順位なし）、BR3.2 の食い違い（全出典を示す）、BR3.3 の対象違いは参考として分けて示す、BR3.4 の値の不正（invalid）、BR3.5 の「適用中の規格」は観測できた物だけ。回答を入力に取らない（回答の型を import しない）。試験: 出典の組み合わせの全部（BR3.1 の 4 つの場合、sds_commit の 2 出典の組み合わせ、requiredForConfirmed が無い場合）が必ずちょうど 1 状態になる。（BR3.1〜BR3.5）
- [ ] Step 7: 回答・draft・選択（LC5、`answers.mjs` と必要なら `draft.mjs`）。Red → Green → Refactor。BR5.1 の型・長さ・文字・path の境界の検査と固定の分類の rejected、BR5.2 の秘密らしい入力（集合 a〜e と fail closed。rejected は value も valueDigest も持たず、入力を写さない）、BR5.3 の独立、BR5.4 の二重送信と「最新」（呼出側の answeredAt）、BR6.1 の永続化なし、BR6.2 の観測 digest との結び・無効化、BR6.3・BR6.4 の「回答済み・未適用」と一致の確認、BR6.5 の持ち越し、BR8.1〜BR8.4 の許可を作らない・命令として評価しない・draft の古さ（observationDigest だけが契機）・外部への効果 0、ConfigurationDraft と draftDigest の組み立て（途中で失敗したら draft を返さない）。秘密らしい fixture は gitleaks に拾われない形で作る（実在の形式の固定の長さの英数字を置かない）。aidlc_settings の要素の形は Step 2 で確定した形。試験: 規則ごとの正例・負例、拒否の出力・理由に入力の一部が写らない。（BR5.1〜BR5.4、BR6.1〜BR6.5、BR8.1〜BR8.4、NFR2.2、NFR3.1、RL1、RL2）
- [ ] Step 8: 質問と案内（LC4、`guidance.mjs`）。Red → Green → Refactor。BR4.1 の質問は missing・conflict（userAnswerable）と直せる invalid だけ、BR4.2 の観測不能・wrong_target・直せない invalid の案内（行き止まりを作らない。推測の値を答えさせない）、BR4.3 の再質問しない、BR4.4 の値を作らない、BR7.1 の並び（結論と対象 → 次の操作 → 原因・未確認 → 証拠の参照）、BR7.2 の平文の区別、BR7.3 の同じ入力は同じ内容、BR7.4 の人待ちは 1 回で止まる、BR7.5 の未確認を確認済みと示さない、BR7.6 の理由コードは U1 の結果を読むだけ（新設しない）、BR7.7 の A 不足・B 観測不能の区別、BR9.2・BR9.4 の範囲と完了の言い方。試験: 規則ごとの正例・負例、初回の確認表示（A 不足・B 観測不能）が区別される、「結果を確認できず」の扱い。（BR4.1〜BR4.4、BR7.1〜BR7.7、BR9.2、BR9.4、NFR5.2、NFR9.1、NFR9.2）
- [ ] Step 9: 観測の読取りの adapter — file（LC1、`read-file.mjs`）。Red → Green → Refactor。実体の解決（実 path・同一性・根との位置関係の事実だけを返す）→ 判定は LC2 → 許した実体だけを読む、の 2 段。読取りの前後の digest と大きさ、所要時間、読んだ大きさを生の事実として返し、分類・比較・判定をしない。時計を読むのはここだけ。予算は信頼版の profile を読んで適用し、値を複製しない。試験: 根の外の symlink・`..`・循環・別綴りの同一 path、読取り中の変化、大きさの上限、権限拒否が未導入と区別される。（BR1.4〜BR1.6、BR2.1、NFR3.2、NFR6.1、NFR6.1a、SC5、RL1）
- [ ] Step 10: 観測の読取りの adapter — 子 process（LC1、`probe-tool.mjs`）。Red → Green → Refactor。infrastructure-specification の「子 process の起動の条件」の 1〜6 をそのまま実装する: 起動する道具は固定の集合だけ、`node` は `process.execPath` だけ、`aidlc` は PATH のうち空でなく絶対 path で対象の根の外の dir だけ（symlink 解決後の実体で判定し、見つけた実行ファイルの実体も根の外であることを確かめ、確かめた絶対 path で起動し、起動の直前に同一性を再確認する）、見つからない時は (a) 未導入、(b) dir を捨てた上で見つからないなら観測不能（件数と種別を `probeNotes` で運ぶ）、(c) 権限・起動失敗は観測不能、環境変数は PATH（絞り込み後）・LANG・LC_ALL・HOME だけ、shell を通さず標準入力を閉じる、子は自分の process group で起動して枠を超えたら group ごと止める、出力は読みながら数えて上限で打ち切る、止められなかった・確かめられなかった時は観測不能、cwd は OS の根（決定 111。POSIX は `/`、Windows はドライブの根。Step 2 で取り方を決める）で、使えない時は起動せず観測不能にして別の場所へ代えない。U2 は何も作らず何も書かない。試験の負例（infrastructure-specification のとおり）: 対象の根・`node_modules/.bin`・PATH の相対要素と空要素・symlink 経由の同名の実行ファイルが起動されない、根が PATH の dir を包む時に「未導入」と案内されず観測不能になって件数が出る、環境に置いた架空の token が子へ渡らない、出力が枠を超えた時と孫を作る子が枠を超えた時に group ごと止まり成功にならない、止めたか確かめられない子が成功にならない、shell の特殊文字を含む架空の対象名で追加の命令が走らない、子の cwd が OS の根である。実在する道具の実行は避け、試験用の架空の実行ファイルを一時 dir に置く（一時 dir は試験が作って片付ける。U2 の本体は何も作らない）。（BR2.2、NFR2.1、NFR3.2、NFR6.1a、NFR6.1b、NFR6.2、SC1a、決定 106・111、A-INF-1、A-INF-2）
- [ ] Step 11: 集約 file と knip の entry（`index.mjs`、`knip.jsonc`）。Red → Green → Refactor。Step 2 で決めた範囲で公開の記号を再 export する 1 file を作り、`knip.jsonc` の `entry` に `scripts/working-state/index.mjs!` を 1 件足す（`ignore` には足さない。閾値を緩める変更ではなく production の entry の追加）。足す前と足した後の `knip --production --config knip.jsonc` の実行結果を記録し、PR 本文に「足す前は未使用と出る・足した後は消える」を書く（未確認のままにしない。足す前に出ない場合はその事実を書き、設計の読みを直す）。（NFR10.1、Q6 = A、R-01、R-09）
- [ ] Step 12: 構造の試験と網羅率の記録。構造の試験（`tests/working-state-structure.test.mjs`）: (a) 核（LC2〜LC5）に `Date`・`Math.random`・`randomUUID`・環境変数・`node:fs`・`node:child_process`・ネットワークの module が現れない、(b) LC1・LC6 に分類・比較・判定の語が無く、LC1 が group ごと止める経路を持つ、(c) 理由コードの定義が無い（U1 が持ち主）、(d) 1 つの規則の判定の持ち主が 1 部品だけ（規則の値の literal が 2 か所に無い）、(e) import に循環が無く、核が LC1・LC6・LC7 を import しない、LC3 が回答の型を import しない、(f) 外部への効果の経路（書込み・push・投稿・network）が無い、(g) 新しい file が 300 行以内、(h) 追加した import が Node の組込みと既存の共通 lib だけ。網羅率の記録（LC7、`tests/working-state-coverage.test.mjs`）: 試験の中で子 process に Node の lcov を流して解析し、機械が読める記録を作る。分母は `scripts/working-state/**/*.mjs` をディスクから列挙して決め、lcov に現れない file は未計測として失敗、0 件は失敗、報告の形が取れない版は失敗、100% 未満は失敗。手で書き写さない。（NFR1.1、NFR1.1b、NFR5.1、NFR5.2、NFR7、NFR10.2、A-INF-3）
- [ ] Step 13: 全体の確かめ。`npm test`（全体、観測値を記録）、既存の構造の検査（`lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage`・`hygiene:lines`・dependency-cruiser・knip）、OWN-01 の上限、`test` job の `scripts/**` の 80% の床を、実行した Node の版を書いて流す。当たった場合は設定を変えず、まず file の置き方を直し、直せない時は止めて arc に伺う（検査を緩める変更を同じ PR に混ぜない）。実行環境の版は観測した版だけを書き、Node 22・Linux の runner・gitleaks（`secrets`）の手元実行ができなかった場合は「観測できなかった」と書く。逆向きの確かめ（NFR8.2）: この単位の変更を取り消した木で既存の試験が全部通ることを 1 回観測する。（NFR1.1、NFR8.1a、NFR10.1、NFR10.2）
- [ ] Step 14: 文書と追跡。`code-summary.md`、`traceability.json`、`source-manifest.json` を書く。文書の訂正（R-08・R-10・R-12）と、aidlc_settings の要素の形（A-08）の entities・rules への追記を同じ PR で行う。配線した workflow での実行・利用先での観測・Node 22 以外の実行は「観測できなかった」と書き、成功とは書かない（入口は U3 まで配線されない）。「門が保証しないこと」として、利用先の対象で同じ欄が読めること、子の起動の安全は固定した条件の範囲に限ることを PR に書く。作業場の木が古い場合、追跡表の検査が探す試験 file だけを同じ内容で作業場の木に置き、記録に書く。PR の本文は `json sds-pr` を 1 つ、`risk:R3` の label を 1 つ付け、設計の参照に設計の記録だけの PR の統合の commit を書く。

## 試験の方針（標準の方針に対する適用）

- 部品ごとの件数: 標準の方針（部品ごとに 5〜8 件）に、規則ごとの正例・負例（42 規則）の要件を足す。核の 4 部品と adapter・構造・網羅率の試験を合わせて 120 件前後を見込む。1 file 300 行以内に分けるため、部品ごとに 1〜3 file にする。実際の件数は Build and Test の記録で実測する。
- 正例と負例: 設計の各規則に正例 1 つ以上と負例 1 つ以上（対象違い、古い記録、欠落、改変、実行不能、再実行、人待ちの停止）を、適用される要件に結ぶ。unit-test-instructions.md の表で規則・要件との対応を追う。
- 評価の写しではなく実物を走らせる: file の読取りと子 process は、実際の一時 dir と架空の実行ファイルで動かす。Node の版が保証の外の時は、その事実を観測として扱い、成功に数えない。
- 置き方: `tests/working-state-<部品>.test.mjs`（既存の `npm test` の glob `tests/*.test.mjs` が拾う）。skip・todo を置かない。fixture は架空の対象（sample-work）と架空の値だけで、秘密らしい形は gitleaks に拾われない形で作る。公開 repo に利用先の実物・非公開の物を写さない。
- 行の網羅率の床 100%: 対象は `scripts/working-state/**/*.mjs` の全部。記録の形・分母の決め方は Step 12。除外が要る行があれば、PR に理由を書いて独立の監査で確認する。

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

## Assumptions & Open Questions

### Assumptions

- file の分け方（上の Step 3〜11 の名前）は案で、Step 2 で実物を読んで決める。決めた対応は logical-components・infrastructure-specification の対応表と食い違わせない（食い違えば表を先に直す）。
- Node の版が保証の外の時、その事実を観測として扱い、成功に数えない。確認した版は Build and Test の記録に具体的に書く（A-INF-4）。
- aidlc_settings の要素の形（A-08）は Step 2 で実物から決める。決められなければ止めて arc に伺う。

### Open Questions

- Step 2 の R-11（観測不能の原因の値と件数の運び先）で、既存の `tool_cannot_start` と別の値 `probeNotes` で足りるかを実物と契約から確かめる。足りなければ止めて arc に伺う。いま答えが要る問いは無い。
