# U2 u2-gate-trigger-narrowing — 技術の選び方と、環境・試験・費用の要件

この単位で使う技術と、それに結び付く要件（動作環境、規則の置き場、試験の方法、構造の予算、指標、費用）を書く。新しい技術は 1 つも足さない。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 単位: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md) の U2。要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR1・NFR3・NFR7・NFR9〜NFR11、FR10.1、FR10.2、FR10.4。
- 技術の観測: 基準は公開 Shirube の `origin/main`（`0f9ea89175ece32604e0dcfde9db28462f0d2f35`）の実物。`kit/sds-gate-caller.yml`（SHA-256 `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`）、再利用 workflow `.github/workflows/sds-gate.yml`（`ac38c62e7f04ca55b8532877c66fa0dcc85452241fd011a192eef9d3f57e812c`）、`scripts/sds/gate.mjs`（`b4f529aeb40270382b44a5a2754d2651b47c1e5414a683016bd34c3a5b1f5aa1`）。詳細は [security-requirements.md](./security-requirements.md) の「基準の観測」。実行時の npm 依存は無い。
- 注意: 共有の [technology-stack.md](../../../../../codekb/shirube/technology-stack.md)（CodeKB）と作業場の木は古いことがある。この単位の基準には使わず、clone の `origin/main` の bytes を使った。
- 実践: team.md の Testing Posture（TDD、`node:test` と `assert`、行の網羅率 100%、観測した値を機械が読める形で記録）と Code Style（`.mjs`、Node 22 以上、実行時 npm 依存なし）。確認コマンドの記録: `verification-command.txt`（Owner 承認済み。対象は `scripts/coverage-gate/` 配下で、この単位は足さない）。
- 既存の試験の読み方: `tests/sds-gate.test.mjs` と `tests/workflow-contract.test.mjs` は workflow を文字列・正規表現として読んで確かめる。YAML を解釈する依存は使っていない。

## 技術の選び方

| ID | 決めたこと | 理由 | 採らなかった代替 |
|---|---|---|---|
| D1 | 絞りは、caller の job の `if:` で行う。`on:` の types は `issue_comment` の `created, edited, deleted` を残す | `issue_comment` には本文で絞る `on:` の項目が無い。追加の action も依存も要らず、費用も増えない（NFR6.1、NFR11.1）。既存の試験（types が `created, edited, deleted`）を変えない（NFR8.2） | `on:` の側で絞る（できない）、本文を読む別の job を足して結果を渡す（job が増え、権限と費用が増える）、`paths` や `branches` の絞り（コメントの出来事には使えない） |
| D2 | 絞りの規則は caller の `if:` の 1 か所に置く。印の集合は監査の入口の schema 名と突き合わせる試験で守る | 規則を 1 か所にする（NFR3.1、S3）。値の集合を 2 か所に別々に持たない | caller に印を直書きして写しの検査もしない（schema 名が変わると黙って食い違う）、印の集合を外の設定に切り出す（読み込みの仕組みが増える） |
| D3 | 本文は `if:` の式の中の `contains()` の引数と、空かどうかの真偽の判定（`!`）の対象としてだけ使い、`run:`・`with:` に渡さない | 外から来る入力が shell や出力に入らない（NFR5.2、脅威 T1） | 本文を環境変数に入れて shell で判定する（注入と権限の面が増える） |
| D4 | 迷う時は流す側に倒す。判定が読むものを変える出来事（head・PR 本文・label・変更 file・依頼と返却）は絞らない | 流しすぎは費用、流さなさすぎは古い PASS が残る（NFR4.2、S5） | 印のあるコメントとラベルなしの `pull_request_target` だけに絞る（`labeled`・`unlabeled` は FR10.2 の確認が済むまで決めない） |
| D5 | 試験は、caller を文字列として読む定義の試験（`node:test` と `assert`）で書く | 既存の試験と同じ読み方で、新しい依存を足さない（NFR6.1、NFR7.1）。文字列の読みは粗いので、負例を厚くして補う | YAML を解釈する npm の依存を足す（新しい依存の承認が要る）、実際の GitHub の実行だけで確かめる（統合前の確かめにならない） |

D1 の `if:` の書き方の細部は nfr-design の設計 1・2 で決めた（作成だけを本文で絞り、編集・削除は常に流す）。字句は Code Generation の計画で確定し、設計監査で確かめる。FR10.2（`labeled`・`unlabeled`）は nfr-design の設計 3 で `scripts/sds/gate.mjs` を読んで決めた（残す）。

## 要件

### NFR1 動作環境

- **NFR1.1** caller は GitHub Actions の構文だけを使い、runner や Node の版に依存しない。再利用 workflow の runner と Node の指定、`package.json` の `engines`（`>=22`）を変えない。[NFR1、FR10.4]

### NFR3 規則は 1 か所

- **NFR3.1** 絞りの規則（どの出来事で門を流すか）は caller の 1 か所だけに書く。試験は規則を再定義せず、caller の定義を読んで確かめるだけにする。監査の印の集合は、監査の入口（`scripts/hygiene/audit-admission.mjs`）が検査する schema 名との突き合わせの試験で守る。[NFR3、S3]

### NFR7 試験の方法

- **NFR7.1** TDD。先に、変更前の caller で失敗する試験を書いて失敗を確かめ、次にそれを通す変更を書く。試験は `node:test` と `assert`。正例（印を含むコメント、印が消える編集、削除、判定が読むものを変える PR の出来事で流れる）と負例（関係の無いコメントで流れない、ラベルの扱いが FR10.2 の確認結果のとおり、失敗を隠す記述が無い、本文が `run:`・`with:` に渡らない）をそろえる。[NFR7、US7.1、US7.2]
- **NFR7.2** この単位は測る対象の JavaScript のソースを足さない（足すのは試験と YAML の変更）。確認コマンドの行の網羅率の対象は `scripts/coverage-gate/` 配下で、この単位の間は 0 件になり、網羅率が空のまま 100% と出て通る。これは U2 の合否の根拠にしない。この単位の確かめが保証するのは、既存の試験と、この単位で足す試験が通ることだけ。[NFR7、プロジェクトの学び（対象 0 件を成功と読まない）]
- **NFR7.3** 試験の結果は、実行した試験の数・合格数・失敗数の観測として Build and Test の記録に残す。実行されない、計測できない、時間切れを成功に数えない。申告された数を写さない。[NFR7、S5、S8]

### NFR9 構造の予算

- **NFR9.1** 新しい試験 file は 300 行以内、ESLint の関数は 50 行・複雑さ 10 を保つ。既存の試験 file に足す場合も、その file の予算を超えない。[NFR9]

### NFR10 評価の指標

- **NFR10.1** この単位の成功は、自社で観測できるものだけで判断する: caller の定義の試験の結果と、base の実物との突き合わせ（この PR 自身の Actions の実行では kit の caller の `if:` を観測できない）。絞りで流れなくなる出来事の数は Actions の一覧から数え、数え方を設計の記録に書く（測定そのものは範囲外）。外から決まる値は使わない。[NFR10、FR10.1]

### NFR11 費用

- **NFR11.1** 新しい有料サービスや常設の資源を足さない。実行回数や費用が減るという主張は、実際の実行の記録で観測するまで書かない。[NFR11、S5]

### NFR2 判定の核の決定性（この単位では当てはまらない）

- 判定の核（時刻・乱数・識別子を入力で受ける部品）をこの単位は持たない。traceability では N/A とし、理由を書く。

## Assumptions & Open Questions

### Assumptions

- [assumption] 既存の試験の読み方（文字列・正規表現として読む）に合わせ、新しい試験もその形で書く。YAML を解釈する依存は足さない。具体の置き場（既存の `tests/sds-gate.test.mjs` への追加か新しい file か）は Code Generation の計画で、その時の行数を見て決める。
- [assumption] D1 の `if:` の式が意図どおりに評価されるかは、試験の負例（式の写しの小さな評価器）で確かめる。GitHub での実際の評価は、この PR 自身の Actions の実行では観測できず（kit の caller は利用先に写されるひな形）、利用先への導入の後に観測する。それまでは「観測できなかった」と書く。
- [assumption] 確認コマンドの変更はこの単位では起きない。置き場（`scripts/coverage-gate/`）が変わる場合は、U3 の設計で再び承認を伺う（Owner の承認済みの確認コマンドの条件）。

### Open Questions

1. 文字列として読む定義の試験で、式（`${{ ... }}`）の意味まで確かめられる範囲。足りない部分は、設計監査と、この PR 自身の Actions の実行の記録で補う。
2. 監査の印の集合と schema 名の突き合わせを、試験でどう書くか（`audit-admission.mjs` の schema 名の取り出し方）。機能の設計と Code Generation の計画で決める。
