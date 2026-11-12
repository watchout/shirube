# U1 u1-ci-concurrency — 設計PRの承認の読み戻し

## Scope and Limits

対象は `261110-shared-coverage-gate / u1-ci-concurrency` の設計記録だけのPR。本書は、AI-DLCの正式な履歴（読み取り専用の照会）から種類・対象・固定の選択値・記録時刻だけを整理した写しであり、新しい承認の発行者・署名・証明ではない。人の返信本文、席の間の通知、個別環境の情報は写していない。

次の点を混同しない。

- 下の段の承認は、**arc の答え**（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830）で記録されたもので、Owner 本人の言葉ではない。委任は保護対象（workflow・必須検査・DB構造・資格情報・本番・料金・契約 .v2）と R3・R4 の対象 head への Owner の承認を含まない。
- この取り組みでは見直し役（AI-DLC の reviewer）を使っていない。Owner の決定（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125 ）で、この作業場の見直しの区分は `none`。見直し済みと読まない。
- 計画の承認（Approve Plan）はこの作業で `off` の設定のため、計画の承認の記録は無い。計画は `code-generation/code-generation-plan.md`、試験の手順は `code-generation/unit-test-instructions.md` にある。計画の承認が無いことを、製品の変更を始める許可にしない。
- 要約の確認（Consolidated Summary Confirmation）も `off` で、記録は無い。
- U1 の NFR Requirements・NFR Design・Infrastructure Design・Code Generation（計画まで）は、単位の段として gate を持たない。段の完了の承認を人から得たものとして扱わない。NFR Requirements・NFR Design・Infrastructure Design は設計監査 round 1 の指摘で開き直して直し、単位の受領を取り直した（下の「設計監査 round 1 の差し戻しと直し」）。

## 段の完了の承認（種類: stage-completion、選択: Approve）

| stage | 記録時刻 |
|---|---|
| intent-capture | 2026-11-10T06:50:19Z |
| feasibility | 2026-11-11T08:45:29Z |
| scope-definition | 2026-11-11T08:50:06Z |
| team-formation | 2026-11-11T08:54:10Z |
| approval-handoff | 2026-11-11T08:58:27Z |
| reverse-engineering | 2026-11-12T00:49:49Z |
| practices-discovery | 2026-11-12T00:55:29Z |
| requirements-analysis | 2026-11-12T01:35:48Z |
| user-stories | 2026-11-12T01:42:23Z |
| domain-design | 2026-11-12T01:48:19Z |
| units-generation | 2026-11-12T01:54:45Z |
| contract-design | 2026-11-12T02:00:06Z |
| delivery-planning | 2026-11-12T02:33:15Z |

Scope Definition の承認では、kit の `sds-gate` の起動の絞り（U2）と Shirube の `ci` の concurrency（この U1）を範囲に入れる指示（Owner の決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810 ）が、arc の答えに添えて引き継がれている。本書はその決定の本文を写さない。

## 文書の検査

U1 の NFR Requirements・NFR Design・Infrastructure Design の各 `traceability.json` は、上流の要件・NFR の全項目に OK を対応付けている。これは文書の対応表であって、製品の試験・実際の CI での動作・統合の合格ではない。未実施: 試験の実行（Red・Green）、`ci.yml` の変更、PR 自身の Actions の実行での取り消しの観測、実装の独立監査、Owner の対象 head の承認、統合。

## 設計監査 round 1 の差し戻しと直し

- 返却（BLOCK、round 1、10 項目中 PASS 7・FAIL 3）: https://github.com/watchout/shirube/pull/102#issuecomment-6813817096 （本文 SHA-256 `39f77f935d99f85f4505bf7cd1f2c35c916c1d689fbe61cddf4995e06d9cf1ce`）。BLOCK への作者の記録は機械の受領ではない（固定の checker は BLOCK の返却に BLOCKED を返す）。
- 指摘 F01（起きやすさ 高 × 困る大きさ 中）: 設計・計画が、権限なし・job 2 本・Node 22 の古い `ci.yml` を現状としていた。基準コミット `7e775afd5b755e51e55e269d8dc35b09d180c33e` の実物（SHA-256 `1e3f42c895dccd23b4b00017da6171488729d092af435cdc11cb85018b861c8a`）は、起動 3 つ・最上位 `permissions: {}`・job `test`・`hygiene`・`measure`・`test` の Node 26 と `scripts/**` 全体 80% の床を持つ。
- 原因: 作業場の木が `origin/main` より古く（`ci.yml` の SHA-256 が基準と違った）、その木と共有の CodeKB を基準として読んだ。
- 直し（承認済みの段を開き直して直した。承認済みの記録を黙って書き換えていない）: NFR Requirements・NFR Design・Infrastructure Design の「現状の観測」と、NFR1.1・NFR5.1・NFR8.1〜8.3、`concurrency:` の置き場（`permissions: {}` の直後）、負例 N4・逆向き・同居、SD5〜SD7、設計 7（「現在の `ci.yml`」の記述を基準の bytes と機械で突き合わせる。12 件を確かめ 12 件 HOLDS、0 件 DOES_NOT_HOLD）、コード生成の計画の Summary・Step 1・2・3（T1・T2・T5・T7・T8）・4、試験の手順、設計監査の項目集合の U1CC-02・04・05・06・08。
- 注意（直していない記録）: 承認済みの前の段の記録にも、同じ古い木から来た「CI は Node 22」の記述がある（ideation の feasibility-assessment・constraint-register T2、inception の developer-scan、requirements-analysis-questions の Q7 の背景）。基準の実物では `test` と `measure` が Node 26、`hygiene` が 22 を渡す。これらは承認済みの記録なので黙って書き換えず、この単位（U1）の基準には使わない。Node の版の保証を決める U3 の設計の前に、段を開き直して直すか注記で足すかを、arc 経由で伺う。
- 再依頼の前の確かめ: 記録の「現在の `ci.yml`」の記述を、基準の bytes と機械で突き合わせた結果が全件 HOLDS であること。

## 公開の範囲

- 含めた記録: 同じ取り組みの必要な Ideation・Inception の記録と、U1 の NFR・配置の設計、コード生成の計画と試験の手順、確認コマンドの記録、設計監査の項目集合（`docs/audit/u1-ci-concurrency-design.json`）。
- 除外した記録: AI-DLC の `audit/` と `.aidlc-engine/`、段ごとの日記（`memory.md`）、state・cursor・runtime graph、取り組みの初期の説明（`project-description.json`）と、それをそのまま含む最初の問い（`intent-capture-questions.md`）。後者の2つは、非公開の土台の名前と手元の path を含むため公開しない。初期の説明の要点は `intent-statement.md` と `scope-document.md` に一般化して書かれている。
- 共有の memory・CodeKB は、この PR の差分に入れない。公開 main の既存の内容を上書きしない。
