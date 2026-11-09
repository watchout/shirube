# Shirube — 明示された制約

Owner が Looks correct と確認した7項目の要約と正式な要約確認記録に基づく Step 5 の最終版。以下は適用中の明示指示と既存の採択から引き継ぐ hard constraints だけであり、観測した実装や一般的な推奨を新しい制約にしていない。段の最終承認と project.md への反映は未実施。各行が project.md に反映されても出典を失わないよう、公開決定を引用する行には control_source_ref の URL と本文 SHA-256 を含める。今回の M-01〜M-13、AUN実証、W-01〜W-03、旧S1の整理、将来メモはこの共通制約の対象ではなく、[evidence.md](evidence.md) と確認済みの質問ファイルで追跡する。要約の確認は保護対象の変更許可ではない。

## Mandated

- ALWAYS 開発を AI-DLC の段・単位・正式な設定・承認済み計画に従って作業場の中で進め、strict・Learnings on と適用される Build and Test・CI・Operation を保つ（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646126384 ; sha256: `d4c48a46139e71880db9d92ae8409c95b21dc0713136d4d07642f87c5a9df502`）。
- ALWAYS 1単位を1つの PR とし、次の単位の Code Generation は前の単位の PR の統合後に始める（既存 team の採択を引継ぎ）。
- ALWAYS 各 PR の独立監査、作者の受領、必須検査、作者以外の suite-lead による統合を通し、保護対象と R3・R4 に必要な Owner の公開決定・対象 head の承認を確認する（既存 team の分担。control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646126384 ; sha256: `d4c48a46139e71880db9d92ae8409c95b21dc0713136d4d07642f87c5a9df502`）。
- ALWAYS DB の構造・権限・契約・セキュリティに触れる単位は、設計記録だけの PR の独立設計監査を通してから Code Generation に入り、同じ PR に実装を足して実装監査を受ける（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 ; sha256: `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`）。
- ALWAYS 単位の PR に必要な AI-DLC の設計・計画・試験・追跡表と既存の採択で必要な承認記録を含め、最初の単位では inception の記録も含める（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 ; sha256: `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`）。
- ALWAYS traceability と upstream-coverage を段の承認前に blocking として適用し、外すのは人の操作だけとする（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 ; sha256: `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`）。
- ALWAYS 既存 team の TDD・Node 組込みの node:test を保持し、行網羅率100%を適用する。計測除外が必要な時は PR に理由を書いて独立監査で確認する（100%の control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6647418162 ; sha256: `4d4a85a99e8778f58c0ee4fccdaa3d5cece3c6efe4305bd11816c0fd8692647d`）。
- ALWAYS S1〜S9、該当する採択済み DB・技術・セキュリティ基準、SEC-T、依存導入前の脆弱性確認、最小権限を維持し、適用・版・証拠・合否を対象の要件と検証へ結び付ける（適用中の技術規格と、control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646144286 ; sha256: `224a607fb07ae0c6c0cb09453882ae369032e0e20537bdafbc924521a8c508cc`）。
- ALWAYS LLM の制御は script・機械・hook による検査や停止と組み合わせる（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6380845765 ; sha256: `5cd75b9904c7cb8a229ba8be55d417d2c56af2eb920ef7f94875c9689fa45501`）。
- ALWAYS Owner 決定を権限として参照する時は control_source_ref の公開コメント URL と本文 SHA-256 を伴わせ、人待ちは一度知らせて停止する（適用中の指示）。
- ALWAYS PR 本文に json sds-pr ブロックを1つ、risk:R0〜risk:R4 のラベルを1つ付け、検査の閾値を通すために弱めない（既存 team/project の採択を引継ぎ）。
- ALWAYS 成功を申告値ではなく対象の実物・公開記録・CI 等の観測から確かめ、各取り組みの承認済み受入条件と対応付ける（適用中の指示 S5、既存の採択）。

## Forbidden

- NEVER 作る人が自分の作業を独立監査・承認・統合したことにする（既存 project の採択を引継ぎ）。
- NEVER 旧道筋や門の判定4・5、退役した独自工程・PR規模/own-code予算を工程・完了の条件として再採用する（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646126384 ; sha256: `d4c48a46139e71880db9d92ae8409c95b21dc0713136d4d07642f87c5a9df502`）。
- NEVER workflow・必須検査・branch protection・DB構造・資格情報・本番・料金・契約.v2 などの保護対象を、草案や段の承認だけで変更する（適用中の保護対象の指示。個別の公開決定に明記された例外の条件・対象を超えて使わない）。
- NEVER PR に audit/・.aidlc-engine/ を含めたり、公開 Shirube に他 repo の非公開記録を写したりする（control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 ; sha256: `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`）。
- NEVER 空欄の新規回答を作る側の判断で埋め、準備の回答・要約確認・段の承認・実装計画の承認・保護対象の許可を混同する（適用中の指示、既存 team）。
- NEVER 見直し役や実装担当への委任を承認された目的・人数・モデル・所有範囲の外へ広げる。段の見直し役には GitHub の書き込み・統合・孫への委任をさせない（適用中の指示と、見直し役の control_source_ref.url: https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 ; sha256: `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462`）。
- NEVER 必須工程や適用される検証の欠落、別対象、古い記録、改変、不一致、未実行、観測不能、timeout、skip を成功へ読み替える。任意工程や正式な適用外は理由と条件を明示し、必須工程の未実行と混同しない（適用中の指示 S5/S8）。
- NEVER 検査の閾値を緩める変更を同じ PR に混ぜたり、scripts/hygiene の検査へ実行時 npm 依存を足したりする（既存 project の採択を引継ぎ）。
- NEVER 一つの取り組みの承認だけで、別の取り組みの承認済み範囲・担当・保留・保護対象の条件を変更する（適用中の権限の指示）。
