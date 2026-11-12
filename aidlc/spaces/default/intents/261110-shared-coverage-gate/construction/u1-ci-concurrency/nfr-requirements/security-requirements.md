# U1 u1-ci-concurrency — 安全・失敗・新旧同居の要件

この単位は、Shirube 自身の `.github/workflows/ci.yml` に「同じ PR の古い実行を取り消す」設定を足すだけの小さな workflow の変更（packaging）。ここでは、その変更が守る安全・失敗の扱い・新旧の同居の要件を、元の NFR の番号に枝番を付けて書く。性能・拡張・信頼性（可用性）・観測の各要件は、この種類（packaging）の単位には当てはまらないので作らない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 単位の内容: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md) の U1（FR10.3、FR10.4。`ci.yml` だけ。必須の検査の名前・数・内容、branch protection、試験の中身は変えない）。
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR4・NFR5・NFR6・NFR8、FR10.3〜FR10.5。契約: [contract-summary.md](../../../inception/contract-design/contract-summary.md)（S10 の 2 つは新しい契約を作らない）。
- 現状の観測: `.github/workflows/ci.yml`（`on: pull_request` と `push` の `main`、job は `test` と `hygiene`、`permissions` と `concurrency` の記載は無い）。既存の試験は workflow を文字列として読んで確かめている（`tests/workflow-contract.test.mjs`）。
- [文献確認] 同じ concurrency の group では、実行中 1 件と保留 1 件までで、新しい実行が来ると保留中の古い実行が取り消されて置き換わる（`cancel-in-progress: false` でも）。出どころは GitHub の更新情報 https://github.blog/changelog/2026-05-07-github-actions-concurrency-groups-now-allow-larger-queues と第三者の解説。公式の workflow 構文の文面での確認は、この単位の設計の段で行う（RAID の I2）。
- 席の方針: [team.md の Way of Working・Testing Posture]（保護対象の変更の進め方、`|| true` などを置かない）。

## 要件

各行の [ ] は出どころ。

### NFR4 失敗を隠さない

- **NFR4.1** 足す行に `continue-on-error`、`|| true`、必須 step の `--if-present` を使わない。既存の `test` と `hygiene` の job に、これらを新しく足さない。[NFR4、S8]
- **NFR4.2** 取り消された実行（cancelled）を成功と数えない。取り消されてよいのは、同じ PR の、最新でない head の実行だけ。最新の head の実行は取り消されず最後まで流れ、その結果が必須の検査の結果になる。[NFR4、FR10.3]
- **NFR4.3** 既定の branch（`main`）への push の実行は取り消さない。同じ group に入れて「保留中の実行が新しい実行に置き換わる」状態も作らない（push の実行は実行ごとに別の group にする）。[FR10.3、US7.4、文献確認]
- **NFR4.4** 負例（`main` への push の実行が取り消し対象にならない、別の PR の実行を巻き込まない）は、workflow の定義の試験で確かめる。確かめられない（読めない・解釈できない）時は失敗にする。[NFR4、FR10.3]

### NFR5 最小の権限

- **NFR5.1** 資格情報・secret・権限・起動の種類（`on:` の項目）を新しく足さない。`pull_request` を `pull_request_target` に変えない。[NFR5、S9]
- **NFR5.2** group の名前は、PR の番号など、PR の作者が自由に選べない値だけから作る。ブランチ名、PR のタイトル、そのほか作者が決められる文字列を使わない。別の fork の同名ブランチが、他の PR の実行を取り消せないようにする。[NFR5、脅威 T1]
- **NFR5.3** 取り消しの対象は、同じ PR の実行だけ。別の PR、別の workflow、`main` の実行を取り消せる group の作り方にしない。[NFR5、FR10.3]

### NFR6 依存

- **NFR6.1** 新しい action、npm の依存、外部の資源を足さない。足すのは `concurrency:` の記述だけ。[NFR6]

### NFR8 新旧の同居

- **NFR8.1** 必須の検査の名前・数・内容（job `test` と `hygiene`）、branch protection、試験の中身を変えない。変更前の定義で通っていた既存の試験が、そのまま通る。[NFR8、FR10.4]
- **NFR8.2** 逆向きがある。足した `concurrency:` を取り除くと変更前の定義に戻り、その状態でも変更前の試験が通る。逆向きは試験で確かめる（S6）。[NFR8]
- **NFR8.3** 追加だけの変更で、削除や改名を含まない。同居の期間の宣言は要らない。[NFR8、S6]

## 脅威の見方（この変更に関わるものだけ）

| ID | 脅威 | 受ける要件 |
|---|---|---|
| T1 | 作者が選べる文字列（同名のブランチなど）で group が決まり、別の fork の PR が他の PR の実行を取り消す | NFR5.2、NFR5.3 |
| T2 | 取り消しが `main` の実行に及び、`main` の検査の結果が欠ける | NFR4.3、NFR4.4 |
| T3 | 取り消された実行が成功として数えられ、最新の head の検査が走らないまま統合に進む | NFR4.2 |
| T4 | 追加に伴って権限や起動の種類が広がる | NFR5.1、NFR6.1 |

## 守る物の条件（機能要件 FR10.5 から。NFR の行ではない）

- この変更は workflow で、保護対象。段の承認は実行の許可ではない。
- 進め方は team.md のとおり。機能・非機能・置き場の設計を終えたら設計記録だけの PR を先に出し、独立の設計監査（devauditor）を 1 回出す。code（workflow の変更）は設計監査の PASS の後に書く。統合の前に、対象 head への Owner の承認が要る。

## 気づいたこと（この単位の範囲の外。変更しない）

- `ci.yml` には `permissions:` の記載が無く、権限は既定のまま。明示して絞るかは、セキュリティの設計の変更にあたるので、この単位では決めない。扱いは Open Questions に書く。

## Assumptions & Open Questions

### Assumptions

- [assumption] group の名前に PR の番号を使えば、NFR5.2 を満たせる（PR の番号は GitHub が割り当て、作者が選べない）。具体の書き方はこの後の設計の段と Code Generation の計画で決め、設計監査で確かめる。
- [assumption] push の実行を実行ごとの別の group にすれば、NFR4.3 を満たせる。これは [文献確認] の出どころにもとづく。公式の構文の文面での確認は、この単位の設計の段で行う。
- [assumption] この単位は、読み取りだけの権限で十分な既存の job の形を変えない。権限の絞り込みは別の判断。

### Open Questions

1. `ci.yml` に `permissions:` を明示して絞るか（セキュリティの設計の変更にあたる）。この取り組みでは範囲外として扱い、変えたいなら arc 経由で Owner に伺う。
2. 公式の workflow 構文の文面で、保留中の実行が置き換わる挙動の確認（設計の段）。
