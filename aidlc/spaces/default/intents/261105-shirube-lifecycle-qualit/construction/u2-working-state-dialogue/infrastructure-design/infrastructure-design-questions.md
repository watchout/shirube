# U2 — 置き場の設計の生成前確認

## Sources

対象は `261105-shirube-lifecycle-qualit / u2-working-state-dialogue / infrastructure-design`。入力は NFR 設計 7 文書（[performance](../nfr-design/performance-design.md)・[security](../nfr-design/security-design.md)・[scalability](../nfr-design/scalability-design.md)・[reliability](../nfr-design/reliability-design.md)・[observability](../nfr-design/observability-design.md)・[logical-components](../nfr-design/logical-components.md)・[traceability](../nfr-design/traceability.json)）、[functional-spec](../functional-design/functional-spec.md)・[entities](../functional-design/entities.md)・[rules](../functional-design/rules.md)、[components](../../../inception/domain-design/components.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)。

U2 は常駐の service ではなく、対象を 1 回ずつ読んで案内を返す Node の module 群である。クラウドの資源・網・DB・queue・secret の保管場所は作らない（この段で決めるのは置き場・試験の分母・子 process の起動の条件だけ）。

## 実物の観測（origin/main、`~/Developer/shirube` の clone）

作業場の木は古いことがあるので、clone の `origin/main` の実物を読んだ。最初の観測は head `7fa98d1`、この直しの時に読み直した head は `f2d509b`（#111 の統合。差分は U5 の file だけで、`knip.jsonc` の entry・`package.json` の `test` の glob・CI の `test`・`hygiene` の job・`.shirube/sds-pin.json` は `7fa98d1` の時から変わらず、`scripts/working-state/` と `tests/working-state-*` はまだ無い）。下は観測した事実で、設計の決定ではない。

| 観測 | 実物 | 置き場の設計への意味 |
|---|---|---|
| 既存の置き場 | `scripts/{hygiene,sds,coverage-gate,unit-done}/`、`src/progression/continuation.mjs`（1 file）、`configs/`、`tests/*.test.mjs`（平らな名前）と `tests/u2/`（別の取り組みの古い U2 の試験） | 名前の `u2` は別の取り組みと紛れる。新しい場所の名前に `u2` を使わない |
| 検査の対象 | `lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage` は `scripts configs` だけを対象にする。`src/` は対象外。`npm test` は `tests/*.test.mjs tests/u2/*.test.mjs` | `src/` に置くと構造・重複・guard の検査と対象 file の網羅の検査に入らない |
| 保護対象 | `.shirube/sds-pin.json` の `protected_paths` に `.github/workflows/**`・`.shirube/**`・`.claude/settings.json`・`.aidlc-version`・`aidlc.settings.json` など | `.shirube/hygiene-profile.md` や workflow を変える置き場の案は Owner の条件が付く |
| 実行の道具 | `package.json` の `engines.node >=22`、実行時 npm 依存なし | 新しい依存は足さない |

## A-07 の突き合わせ（initialCatalog の出典の割当と実物）

functional-design の仮定 A-07 を、clone の実物と突き合わせた。この clone は Shirube 自身の repo で、U2 が実際に読む「対象」（利用先）の観測ではない。

| itemKey | 割当の出典 | 実物での確認 | 結果 |
|---|---|---|---|
| sds_commit | sds_pin・workflow_caller | `.shirube/sds-pin.json` の `sds_commit`、`.github/workflows/sds-gate.yml` の `uses: ...@<commit>` | 確認できた（形式は 40 桁の小文字 16 進） |
| kit_version | sds_pin | pin の `kit_version` | 確認できた |
| protected_paths | sds_pin | pin の `protected_paths` | 確認できた |
| aidlc_version | aidlc_version | 根の `.aidlc-version` | file の存在を確認。中身の形式は Code Generation の試験で固定 |
| aidlc_settings | aidlc_settings | 根の `aidlc.settings.json` | file の存在を確認 |
| tool_node・tool_aidlc | tool_probe | `engines.node >=22`（要求側）。実行ファイルの観測は子 process | 起動の条件は Q4 |
| **required_checks** | workflow_caller・sds_pin | pin に `required_checks` の欄は無く、caller の workflow にも必須検査の一覧は無い（必須かどうかは default branch の保護の設定で、file ではない） | **割当と実物が合わない。両方の出典から値は読めない** |

required_checks の扱いは Q5 で決める。決まるまで required_checks は「確認できず」として扱い、確認済みと示さない。

## Questions

### Q1 — コードを置く場所

U2 の核（観測の解釈・項目状態・質問と案内・回答と draft）と、読取りの adapter、表示の escape を置く場所です。

場面の例: 実装が終わった後、Shirube の自動検査（構造・重複・guard・対象 file の網羅）が U2 の file を数えるかどうかが変わります。

- A. `scripts/working-state/`（新しい dir）。既存の検査の対象に最初から入り、`.shirube/**` や workflow の変更は要らない。
- B. `src/working-state/`。既存の `src/progression/` と並ぶが、検査の対象に入れるには `.shirube/hygiene-profile.md` と `package.json` の script を変える必要があり、`.shirube/**` は保護対象で Owner の条件が付く。
- X. Other (please specify)

[Answer]: A（scripts/working-state/。守る物の .shirube を変えずに、今の検査に最初から入る）。arc が Owner の決定 95 により入力（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6934340758）。Owner 自身の言葉ではない。

### Q2 — 入口（既存の対話・CLI への組込み）

U2 を呼ぶ入口を、この単位で作るかどうかです。開始・適用の決定（C02 の explicitStart）は U3 の持ち物です。

場面の例: 利用者が LLM との対話で「設定を確かめたい」と言った時、LLM が U2 の関数を呼ぶ口があるかどうか。

- A. 入口は作らず、module の export だけ置く（試験が直接呼ぶ）。口は U3 が作る。新しい CLI・bin を足さない。
- B. 薄い CLI を 1 つ足し、観測の結果と案内を JSON で出す。
- X. Other (please specify)

[Answer]: A（module の export だけ。口は U3）。arc が Owner の決定 95 により入力（同上）。Owner 自身の言葉ではない。

### Q3 — 試験の置き場と行の網羅率の分母

行の網羅率の床は 100%（team.md）。分母に入れる file と確認コマンドを決めます。置き場が Q1 の A なら、分母は `scripts/working-state/` の全 `.mjs` と考えます。

- A. 試験は平らな名前 `tests/working-state-*.test.mjs`（`npm test` の既存の glob に入り、`package.json` の変更が要らない）。分母は `scripts/working-state/**/*.mjs` の全部で、除外は PR に理由を書いて監査で確かめる。対象が 0 件の時は成功にせず失敗にする。確認コマンドは試験の中で Node の lcov を解析する LC7 の記録。
- B. 試験は新しい dir `tests/working-state/`。`npm test` の glob に足すため `package.json` の script を変える。分母は A と同じ。
- X. Other (please specify)

[Answer]: A（平らな tests/working-state-*.test.mjs、分母は scripts/working-state/ の全 .mjs、対象 0 件は失敗）。arc が Owner の決定 95 により入力（同上）。Owner 自身の言葉ではない。

### Q4 — 子 process の起動の条件（security-design SC1a の確定）【セキュリティ設計。arc では決められず、Owner の判断が要る】

道具（tool_node・tool_aidlc）の有無と版を調べる時の、信頼する実行ファイルの場所と子へ渡す環境変数です。

場面の例: 利用先の repo に、`node` や `aidlc` と同じ名前の実行ファイルが置かれていても、それを動かさないための決め方です。

- A. `node` は今動いている process の実行ファイル（`process.execPath`）だけ。`aidlc` は PATH のうち「絶対 path で、対象の根の外」の dir だけを探す。子へ渡す環境変数は `PATH`（上の絞り込み後）・`LANG`・`LC_ALL`・`HOME` だけ。token・資格情報の名前は渡さない。
- B. 固定の絶対 path の一覧（Owner が決めた install 先）だけ。PATH は使わない。環境変数は `LANG`・`LC_ALL` だけ。
- X. Other (please specify)

[Answer]: 「106: Shirube の u2 の Q4 は A（node は今動いている process の実行ファイルだけ、aidlc は PATH のうち絶対 path で対象の根の外の dir だけ、子へ渡す環境変数は PATH・LANG・LC_ALL・HOME だけ）」 — Owner の原文（arc の端末の会話。記録 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6941079231 、本文 SHA-256 `a66c97dcee48505de936dbce9c7fc511f2354cd53ff553ad6e98fe0af32542ad`）。

### Q5 — required_checks の出典

上の A-07 の突き合わせで、required_checks は pin にも caller の workflow にも書かれていないと分かりました（必須かどうかは GitHub の保護の設定にあります）。

場面の例: 利用者が「必須の検査は設定されているか」と聞いた時に、U2 が何を答えられるか。

- A. U2 では required_checks を扱わない項目にする。保護の設定は U1 の門と U3 の接続が持つので、U2 は「この項目は U2 では確認しない」と案内する。
- B. required_checks の出典を GitHub の保護の設定（remote_metadata）に改める。読み取りだけの資格情報と、読取りの総予算（観測の回数 × 宣言の件数 × 対象の数）の式を追加で決める必要がある。
- X. Other (please specify)

[Answer]: A（U2 では扱わない項目にし、FD-GAP-4 に名指しで残す。新しい資格情報は足さない）。arc が Owner の決定 95 により入力（同上）。Owner 自身の言葉ではない。

### Q6 — knip の production の entry（見直し R-01）

Q1 = A の理由は「今の検査に最初から入り、変更が要らない」でした。実物を読み直すと、構造・重複・guard の検査は最初から入りますが、未使用 file の検査（knip）だけは例外です。`knip.jsonc` の production の入口は一覧で書かれていて、`scripts/working-state/` は入っていません。Q2 = A（入口を作らない）のままだと、`scripts/working-state/` の全 file が「どこからも使われない file」と判定され、`hygiene` が落ちる見込みです（設定からの読みで、実行して確かめてはいません）。

場面の例: 実装の PR を出した時に、CI の `hygiene` が「未使用 file」で落ちるかどうか。`knip.jsonc` は守る物（保護対象）の一覧に入っていません。

- A. `knip.jsonc` の `entry` に、U2 の module の export を集約する file を 1 件足す（`scripts/working-state/<集約の file>!`）。検査の閾値を緩める変更ではなく入口の追加で、同じ PR に含める。
- B. `knip.jsonc` の `ignore` に `scripts/working-state/**` を足す。未使用の検出が U2 の file だけ効かなくなるので、検査を弱める変更になる。
- X. Other (please specify)

[Answer]: A（knip.jsonc の entry に U2 の export を集約する file を 1 件足す。同じ PR。B は U2 の file の未使用の検出を外し検査を弱めるので採らない。設定からの読みなので、Code Generation の最初に `knip --production` を実際に流し、entry を足す前に未使用と出ること・足した後に消えることを PR 本文に書く）。arc が Owner の決定 95 により入力（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6934340758）。Owner 自身の言葉ではない。

### Q7 — 子 process の cwd【セキュリティ設計。arc では決められず、Owner の判断が要る】

Q4 = A（決定 106）は、子に渡す実行ファイルと環境変数を決めました。子を起動する時の「今いる場所（cwd）」は決めていません（security-design SC1a が置き場の設計で決めるとした事項）。cwd に利用先の file があると、子が隣の設定や file を拾いうるので、対象の根の中や配下は使いません。

場面の例: 利用先の repo の中に悪意のある設定 file が置かれていても、`aidlc --version` を調べる子がそれを読まないようにしたい場面。

- A. OS の根（`/`。Windows ではドライブの根）。U2 は何も作らず、何も書かない。利用者が置いた file を隣に拾う場所ではない。
- B. 起動する実行ファイルの dir。PATH 上の dir から選ばれるので、利用者が書ける場所（`~/.local/bin` など）も絶対 path なら許され、隣の file・設定を子が拾いうる。見直しで弱いと指摘された案。
- C. U2 が新しい空の一時 dir を作って使い、終わりに消す。何も書かない（NFR4.3）という前提が変わり、作成・削除の失敗の扱いが増える。
- X. Other (please specify)

[Answer]: 「111: A（子 process の cwd は OS の根。何も作らない・書かない）」 — Owner の原文（arc の端末の会話。記録 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6942847653 、本文 SHA-256 `3ecb0ea0934655ad1e904914a6ee379d18edcfef5785f6200567f7518a6891e1`）。

## 機能設計・NFR 設計の直し（反映済み）

FD-GAP-1〜3・FD-GAP-4（Q5 = A）・LC-GAP-1・LC-GAP-2・SC-GAP-1 は、段を開き直す正規の手順で機能設計と NFR 設計に反映し、どちらも見直し済み（READY）。承認済みの記録は黙って書き換えていない。

## 前の見直し（置き場の設計 1 回目）の指摘への扱い

| ID | 重さ | 扱い |
|---|---|---|
| R-01 | Major | Q6 = A（arc が決定 95 により入力）。設計に「knip の production の entry」の節を置いた |
| R-02 | Major | Q7 = A（Owner の決定 111。cwd は OS の根）。設計の条件 5 と A-INF-2 に反映した |
| R-03 | Minor | `secrets` を `hygiene` の step として直した |
| R-04 | Minor | 未導入と観測不能を分け、実行ファイルの実体も根の外を確かめ、解決した絶対 path で起動する条件を足した（Owner の決定 106 の文は変えず、読みを狭める側。arc が「問題なし」と答えた。Owner の言葉ではない） |
| R-05 | Minor | 分母をディスクの列挙で決め、lcov に無い file は未計測で失敗にする条件を足した |
| R-06 | Minor | `test` job の 80% の床・OWN-01・300 行（tests も対象）を関門の表へ足した |
| R-07 | Minor | 出力の枠の機構を条件に書き、SC-GAP-1 は NFR 設計で反映済みとした |

## Assumptions & Open Questions

仮定: Q1・Q2・Q3・Q5 は arc が Owner の決定 95 により入力した答えで、Owner 自身の言葉ではない。Q4 は Owner の原文（決定 106）。Q6 は arc が決定 95 により入力した答え（Owner の言葉ではない）。Q7 は Owner の原文（決定 111）。

未決: なし（Q6・Q7 とも答え済み）。

## Consolidated Summary Confirmation

置き場の設計の答えのまとめ（箇条書き）:

- 置き場（Q1 = A）: U2 の code は `scripts/working-state/` に置く。構造・重複・guard・対象 file の網羅の検査に最初から入り、`.shirube/**`・workflow・`package.json` の変更は要らない。
- 入口（Q2 = A）: 入口は作らず module の export だけ置く。口は U3。
- 未使用 file の検査（Q6 = A、arc が決定 95 により入力）: 入口を作らないので、`knip --production` が全 file を未使用と判定する見込み。`knip.jsonc` の `entry` に、module の export を集約する file を 1 件足す（同じ PR。閾値の緩和ではない。`ignore` に足す案は採らない）。Code Generation の最初に knip を実際に流し、足す前に未使用と出ること・足した後に消えることを PR 本文に書く。
- 試験と分母（Q3 = A）: 試験は平らな `tests/working-state-*.test.mjs`。行の網羅率の分母は `scripts/working-state/**/*.mjs` をディスクから列挙して決め、lcov に現れない file は未計測として失敗、対象 0 件も失敗にする。
- 子 process の起動の条件（Q4 = A、Owner の決定 106）: `node` は今動いている process の実行ファイルだけ。`aidlc` は PATH のうち絶対 path で対象の根の外の dir だけ。環境変数は PATH（絞り込み後）・LANG・LC_ALL・HOME だけ。読みを狭める側の足し（arc が問題なしと答えた）: 見つけた実行ファイルの実体も根の外であることを確かめ、確かめた絶対 path で起動する。PATH の dir を 1 件以上捨てた上で見つからない時は未導入と断定せず観測不能にして件数を案内に出す。
- 子の cwd（Q7 = A、Owner の決定 111）: OS の根。U2 は何も作らず、何も書かない。
- required_checks（Q5 = A）: U2 では扱わない項目にする。
- 前の見直し（置き場の設計 1 回目）の指摘 R-01〜R-07 は、上のとおり設計に反映した。機能設計・NFR 設計の直し（FD-GAP・LC-GAP・SC-GAP）は反映済みで、どちらも見直し済み（READY）。
- 既存の CI の関門として、`test` job の `scripts/**` の行の網羅率 80% の床・OWN-01・新しい file 300 行（`tests/**` も対象。規則 42 件の試験は複数 file に分ける）を表に足した。
- 作る物: 基盤の仕様、監視の設計、CI の設計、追跡表。クラウドの資源・網・DB・queue・secret の保管場所は作らない。

設計監査 1 回目（PR #112）の直しと、Owner の決定 116・120 に合わせた追加の取り決め（新しい問いは立てない。どれも置き場・試験・検査の取り決めで、Owner の答えが要る選択ではない）:

- 観測値の判定の関数（Owner の決定 116・120）: 判定の関数は `scripts/working-state/` の中の 1 file に置く（file 名は Code Generation で決める仮の名前。NFR 設計の `value-exposure.mjs` は仮の名前として扱う）。他の部品を import しない末端の純粋な関数で、LC2（観測値を外へ出す前）と LC5（回答の検査）が呼ぶ。BR5.2 の判定の持ち主はこの関数だけ（LC3 が持つ）で、LC5 は呼んで結果を適用するだけ。置き場の設計の依存の向きの図に「LC2 と LC5 が末端の関数を呼ぶ」を 1 行足す（NFR 設計の持ち越しの Minor への扱い）。
- 開いた形（string・list）の観測値（決定 120）: 生の値が存在するのは、LC1 から LC2 へ渡す 1 か所の受け渡しだけ。保持・digest・表示をせず、診断・記録・試験の出力に出さない。構造の試験を足す: LC1 の返り値が診断・記録へ流れる経路が無い。
- 対象の結び（targetBinding）: 項目一覧の出典ごとの targetBinding が書かれていなければ named（失敗側）。対象を名指さない出典は観測不能（malformed）で、確認済みにならない。試験に T1.1u を足す。
- 試験の追加: T1.1u・T3.2o・T3.4o・T5.2o・T6.4o・T8.3o と、観測値に秘密らしい架空の値・形式に合わない架空の値を入れた負例（値も digest も現れない）を、CI の関門の表と監視の設計に足す。1 file 300 行のため複数の `tests/working-state-*.test.mjs` に分ける。
- U2 が保証しないこと（決定 120）: 開いた形の中身だけの変化は検出しない。回答は「回答済み」のままで、実物との一致は確認済みと示さず「比べられず観測できず」。実物の読み直しは実適用側（U3・U5）の持ち物。この基盤の設計も、この限りを埋める仕組み（開いた形の値の保管場所）を作らない。
- 実物の観測の head を `f2d509b` に更新した（上の観測の表。差し替えた物は無い）。

設計監査 2 回目の F02 の反映（arc が Owner の決定 95 により指示。新しい問いは立てない。置き場・試験・検査の取り決めだけで、Owner の答えが要る選択ではない）:

- 開いた形（string・list）でも固定の分類（withheld: invalid_format | secret_like）を観測の事実に持ち、値・digest・表示は持たない。分類の変化は観測 digest を変え、古い回答・draft を無効にする。同じ分類のまま中身だけが変わる変化は検出しない（決定 120 の限界）。この「開いた形の固定の分類」は arc の読みで Owner の言葉ではなく、Owner に確認中（arc の項目 122）。Owner が別の読みなら withheld を開いた形から外す。
- 試験の足し: T8.3p（分類だけの変化で observationDigest が変わり、古い draft・選択・回答が無効になる。どの出力にも値が出ない）と T3.4p（withheld の不変条件。lengthBucket・matchGroup を持たない、番号づけに入らない、判定できない・例外・未知の型は secret_like、例外を起こす架空の入力でも出力に値が出ない）を、CI の関門の表・監視の設計・追跡表・試験の手順に足す。
- NFR 設計の見直し（回 1、READY）で持ち越した Minor 2 件の扱い: (1) 読む直前の同一性の等値の確認だけは機構として LC1 が行い、結果は事実として返し、観測不能にする判定は LC2 が持つ（LC1 の「分類・比較・判定をしない」の例外を 1 行書き、構造の試験はこの例外を除く形にする）。(2) profile が読めない時の観測不能の原因は、既存の UnobservableCause の集合から 1 つ（malformed）を使い、新しい原因は作らない（NFR5.2）。置き場の設計の仕様に書く。

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

（F02 の反映に対する確認。arc が Owner の決定 95（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6934340758）により入力した。Owner の言葉ではない。「開いた形の固定の分類」は引き続き arc の読み・Owner に確認中（arc の項目 122）として記録して進める。）

（Looks correct は arc が Owner の決定 95（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6934340758）により入力した。Owner の言葉ではない。Q1〜Q7 の答えは変えず、cwd = OS の根は決定 111 のまま、観測の head を f2d509b に読み直し、判定の関数を末端の 1 file に置き開いた形の生の値は LC1→LC2 の受け渡しだけ（決定 116・120）、負例を含む試験の足し、保証しないことの保持、が arc の答えと決定に合っている、との arc の確認。）
