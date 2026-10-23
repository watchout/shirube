# 安全の作り方（Security Design）— U1 u1-skeleton

出典: U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/security-requirements.md`）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md`）、この段の答え（`nfr-design-questions.md` の Q4）。

## Actions の権限（Q4）

- `ci.yml` は、workflow の一番上の permissions を全部なし（`permissions: {}`）にし、job ごとに要る物だけを足す。計測の job は contents・actions・pull-requests・statuses の読取りだけ（NFR10.3）。
- 門の呼出し（`.github/workflows/sds-gate-self.yml`）は、配布キットの部品（`kit/sds-gate-caller.yml`）と同じ形にする。権限は kit の部品どおり一番上に置く。job が 1 つなので、効き目は job ごとに置くのと同じ。権限は statuses の書込みと、contents・actions・pull-requests・issues・checks の読取り（NFR10.1。Infrastructure Design の Q1 で、この段の記録をこの形に直した）。
- どちらの workflow も保護面で、U1 の保護面の PR で Owner の exact-head を 1 回通す。

```yaml
permissions: {}
jobs:
  measure:
    permissions: { contents: read, actions: read, pull-requests: read, statuses: read }
```

## 計測の専用の資格情報（NFR10.2）

- 専用の読取りの資格情報ができるまでは、この Mac から計測を動かさない。U1 の確かめは `ci.yml` の計測の job で行う。
- 専用の資格情報を作る時は、token の発行の保護面として Owner の決定を取る。B1 の exact-head にまとめられるかは、その時に伺う。

## 承認の偽装を防ぐ（NFR4.1・NFR4.2）

- 門の呼出しは、固定した shirube の commit の再利用 workflow を `pull_request_target` で呼ぶ。PR の head のコードは checkout しない。
- 記録の橋は、承認の記録と状態の記録を、PR の base の commit からだけ読む（API の ref に base の sha を渡す）。

## 書込みの最小化（NFR10.4）

- 承認の記録の作り手は、作業場に file を書くだけで、GitHub の API を呼ばない。

## 個人情報（NFR9.1）

- 門と計測が呼ぶ API は、PR・label・commit status・Actions の log・issue の comment（監査の返却）・repo の contents（記録）だけ。製品のデータの置き場は読まない。
