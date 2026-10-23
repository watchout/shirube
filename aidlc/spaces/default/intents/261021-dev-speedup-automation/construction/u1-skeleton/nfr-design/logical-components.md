# 部品の置き場と失敗の広がり（Logical Components）— U1 u1-skeleton

出典: 部品の一覧（`inception/domain-design/components.md`）、U1 の設計（`construction/u1-skeleton/functional-design/functional-spec.md` の置き場の block）、この段の答え（`nfr-design-questions.md`）。

## 部品と置き場

| 部品 | 置き場 | 動く所 | 書き込む物 |
|------|--------|--------|------------|
| SdsGate（門） | `scripts/sds/gate.mjs` | 門の呼出しの workflow（`.github/workflows/sds-gate-self.yml`、固定 commit の再利用 workflow） | commit status 1 つ |
| RecordBridge（記録の橋） | `scripts/sds/record-bridge.mjs` | 門の中から呼ばれる | なし |
| ApprovalRecordWriter（承認の記録の作り手） | `scripts/sds/approval-record.mjs` | 席の作業場の CLI | 作業場の file だけ |
| 時間の上限と予算 | `scripts/sds/budget.mjs` | 門・記録の橋・計測から使われる | なし |
| MetricsCore・MetricsCollector（計測） | `scripts/sds/metrics/**` | `ci.yml` の計測の job（U1 の確かめ）、後に W2 の道具 | なし（標準出力だけ） |
| shirube の pin | `.shirube/sds-pin.json` | 門が base から読む | — |

## 失敗の広がり（どこまで影響するか）

| 失敗 | 広がる範囲 | 止め方 |
|------|------------|--------|
| 門の 1 回の失敗 | その PR の status だけ。記録だけの段なので統合は止まらない | 作者が workflow を再実行 |
| 記録の橋が記録を読めない | その PR の記録の判定だけ（「観測できず」） | 記録を入れる PR を直す |
| 計測で 1 つの repo が読めない | その repo の件数だけ（「観測できず」、partial） | 次の回で測り直す |
| 計測の全体の予算切れ | 読み終えていない repo（「観測できず」） | 予算の値を `budget.mjs` で見直す（B2 の実測から） |

## 共有する物

- 時間の上限と予算の値（`budget.mjs`）だけを、門・記録の橋・計測が共有する。値を変える時はここだけを変える。
- 形の読み方（PR の block、監査の返却）は、門の部品の物を計測も使う（ADR-009）。
