# 基盤の仕様（Infrastructure Specification）— U1 u1-skeleton

出典:
- U1 の NFR の作り方: `construction/u1-skeleton/nfr-design/`
- U1 の NFR の決まり: `construction/u1-skeleton/nfr-requirements/`
- U1 の設計: `construction/u1-skeleton/functional-design/`
- 受け渡しの形: `inception/contract-design/contract-summary.md`
- 部品の一覧: `inception/domain-design/components.md`
- この段の答え: `infrastructure-design-questions.md`（Q1〜Q7）
- 作る順番の計画: `inception/delivery-planning/bolt-plan.md` の B1（Delivery Planning の Q10・Q11）

U1 の基盤は GitHub Actions だけです。クラウドの資源・DB・常駐する部品は使いません。

## 動かし方

| 項目 | 選んだ物 | 理由 |
|------|----------|------|
| 動く所 | GitHub Actions（GitHub が用意する Ubuntu の runner） | 仕組みを動かす場所は GitHub とこの Mac の席だけ（制約 CT-2） |
| 門の呼出し | `.github/workflows/sds-gate-self.yml`。kit の部品（`kit/sds-gate-caller.yml`）と同じ中身で、`pull_request_target` と `issue_comment` で動き、固定した shirube の commit の再利用 workflow `sds-gate.yml` を呼ぶ。P1 では手で組み（今の kit は shirube の再利用 workflow を上書きする）、K からは kit の自己用の書く先が書く | 配布先と同じ形で、配る物が効くことを shirube 自身で確かめる（Q1、S1-SH-06、Q4・Q5） |
| 試験と網羅率 | `ci.yml` の今の試験の step を、`node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs` に替える（`npm ci` の後）。この job の `node-version` は "26"（`--test-coverage-include-all` は Node 26.7.0 から）。PR と main への push で動く | 行の網羅率 80% の床を、`scripts/**` の全部（試験が読まない file も 0%）で統合の前に CI で確かめる（NFR8.2、iyasaka-arc#49 6336689921、NFR Design の Q5・Q8、Q4・Q8。監査の指摘 BF-07） |
| 計測（U1 の確かめ） | `ci.yml` に計測の job を足す。main への push と手動（workflow_dispatch）で動く。期間は引数、既定は直近 30 日、対象は shirube | 計測は期間の値を出す物で、main の状態で決まる（Q3） |
| pin | `.shirube/sds-pin.json`。`sds_commit` に固定する shirube の commit（P1 では U1 の前の main）、`plan_binding_mode` と `design_binding_mode` は記録だけ（report-only）、保護面の path は既定のまま | 門は固定した commit から動く（NFR4.1） |
| 版上げ | kit の版上げの PR で pin を上げる。差分がキットの file だけ・kit check OK・上げる先が監査済みの main なら、監査 PASS の後に統合の担当が統合する。U1 の最初の版上げは門の判定（I3）の後の K で、pin を I3 の後の main に上げ、kit が書く 3 つの file も入れる。K は「最初の導入」ではなく「版上げ」 | 決まり iyasaka-arc#49 6308341298（Q2・Q5・Q8）。I4 を新しい門で判定させるため（Delivery Planning の Q11・Q12） |
| 実装の席の作業場 | U1 の Code Generation は、shirube の実装の席をこの Owner の作業場（`~/Developer/aidlc-owner/shirube`）で起動し、同じ作業場で `/aidlc --resume` して回す | audit を 1 つの作業場に保ち、段の順の記録に Code Generation の行を載せる（Q7、iyasaka-arc#49 6353826462） |
| 環境 | 1 つ（shirube の main）。本番・staging の区別は無い | 本番の展開は無い（`team-practices.md` の Deployment） |
| 基盤のコード | workflow の YAML と pin の JSON を repo に置く。変更はすべて保護面の PR で、Owner の exact-head を通す | 保護面（iyasaka-arc#36） |

## 使う外の仕組み

| 仕組み | 役割 | 設定 | 注意 |
|--------|------|------|------|
| GitHub Actions | 門と CI と計測を動かす | runner は GitHub の用意する物。job の時間の上限は、門 5 分・計測 10 分の予算（`scripts/sds/budget.mjs`）より長くしておく | 予算は script の中で守る |
| GitHub API | PR・label・status・log・comment・contents を読む。門は commit status を 1 つ書く | job の GITHUB_TOKEN（下の権限） | 自動の再試行はしない |
| Actions の log | 門の 1 行の JSON（`sds-gate-result/1`）の置き場 | 保持期間は repo の今の設定のまま | 期間を過ぎた PR は「観測できず」 |

## 権限

| workflow・job | 権限 | 決まり |
|---------------|------|--------|
| `sds-gate-self.yml`（job 1 つ、一番上に置く） | statuses: write、contents・pull-requests・issues・actions・checks: read | NFR10.1 |
| `ci.yml`（一番上は `permissions: {}`） | 試験の job: contents: read。計測の job: contents・actions・pull-requests・statuses: read | NFR10.3 |

## 共有する物

U1 の基盤は shirube だけで閉じ、ほかの Unit と共有する資源はありません。配布先（aun・onza）への門の呼出しは、U6・U7 で同じ kit の部品から入れます。
