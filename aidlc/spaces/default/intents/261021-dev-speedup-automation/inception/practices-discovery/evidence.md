# 根拠（Evidence）

状態: 確定（面談と要約の確認の後）。

## 調べたもの

| 参加者 | 調べたもの | 読み取ったこと |
|--------|------------|----------------|
| 進め方の担当（この会話で実施） | `git log`（直近 40 件の merge と 30 件の commit） | 席ごとの branch 名、merge commit での統合、commit の文の形（`docs:`・`feat:`・`fix:` と日本語の説明） |
| 同上 | `.github/workflows/ci.yml`、`hygiene.yml`、`sds-gate.yml` | CI の段（試験・予算・hygiene）、門の呼ばれ方 |
| 同上 | `.shirube/hygiene-profile.md`、`configs/`、`.dependency-cruiser.cjs` | 上限の値、依存の決まり |
| 同上 | `kit/instructions-block.md`、`templates/PULL_REQUEST_TEMPLATE.md`、README | PR の決まり、分離、fail closed、閾値を緩めない決まり |
| 同上 | `aidlc/spaces/default/codekb/shirube/` の code-structure.md・technology-stack.md・dependencies.md・code-quality-assessment.md・architecture.md・business-overview.md | 構成、技術、試験の状態（網羅率の測定なし） |
| 同上 | `docs/process/audit-items/pr34-u2-red.json`、`pr34-u2-green.json`（file 名） | 失敗する試験の PR と通す PR が分かれた例 |

別の作業者（品質・開発・セキュリティ）による見直しは、この段の設定で行っていない（この会話で実行、協力者なし）。

## 面談で決めたこと

| 問い | 決定 | 出どころ |
|------|------|----------|
| Q1 統合の仕方 | 今のまま（席ごとの branch → PR → merge commit、作者と別の席が監査 PASS の後に統合） | arc の下書きを要約の確認で Owner が確認 |
| Q2 端から端まで通る細い版 | 作る | arc の下書きを要約の確認で Owner が確認 |
| Q3 試験と実装の順番 | 試験が先（tdd） | arc の下書きを要約の確認で Owner が確認 |
| Q4 行の網羅率 | 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない（面談の答え「記録だけ」は、Owner の決定 iyasaka-arc#49 6336689921 で置き換えた） | Owner の答えと、その後の Owner の決定 |
| Q5 配布の仕方 | commit 固定 + kit の PR。キットの版上げ PR は監査 PASS 後に各 repo の統合担当（iyasaka-arc#49 6308341298）。その他の保護面は Owner の exact-head | arc の下書きを要約の確認で Owner が確認 |
| Q6 ハードな決まり | A〜E の 5 つ | arc の下書きを要約の確認で Owner が確認 |

## 残る不確かさ

- 網羅率の検査を CI に足す変更は workflow の変更なので、保護面として Owner の exact-head が要る。いつ足すかは、この取り組みの作業単位の計画で決める。
- 今の網羅率の値は未測定。80% の床に届くかは、測ってみるまで分からない。
