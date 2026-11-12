# U3 u3-node-gate-slice — 設計PRの承認の読み戻し

## Scope and Limits

対象は `261110-shared-coverage-gate / u3-node-gate-slice` の設計記録だけのPR。本書は、AI-DLCの正式な履歴から種類・対象・固定の選択値だけを整理した写しであり、新しい承認の発行者・署名・証明ではない。人の返信本文、席の間の通知、個別環境の情報は写していない。

次の点を混同しない。

- 取り組み全体の段の完了の承認（Ideation・Inception の各段）は、U1 の PR #102 の `construction/u1-ci-concurrency/design-approval-records.md` に読み戻してある。U3 はそれを引き継ぎ、新しい段の完了の承認は発行していない。
- U3 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design・Code Generation（計画まで）は、単位の段として gate を持たない。段の完了の承認を人から得たものとして扱わない。
- 取り組みの設定と Functional Design の問い（Q1〜Q4）を決めた承認は、**arc の答え**（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）で記録されたもので、Owner 本人の言葉ではない。委任は保護対象（workflow・必須検査・DB構造・資格情報・本番・料金・契約 .v2）と R3・R4 の対象 head への Owner の承認を含まない。
- この取り組みでは見直し役（AI-DLC の reviewer）を使っていない。Owner の決定（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125 、本文 SHA-256 `f538f6a98c0284d0be5d177cc651d3a1cf87aec7b8ac1493ac72eba28e0c7f76`）で、この作業場の見直しの区分は `none`。見直し済みと読まない。
- 計画の承認（Approve Plan）と要約の確認はこの作業で `off` の設定のため、記録は無い。計画は `code-generation/code-generation-plan.md`、試験の手順は `code-generation/unit-test-instructions.md` にある。計画の承認が無いことを、製品の変更を始める許可にしない。

## この単位で arc の答えを受けた点（Owner の言葉ではない）

- Functional Design の問い 4 つ（`functional-design/functional-design-questions.md`）: Q1 試験が 1 つでも失敗した実行は「観測できず」（流れた試験は skip でも todo でもない合格が 1 件以上ある file だけ）、Q2 割合は整数の厳密比較・表示は小数第 2 位の切り捨て、Q3 期限 600 秒・総予算 900 秒、Q4 保証するのは Node 22 だけ。答えは公開の委任（上の URL）による。
- この PR の扱い（席の間の確認への arc の答え。公開の comment URL を持たない扱いの確認で、Owner の決定ではない）: (1) 入力・結果の JSON の版 1 は他の repo が呼ぶ新しい契約で、子の環境の除去と出力の無害化はセキュリティの設計なので、守る物に触れる単位として、設計記録だけの PR を先に出し、設計監査の PASS の後に code を書く。(2) リスクの区分は R2。U3 は新しい file と試験だけで、workflow・必須の検査・どの CI からも呼ばれない（つながるのは U7）。事前の確かめは設計監査が受け持つ。必須の検査につなぐ U7 が R3 以上で、Owner の対象 head の承認はそこで取る。この 2 点の理由は PR 本文にも書く。
- 設計の変更（第1 head の監査依頼の後、監査が拾う前に直した。席の間の arc の答え。Owner の言葉ではない）: 子プロセスの環境は、名前を挙げて除く方式をやめ、許可した名前の一覧だけを渡す方式にする（資格の漏れは致命なので、起きやすさを監査に判定させず U3 で直す）。理由と形は security-design の SC1、NFR5.1、BR2.8。

- 設計監査 round 1 の返却（BLOCK。指摘 3 件 F01〜F03。返却は PR #104 の comment で、公開の URL は PR にある）への直し（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）: 直す範囲は F01〜F03 だけ（軽い観測 O01・O03・O04 を同時に直した）。F01 = Node の暗黙の file 合格を数えない規則を実測で選んだ。F02 = 子の環境の完全一致を spawn の境界に移し、子の中は否定だけにした。F03 = 削除の失敗を TEMP_CLEANUP_FAILED の必須の失敗にした。詳細は下の KY の先読みの 5〜7。

## 文書の検査

U3 の NFR Requirements・NFR Design・Infrastructure Design・Functional Design の各 `traceability.json` は、上流の要件・NFR の全項目に OK（または理由つきの Deferred・N/A）を対応付けている。これは文書の対応表であって、製品の試験・実際の CI での動作・統合の合格ではない。未実施: 試験の実行（Red・Green）、`scripts/coverage-gate/` の実装、孫の process が残らないことの実測、lcov の整合の実測、独立の実装監査、統合。

## 基準の実物との突き合わせ（設計 9）

設計・計画が「現在の file」として書いた事実を、公開 Shirube の clone の `origin/main`（`0f9ea89175ece32604e0dcfde9db28462f0d2f35`）から作った worktree の bytes と機械で突き合わせた。作業場の木と共有の CodeKB は基準に使っていない。

| 事実 | 結果 |
|---|---|
| `package.json` の SHA-256 `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee` | 成り立つ |
| `.github/workflows/ci.yml` の SHA-256 `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f` | 成り立つ |
| `scripts/hygiene/lib.mjs` の SHA-256 `294ca623c2a002aafe1940544ec178b27f07085528e6192b14c1edf2a51117c4`、`trackedFiles`（119 行）・`resolveTargets`（130 行）を export | 成り立つ |

## KY の先読み（自分の残り）

「起きやすさ × 困る大きさ」の表（aidlc-only §2）で、監査の前に自分で判定した。根拠は設計の記録にある。

1. 子の環境（security-design の SC1）。最初の案は、名前を挙げて 4 つの資格情報を除く方式（denylist）だった。知らない名前の秘密を子に通すため、困る大きさは「致命」（資格の漏れ）で、起きやすさに関わらず差し戻しになる。arc の答え（Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）に従い、**許可した名前の一覧だけを子に渡す方式に直した**（`PATH`・`HOME`・`LANG`・`LC_ALL`・`TZ`。値は門が置き、親から写さない。`NODE_OPTIONS`・`NODE_PATH` は渡さない）。一覧は 1 か所に置く。試験は 2 段（設計監査 round 1 の F02 で直した。Node 自身が起動後に子へ `NODE_TEST_CONTEXT`・`NODE_V8_COVERAGE` などを足すので、子の中の名前の完全一致は成り立たない）: (1) 完全一致は spawn の境界で、起動関数を差し替えた単体の試験で確かめる、(2) 実際の子の中では、親に置いた既知・未知・小文字の名前の偽の秘密 3 種類と `NODE_OPTIONS`・`NODE_PATH` の名前も値も見えないことの否定だけを確かめる。親の環境を継承する形に戻さない。残る面: 一覧の中の `PATH` は固定の系統 directory だけで、`HOME` は一時 directory。試験の中身の安全は保証しない境界（SC8）として残り、資格のある文脈で外部の code を走らせない使い方の定義は U7 が受ける。副作用: 親の環境変数（例: `CI`）に頼る利用先の試験は失敗し、観測できずになる（成功には倒れない）。実装の最初の実測で、一覧だけでは Node の網羅率が測れないと分かった時だけ名前を足し、設計に戻して記録する（未観測の仮定）。
2. process group の停止が孫まで届く前提（reliability-design の RL2）。実装の前なので未観測。重大（上限を過ぎても子が残り費用が出続ける）× 低〜中。実装の最初に架空の試験で確かめ、届かなければ設計に戻す。
3. lcov の `LF`/`LH` と `DA` の整合の検査が、Node が正当に出す記録を壊れたと誤判定する可能性（RL6）。誤判定は「観測できず」に倒れる（成功には倒れない）ので、中 × 低。実装で食い違えば検査を外し、理由を記録する。
4. 保証は Node 22 だけ。24・26 は実測の事実で、保証しない（Q4）。差は「観測できず」か不一致に倒れる設計。
5. 試験を 1 件も呼ばない file（設計監査 round 1 の F01、高 × 重大）。Node 22 は空の file・import だけの file にも file 全体の暗黙の `test:pass` を 1 件出すので、「試験 0 件 = ran でない」（BR2.4）を守るには、それを試験に数えない見分けが要った。Node 22.23.4 の実際の reporter に 6 例（空、import だけ、普通の合格、全 skip、全 todo、読み込みの失敗）と入れ子の path・同名の試験を流して出来事の形を観測し、見分け（nesting 0・line 1・column 1・name が file の path と等しい `test:pass`）を選んだ。観測は functional-design/node22-reporter-observations.md。外れる向きは安全側（file 名と同じ名前の試験を 1 行目に置くと数えられず ran でなくなる）。保証は Node 22 だけ。コード生成で同じ 6 例を実際の reporter に流す試験を足す。
6. 一時 directory の削除の失敗（設計監査 round 1 の F03、低 × 重大）。最初の案は「警告だけで結果を変えない」で、NFR5.6・BR2.8 の「消す」・S8 と食い違い、削除の失敗が成功の記録のまま残った。直し（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）: 削除の失敗は名前つきの必須の失敗にする。理由コード TEMP_CLEANUP_FAILED（観測できずの区分。理由コードは 20 から 21。観測できず 6 から 7）。**採った判断**: 終了コードはほかの観測できずと同じ 1（落とす）。**採らなかった代替**: 終了コード 2（監査の依頼文は例として 2 を挙げたが、2 は判定に至らなかった = 入力・入口の失敗に限る BR5.3 の定義で、削除の失敗は判定に至った後の観測できずなので、区分の表を 1 か所に保つため 1 にした。成功と記録されないこと、非 0 で落ちることは同じ）。残った directory は絶対 path でなく runId で示し、手順（runId の接頭辞で OS の一時領域から消して流し直す）は security-design SC6 に書いた。試験は削除関数を差し替えて失敗を注入する。実際の fs で消せない状況の再現は環境に依るので、成功の根拠にしない。
7. 設計監査 round 1 の観測のうち、軽い物は同じ直しで扱った: O01（自己の測定の入力は directory の宣言 `scripts/coverage-gate/` にし `**` を書かない）、O03（cause の名前を `child_process_not_countable` に統一）、O04（cicd-pipeline の再依頼の回数を、採択された監査の手順に従うと書き、この記録は回数を決めない）。O02（期限と残りの総予算が等しいときの timed_out と budget_exceeded の見分けの違い。どちらも観測できず）は、この単位は測定 1 回なので意味に影響せず、実装の前に BR2.3 と RL2 のどちらかに揃える記録として持ち越す。

## 公開の範囲

- 含めた記録: U3 の Functional Design・NFR・配置の設計、コード生成の計画と試験の手順、設計監査の項目集合（`docs/audit/u3-node-gate-slice-design.json`）、Node 22 の reporter の観測（functional-design/node22-reporter-observations.md）、この読み戻し。
- 除外した記録: AI-DLC の `audit/` と `.aidlc-engine/`、段ごとの日記（`memory.md`）、state・cursor・runtime graph。code（`scripts/` と `tests/`）は含めない。設計監査の PASS の後に同じ PR へ足す。
- 共有の memory・CodeKB は、この PR の差分に入れない。
