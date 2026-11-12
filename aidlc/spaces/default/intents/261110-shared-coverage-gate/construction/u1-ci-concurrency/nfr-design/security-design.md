# U1 u1-ci-concurrency — 安全の設計（取り消しの規則）

この単位は、Shirube 自身の `.github/workflows/ci.yml` に「同じ PR の古い実行を取り消す」規則を足す。ここでは、その規則をどう組み立てるか、何を守るか、どう確かめるかを設計として書く。実装の code（workflow の変更と試験）は、設計監査の PASS の後に書く。性能・拡張・信頼性（可用性）・観測・論理部品の各設計は、この種類（packaging）の単位には当てはまらないので作らない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [security-requirements.md](../nfr-requirements/security-requirements.md)（NFR4.1〜4.4、NFR5.1〜5.3、NFR6.1、NFR8.1〜8.3）、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)（D1〜D5、NFR1.1、NFR3.1、NFR7.1〜7.3、NFR9.1、NFR10.1、NFR11.1）。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 の 2 つは新しい契約を作らない）。
- 基準の観測（公開 Shirube の base コミット `7e775afd5b755e51e55e269d8dc35b09d180c33e` の実物。`.github/workflows/ci.yml` の SHA-256 `1e3f42c895dccd23b4b00017da6171488729d092af435cdc11cb85018b861c8a`）: 起動は `pull_request`・`push` の `main`・`workflow_dispatch` の 3 つ。最上位に `permissions: {}` があり、job は `test`（`contents: read`、Node 26、`scripts/**` 全体の行の網羅率 80% の床）・`hygiene`（`contents: read`、`./.github/workflows/hygiene.yml` を呼び Node 22 を渡す）・`measure`（`pull_request` 以外のときだけ、読み取り 4 つ、Node 26）の 3 本。`ci.yml` にも `hygiene.yml` にも `concurrency` の記載は無い。同じ repo の `sds-gate.yml` には job 単位の `concurrency`（group = `sds-gate-<repo>-<PR 番号>`、`cancel-in-progress: true`）が先例としてある。
- 訂正の記録: 設計の第 1 版は作業場の古い木の `ci.yml`（権限なし・2 job）を現状として書き、誤っていた（設計監査 round 1 の F01）。この版は上の base の bytes から読み直した。以後、「現在の `ci.yml`」についての記述は、設計 6 の機械の突き合わせを通してから書く。
- [文献確認] GitHub 公式の workflow 構文（https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions と https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency）: 同じ group で保留にできる実行は 1 件で、新しい実行が来ると保留中の古い実行は取り消されて置き換わる（既定）。実行中のものまで取り消すには `cancel-in-progress: true`。`cancel-in-progress` には式が書ける（要件の Open Question 2 を、この公式の文面で確認した）。呼ばれる側（reusable workflow）と呼ぶ側に同じ group 名を付けると、実行中の呼び出しを取り消す注意がある。

## 設計

### 1. 規則を置く場所と形（D1・D2、NFR3.1）

`ci.yml` の最上位で、既存の `permissions: {}` の直後・`jobs:` の直前に `concurrency:` を 1 か所だけ置く。job の中には置かない。`on:` の中（`push:` と `workflow_dispatch:` の間など）には入れない。`test`・`hygiene`・`measure` のすべてが、この 1 か所の規則に従う。形は次のとおり（実装時の書き方の目安。字句は Code Generation の計画で確定し、設計監査で確かめる）。

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
| `workflow_dispatch`（手動） | `ci-run-<実行の番号>` | 同上。手動の実行も取り消されない（`cancel-in-progress` は `pull_request` のときだけ真） |

- 鍵に使うのは、GitHub が割り当てる PR の番号と実行の番号だけ。ブランチ名・PR のタイトル・作者名など、作者が選べる文字列は使わない。別の fork の同名ブランチが他の PR の実行を取り消す経路を作らない（脅威 T1）。
- 接頭語 `ci-` は、同じ repo の `sds-gate-` の group と食い違わないために付ける。`hygiene.yml` には `concurrency` が無いので、呼び出し側と呼ばれる側で同じ group を使う問題は起きない。
- `push` の鍵を実行ごとにするのは、`main` の push の実行を 1 つの group にまとめると「保留中の実行が置き換わる」ことで、検査の結果が欠けるため（脅威 T2、公式の既定の挙動）。

### 3. 取り消す条件（D4、NFR4.2・NFR4.3）

`cancel-in-progress` は、PR の実行のときだけ真になる式にする。`push` と `workflow_dispatch` の実行では偽。式が評価できない・解釈できない場合に取り消しが起きる形にはしない（偽になる側に倒す。つまり、取り消す条件を「PR の実行である」と肯定で書き、それ以外は取り消さない）。

### 4. 失敗を隠さない・権限を広げない（NFR4.1・NFR5.1・NFR6.1・NFR8.3）

- 足すのは `concurrency:` のブロック（キー `concurrency:` と、その下の group と cancel-in-progress の 2 行）だけ。`continue-on-error`、`|| true`、`--if-present` を足さない。`on:` の項目、secret、action、依存を足さない。最上位の `permissions: {}` と job ごとの権限は、そのまま保つ（足さず、変えず、動かさない）。`pull_request` を `pull_request_target` に変えない。
- 最上位の `concurrency:` は権限と独立した構文で、`permissions: {}` と job 別の権限を変えない（構文上の独立。この PR 自身の実行で、権限の設定が変わっていないことを観測する）。
- 取り消された実行は、GitHub 上で「取り消し（cancelled）」として残る。これを成功と数える経路は無い。必須の検査の結果は、最新の head の実行（取り消されず最後まで流れる）だけが決める（脅威 T3）。
- 既存の job `test`・`hygiene`・`measure` の名前・数・内容（`test` の Node 26 と `scripts/**` 全体 80% の網羅率の command を含む）、起動 3 つ、branch protection は変えない（NFR8.1）。これらは既存の `tests/workflow-contract.test.mjs`（BR7.2）がすでに固定しているので、この単位の試験は同じ知識を複製せず、変更後もその試験が通ることを保つ（S3）。

### 5. 確かめ方（D5、NFR4.4・NFR7.1・NFR8.2）

試験は既存の `tests/workflow-contract.test.mjs` と同じ「workflow を文字列として読む」形で、`node:test` と `assert` で書く。先に、変更前の `ci.yml` で失敗する試験を書いて失敗を確かめ（TDD）、次にそれを通す変更を書く。

| 種類 | 確かめること | 見るもの |
|---|---|---|
| 正例 | 最上位に `concurrency:` が 1 つある。group が PR の番号から作られ、PR の実行で `cancel-in-progress` が真になる | `ci.yml` の文字列 |
| 負例 N1 | `push` の実行は取り消されない: 取り消しの式が `pull_request` のときだけ真で、`push` では偽 | 同上 |
| 負例 N2 | group の鍵にブランチ名・タイトル・作者名など作者が選べる値が入っていない（`github.head_ref`、`github.ref_name`、`github.actor`、`pull_request.title` などを含まない） | 同上 |
| 負例 N3 | 別の PR・別の workflow を巻き込まない: group の接頭語が `ci-` で、`sds-gate-` と重ならない | 同上 |
| 負例 N4 | 足した行（`concurrency:` ブロック）に、失敗を隠す記述（`continue-on-error`、`|| true`、必須 step の `--if-present`）、`permissions`、`uses`、secret、`on:` の項目が入っていない | 足したブロックの行だけ |
| 負例 N5 | 読めない・解釈できない `ci.yml` は失敗になる（成功に読み替えない） | 同上 |
| 逆向き | 足した `concurrency:` ブロックを取り除くと、読み手が「`concurrency` なし」と判定し、取り除いた結果が元の `ci.yml` から追加行だけを削ったものと一致する | 取り除いた文字列 |
| 同居 | 取り除いた結果の構造（起動 3 つ、最上位 `permissions: {}`、job `test`・`hygiene`・`measure` とそれぞれの権限、`measure` の条件）が、変更後の `ci.yml` の同じ部分と一致する。構造の知識を試験の中に書き写さず、取り除く前と後を比べるだけにする（S3） | 変更後と取り除いた後の文字列の差分 |

- 文字列としての読みは粗いので、式の意味まで証明しない。足りない分は、設計監査と、この PR 自身の CI の実行の記録（古い head の実行が取り消され、最新の head の実行が最後まで流れたこと）で補う。この PR の CI の記録は、観測値として Build and Test の記録に残し、申告値を写さない（NFR7.3、NFR10.1）。
- 公開に載る試験データは架空だけ。この単位は fixture に実在の識別子を使わない。

### 6. 変更を戻す方法（S6、NFR8.2）

追加した `concurrency:` ブロックを取り除くだけで、変更前の定義に戻る。追加のみの変更で、削除や改名を含まないため、新旧の同居の期間の宣言は要らない。実装の段では、取り除いた結果の SHA-256 が base の `1e3f42c8…` と一致することを 1 回観測して記録する（恒久の試験にはしない。後の単位が `ci.yml` を正当に変えるため）。

### 7. 「現在の `ci.yml`」の記述を base の実物と突き合わせる（F01 の再発防止）

設計・計画・監査の項目が「現在の `ci.yml`」について書く事実（SHA-256、起動 3 つ、最上位 `permissions: {}`、job が `test`・`hygiene`・`measure`、各 job の権限、Node 26 と網羅率 80% の command、`hygiene` の Node 22、`concurrency` が無いこと、`sds-gate.yml` の group の形）は、書いたあとに base コミットの bytes（`git show`）と機械で突き合わせる。突き合わせの script は読み取りだけで、結果は 1 件ずつ HOLDS／DOES_NOT_HOLD で出す。1 件でも DOES_NOT_HOLD なら監査を依頼しない。この版の結果: base `7e775afd…` に対し 12 件を確かめ、12 件が HOLDS、0 件が DOES_NOT_HOLD（観測。申告ではない）。作業場の木や共有の CodeKB の写しは、この突き合わせの基準に使わない。

## 守る物の条件

- この変更は workflow で、保護対象。段の承認は実行の許可ではない。team.md のとおり、機能・非機能・置き場の設計を終えたら設計記録だけの PR を先に出し、独立の設計監査（devauditor）を 1 回出す。code は設計監査の PASS の後に書く。統合の前に、対象 head への Owner の承認が要る。

## 設計の判断（採った判断と採らなかった代替）

| ID | 採った判断 | 採らなかった代替 | 規格の項目 |
|---|---|---|---|
| SD1 | 最上位の `concurrency:` 1 か所 | job ごとの写し | S3、NFR3.1 |
| SD2 | PR の番号と実行の番号だけで group を作る | `github.head_ref` などの作者が選べる値、全部を 1 つの group にする | S9、NFR5.2、NFR4.3 |
| SD3 | `main` の push は実行ごとに別の group | push も PR と同じ group にする | S8、NFR4.3 |
| SD4 | 文字列として読む定義の試験 | YAML を解釈する依存を足す（新しい依存の承認が要る） | NFR6.1 |
| SD5 | 最上位の `permissions: {}` と job 別の権限はすでに明示されているので、この単位では変えない（変えるのはセキュリティの設計の変更にあたる） | この単位で権限を足す・動かす | escalation-policy、FR10.4、S9 |
| SD6 | 「現在の `ci.yml`」の記述を、base の bytes と機械で突き合わせてから書く | 作業場の木や CodeKB の写しを基準にする | S5、F01 |
| SD7 | `concurrency:` を `permissions: {}` の直後に置く | `on:` の中に入れる、`jobs:` の後ろに置く（既存の BR7.2 の読み方と衝突する・読みにくい） | S3、NFR8.1 |

## Assumptions & Open Questions

### Assumptions

- [assumption] 上の式の字句（`format` の使い方、`&&` と `||` の組み合わせ）は、GitHub Actions の式として意図どおりに評価される。公式の構文は式の使用を許すが、この記録の段階では実行して確かめていない。Code Generation の計画と、この PR 自身の CI の記録で確かめる。評価されない場合は、設計を先に直してから実装する。
- [assumption] fork からの PR でも、`github.event.pull_request.number` は取り消しの鍵として使える（この repo の PR の番号）。

### Open Questions

1. 試験を既存の `tests/workflow-contract.test.mjs` に足すか、新しい file に分けるか。現在の行数を見て、Code Generation の計画で決める（NFR9.1）。
2. `permissions:` は最上位ですでに `{}` で、job ごとに必要な分だけ足されている。この単位は変えない。変えたいなら arc 経由で Owner に伺う。
3. 最上位の `concurrency:` が権限の設定に影響しないこと（構文上は独立）の公式の文面での確認は、実装の段の PR 自身の実行の記録で観測して補う。
