# 見つかったハードな決まり（Discovered Rules）

状態: 確定（面談の Q6 と要約の確認で Owner が確認）。どれも記録の中で人が書いた決まりで、今の運用でも守っている。

## Mandated

- ALWAYS PR の本文に `json sds-pr` のブロックを 1 個置き、`risk:R0`〜`risk:R4` の label を 1 つ付ける（`kit/instructions-block.md`）
- ALWAYS 検査は、読めない・壊れている時に失敗にする（fail closed）（README「Every check fails closed」、Shirube 開発規格 S8）

## Forbidden

- NEVER 作る人が自分の作業を監査・承認・統合する（`kit/instructions-block.md`）
- NEVER 検査の閾値を緩める変更を、同じ PR で行う（README「never a threshold loosened in the same PR」）
- NEVER `scripts/hygiene` の検査に、実行時の npm 依存を足す（`.shirube/hygiene-profile.md`、`.dependency-cruiser.cjs`）
