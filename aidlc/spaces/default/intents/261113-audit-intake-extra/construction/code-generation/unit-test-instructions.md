**Collaborator:** aidlc-developer-agent

# 試験の手順（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file（`scripts/hygiene/audit-admission.mjs`）。以下の命令はすべて、この単位の試験 file だけを名指す（`npm test` のような全体の命令は使わない）。

## 試験の道具と準備

- 道具: Node 組込みの `node:test` と `assert`（`>=22`。手元は 24、CI は 26）。新しい依存・設定 file は足さない。
- 準備: 作業用の clone の worktree で `npm ci` を済ませる。依存が無いと既存の `tests/audit-counterexamples.test.mjs` の 3 件が失敗する（eslint・jscpd が要る）。その実行は成功に数えない。
- 戦略は Standard（1 component あたり 5〜8 試験を下限の目安とし、負例を含めてこの取り組みは規則の数に合わせて 40〜60 件程度を見込む）。scope は refactor（新しい試験の追加の床は無いが、既存の試験は緑のまま）。

## この単位の試験 file

| file | 内容 | 種類 |
|---|---|---|
| `tests/audit-admission.test.mjs`（既存・変更しない） | 受付の既存の挙動 | 回帰 |
| `tests/audit-counterexamples.test.mjs`（既存・変更しない） | 既存の負例 | 回帰 |
| `tests/audit-intake-extra-fixtures.mjs`（新） | path（repo と commit）ごとに応答を返す `api` の差し込み、宣言付きの依頼・job の記録の補助 | 補助（試験ではない） |
| `tests/audit-intake-extra.test.mjs`（新） | 宣言の読み取り（BR1.x）、job の分類・宣言の確認・実在（BR2.x・BR3.x）、受理の出力・総予算・決定性 | 単体＋境界の統合 |
| `tests/audit-intake-extra-proof.test.mjs`（新。上の file が 300 行を超える時だけ分ける） | 分けた分 | 同上 |
| `tests/audit-intake-extra-docs.test.mjs`（新） | 実装の定数と 2 つの文書の揃い（BR4.x）、食い違いの負例 | 単体 |
| `tests/audit-intake-extra-coverage.test.mjs`（新） | 子の process の lcov の解析・判定（NFR3.x）、負例（文字列の fixture）、実測 | 単体＋実測 |

## 実行する命令（この単位だけ）

- 既存の確認（Step 3）: `node --test tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs`
- 新しい試験の Red / Green（Step 5〜12）:
  - `node --test tests/audit-intake-extra.test.mjs`
  - `node --test tests/audit-intake-extra-proof.test.mjs`（分けた時だけ）
  - `node --test tests/audit-intake-extra-docs.test.mjs`
  - `node --test tests/audit-intake-extra-coverage.test.mjs`
- この単位の全部: `node --test tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs tests/audit-intake-extra.test.mjs tests/audit-intake-extra-docs.test.mjs tests/audit-intake-extra-coverage.test.mjs`（分けた時は proof も足す）
- 行の網羅率の実測（NFR3.7。依存を入れた環境で、既存の試験の失敗が 0 の時だけ値を読む）: `node --test --experimental-test-coverage --test-coverage-include='scripts/hygiene/audit-admission.mjs' tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs tests/audit-intake-extra.test.mjs tests/audit-intake-extra-docs.test.mjs`（子の process から流すときは、この取り組みの網羅率の試験自身を含めない）

## TDD の記録

- 各 Red の後に、**失敗した命令と出力の抜粋**を `code-summary.md` に書く（失敗の理由が「実装が無い」ことを示す文であること。構文の誤りや試験の書き間違いによる失敗を Red と数えない）。
- 各 Green の後に、同じ命令が通った出力を書く。
- Node 24 と CI の Node の両方の lcov の出力の形は、Step 12 の Red の前に確かめて記録する。形が取れない版は失敗にする（NFR3.5）。

## 網羅率の目標

- 床は 100%。対象は `scripts/hygiene/audit-admission.mjs` の 1 file、足す・変える行の全部。
- 既にある通らない 2 つの範囲（R1 = `function github(path) {` 〜閉じる `}` の 4 行、内容の SHA-256 `93804d44400ca198f8bda0061dda2ee0e5f0f7d6682edcd63e46bfc7e71a4ae7`、R2 = 命令行の入口の 3 行、`c9424673d1663dae3b883f57e814e4342fc09ea3d2e0ba7a48a3594f947abf08`）だけを理由つきで除く。範囲の内容が変わったら除外を認めず失敗にする。
- 計測できない・対象が 0 行・子の process の失敗・報告の形が取れない版は、すべて失敗（成功に数えない）。

## 差し込み（mock）と試験データ

- `api` は、`repos/<repo>/git/commits/<commit>` の path ごとに応答を決める差し込み。応答は 4 種類: 実在（sha が一致）、404（例外）、期限切れ（例外）、別の sha・読めない形。問い合わせの回数は差し込みの中で数え、総予算の式（受付 4 × T、返却の確認 8 × T）を確かめる。
- 時刻は呼び出し側が渡す固定の `now`。乱数・実際の `gh`・network は使わない。
- fixture は架空の repo 名（`example-org/example-api` など）と、固定の 40 桁の小文字 16 進の commit だけ。資格情報・実在の PR は書かない。

## 試験の対応（要件・規則）

| 群 | 内容 | 規則・要件 |
|---|---|---|
| 宣言の読み取り | 欄なし・空 = 今と同じ／型・キーの過不足／commit・repo の書式／重複／5 件目／PR 自身の repo（大文字小文字違い）／必須の検査が空／不正のとき問い合わせ 0 回／対象ごとに独立 | BR1.1〜BR1.8、FR1.x |
| job の分類 | 宣言なし 1 件 = 今と同じ／宣言なし 2 件 = 今と同じ拒否／宣言あり: 候補 0・1・2 件／両親の不一致／全桁一致のみ／同じ commit の重複行は 1 件／job 名・順序を読まない | BR2.1〜BR2.6、FR2.1〜FR2.3・FR2.7〜FR2.9 |
| 宣言の確認・実在 | どの job にも出ない宣言／一部の job だけに出る宣言（通る）／実在 1 件 1 回／sha 不一致・404・期限切れ・別 repo の commit／再試行しない | BR3.1・BR3.2、FR2.4〜FR2.6 |
| 受理の出力・固定の理由 | 出力のキーが宣言なしと同じ／宣言の値が出ない／8 つの新しい理由が固定の文 | BR3.3・BR3.6、NFR1.7・NFR8.4 |
| 決定性・総予算 | 同じ入力で同じ出力／受付 4 × T・返却の確認 8 × T／時刻・乱数を核が取らない | BR3.5、NFR5、NFR6 |
| 後方互換 | 既存の 2 試験が変更なしで通る／`gate.mjs`・`design-gate.mjs` の呼び出しが変わらない | FR4.4、NFR2 |
| 文書の揃い | 実装の定数と 2 つの文書の欄の名前・上限・規則・保証しないこと・schema `/1`／食い違いの fixture で失敗 | BR4.1・BR4.2、FR3.x、NFR7 |
| 網羅率の記録 | R1・R2 の SHA-256 の照合／通らない行 ⊆ R1 ∪ R2／未計測・0 行・子の失敗・形が取れない = 失敗／実測の記録の項目 | NFR3.1〜NFR3.8 |
