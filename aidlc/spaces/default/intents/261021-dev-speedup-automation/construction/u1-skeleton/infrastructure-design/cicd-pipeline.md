# 統合までの流れ（CI/CD Pipeline）— U1 u1-skeleton

出典: チームの進め方（`inception/practices-discovery/team-practices.md`）、作る順番の計画（`inception/delivery-planning/bolt-plan.md` の B1）、U1 の基盤の仕様（`infrastructure-specification.md`）、この段の答え（`infrastructure-design-questions.md`）。

本番への展開はありません。「出す」とは、main に統合することです。

## U1 の PR の順

1. **記録を入れる PR**（承認の記録と AI-DLC の記録）。shirube の席が作り、devauditor が監査し、suite-lead が統合する。
2. **保護面の PR**（R4）。中身は次の 3 つ。shirube の席が作り、devauditor が監査し、Owner の exact-head 1 回の後に suite-lead が統合する。
   - `sds-gate-self.yml`
   - `.shirube/sds-pin.json`（記録だけ）
   - `ci.yml`（網羅率の床・計測の job）
   - この 1 回に、監査の席の分類の役の決定（FR5.4）もまとめる。
3. **U1 の残りの実装の PR**（門の記録の欄・記録の橋・作り手・計測）。試験が先で、R2 の監査を通す。この PR で、門が動き、log に 1 行の JSON が出ることを確かめる（細い版の確かめ）。

## 段と門

| 段 | 何が動くか | 止める物 |
|----|------------|----------|
| PR を開く・更新する | `ci.yml` の試験（網羅率の床つき）、hygiene、own-code の予算、`sds-gate-self.yml`（門） | CI の失敗は統合を止める。門は記録だけで止めない |
| 監査 | devauditor の監査の返却（`sds-audit-review/1`） | R2 以上は監査 PASS が要る（統合の担当が確かめる） |
| 統合 | suite-lead（作者と別の席） | R3・R4 は Owner の exact-head が要る |
| main への push | `ci.yml` の試験と計測の job | 計測の job の失敗は統合済みの物を戻さない（次の回で測り直す） |

## 戻し方

- 門の呼出しや pin が正しい PR を邪魔した時も、記録だけの段なので統合は止まらない。外す時は、保護面の PR（revert）を出し、Owner の exact-head を通す。
- 網羅率の床で CI が失敗した時は、試験を足して床を満たす。床の値を下げない（Build and Test の段でも弱めない）。

## 資格情報

- 門と CI と計測は、job の GITHUB_TOKEN だけを使う。権限は `infrastructure-specification.md` の表のとおり。
- 計測の専用の読取りの資格情報は、作る時に Owner の決定を取る（NFR10.2）。U1 では使わない。
- secret を workflow に足さない。
