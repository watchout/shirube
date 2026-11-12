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

1. 子の環境から除く名前が 4 つの denylist である（security-design の SC1・Open Question 1）。それ以外の資格情報は、門を呼ぶ job の環境にあれば、利用先の追跡された試験の子に渡りうる。困る大きさは「致命」（資格の漏れ）になりうるので、起きやすさの根拠を書けなくても差し戻す対象になりうる。自分の見方: U3 はどの workflow からも呼ばれず（配線は U7）、試験の中身の安全は保証しない境界（SC8）として設計に残し、「fork の code を書ける資格情報のある文脈で走らせない」使い方の定義は U7 が受ける。許可名簿方式への移行は利用先の試験を壊しうるので U3 では行わない。これで足りるかを判定してほしい。足りないと見えれば、名簿方式への移行を U3 に入れるか、U7 へ持ち越す条件を設計に足す。
2. process group の停止が孫まで届く前提（reliability-design の RL2）。実装の前なので未観測。重大（上限を過ぎても子が残り費用が出続ける）× 低〜中。実装の最初に架空の試験で確かめ、届かなければ設計に戻す。
3. lcov の `LF`/`LH` と `DA` の整合の検査が、Node が正当に出す記録を壊れたと誤判定する可能性（RL6）。誤判定は「観測できず」に倒れる（成功には倒れない）ので、中 × 低。実装で食い違えば検査を外し、理由を記録する。
4. 保証は Node 22 だけ。24・26 は実測の事実で、保証しない（Q4）。差は「観測できず」か不一致に倒れる設計。

## 公開の範囲

- 含めた記録: U3 の Functional Design・NFR・配置の設計、コード生成の計画と試験の手順、設計監査の項目集合（`docs/audit/u3-node-gate-slice-design.json`）、この読み戻し。
- 除外した記録: AI-DLC の `audit/` と `.aidlc-engine/`、段ごとの日記（`memory.md`）、state・cursor・runtime graph。code（`scripts/` と `tests/`）は含めない。設計監査の PASS の後に同じ PR へ足す。
- 共有の memory・CodeKB は、この PR の差分に入れない。
