# U4 u4-thresholds-and-modes — 設計PRの承認の読み戻し

## Scope and Limits

対象は `261110-shared-coverage-gate / u4-thresholds-and-modes` の設計記録だけのPR。本書は、AI-DLCの正式な履歴から種類・対象・固定の選択値だけを整理した写しであり、新しい承認の発行者・署名・証明ではない。人の返信本文、席の間の通知、個別環境の情報は写していない。

次の点を混同しない。

- 取り組み全体の段の完了の承認（Ideation・Inception の各段）は、U1 の PR #102 の `construction/u1-ci-concurrency/design-approval-records.md` に読み戻してある。U4 はそれを引き継ぎ、新しい段の完了の承認は発行していない。
- U4 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design は、単位の段として gate を持たない。段の完了の承認を人から得たものとして扱わない。Code Generation の計画と試験の手順は、U3（PR #104）の統合の後に作る（この PR に含めない）。
- 取り組みの設定と、この単位の扱い（設計記録だけの PR を先に出す、リスクの区分、計画の時期）は、**arc の答え**（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）で記録されたもので、Owner 本人の言葉ではない。委任は保護対象（workflow・必須検査・DB構造・資格情報・本番・料金・契約 .v2）と R3・R4 の対象 head への Owner の承認を含まない。
- この取り組みでは見直し役（AI-DLC の reviewer）を使っていない。Owner の決定（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125 、本文 SHA-256 `f538f6a98c0284d0be5d177cc651d3a1cf87aec7b8ac1493ac72eba28e0c7f76`）で、この作業場の見直しの区分は `none`。見直し済みと読まない。サブエージェントも使っていない。
- 計画の承認（Approve Plan）と要約の確認はこの作業で `off` の設定のため、記録は無い。計画の承認が無いことを、製品の変更を始める許可にしない。

## この単位で arc の答えを受けた点（Owner の言葉ではない）

U4 の設計に入る前に席から出した確認 3 点への arc の答え（席の間の確認への答え。公開の comment URL を持たない扱いの確認で、Owner の決定ではない）。

1. 設計記録だけの PR を先に出し、設計監査を 1 回出す。理由: 入力の契約に `threshold` と `mode` の項目を足す（他の repo が呼ぶ契約の変更）ことと、閾値を下げる道というセキュリティの設計を持つため、守る物に触れる単位として扱う。この PR は main から切り、U4 の AI-DLC の記録だけを含める。
2. リスクの区分は **R3**。統合の前に、arc 経由で Owner の対象 head の承認を取る。監査の依頼には `base_moved` を最初から含める。
3. U4 の Code Generation の計画と試験の手順は、U3 の PR #104 の統合の後に始める。それまで、設計の返却を待つ間も `scripts/` と `tests/` の code は書かない。設計監査の PASS の後に、実装を別の PR で受ける扱いを、実装の際に作者が改めて示す。

## 文書の検査

U4 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design の各 `traceability.json` は、上流の要件・NFR の全項目に OK（または理由つきの Deferred・N/A）を対応付けている。これは文書の対応表であって、製品の試験・実際の CI での動作・統合の合格ではない。未実施: 試験の実行（Red・Green）、`threshold.mjs`・`report-exception.mjs` の実装、U3 の出力との golden の比較の観測、独立の実装監査、統合。

## 基準の実物との突き合わせ

設計・計画が「現在の file」として書いた事実を、公開 Shirube の clone の `origin/main`（`1dd43e457361d9650153578baa71120788285e98`、#105 の統合後）から作った worktree の bytes と機械で突き合わせた。作業場の木と共有の CodeKB は基準に使っていない。

| 事実 | 結果 |
|---|---|
| `package.json` の SHA-256 `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee` | 成り立つ |
| `.github/workflows/ci.yml` の SHA-256 `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f` | 成り立つ |
| `scripts/hygiene/lib.mjs` の SHA-256 `294ca623c2a002aafe1940544ec178b27f07085528e6192b14c1edf2a51117c4` | 成り立つ |
| `scripts/coverage-gate/` はこの `main` に無い | 成り立つ（`scripts/` の下は `hygiene`・`sds`・`unit-done` だけ） |

U3 の実装（PR #104 の head `48024643e63c70fa5df62714a129972457181406`）の関数の形（`checkInput(text)`、`judge({denominatorPaths, requiredTestPaths, measurement})`、`buildDocument`、`renderSummary`・`renderNotice`・`renderOutputs`、`runCli`）を土台として書いた。U3 の統合前なので、コード生成の始めに、U3 の統合後の `main` の実物と SHA-256 で突き合わせ直す。食い違えば、設計を先に直してから code を書く。

## KY の先読み（自分の残り）

「起きやすさ × 困る大きさ」の表（aidlc-only §2）で、監査の前に自分で判定した。根拠は設計の記録にある。

1. 閾値を下げる道を黙って通す（security-design の SC1・SC7、rules の BR6.6）。決定の URL は形だけを確かめ、実在・書き手・本文が値を認めているかは門が確かめない。困る大きさは重大（照らしていない緩和が通る）。起きやすさは低（URL の形に合う偽の決定を書く手間があり、結果の JSON と summary に URL・値・根拠・実際の閾値が残るので、独立の監査が公開の記録と照らせる）。門が確かめないことを「門が保証しないこと」として契約に書き、補う分担を今ある独立の監査に置いた。新しい道具や別の取り組みへ広げていない（広げる前に Owner に伺うという、プロジェクトの訂正の記録に従う）。
2. 記録だけ（record-only）が失敗の握りつぶしになる（reliability-design の RL1・RL3）。重大 × 低。区分と理由コードは動作を見ずに U3 の表で決め、shouldFail だけが動作を見る 2 段にした。入力の失敗と書き込みの失敗は動作に依らず終了コード 2。結果の文書と summary に動作が残る。区分 3 × 動作 2 の 6 通りの試験を計画に置いた。
3. 動作の書き間違いが別の動作に読み替わる（SC6）。重大 × 低〜中。完全一致だけを受け、大文字小文字・別名・前後の空白・型違いはすべて入力の失敗にする。省略だけが enforce（落とす側）に倒れる。
4. 例外の記録が結果の区分で消える（RL4）。重大 × 低。観測できずの経路でも例外を verdict に載せ、主張された値と比べた値を別の項目で持つ。3 つの区分で残る試験を計画に置いた。
5. U3 の出力との後ろ向きの互換が崩れる（RL6）。中 × 中。例外も動作も無い入力の出力が、U3 の出力とバイトまで一致する golden の比較を置いた。追加の行・節は条件分岐の中だけ。U3 の「`threshold`・`mode` は未知のキー」の試験の置き換えは、保つ確かめを残す形で設計に書いた（弱めた試験は PR に書く）。
6. 自由な文字列（決定の URL、根拠）が表・注釈を壊す（SC4）。中 × 低。入口で厳しく検査し、出口で面ごとに無害化する二重の防御。出力値には自由な文字列を載せない。
7. U3 の統合前に設計を書いたので、U3 の実装の形の取り違え。中 × 低。コード生成の始めに、U3 の統合後の `main` と突き合わせ直す手順を設計に書いた（上の「基準の実物との突き合わせ」）。

## 公開の範囲

- 含めた記録: U4 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design、設計監査の項目集合（`docs/audit/u4-thresholds-and-modes-design.json`）、この読み戻し。
- 除外した記録: AI-DLC の `audit/` と `.aidlc-engine/`、段ごとの日記（`memory.md`）、state・cursor・runtime graph。code（`scripts/` と `tests/`）は含めない。Code Generation の計画・試験の手順も含めない（U3 の統合の後に作る）。
- 共有の memory・CodeKB は、この PR の差分に入れない。
