# 部品の置き場と失敗の広がり（Logical Components）— U1 u1-skeleton

出典: 部品の一覧（`inception/domain-design/components.md`）、U1 の設計（`construction/u1-skeleton/functional-design/functional-spec.md` の置き場の block）、この段の答え（`nfr-design-questions.md`、Q6 を含む）、大きさの見積もり（`construction/u1-skeleton/nfr-requirements/tech-stack-decisions.md`）、作る順番（`inception/delivery-planning/bolt-plan.md` の B1）。

## 部品と置き場

| 部品 | 置き場 | 動く所 | 書き込む物 |
|------|--------|--------|------------|
| SdsGate（門） | `scripts/sds/gate.mjs` | 門の呼出しの workflow（`.github/workflows/sds-gate-self.yml`、固定 commit の再利用 workflow） | commit status 1 つ |
| RecordBridge（記録の橋） | `scripts/sds/record-bridge.mjs` | 門の中から呼ばれる | なし |
| ApprovalRecordWriter（承認の記録の作り手） | `scripts/sds/approval-record.mjs` | 席の作業場の CLI | 作業場の file だけ |
| 時間の上限と予算 | `scripts/sds/budget.mjs` | 門・記録の橋・計測から使われる | なし |
| MetricsCore・MetricsCollector（計測） | `scripts/sds/metrics/**` | `ci.yml` の計測の job（U1 の確かめ）、後に W2 の道具 | なし（標準出力だけ） |
| KitCli（配布キット、自己用の書く先） | `scripts/sds/kit.mjs` | 席の作業場の CLI | target の checkout の file だけ（shirube では `sds-gate-self.yml`、再利用 workflow は書かない） |
| shirube の pin | `.shirube/sds-pin.json` | 門が base から読む | — |

## 失敗の広がり（どこまで影響するか）

| 失敗 | 広がる範囲 | 止め方 |
|------|------------|--------|
| 門の 1 回の失敗 | その PR の status だけ。記録だけの段なので統合は止まらない | 作者が workflow を再実行 |
| 記録の橋が、段の順の記録か承認の記録を見つけられない・壊れている | その PR の記録の判定だけ（FAIL、記録だけの段では止めない） | 承認の記録の PR（A）を作り直す |
| 記録の橋が GitHub を読めない・時間切れ | その PR の記録の判定だけ（「観測できず」） | 作者が workflow を再実行 |
| 計測で 1 つの repo が読めない | その repo の件数だけ（「観測できず」、partial） | 次の回で測り直す |
| 計測の全体の予算切れ | 読み終えていない repo（「観測できず」） | 予算の値を `budget.mjs` で見直す（B2 の実測から） |

## PR ごとの置き方（NFR6.1・NFR7.1、Q6・Q9、監査の指摘 BF-04）

見積もりは `tech-stack-decisions.md` の「大きさの見積もり」（幅つき、実装の実測ではない）。U1 は保護面の 1 本と実装の PR 4 本まで（Units Generation の Q8）、順は P1 → R → I1 → A → I2 → I3 → K → I4（Delivery Planning の Q10〜Q12）。

| PR | 部品 | file | 追加行（見込み） | own-code の増分 |
|----|------|------|------------------|-----------------|
| P1 保護面の 1 本（手で組む） | 門の呼出し・pin・CI | `.github/workflows/sds-gate-self.yml`・`.github/workflows/ci.yml`（網羅率の床と計測の job。網羅率を測る job は Node 26）・`.shirube/sds-pin.json`・`.shirube/hygiene-profile.md`（`exclude_generated` と own-code の予算）・AI-DLC の自己適用の file・`.gitignore` | 約 380 | 約 50 |
| I1 実装 1 | ApprovalRecordWriter | `scripts/sds/approval-record.mjs`・その試験 | 約 270〜340 | 約 180〜230 |
| I2 実装 2 | KitCli の自己用の書く先、時間の上限と予算 | `scripts/sds/kit.mjs`・`scripts/sds/budget.mjs`・`docs/sds/distribution.md`（数えない）・その試験 | 約 110〜140 | 約 35〜55 |
| I3 実装 3 | RecordBridge、SdsGate の記録の判定 | `scripts/sds/record-bridge.mjs`・`scripts/sds/gate.mjs`・その試験 | 約 350〜400 | 約 170〜230 |
| I4 実装 4 | MetricsCore・MetricsCollector | `scripts/sds/metrics/**`・その試験 | 約 290〜350 | 約 135〜185 |

- R（記録の PR）・A（承認の記録の PR）・K（kit の版上げの PR）は Unit を指さないので、この表に入れない。K は I3 の後に shirube の pin を上げ、kit が書く 3 つの file を入れる（約 110〜115 行・5 file）。I4 は K の後の門で判定される（Delivery Planning の Q11・Q12）。
- どの PR も、見積もりの上の端で 400 行・20 file の中に収まる（I3 の上の端がちょうど 400 行）。`budget.mjs` は、それを使う記録の橋と門（I3）より前の I2 に置く。
- 各部品は 1 つの PR の中で、試験が先・実装が後の順に作る（`team.md` の Testing Posture）。1 本が 400 行・20 file を超える見込みになった時は、Code Generation の計画で試験と実装の分け方を見直す。U1 の PR の数は変えない。
- 新しい file は 300 行、関数は 50 行・複雑さ 10 まで（`team.md` の Code Style）。`gate.mjs`（今 143 行）と `kit.mjs`（今 176 行）は、足した後も 300 行の中に収める。
- own-code の予算は、P1 で S1 全体の見積もりを添えて 1 回だけ改める（NFR6.1）。
- kit が shirube に書く 3 つの file（sds-audit の skill・PR の雛形・`AGENTS.md`）は、K で入る（Delivery Planning の Q11）。

## 共有する物

- 時間の上限と予算の値（`budget.mjs`）だけを、門・記録の橋・計測が共有する。値を変える時はここだけを変える。
- 形の読み方（PR の block、監査の返却）は、門の部品の物を計測も使う（ADR-009）。
