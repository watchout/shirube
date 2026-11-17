# U5 u5-exclusions — 配送の流れ（cicd-pipeline）

この単位は workflow を変えず、新しい action・service・秘密を足さない。既存の PR の流れ（CI、独立監査、受領、作者以外の統合）に乗る。ここでは、この単位の変更が通る段と門、戻し方、権限を書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [infrastructure-specification.md](./infrastructure-specification.md)、[monitoring-design.md](./monitoring-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)（RL9〜RL13）、[security-design.md](../nfr-design/security-design.md)（SC1〜SC7）。土台: U3・U4 の同名の [cicd-pipeline.md](../../u4-thresholds-and-modes/infrastructure-design/cicd-pipeline.md)。
- 守る物: `protected-surface-owner-gate.md`（workflow・必須検査・branch protection・契約 `.v2` は Owner の決定が要る）、`aidlc-only.md`（1 単位 = 1 PR、独立監査、作者以外の統合）。
- 設計の記録だけの PR を先に出して設計監査を通してから code を書く扱いと、リスクの区分 R3: arc の答え（Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。契約の面に値を足す単位だから。

## 流れ

| 段 | 内容 | 門（通らなければ進まない） |
|---|---|---|
| 0 前提 | 前の単位（U4 の PR）が統合されている（`origin/main` `7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e` に含まれる）。コード生成の最初に、その時点の `main` の実物と SHA-256 で突き合わせ、記録の「現状」を実物に直す | U4 の統合。突き合わせの記録 |
| 1 設計の記録だけの PR | 単位の設計・計画・試験・追跡表を入れ、`audit/` と `.aidlc-engine/` は含めない。`json sds-pr` と `risk:R3` の label 1 つ。作者が `sds-audit-request/1` を投稿し、設計監査を 1 回出す（reviewer は設計監査の記録の固定で devauditor） | 設計監査の PASS と作者の受領。code はこの後 |
| 2 作る（TDD） | 規則ごとに Red（失敗する試験）を先に書いて失敗を確かめ、Green（実装）で通す。別々の commit にする。同じ PR に実装を足す | Red が実際に失敗した記録 |
| 3 手元の確かめ | `npm test`（既存の試験 + 追加・置き換えの試験）、既存の構造の検査（ESLint、dependency-cruiser、knip、jscpd）、OWN-01 | 失敗 0、skip 0。当たる検査は PR に理由を書く |
| 4 網羅率の記録 | 足した・触った file を対象にした 1 回の実行の結果と、組込みの lcov の別計算を突き合わせる | 100%、2 つの値が一致、対象が 0 件でない |
| 5 逆向きの確かめ | 足した file を除き置き換えた試験を戻した木で既存の `npm test` を流し、base の実物と SHA-256 を突き合わせる（RL11） | 既存の試験が通り、一致 |
| 6 後ろ向きの互換 | 除外の無い入力の出力を、U3・U4 から固定した例と比べる（RL9） | 4 つの面がバイトまで一致 |
| 7 独立の監査（実装） | 実装を足した head で CI を通し、作者が `sds-audit-request/1` を投稿して前検査を通し、その時に空いている監査席の返却を待つ。監査の項目に、置き換えた既存の試験 4 件が弱まっていないこと、除外の道が入力の file だけであること、理由の決定の URL の実在（門は形だけ）と試験 file の除外が妥当な理由であること、kind の追加が .v2 に当たらないこと、環境変数の読みの扱い（拒否の文を書かない読み）を入れる | PASS と作者の受領 |
| 8 統合 | 作者以外の席（suite-lead）が、統合の merge commit で統合する（squash しない）。R3 は統合の前に Owner の exact-head を arc 経由で受ける | 返却・受領・必須検査・Owner の exact-head がそろう |

- 自動の配布はこの単位に無い。展開（deploy）も無い。統合された後の配線は U7、運用の手引きは U8。
- 監査依頼後、結果を受けるまでは対象 PR に push しない。head を変えたら古い依頼や結果を流用しない。

## 権限と秘密

| 項目 | 内容 |
|---|---|
| 新しい秘密 | 足さない。門は GitHub を読む資格情報を持たず、除外の理由を読みに行かない（SC1）。理由の妥当性は独立の監査が行う（rules.md「門が保証しないこと」） |
| workflow の権限 | 変更しない。門を呼ぶ job の権限の最小化は U7 が受ける。保護対象のため Owner の決定が要る |
| 新しい外部の action・service | 足さない（NFR6.2） |
| 保護対象 | この単位は触れない: workflow、必須検査、branch protection、DB の構造、資格情報、本番、料金、契約 `.v2`。DB の job の起動と PostgreSQL の版の固定も触れない（U7） |

## 戻し方と段階

| 項目 | 内容 |
|---|---|
| 戻し方 | 足した 2 file とその試験を取り除き、既存 4 file への追加を戻し、置き換えた試験を U4 のものに戻す。取り消すと U4 の状態に戻り、U3・U4 の試験が全部通る（NFR8.3） |
| 新旧の同居 | どの workflow も門を呼ばないので、統合しても CI の挙動は変わらない（NFR8.6）。除外の無い入力の出力は U4 と同じ（NFR8.1）。`exclusions: []` は新しく受け付ける向き（NFR8.5） |
| 失敗した時 | 独立の監査で BLOCK なら、作者が直して新しい head を出し、監査を再依頼する。回数と手順は採択された監査の手順に従い、この記録は回数を決めない |

## 確かめの記録

| 記録 | 置き場 |
|---|---|
| Red と Green の commit | PR の履歴 |
| 試験の観測値（実行数・合格数・失敗数・skip 数） | Build and Test の記録 |
| 網羅率の突き合わせ | U3 で決めた置き場に従う |
| golden の比較、base との SHA-256 の突き合わせ | Build and Test の記録 |
| 単位の AI-DLC の記録 | 単位の PR（`construction/u5-exclusions/` の設計・計画・試験・追跡表。`audit/` と `.aidlc-engine/` は含めない） |

## Assumptions & Open Questions

### Assumptions

- [assumption] 追加・変更の file は既存の CI の必須検査で判定される。必須検査の一覧を変えない（保護対象）。
- [assumption] この単位の変更の行数は 100 行を超える見込み（新規 2 file とその試験）なので、小さい変更の軽い道には当たらず、今の道で作る。

### Open Questions

なし。設計の PR を先に出すこととリスクの区分 R3 は arc の答えを得ており、設計監査と R3 の exact-head で確かめる。
