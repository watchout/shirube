# U4 u4-thresholds-and-modes — 配送の流れ（cicd-pipeline）

この単位は workflow を変えず、新しい action・service・秘密を足さない。既存の PR の流れ（CI、独立監査、受領、作者以外の統合）に乗る。ここでは、この単位の変更が通る段と門、戻し方、権限を書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [infrastructure-specification.md](./infrastructure-specification.md)、[monitoring-design.md](./monitoring-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)（RL6・RL7）、[security-design.md](../nfr-design/security-design.md)（SC1・SC7）。土台: U3 の [cicd-pipeline.md](../../u3-node-gate-slice/infrastructure-design/cicd-pipeline.md)。
- 守る物: `protected-surface-owner-gate.md`（workflow・必須検査・branch protection・契約 `.v2` は Owner の決定が要る）、`aidlc-only.md`（1 単位 = 1 PR、独立監査、作者以外の統合）。

## 流れ

| 段 | 内容 | 門（通らなければ進まない） |
|---|---|---|
| 0 前提 | 前の単位（U3 の PR）が統合されている。統合後の `main` を土台にし、U3 の実物と SHA-256 で突き合わせる（記録の「現状」を実物に直す） | U3 の統合。突き合わせの記録 |
| 1 作る（TDD） | 規則ごとに Red（失敗する試験）を先に書いて失敗を確かめ、Green（実装）で通す。別々の commit にする | Red が実際に失敗した記録 |
| 2 手元の確かめ | `npm test`（既存の試験 + 追加・置き換えの試験）、既存の構造の検査（ESLint、dependency-cruiser、knip、jscpd）、OWN-01 | 失敗 0、skip 0。当たる検査は PR に理由を書く |
| 3 網羅率の記録 | 足した・触った file を対象にした 1 回の実行の結果と、組込みの lcov の別計算を突き合わせる | 100%、2 つの値が一致、対象が 0 件でない |
| 4 逆向きの確かめ | 足した file を除き置き換えた試験を戻した木で既存の `npm test` を流し、base の実物と SHA-256 を突き合わせる（RL7） | 既存の試験が通り、一致 |
| 5 後ろ向きの互換 | 例外も動作も無い入力の出力を、U3 から固定した例と比べる（RL6） | 4 つの面がバイトまで一致 |
| 6 PR | 単位の変更だけで PR（`json sds-pr` と `risk` の label 1 つ）。リスクの区分は計画で確定する（Open Question 1） | 既存の CI の必須検査が通る |
| 7 設計の確認 | この単位は入力・結果の契約（版 1）に項目を足し、閾値を下げる入力という安全に関わる設計を持つ。守る物（契約・セキュリティ）に触れる単位として扱う見込み。その場合は、設計の記録だけの PR を先に出し、設計監査を 1 回出して PASS の後に code を書く（team.md、aidlc-only §2）。扱いの確定は arc に確かめる | 設計監査の PASS（該当する場合） |
| 8 独立の監査 | 作者が `sds-audit-request/1` を対象の PR に投稿し、前検査を通して、devauditor の返却を待つ | PASS と作者の受領 |
| 9 統合 | 作者以外の席（suite-lead）が、統合の merge commit で統合する（squash しない） | 返却・受領・必須検査がそろう |

- 自動の配布はこの単位に無い。展開（deploy）も無い。統合された後の配線は U7、運用の手引きは U8。

## 権限と秘密

| 項目 | 内容 |
|---|---|
| 新しい秘密 | 足さない。門は GitHub を読む資格情報を持たず、決定の URL を読みに行かない（SC1）。決定の実在・書き手・本文の確かめは独立の監査が行う（SC7） |
| workflow の権限 | 変更しない。門を呼ぶ job の権限の最小化は U7 が受ける。保護対象のため Owner の決定が要る |
| 新しい外部の action・service | 足さない（NFR6.2） |
| 保護対象 | この単位は触れない: workflow、必須検査、branch protection、DB の構造、資格情報、本番、料金、契約 `.v2`。閾値の下限や例外の許可の方針そのもの（例外を許す範囲）は Owner の決定済みの要件に従い、この単位で広げない |

## 戻し方と段階

| 項目 | 内容 |
|---|---|
| 戻し方 | 足した 2 file とその試験を取り除き、既存 3 file への追加を戻し、置き換えた試験を U3 のものに戻す。取り消すと U3 の状態に戻り、U3 の試験が全部通る（NFR8.3） |
| 新旧の同居 | どの workflow も門を呼ばないので、統合しても CI の挙動は変わらない（NFR8.5）。例外も動作も無い入力の出力は U3 と同じ（NFR8.1） |
| 失敗した時 | 独立の監査で BLOCK なら、作者が直して新しい head を出し、監査を再依頼する。回数と手順は採択された監査の手順に従い、この記録は回数を決めない。古い依頼や結果を流用しない |

## 確かめの記録

| 記録 | 置き場 |
|---|---|
| Red と Green の commit | PR の履歴 |
| 試験の観測値（実行数・合格数・失敗数・skip 数） | Build and Test の記録 |
| 網羅率の突き合わせ | U3 で決めた置き場に従う |
| golden の比較、base との SHA-256 の突き合わせ | Build and Test の記録 |
| 単位の AI-DLC の記録 | 単位の PR（`construction/u4-thresholds-and-modes/` の設計・計画・試験・追跡表。`audit/` と `.aidlc-engine/` は含めない） |

## Assumptions & Open Questions

### Assumptions

- [assumption] 追加・変更の file は既存の CI の必須検査で判定される。必須検査の一覧を変えない（保護対象）。
- [assumption] この単位の変更の行数は 100 行を超える見込み（新規 2 file とその試験）なので、小さい変更の軽い道には当たらず、今の道で作る。

### Open Questions

1. 設計の PR を先に出すか（上の段 7）と、リスクの区分（R2 か R3 以上か）。この単位は workflow・必須検査・DB・資格情報・本番・料金・契約 `.v2` には触れないが、入力の契約の項目と、閾値を下げる道というセキュリティの設計を持つ。保護対象の許可ではなく、扱いの確認として arc に伺う。コード生成は U3 の統合まで入らない。
