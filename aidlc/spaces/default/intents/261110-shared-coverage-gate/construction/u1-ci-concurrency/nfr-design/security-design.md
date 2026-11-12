# U1 u1-ci-concurrency — 安全の設計（取り消しの規則）

この単位は、Shirube 自身の `.github/workflows/ci.yml` に「同じ PR の古い実行を取り消す」規則を足す。ここでは、その規則をどう組み立てるか、何を守るか、どう確かめるかを設計として書く。実装の code（workflow の変更と試験）は、設計監査の PASS の後に書く。性能・拡張・信頼性（可用性）・観測・論理部品の各設計は、この種類（packaging）の単位には当てはまらないので作らない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR4.1〜4.4、NFR5.1〜5.3、NFR6.1、NFR8.1〜8.3）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（D1〜D5、NFR1.1、NFR3.1、NFR7.1〜7.3、NFR9.1、NFR10.1、NFR11.1）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 の 2 つは新しい契約を作らない）。
- 現状の観測: `.github/workflows/ci.yml` は `on: pull_request` と `push` の `main`、job は `test` と `hygiene`（`./.github/workflows/hygiene.yml` を呼ぶ）で、`concurrency` と `permissions` の記載は無い。`hygiene.yml` に `concurrency` の記載は無い。同じ repo の `sds-gate.yml` には job 単位の `concurrency`（group = `sds-gate-<repo>-<PR 番号>`、`cancel-in-progress: true`）が先例としてある。
- [文献確認] GitHub 公式の workflow 構文（https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions と https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency）: 同じ group で保留にできる実行は 1 件で、新しい実行が来ると保留中の古い実行は取り消されて置き換わる（既定）。実行中のものまで取り消すには `cancel-in-progress: true`。`cancel-in-progress` には式が書ける（要件の Open Question 2 を、この公式の文面で確認した）。呼ばれる側（reusable workflow）と呼ぶ側に同じ group 名を付けると、実行中の呼び出しを取り消す注意がある。

## 設計

### 1. 規則を置く場所と形（D1・D2、NFR3.1）

`ci.yml` の最上位（`on:` と `jobs:` の間）に `concurrency:` を 1 か所だけ置く。job の中には置かない。`test` と `hygiene` の両方が、この 1 か所の規則に従う。形は次のとおり（実装時の書き方の目安。字句は Code Generation の計画で確定し、設計監査で確かめる）。

```yaml
concurrency:
  group: ci-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

### 2. group の鍵（D3、NFR5.2・NFR5.3・NFR4.3）

| 実行の種類 | group | 取り消されるか |
|---|---|---|
| `pull_request`（PR の作成・更新） | `ci-pr-<PR 番号>` | 同じ PR の古い実行は取り消される |
| `push`（`main`） | `ci-run-<実行の番号>` | 実行ごとに別の group なので、取り消されず、保留で置き換わることもない |

- 鍵に使うのは、GitHub が割り当てる PR の番号と実行の番号だけ。ブランチ名・PR のタイトル・作者名など、作者が選べる文字列は使わない。別の fork の同名ブランチが他の PR の実行を取り消す経路を作らない（脅威 T1）。
- 接頭語 `ci-` は、同じ repo の `sds-gate-` の group と食い違わないために付ける。`hygiene.yml` には `concurrency` が無いので、呼び出し側と呼ばれる側で同じ group を使う問題は起きない。
- `push` の鍵を実行ごとにするのは、`main` の push の実行を 1 つの group にまとめると「保留中の実行が置き換わる」ことで、検査の結果が欠けるため（脅威 T2、公式の既定の挙動）。

### 3. 取り消す条件（D4、NFR4.2・NFR4.3）

`cancel-in-progress` は、PR の実行のときだけ真になる式にする。`push` の実行では偽。式が評価できない・解釈できない場合に取り消しが起きる形にはしない（偽になる側に倒す。つまり、取り消す条件を「PR の実行である」と肯定で書き、それ以外は取り消さない）。

### 4. 失敗を隠さない・権限を広げない（NFR4.1・NFR5.1・NFR6.1・NFR8.3）

- 足すのは `concurrency:` の 2 行（group と cancel-in-progress）だけ。`continue-on-error`、`|| true`、`--if-present` を足さない。`on:` の項目、`permissions:`、secret、action、依存を足さない。`pull_request` を `pull_request_target` に変えない。
- 取り消された実行は、GitHub 上で「取り消し（cancelled）」として残る。これを成功と数える経路は無い。必須の検査の結果は、最新の head の実行（取り消されず最後まで流れる）だけが決める（脅威 T3）。
- 既存の job `test`・`hygiene` の名前・数・内容、branch protection は変えない（NFR8.1）。

### 5. 確かめ方（D5、NFR4.4・NFR7.1・NFR8.2）

試験は既存の `tests/workflow-contract.test.mjs` と同じ「workflow を文字列として読む」形で、`node:test` と `assert` で書く。先に、変更前の `ci.yml` で失敗する試験を書いて失敗を確かめ（TDD）、次にそれを通す変更を書く。

| 種類 | 確かめること | 見るもの |
|---|---|---|
| 正例 | 最上位に `concurrency:` が 1 つある。group が PR の番号から作られ、PR の実行で `cancel-in-progress` が真になる | `ci.yml` の文字列 |
| 負例 N1 | `push` の実行は取り消されない: 取り消しの式が `pull_request` のときだけ真で、`push` では偽 | 同上 |
| 負例 N2 | group の鍵にブランチ名・タイトル・作者名など作者が選べる値が入っていない（`github.head_ref`、`github.ref_name`、`github.actor`、`pull_request.title` などを含まない） | 同上 |
| 負例 N3 | 別の PR・別の workflow を巻き込まない: group の接頭語が `ci-` で、`sds-gate-` と重ならない | 同上 |
| 負例 N4 | 失敗を隠す記述（`continue-on-error`、`|| true`、必須 step の `--if-present`）が `ci.yml` に新しく無い。`on:` の項目と job の数・名前が変わっていない | 同上 |
| 負例 N5 | 読めない・解釈できない `ci.yml` は失敗になる（成功に読み替えない） | 同上 |
| 逆向き | 足した `concurrency:` を取り除いた `ci.yml` で、変更前の試験が通る | 取り除いた文字列に対する既存の検査 |

- 文字列としての読みは粗いので、式の意味まで証明しない。足りない分は、設計監査と、この PR 自身の CI の実行の記録（古い head の実行が取り消され、最新の head の実行が最後まで流れたこと）で補う。この PR の CI の記録は、観測値として Build and Test の記録に残し、申告値を写さない（NFR7.3、NFR10.1）。
- 公開に載る試験データは架空だけ。この単位は fixture に実在の識別子を使わない。

### 6. 変更を戻す方法（S6、NFR8.2）

追加した `concurrency:` の 2 行を取り除くだけで、変更前の定義に戻る。追加のみの変更で、削除や改名を含まないため、新旧の同居の期間の宣言は要らない。

## 守る物の条件

- この変更は workflow で、保護対象。段の承認は実行の許可ではない。team.md のとおり、機能・非機能・置き場の設計を終えたら設計記録だけの PR を先に出し、独立の設計監査（devauditor）を 1 回出す。code は設計監査の PASS の後に書く。統合の前に、対象 head への Owner の承認が要る。

## 設計の判断（採った判断と採らなかった代替）

| ID | 採った判断 | 採らなかった代替 | 規格の項目 |
|---|---|---|---|
| SD1 | 最上位の `concurrency:` 1 か所 | job ごとの写し | S3、NFR3.1 |
| SD2 | PR の番号と実行の番号だけで group を作る | `github.head_ref` などの作者が選べる値、全部を 1 つの group にする | S9、NFR5.2、NFR4.3 |
| SD3 | `main` の push は実行ごとに別の group | push も PR と同じ group にする | S8、NFR4.3 |
| SD4 | 文字列として読む定義の試験 | YAML を解釈する依存を足す（新しい依存の承認が要る） | NFR6.1 |
| SD5 | `permissions:` を明示して絞ることはこの単位では行わない（範囲外。セキュリティの設計の変更にあたる） | この単位で一緒に絞る | escalation-policy、FR10.4 |

## Assumptions & Open Questions

### Assumptions

- [assumption] 上の式の字句（`format` の使い方、`&&` と `||` の組み合わせ）は、GitHub Actions の式として意図どおりに評価される。公式の構文は式の使用を許すが、この記録の段階では実行して確かめていない。Code Generation の計画と、この PR 自身の CI の記録で確かめる。評価されない場合は、設計を先に直してから実装する。
- [assumption] fork からの PR でも、`github.event.pull_request.number` は取り消しの鍵として使える（この repo の PR の番号）。

### Open Questions

1. 試験を既存の `tests/workflow-contract.test.mjs` に足すか、新しい file に分けるか。現在の行数を見て、Code Generation の計画で決める（NFR9.1）。
2. `ci.yml` に `permissions:` を明示して絞るか。範囲外。変えたいなら arc 経由で Owner に伺う。
