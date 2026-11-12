# U3 u3-node-gate-slice — 配送の流れ（cicd-pipeline）

この単位は workflow を変えず、新しい action・service・秘密を足さない。既存の PR の流れ（CI、独立監査、受領、作者以外の統合）に乗る。ここでは、この単位の変更が通る段と門、戻し方、権限を書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 設計: [infrastructure-specification.md](./infrastructure-specification.md)、[monitoring-design.md](./monitoring-design.md)、[reliability-design.md](../nfr-design/reliability-design.md)（RL8）、[security-design.md](../nfr-design/security-design.md)（SC1・SC8）。基準の観測は infrastructure-specification.md の Sources と同じ実物（`ci.yml` blob `6ee7b6c3f078285bfd1c65812c1a42b4aabd6310`）。
- 守る物: 社内の `protected-surface-owner-gate.md`（workflow・必須検査・branch protection は Owner の決定が要る）、`aidlc-only.md`（1 単位 = 1 PR、独立監査、作者以外の統合）。

## 流れ

| 段 | 内容 | 門（通らなければ進まない） |
|---|---|---|
| 1 作る（TDD） | 部品ごとに Red（失敗する試験）を先に書いて失敗を確かめ、Green（実装）で通す。別々の commit にする | Red が実際に失敗した記録 |
| 2 手元の確かめ | `npm test`（既存の試験 + 追加の試験）、既存の構造の検査（ESLint、dependency-cruiser、knip、jscpd）、OWN-01 | 失敗 0、skip 0。当たる検査は PR に理由を書く |
| 3 網羅率の記録 | 門自身を `scripts/coverage-gate/`（directory の宣言）に向けた 1 回の実行の結果と、組込みの lcov の別計算を突き合わせる（OB5） | 100%、2 つの値が一致、対象が 0 件でない |
| 4 逆向きの確かめ | 足した file を除いた木で既存の `npm test` を流し、base の実物と SHA-256 を突き合わせる（RL8） | 既存の試験が通り、一致 |
| 5 PR | 単位の変更だけで PR（`json sds-pr` と `risk` の label 1 つ）。リスクの区分は計画で確定する（Open Question 1） | 既存の CI の必須検査が通る |
| 6 設計の確認 | この単位は入力・結果の JSON の版 1（契約）と、子の環境・出力の無害化（セキュリティ）の設計を持つので、守る物（契約・セキュリティ）に触れる単位として扱う見込み。その場合は、設計の記録だけの PR を先に出し、設計監査の PASS の後に code を書く（team.md、aidlc-only §2）。扱いの確定は計画の前に arc へ確かめる | 設計監査の PASS（該当する場合） |
| 7 独立の監査 | 作者が `sds-audit-request/1` を対象の PR に投稿し、前検査を通して、devauditor の返却を待つ | PASS と作者の受領 |
| 8 統合 | 作者以外の席（suite-lead）が、統合の merge commit で統合する（squash しない） | 返却・受領・必須検査がそろう |

- 自動の配布はこの単位に無い。展開（deploy）も無い。統合された後の配線は U7、運用の手引きは U8。

## 権限と秘密

| 項目 | 内容 |
|---|---|
| 新しい秘密 | 足さない。門は秘密を読まず、子の試験には許可した名前の一覧だけを渡し、資格情報を渡さない（SC1） |
| workflow の権限 | 変更しない（この単位は workflow を変えない）。門を呼ぶ job の権限の最小化（読みだけの資格情報にする、fork の code を権限のある文脈で走らせない）は U7 が受ける（SC8）。保護対象のため Owner の決定が要る |
| 新しい外部の action・service | 足さない（NFR6.3） |
| 保護対象 | この単位は触れない: workflow、必須検査、branch protection、DB の構造、資格情報、本番、料金、契約 `.v2` |

## 戻し方と段階

| 項目 | 内容 |
|---|---|
| 戻し方 | 足した file（`scripts/coverage-gate/`、`tests/coverage-gate-*`）を取り除く。追加のみなので、取り除くと base の状態に戻り、既存の試験が通る（NFR8.2） |
| 新旧の同居 | どの workflow も門を呼ばないので、統合しても CI の挙動は変わらない（NFR8.4）。後の単位が入力・結果の JSON に項目を足す時は追加の順（NFR8.3） |
| 失敗した時 | 独立の監査で BLOCK なら、作者が直して新しい head を出し、監査を再依頼する。再依頼の回数と手順は、採択された監査の手順（audit-method §2.6）に従い、この記録は回数を決めない（設計監査 round 1 の観測 O04）。古い依頼や結果を流用しない |

## 確かめの記録

| 記録 | 置き場 |
|---|---|
| Red と Green の commit | PR の履歴 |
| 試験の観測値（実行数・合格数・失敗数・skip 数） | Build and Test の記録 |
| 網羅率の突き合わせ | OB5（置き場はコード生成の計画で決める） |
| base との SHA-256 の突き合わせ | Build and Test の記録 |
| 単位の AI-DLC の記録 | 単位の PR（`construction/u3-node-gate-slice/` の設計・計画・試験・追跡表。`audit/` と `.aidlc-engine/` は含めない） |

## Assumptions & Open Questions

### Assumptions

- [assumption] 追加の file は既存の CI の必須検査で判定される。必須検査の一覧を変えない（保護対象）。
- [assumption] この単位は 100 行を超えるので、小さい変更の軽い道（aidlc-only §1）には当たらず、今の道で作る。

### Open Questions

1. 設計の PR を先に出すか（上の段 6）と、リスクの区分（R2 か R3 以上か）。この単位は workflow・必須検査・DB・資格情報・本番・料金・契約 `.v2` には触れないが、新しい入力・結果の契約（版 1）とセキュリティの設計を持つ。R3 以上なら Owner の対象 head の決定が要る。どちらも判断を要するので、Code Generation の計画の前に arc に確かめる（arc-73 経由。保護対象の許可ではなく、扱いの確認）。
