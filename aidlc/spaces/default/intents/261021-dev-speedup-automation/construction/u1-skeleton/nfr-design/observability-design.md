# 見え方の作り方（Observability Design）— U1 u1-skeleton

出典: U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/observability-requirements.md`）、受け渡しの形（`inception/contract-design/contract-summary.md` の C3・C4）。

## 門（NFR1.3）

- 門は、判定ごとの id・verdict・mode・reasons を並べた `sds-gate-result/1` の 1 行の JSON を、成功でも失敗でも標準出力に出す。workflow の log に残る。
- commit status `sds-gate` の説明文には、全体の verdict と、FAIL の判定の id を短く入れる（140 文字まで）。理由の全文は log の行で読む。

## 計測（NFR11.1）

- 計測の出力は `sds-metrics/1` の最小の欄の 1 行の JSON。
  - 件数: PASS・FAIL・観測できず・PR の件数
  - 期間と、測った時刻
  - repos: repo ごとの state と理由
  - partial
- U1 の確かめでは、`ci.yml` の計測の job の log に、この 1 行が残る。

## 指標と目標（U1 の範囲）

| 指標 | 見る所 | 目標（U1） |
|------|--------|------------|
| 門の結果が log に 1 行だけ出た PR の割合 | 計測の出力の件数（観測できず ÷ PR の件数） | 門の呼出しが入った後の PR で、観測できず 0 |
| 記録の判定の FAIL の件数 | 計測の出力の FAIL | 記録だけの段なので目標は置かない。FAIL ごとに監査の席が分類する（U2 で数える） |

## 足さない物

- 失敗の通知（Issue への書込みなど）は足さない。
