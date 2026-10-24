# 見え方の決まり（Observability）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR1・NFR10・NFR11）、受け渡しの形（`inception/contract-design/contract-summary.md` の C3・C4）、設計の決定 ADR-003（`inception/domain-design/decisions.md`）、この段の答え（`nfr-requirements-questions.md` の Q4）。

## 何がどこに見えるか

| ID | 決まり | どこに見えるか | 確かめ方 |
|----|--------|----------------|----------|
| NFR1.3 | 門の失敗（exit code 1・2）と、判定ごとの理由を出す | commit status `sds-gate` の説明文と、門の workflow の log の 1 行の JSON（`sds-gate-result/1`） | 負例の PR の status の説明文と log の行 |
| NFR11.1 | 計測の出力には、件数（PASS・FAIL・観測できず）・対象の PR の件数・期間・測った時刻を並べる。一部の repo が読めない時は、repos の欄にその repo と理由、partial = true を出す | 計測の標準出力の 1 行の JSON（`sds-metrics/1` の最小の欄） | 1 repo が読めない試験の入力の出力 |

## 足さない物

- 失敗の時に Issue などへ書く通知は足さない。書込みを最小にする（NFR10）。Owner は計測の結果を #53 で見る（ADR-003、#53 に載せるのは U2 と W2 の道具）。

## 指標の見方（U1 の範囲）

- U1 で見えるのは、門の結果の件数だけ。4 つの指標（時間・手戻り・Owner の手・誤って止めた回数）は U2 で足す。
