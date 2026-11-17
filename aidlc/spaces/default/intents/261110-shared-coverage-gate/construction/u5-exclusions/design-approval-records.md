# U5 u5-exclusions — 設計PRの承認の読み戻し

## Scope and Limits

対象は `261110-shared-coverage-gate / u5-exclusions` の設計記録だけのPR。本書は、AI-DLCの正式な履歴から種類・対象・固定の選択値だけを整理した写しであり、新しい承認の発行者・署名・証明ではない。人の返信本文、席の間の通知、個別環境の情報は写していない。

次の点を混同しない。

- 取り組み全体の段の完了の承認（Ideation・Inception の各段）は、U1 の PR #102 の `construction/u1-ci-concurrency/design-approval-records.md` に読み戻してある。U5 はそれを引き継ぎ、新しい段の完了の承認は発行していない。
- U5 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design は、単位の段として gate を持たない。段の完了の承認を人から得たものとして扱わない。Code Generation の計画と試験の手順はこの PR に含めるが、その承認（Approve Plan）はこの取り組みで `off` の設定のため、記録は無い。計画の承認が無いことを、製品の変更を始める許可にしない。code はこの head に含めない。
- 取り組みの設定と、この単位の扱い（設計記録だけの PR を先に出す、リスクの区分、計画の時期、環境変数の読みの扱い）は、**arc の答え**（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609`）で記録されたもので、Owner 本人の言葉ではない。委任は保護対象（workflow・必須検査・DB構造・資格情報・本番・料金・契約 .v2）と R3・R4 の対象 head への Owner の承認を含まない。
- この取り組みでは見直し役（AI-DLC の reviewer）を使っていない。Owner の決定（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125 、本文 SHA-256 `f538f6a98c0284d0be5d177cc651d3a1cf87aec7b8ac1493ac72eba28e0c7f76`）で、この作業場の見直しの区分は `none`。見直し済みと読まない。サブエージェントは、2 回目の設計監査の依頼の前の KY の先回りの点検（読むだけ、下の「devsecops の KY の点検」）に aidlc-devsecops-agent を 1 体だけ使った（社内の決まり版 8 の許す範囲。書き込みなし）。見直し役としては使っていない。

## この単位で arc の答えを受けた点（Owner の言葉ではない）

1. 設計記録だけの PR を先に出し、設計監査を 1 回出す。リスクの区分は **R3**（契約の面に値を足す単位。入力の契約の項目 `exclusions` の追加と、除外が割合を上げる道というセキュリティの設計を持つ）。統合の前に、arc 経由で Owner の対象 head の承認を取る。設計監査の返却を待つ間も、作る計画と試験の手順は書いて承認を受けてよい。code は設計監査の PASS の後に書く。
2. 環境変数の読み: 門が除外のために環境変数を読まないことで「環境変数では足せない」を満たしてよい。構造の試験（除外を決める code に環境変数の読みが 0 件）と負例の試験（環境変数を置いても結果が変わらない）を置く。採った判断・採らなかった代替（拒否の文を書く案）を 1 行ずつ記録し、設計監査で確かめる（監査項目 U5EX-04）。

## 文書の検査

U5 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design の各 `traceability.json` は、上流の要件・NFR の項目に OK（または理由つきの Deferred・N/A）を対応付けている。これは文書の対応表であって、製品の試験・実際の CI での動作・統合の合格ではない。未実施: 試験の実行（Red・Green）、`exclusions.mjs`・`report-exclusions.mjs` の実装、U3・U4 の出力との golden の比較の観測、独立の実装監査、統合。

## 基準の実物との突き合わせ

設計・計画が「現在の file」として書いた事実を、公開 Shirube の clone の `origin/main`（`7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e`、#110 の統合後）の bytes と機械で突き合わせた。作業場の木と共有の CodeKB は基準に使っていない。

| 事実 | 結果 |
|---|---|
| `package.json` の SHA-256 `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee` | 成り立つ |
| `.github/workflows/ci.yml` の SHA-256 `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f` | 成り立つ |
| `scripts/hygiene/lib.mjs` の SHA-256 `294ca623c2a002aafe1940544ec178b27f07085528e6192b14c1edf2a51117c4` | 成り立つ |
| `scripts/coverage-gate/` の行数: `threshold` 84、`input` 117、`resolve` 42、`judge` 158、`report` 177、`report-exception` 64、`cli` 114 | 成り立つ |
| `scripts/coverage-gate/` は 15 file、`exclusions.mjs`・`report-exclusions.mjs` はまだ無い | 成り立つ（この単位で 2 file を足して 17 file） |
| `input.mjs` に `exclusions` の語は無い（今は未知のキー） | 成り立つ |

観測できなかった事実はここに書かない。コード生成の始めに、そのときの `main` の実物と突き合わせ直し、食い違えば設計を先に直してから code を書く。

## KY の先読み（自分の残り）

「起きやすさ × 困る大きさ」の表（aidlc-only §2）で、監査の前に自分で判定した。根拠は設計の記録にある。

1. 除外の理由が正しいか（本当に DB の job でだけ流れる file か）を門が確かめず、不当な除外で割合が上がる（rules の「門が保証しないこと」、security-design SC1）。困る大きさは重大（照らしていない緩和が通る）。起きやすさは低（結果の JSON と summary に path・理由・件数・分母の件数が残り、入力の差分に 1 件ずつ見えるので、独立の監査が照らせる）。補いは今ある独立の監査に置き、新しい道具や別の取り組みへ広げていない（広げる前に Owner に伺うという、プロジェクトの訂正の記録に従う）。
2. 除外が必須の試験や未計測を隠す（BR10.3、RL6）。重大 × 低。必須の試験は除外と無関係に決め、判定の核に除外のための分岐を持たない。3 つの負例（必須の試験が流れない、分母に残る file の未計測、試験の失敗）を計画に置いた。
3. 綴りの誤りの除外が黙って無視され、穴を隠す（BR10.1）。重大 × 低〜中。分母と完全一致しない path は TARGET_UNRESOLVED（終了コード 2）。directory・wildcard・`./`・`..`・絶対 path・追跡されていない file の負例を置いた。
4. 全部除外で測定の対象が 0 件になる（BR10.2）。重大 × 低。TARGET_EMPTY で失敗にする。
5. 環境変数で除外を足される（BR10.4）。重大 × 低。門は除外のために環境変数を読まない。構造の試験と負例の試験で確かめる。この「読まないことによる満たし方」の妥当性は設計監査で確かめる点として U5EX-04 に置いた。
6. 自由な文字列（path・理由）が表・注釈を壊す（SC5）。中 × 低。理由は入口で厳しく検査し、出口で面ごとに無害化する二重の防御。notice に path・理由を載せない。
7. U3・U4 の出力との後ろ向きの互換が崩れる（RL9）。中 × 中。除外が 0 件の入力の出力が U4 の出力とバイトまで一致する golden を置いた。U3・U4 の「`exclusions` は未知のキー」の試験 4 件の置き換えは、保つ確かめを残す形で設計に書いた（弱めた試験は PR に書く）。
8. 既存の構造の検査（dependency-cruiser・knip・jscpd・OWN-01）に新しい file が当たる。中 × 中。設定を変えず file の置き方を直す。直せなければ止めて arc に伺う。コード生成の Step 2 で既存の設定を読んで記録する。

## devsecops の KY の点検（2 回目の設計監査の依頼の前、読むだけ、1 回）

aidlc-devsecops-agent 1 体（読むだけ。file も GitHub も書かない）に、F01〜F03 の直しを入れた設計の記録を、KY の表（差し戻す組み合わせ = 致命 × 全部、重大 × 低以上、中 × 中以上、軽 × 高）で点検させた。これは見直し役の見直しでも独立の監査でもなく、監査の前の先回りの点検で、監査の代わりにしない。

- 差し戻しに当たる指摘: なし。試験 file の除外は、U5 の前は testTargets を狭めると理由なしに必須の試験が黙って消えた形より前に進む（path・理由・kind・件数が結果に残り、summary の最初の行に件数が毎回出る）。残る穴は、決定の URL が形だけの検査で実在を見ないこと（重大 × 低。U4 と同じ扱いで、補いは今ある独立の監査に置く）。
- 差し戻さず持ち越す指摘: TARGET_EMPTY の 2 つの detail は文でしか区別できない（軽 × 高、記録だけ）。
- 設計の記録の中の食い違い 5 件を直した: (1) rules.md「門が保証しないこと」に、決定の URL の実在を見ないことと、試験の除外が必須の試験を減らすことを足した。(2)(3) observability-design の結果の要素に kind、一覧に (kind) を足した。(4) 計画の件数をおよそ 58 件にそろえた。(5) 計画の承認の記録（code-generation-questions.md）の Builds・Touches・件数を、計画の本文と同じ内容にそろえた（承認は off で、承認の指紋は計画の再生成で変わるため、その値は手で書き換えていない）。
- 点検が未観測としたこと: 実装も試験も未実施。測定の実行に除外した試験がどう効くか（cli.mjs の配線で除外を引いた必須の試験を測定へ渡すこと、除外した試験が testTargets に残って流れた場合）は実装の前に実物で確かめる点として、計画の Step 9 に 1 行足した。未観測を成功と読まない。

## 公開の範囲

- 含めた記録: U5 の Functional Design・NFR Requirements・NFR Design・Infrastructure Design、Code Generation の計画と試験の手順、設計監査の項目集合（`docs/audit/u5-exclusions-design.json`）、この読み戻し。
- 除外した記録: AI-DLC の `audit/` と `.aidlc-engine/`、段ごとの日記（`memory.md`）、state・cursor・runtime graph。code（`scripts/` と `tests/`）は含めない。
- 共有の memory・CodeKB は、この PR の差分に入れない。
