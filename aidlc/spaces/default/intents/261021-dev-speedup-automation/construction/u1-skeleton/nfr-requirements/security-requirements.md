# 安全の決まり（Security）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR4・NFR9・NFR10）、チームの決まり（Shirube 開発規格 S9、`inception/practices-discovery/team-practices.md`）、U1 の設計（`construction/u1-skeleton/functional-design/rules.md` の BR3.1・BR5.4・BR6.5・BR7.1）、この段の答え（`nfr-requirements-questions.md` の Q2）。

## 資格情報

| ID | 決まり | 確かめ方 |
|----|--------|----------|
| NFR10.1 | 門は、その job の GITHUB_TOKEN だけを使い、権限を commit status の書込みと、contents・actions・pull-requests・issues・checks の読取りに絞る（issues・checks は、判定 3 が監査の依頼と返却の comment と CI の結果を読むため。Infrastructure Design の Q1 で足した） | 門の呼出しの workflow の permissions の一覧 |
| NFR10.2 | 計測は、3 repo の contents・actions・pull-requests・commit status を読むだけの専用の資格情報で動かし、書ける資格情報を渡さない。専用の資格情報を作るのは token の発行で保護面なので、作る時に Owner の決定を取る | 計測を動かす経路が受け取る資格情報の一覧と、その権限 |
| NFR10.3 | 専用の資格情報ができるまでの U1 の確かめは、shirube の Actions の中（既存の `ci.yml` の job）で、読取りだけに絞った GITHUB_TOKEN で shirube 自身を測る | その job の permissions が読取りだけであること |
| NFR10.4 | 承認の記録の作り手は push も統合もしない。作業場に file を書くだけ | 作り手が GitHub に書く経路を持たないこと |

この Mac の席の gh の認証は、repo への書込みの scope を持っています（arc が scope の名前だけを確かめた）。計測をその認証で動かしてはいけません。

## 承認の偽装を防ぐ

| ID | 決まり | 確かめ方 |
|----|--------|----------|
| NFR4.1 | 門は PR の head のコードを使わず、固定した shirube の commit から動く | 門の workflow が checkout する commit |
| NFR4.2 | 承認の記録は PR の base（main）からだけ読む。PR の中で足した承認の記録では通らない | head にだけ承認の記録を足した PR が FAIL になる試験 |

S1 では承認の本人確認を機械で見ません（`identity_check: none`）。偽装は独立監査と GitHub の履歴で見ます。

## 個人情報

| ID | 決まり | 確かめ方 |
|----|--------|----------|
| NFR9.1 | 門と計測が読むのは、PR・label・commit status・Actions の log・監査の返却・承認の記録などの開発の記録だけ。製品のデータは読まない | 読む API の一覧 |
