# U3 u3-node-gate-slice — 技術の選び方と、守る形の要件

この単位は、新しい依存を足さず、Node 22 の組込みだけで門の最初の実体を作る。ここでは、使う技術とその理由、規則を 1 か所に置く要件、試験の方法、構造の予算を、NFR3・NFR6・NFR7・NFR9 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR3・NFR6・NFR7・NFR9、FR1.1・FR1.3。部品の判断: [decisions.md](../../../inception/domain-design/decisions.md)（ADR-001〜006）。機能の設計: [rules.md](../functional-design/rules.md)、[entities.md](../functional-design/entities.md)（GateConstants）。
- 基準の観測（公開 Shirube の `origin/main` = `0f9ea89175ece32604e0dcfde9db28462f0d2f35` の実物。作業場の木は古いことがあるので使わず、clone の `origin/main` と blob を突き合わせた）:
  - `package.json`（blob `4b23a0a0e8feb4f666f0a7eb3109d68f1430b907`、SHA-256 `ed2e11f383a1714ebdd973b009f5516836b75832ed4bae6c12c69daf545205ee`）: `type: module`、`engines.node >=22`、`npm test` = `node --test tests/*.test.mjs tests/u2/*.test.mjs`。開発依存は `@eslint-community/eslint-plugin-eslint-comments`・`dependency-cruiser`・`eslint`・`eslint-plugin-unicorn`・`jscpd`・`knip`（実行時の依存は無い）。`lint:structural`・`lint:guard`・`hygiene:*` の script は `scripts configs` を対象にする。
  - `.github/workflows/ci.yml`（blob `6ee7b6c3f078285bfd1c65812c1a42b4aabd6310`、SHA-256 `d116d938fdc01ea546dc9276929eefb06757135aa279269022a7333351b8789f`）: `test` job は Node 26 で `node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs` を流し、続けて own-code budget（OWN-01）を検査する。`hygiene` は呼び出し先へ Node 22 を渡す。つまり、`scripts/**` に足す file は、既存の CI の網羅率の床（80%）と構造の検査の対象に自動で入る。
- 実測（作った側の観測）: Node の組込みの網羅率の lcov は 22.23.4・24.22.1・26.12.1 でバイトまで一致した（架空の小さな例が 1 つ）。

## 技術の選び方

| 領域 | 選ぶ物 | 理由 | 採らなかった代替 |
|---|---|---|---|
| 言語・実行 | JavaScript ESM（`.mjs`）、Node 22 の組込みだけ | 既存の製品規約（NFR1、NFR6）。実行時の依存が無い | TypeScript（U6 の形）。新しい build の段が要る |
| 測定 | `node --test --experimental-test-coverage` と lcov の報告係 | 新しい依存が要らない（FR1.1、FR1.3）。子プロセスの行も数えられることを実測した | c8・nyc・vitest（新しい依存。arc-sec と Owner の決定が要り、U6 の話） |
| 試験の出来事 | 独自の報告係の module（Node の報告係の仕組み。出来事を JSON の行で書き出すだけ） | file ごとの合格・失敗・skip・todo を、標準出力の文面を読まずに数えられる（Q1） | junit の報告係（file ごとの情報が無い）、標準出力の文面の解析（壊れやすい） |
| 子プロセス | `node:child_process` の起動（shell なし、引数の配列、自分の process group） | 上限を超えたら孫まで止められる（NFR4.3、NFR5.3） | shell 経由の起動（注入の危険）、`execSync`（上限と process group を扱えない） |
| 分母の解決 | 既存の `scripts/hygiene/lib.mjs` の `resolveTargets`・`trackedFiles` を変更せずに呼ぶ | 解決の規則を 2 か所に持たない（NFR3、ADR-003） | 同じ規則を門の中に写す（知識の重複） |
| 試験 | `node:test` と `node:assert/strict` | 既存の方法（NFR7） | 外部の試験道具（新しい依存） |
| digest | `node:crypto` の SHA-256 | 組込み | 外部の hash の部品 |

## 要件

### NFR3 規則は 1 か所

- **NFR3.1** 閾値の既定（行 100% = 10000 の 100 分の 1 単位）、結果の区分の集合、理由コードの集合は、判定の核の定数の 1 か所だけが持つ。入力の既定（期限 600 秒、総予算 900 秒、試験 file の名前の型）は入力の検査が、Node の保証する版は測定の部品が、子に渡す環境変数の名前の一覧（childEnvAllowlist）は測定の実行が、summary の一覧の上限は整形が、それぞれ 1 か所だけ持つ。ほかの file はそこを参照し、値を literal で写さない。[NFR3、S3、GateConstants]
- **NFR3.2** 規則の値が 2 か所以上に literal で現れたら失敗にする試験を置く（`10000`、`600`、`900`、理由コードの名前などが、持ち主の file 以外の `scripts/coverage-gate/` に現れない）。文面の英語の固定の文型は整形の 1 か所に置く。[NFR3、S3]
- **NFR3.3** 既存の `scripts/hygiene` の分母の解決（`resolveTargets`、`trackedFiles`）は、変更せず呼ぶだけで、同じ規則を門の中に書かない。[NFR3、ADR-003]

### NFR6 依存

- **NFR6.1** 実行時の npm の依存を足さない。`scripts/coverage-gate/` は、Node の組込みの module と、既存の `scripts/hygiene` の共通 lib だけに依存する。`package.json` の `dependencies` と `devDependencies` に新しい物を足さない。[NFR6、FR1.3]
- **NFR6.2** 測定の道具として c8・nyc・vitest などの新しい依存は使わない。それらが要る形（TypeScript と vitest）は U6 が、arc-sec の確認と Owner の決定を経て扱う。[NFR6、制約 O1・P3]
- **NFR6.3** 新しい外部の action や service を足さない。この単位は workflow を変えない。[NFR6、NFR8.1]

### NFR7 試験の方法

- **NFR7.1** TDD。各部品について、まず失敗する試験（Red）を書いて失敗を確かめ、次に通す実装（Green）を書く。Red と Green は PR の履歴に残す。[NFR7、team.md]
- **NFR7.2** 試験は `node:test` と `node:assert/strict`。置き場は既存の `npm test` の対象（`tests/*.test.mjs`）に入る位置にする。判定の核・入力の検査・整形・測定の部品・入口の各部品に、正例と負例を用意する。負例は、未知のキー・版違い・分母が 0 件・未計測・流れていない試験・失敗した試験・壊れた記録・行 0 件・期限超過・総予算超過・古い Node・悪意のある file 名・古い結果の file の残りなど。[NFR7、AC10.1.1]
- **NFR7.3** 行の網羅率の床は 100%。対象の集合は、この単位で足す `scripts/coverage-gate/**`（分母は宣言する）。既存の CI の `scripts/**` に対する床（80%）は別に残り、この単位の 100% は置き換えでなく追加である。通すために弱めない。計測から除く行が要る時は、PR に理由を書いて独立の監査で確認する。[NFR7、team.md、P4]
- **NFR7.4** 網羅率の結果は、CI の成否だけで済ませず、観測した値（対象の件数、行の件数、割合）を機械が読める形で記録する。対象が 0 件、記録が無い、実行されていないは、成功に数えない。申告された値を証拠にしない。この単位の記録は、門自身を `scripts/coverage-gate/**` に向けた 1 回の実行の結果の JSON（自分で測る）と、Node の組込みの lcov を別に再計算した値の突き合わせで残す。どこに置くかは Code Generation の計画で決める。[NFR7、S5、S8]
- **NFR7.5** 試験の fixture は架空の名前と値だけにする。gitleaks に拾われる形（`token: "12 文字の英数字"` の形）を避ける。試験が作る一時の repo は、試験が終わると消す。公開 repo に製品固有の名前・数字を置かない。[NFR7、team.md]
- **NFR7.6** 必須の工程や適用される検証の skip・timeout・観測できず・exit 0 だけを、合格に数えない。設定の値や試験 file の存在を、実測の結果の代わりにしない。[NFR7、S8]

### NFR9 構造の予算

- **NFR9.1** 新しい file は 300 行以内。ESLint の関数は 50 行、複雑さは 10 を保つ（既存の `lint:structural`・`lint:guard` の対象 `scripts` に入る）。複数の部品を 1 file に詰めず、機能の設計の部品の分け方（judge、input、runner、measure-node、events-reporter、report、cli）を保つ。[NFR9、NFR3]
- **NFR9.2** dependency-cruiser の import 方向と循環の検査、knip の未使用の検査、jscpd の重複の検査を通す。新しい例外コメントを足すときは理由を書き、無制限の disable を使わない。[NFR9、team.md の Code Style]
- **NFR9.3** 既存の own-code budget（OWN-01）は、新しい file の行数で上限に当たりうる。その場合は PR に「AI-DLC の単位の作る段の出力」と 1 行書く（aidlc-only の決定）。budget の設定そのものは、この単位で変えない（保護対象）。[NFR9、aidlc-only §1]

### NFR11 費用（続き）

- **NFR11.3** 新しい依存・service・常設の資源を足さないので、この単位の追加の費用は無い（NFR6.1、NFR11.1）。[NFR11]

## 気づいたこと

- 既存の CI の `test` job は Node 26 で動き、`scripts/**` の網羅率に 80% の床がある。この単位は Node 22 を保証の範囲にしている（NFR1.1）。門を呼ぶ workflow がどの Node を使うかは U7 の設計。実測では 22・24・26 で lcov が一致したが、保証は 22 だけ。
- 既存の `npm test` は `tests/*.test.mjs tests/u2/*.test.mjs` を流す。この単位の試験を `tests/` の直下に置けば `npm test` に入る。置き場の確定はコード生成の計画で行う。

## Assumptions & Open Questions

### Assumptions

- [assumption] 追加の file が既存の dependency-cruiser・knip・jscpd・OWN-01 に当たるかは、この段では実行して確かめていない。コード生成の中で、既存の検査を流して結果を記録する。当たる場合は、設計に戻して直すか、保護対象でない範囲で例外コメントを理由つきで足す。
- [assumption] 自分自身を測る 1 回の実行（NFR7.4）が、再帰（門の試験が門を走らせる）で循環しないよう、門の試験は架空の小さな repo を一時 directory に作って使う。
- [assumption] 独自の報告係の module は、Node の組込みの報告係の仕組みで読み込める（実測した。Node 22 で `--test-reporter=<path>` が動いた）。

### Open Questions

1. 網羅率の再計算の記録（NFR7.4）の置き場を、PR の中のどの file にするか。コード生成の計画で決める。
