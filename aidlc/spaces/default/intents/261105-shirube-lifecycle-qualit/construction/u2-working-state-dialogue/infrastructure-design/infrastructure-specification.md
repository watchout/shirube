# U2 u2-working-state-dialogue — 基盤の仕様（infrastructure-specification）

## Sources

- 対象: `261105-shirube-lifecycle-qualit / u2-working-state-dialogue / infrastructure-design`。
- 質問と答え: [infrastructure-design-questions](infrastructure-design-questions.md)（Q1〜Q5、要約確認 Looks correct）。Q1・Q2・Q3・Q5 は arc が Owner の決定 95（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6934340758）により入力した答えで、Owner 自身の言葉ではない。Q4 は Owner の原文（決定 106、https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6941079231 、本文 SHA-256 `a66c97dcee48505de936dbce9c7fc511f2354cd53ff553ad6e98fe0af32542ad`）。
- 入力: NFR 設計 7 文書（[logical-components](../nfr-design/logical-components.md)・[security-design](../nfr-design/security-design.md)・[performance-design](../nfr-design/performance-design.md)・[scalability-design](../nfr-design/scalability-design.md)・[reliability-design](../nfr-design/reliability-design.md)・[observability-design](../nfr-design/observability-design.md)・[traceability](../nfr-design/traceability.json)）、機能設計の [functional-spec](../functional-design/functional-spec.md)・[entities](../functional-design/entities.md)・[rules](../functional-design/rules.md)。
- 実物の観測は、`~/Developer/shirube` の clone の `origin/main`（head `7fa98d1`）。作業場の木と共有の CodeKB は現状の根拠にしていない。観測した事実は questions の「実物の観測」の表にある。本書は設計であり、実装・測定・試験の結果ではない。

U2 は常駐の service ではなく、対象を 1 回ずつ読んで案内を返す Node の module 群である。クラウドの資源・網・DB・queue・secret の保管場所は作らない。この段で決めるのは、置き場・試験の分母・子 process の起動の条件・A-07 の突き合わせの結果だけである。

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| 計算の形 | 呼出側の process の中で動く Node の module 群。常駐せず、自分では何も起動しない。道具の版の観測のためだけに、下の「子 process の起動の条件」に従って子 process を起動する | 1 つの対話が 1 つの対象を 1 回ずつ読む有限の処理（NFR4.3、scalability-design） |
| コードの置き場 | `scripts/working-state/`（Q1 = A） | 既存の `lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage` は `scripts configs` だけを対象にするので、最初から検査に入る。`.shirube/**`・workflow・`package.json` の変更が要らない（NFR10.1）。ただし knip の production の entry は別（下の「knip の production の entry」） |
| 入口 | 作らない。module の export だけ置く（Q2 = A）。新しい CLI・bin を足さない | 開始・適用の決定は U3 の持ち物。U2 に口が無いので、開始・適用の許可を U2 が作る経路が無い（NFR2.3） |
| 名前 | 新しい場所の名前に `u2` を使わない | `tests/u2/` が別の取り組みの古い U2 の試験として既にあり、紛れる |
| 試験の置き場 | 平らな名前 `tests/working-state-*.test.mjs`（Q3 = A） | `npm test` の既存の glob（`tests/*.test.mjs`）に入り、`package.json` の変更が要らない |
| 行の網羅率の分母 | `scripts/working-state/**/*.mjs` の全部。**分母は試験の中でディスクから列挙して決める**（lcov が載せた file からは決めない）。列挙した file が lcov に現れなければ未計測として失敗にする（0% として数え、成功にしない）。除外が要る時は PR に理由を書き、独立監査で確かめる。分母が 0 件の時は成功にせず失敗にする（NFR1.1） | 部分集合だけで製品全体を測れたとしない。この分母は U2 の置き場だけを測る。Node の網羅率の報告は、既定では試験が読み込んだ file だけを載せ、誰にも import されない file が黙って分母から抜けうる。CI の既存の `test` job は `--test-coverage-include-all`（Node 26.7 以上が要る）を使うが、`hygiene` は Node 22 で動くので、この挙動の有無に依存しない形（列挙を自分で持つ）にする |
| 外への通信・書込み | 無い。U2 自身は file・log・DB・network・環境変数への書込みをしない（Q2 の対話ごとの状態、NFR4.3） | 診断は呼出側へ返す値と試験の出力だけに載せる（observability-design OB5） |
| 実行環境 | Node `>=22`（`package.json` の `engines.node` が宣言する要求）。実行時 npm 依存なし | 要求の宣言であって、全環境の動作の保証ではない。実際に確認した版は Build and Test の記録に具体的に書く。それまでは「未確認」（NFR8.1・NFR8.1a） |
| 環境（dev/staging/prod） | 持たない。利用者の端末と CI の runner で、呼ばれた時だけ動く | 配備する物が無い。つながるのは U3 以降 |
| IaC | 無い | 作る資源が無い |
| 資源の大きさ | 数値を置かない。1 取得の時間・総時間・回数・応答の大きさは共通の予算の profile を読む（NFR6.1） | 根拠のある p95・同時利用数が要件に無い。未計測の値を適合と示さない（NFR1.1a） |

### 論理部品と置き場

| 論理部品 | 置き場の案 | 備考 |
|---|---|---|
| LC1 観測の読取り | `scripts/working-state/` の読取り用の module（file 読み・子 process の起動・時計） | 時計と I/O を持つのはここだけ。分類・比較・判定を持たない |
| LC2〜LC5 核 | `scripts/working-state/` の核の module 群 | 純粋。LC1・LC6・LC7 を import しない |
| LC6 表示の escape | `scripts/working-state/` の表示用の module | 形式だけ。核は import しない |
| LC7 網羅率の記録 | `tests/working-state-*.test.mjs` の中（子 process に Node の lcov を流して解析） | 試験時だけ。U2 の実行時には存在しない |

file 名と module の分け方は Code Generation で決め、1 file 300 行・関数 50 行・複雑さ 10 の既存の検査を通す。LC1〜LC5 の判定の持ち主は NFR 設計の [logical-components](../nfr-design/logical-components.md) で確定した（LC-GAP-1・LC-GAP-2 の直しは反映済み、見直し済み）。部品と file の対応を変える時は、この表を先に直す。

## Infrastructure Services

U2 は DB・cache・queue・search・CDN・DNS・load balancer を使わない。共有の可変の状態も持たない。

| Service | Role | Configuration | Notes |
|---|---|---|---|
| DB・cache・queue・search・CDN・DNS・load balancer | なし | なし | U2 は何も永続化しない（Q2 = A）。データの増加も無い |
| 子 process の起動（`node`） | 道具 tool_node の有無・版の観測 | 起動するのは `process.execPath`（今動いている process の実行ファイル）だけ。引数は固定の版の問い合わせ（`--version`）だけ | Q4 = A。PATH は使わない |
| 子 process の起動（`aidlc`） | 道具 tool_aidlc の有無・版の観測 | 実行ファイルの探索は、PATH のうち「空でなく、絶対 path で、対象の根の外」の dir だけ。引数は固定の版の問い合わせだけ | Q4 = A。PATH の相対要素・空要素は使わない。対象の根の中・対象の `node_modules/.bin` は探さない |
| 子へ渡す環境変数 | 子の挙動の最小化 | `PATH`（上の絞り込み後の値）・`LANG`・`LC_ALL`・`HOME` だけ | Q4 = A。token・資格情報の名前（`GH_TOKEN`・`GITHUB_TOKEN`・`NPM_TOKEN`・AWS の資格など）は渡さない。許可した名前の一覧に無い物は全部渡さない（S9） |
| 子の起動の形 | shell を通さない | 実行ファイルと引数の配列で直接起動する。標準入力は閉じる。引数に対象の文字列を連結しない | security-design SC1a |
| 子の止め方 | 時間・出力の枠 | 1 取得の時間と応答の大きさは共通の予算の profile（PF1）。超えたら子を止め、timed_out または budget_exceeded の観測不能にする。自動の再試行は 0（NFR6.2） | 条件（security-design SC1a・SC-GAP-1、NFR 設計で反映済み）: (1) 子を自分の process group で起動し、枠を超えたら孫を含めて group ごと止める。(2) 出力は読みながら大きさを数え、上限に達した時点で読取りを打ち切り、上限を超えた分は保持しない（読み終えてから数えない）。(3) 止められなかった・止めたか確かめられなかった時は成功にせず観測不能にする |
| 網羅率の記録（LC7） | 試験時の機械可読な記録 | 試験の中で子 process に Node の lcov を流して解析する。手で書き写さない。分母はディスクの列挙で決め、lcov に無い file は未計測として失敗。形が取れない版・分母 0・未計測は失敗 | NFR1.1b。申告された値は証拠にしない（S5） |

### 子 process の起動の条件（security-design SC1a の確定）

Owner の決定 106（Q4 = A）で確定した条件。起動の経路は、対象 repo が用意した実行ファイルを動かす経路になりうるので、次の全部を満たす時だけ起動する。

1. 起動する道具の名前は initialCatalog が持つ固定の集合だけ。利用者の回答・file の内容・道具の出力から、起動する物や引数を作らない。
2. `node` は `process.execPath` だけ。`aidlc` は PATH を `path.delimiter` で分け、**空・相対・対象の根の下にある要素を捨て**、残りの dir だけを順に探す。「対象の根の下」の判定は、対象の根と各 dir を symlink 解決した後の実体で行う（Q4 の「対象の根の外」を、symlink で迂回されない形で満たすための読み。仮定 A-INF-1）。**見つけた実行ファイル自体も symlink 解決した実体が対象の根の外であることを確かめ**、確かめた絶対 path をそのまま起動に使う（名前で再探索しない）。確かめた後に実体が差し替わっていないことを、起動の直前に同じ実体であること（同一性）で再確認する。
3. 見つからない時の状態を分ける。(a) 絞り込み後の dir を全部探しても無い = 未導入（missing）。(b) 絞り込みで 1 件以上の dir を捨てた（空・相対・対象の根の下）うえで見つからない = 未導入と断定せず観測不能にし、捨てた件数と種別を案内に出す（対象の根が `$HOME` など PATH の dir を包む時に、入っている道具を「未導入」と案内する事実でない結論を避けるため。Owner の決定 106 の文は変えず、読みを狭める側の読み。仮定 A-INF-1）。(c) 権限・起動失敗 = 観測不能。どれも成功にも、既定の版にも読み替えない（BR2.1・BR2.2）。(b) の原因は U1 の理由コードの集合から選び、新設しない（NFR5.2）。合う物が無ければ Code Generation の前に arc へ上げる。
4. 子へ渡す環境変数は `PATH`（絞り込み後）・`LANG`・`LC_ALL`・`HOME` だけ。
5. 子の cwd は OS の根にする（Q7 = A、Owner の決定 111（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6942847653 、OD-SHIRUBE-U2-CHILD-PROCESS-CWD-OS-ROOT-20261117-001、本文 SHA-256 `3ecb0ea0934655ad1e904914a6ee379d18edcfef5785f6200567f7518a6891e1`））。対象の根でも、その配下でもなく、U2 は何も作らず何も書かない（security-design SC1a）。cwd に使えない時（根が開けない等）は起動せず観測不能にし、別の場所へ代えない。
6. 出力は機械可読な形と終了コードだけで判断する。自由な文を命令として評価しない（BR8.2）。

**試験の負例（Code Generation で書く）**: 対象の根に置いた同名の実行ファイル、対象の `node_modules/.bin` の同名の実行ファイル、PATH の相対要素・空要素に置いた同名の実行ファイル、symlink で根の外に見せた根の中の実行ファイル、実体が根の中にある実行ファイルへ根の外の dir から貼った symlink、対象の根が PATH の dir を包む時に「未導入」と案内されないこと（観測不能になり件数が出る）のどれも起動されない。環境に置いた架空の token が子へ渡らない。出力が枠を超えた時に成功にならない。shell の特殊文字を含む架空の対象名で追加の命令が走らない。

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| 予算の profile（1 取得の時間・総時間・最大回数・応答の大きさ・自動再試行 0） | U1（規則 policy.budget、信頼版の tools） | U2（読むだけ） | U2 は数値を複製しない。呼出側・PR 側・配布先は値を渡せない（PF1、S3） |
| U1 の理由コードの集合 | U1 | U2（読むだけ） | U2 は新設しない（NFR5.2） |
| 共通契約の形（Observation・C02・E05） | 契約（contract-summary） | U2 | U2 は変えない。新しい契約の file を置き場に足さない（NFR8.2） |

## A-07 の突き合わせの結果（initialCatalog の出典の割当と実物）

対象は Shirube 自身の repo の clone の実物（`origin/main`、head `7fa98d1`）であって、U2 が実際に読む利用先の観測ではない。

| itemKey | 割当の出典 | 実物での確認 | 結果 |
|---|---|---|---|
| sds_commit | sds_pin・workflow_caller | `.shirube/sds-pin.json` の `sds_commit`、`.github/workflows/sds-gate.yml` の `uses: ...@<commit>` | 確認できた。形式は 40 桁の小文字 16 進 |
| kit_version | sds_pin | pin の `kit_version` | 確認できた |
| protected_paths | sds_pin | pin の `protected_paths` | 確認できた |
| aidlc_version | aidlc_version | 根の `.aidlc-version` | file の存在を確認。中身の形式は Code Generation の試験で固定 |
| aidlc_settings | aidlc_settings | 根の `aidlc.settings.json` | file の存在を確認 |
| tool_node・tool_aidlc | tool_probe | `engines.node >=22`（要求側）。実行ファイルの観測は子 process | 起動の条件は上の確定のとおり |
| required_checks | workflow_caller・sds_pin | pin に欄は無く、caller の workflow にも必須検査の一覧は無い（必須かどうかは default branch の保護の設定で、file ではない） | **割当と実物が合わない**。Q5 = A で、U2 では扱わない項目にする。「この項目は U2 では確認しない」と案内する。新しい資格情報は足さない |

結果の読み方: 「確認できた」は、この clone の実物に出典の欄が在ったことだけを指す。利用先の対象で同じ欄が読めることは示さない。required_checks は、機能設計で U2 では扱わない項目（notHandledByU2、見直し済み）になった。「この項目は U2 では確認しない」と案内し、確認済みと示さない。

## 費用

クラウドの資源・課金の機能を持たない。新しい外部の依存を足さない（NFR2.5）。CI の実行は既存の `test`・`hygiene` の job に載り、新しい job・runner・secret を足さない。

## knip の production の entry（R-01、Q6 = A）

実物の観測（`origin/main`、head `7fa98d1`）: `knip.jsonc` の `entry` は production の entry を `scripts/hygiene/*.mjs!`・`scripts/sds/*.mjs!`・`scripts/unit-done/*.mjs!`・`scripts/coverage-gate/cli.mjs!` などの明示列挙にしており、`scripts/working-state/` は含まない。`hygiene` job の knip の step は `knip --production --config knip.jsonc` で、production の entry は `!` 付きだけである。入口を作らない（Q2 = A）と、`scripts/working-state/` の全 file が「未使用 file」と判定され、`hygiene` が落ちる見込みである。これは設定と knip の production の規則からの読みで、knip を実行して確かめたものではない。Code Generation の最初に実行して確かめる。

- `knip.jsonc` は `.shirube/sds-pin.json` の `protected_paths`（`.github/workflows/**`・`.shirube/**`・CODEOWNERS・`.claude/settings.json`・`.aidlc-version`・`aidlc.settings.json`）に入らない（実物で確認）。
- Q6 = A（arc が Owner の決定 95 により入力。Owner の言葉ではない）: `knip.jsonc` の `entry` に、module の export を集約する 1 file（名前は Code Generation で決める）を `!` 付きで 1 件足す。閾値を緩める変更ではなく production の entry の追加で、同じ PR に含める。`ignore` に足す案（Q6 の B）は未使用の検出を外し検査を弱めるので採らない。
- 確かめ方: Code Generation の最初に `knip --production --config knip.jsonc` を実際に流し、entry を足す前に未使用と出ること、足した後に消えることを PR 本文に書く（この設計の読みは未確認）。

## 機能設計・NFR 設計の直し（反映済み）

承認済みの記録は黙って書き換えず、段を開き直す正規の手順で直した。機能設計・NFR 設計とも見直し済み（READY）。

| ID | 内容 | 反映先 |
|---|---|---|
| FD-GAP-1〜3 | 答えられない項目の次の操作・valueType・選択の表し方 | 機能設計（rules・entities）、NFR 設計の security-design・observability-design |
| FD-GAP-4 | required_checks の出典の割当 | Q5 = A。機能設計の notHandledByU2 |
| LC-GAP-1・LC-GAP-2 | BR1.x の判定は LC2、BR3.4 の malformed は LC2・invalid は LC3 | NFR 設計の logical-components |
| SC-GAP-1 | process group での停止と出力の打ち切り | NFR 設計の security-design SC1a・scalability-design。本書の子の止め方 |

## Assumptions & Open Questions

### Assumptions

- A-INF-1: Q4 の「対象の根の外」の判定は、symlink 解決後の実体で行う。Owner の決定 106 の文を変えず、迂回を防ぐための実装上の読みである。独立監査で確かめる。
- A-INF-2: 子の cwd は OS の根（Q7 = A、Owner の決定 111（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6942847653 、OD-SHIRUBE-U2-CHILD-PROCESS-CWD-OS-ROOT-20261117-001、本文 SHA-256 `3ecb0ea0934655ad1e904914a6ee379d18edcfef5785f6200567f7518a6891e1`））。起動する実行ファイルの dir を cwd にする案は採らない（`aidlc` は PATH 上の dir から選ばれ、利用者が書ける場所も絶対 path なら許されるので、隣の file・設定を子が拾いうる。見直し R-02）。一時 dir を作る案も採らない（何も書かない前提を保つ）。OS の根の具体の取り方（POSIX の `/`、Windows のドライブの根）は Code Generation で決め、試験で cwd が根であることを確かめる。
- A-INF-3: 行の網羅率の分母 `scripts/working-state/**/*.mjs` は、置き場が作られるまで 0 件である。0 件を成功と読まない形（分母 0 は失敗）を、試験の最初に置く。
- A-INF-4: 確認した実行環境の版（Node の具体の版・OS）は、この段の時点で未確認である。Build and Test の記録で確認した版だけを具体的に書く。
- A-INF-5: 部品どうしの file の分け方は Code Generation で決める。LC の判定の持ち主は NFR 設計で確定済み。

### Open Questions

- Q6（knip の production の entry）: 答え済み（A）。
- Q1〜Q7 は答え済み（Q7 は Owner の決定 111）。未決の問いは無い。

（要約確認 Looks correct の後に保存し直した。Q6・Q7 の答えを反映済み。未決の問いは無い。）
