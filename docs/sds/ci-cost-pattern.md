# CI の費用を減らす型（CI-COST-REDUCE）

正本の決定: Owner の OD-COMPANY-CI-REDUCE-ALL-EXCESS-20261124-001（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-7124878927 、本文 SHA-256 `941f82244dd39456435e468b388b869ae950fd4b0a2b201123d83beac9e6641c`）と CTO の決め（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-7124863123 、`059d610154b40d5ba472839cd0a9e14815e8c8acf2942f83c53928e9fd86bc4d`）。判定の中身は変えない。変えないもの: コードを変える PR の全試験、main の後の試験、base が動いた時の取り直し、網羅率の床、必須の check の名前と数。

この文書は型を 1 か所に置く。各 repo は写さず、commit を固定して参照する。

## 型の 5 つ

| 削減 | 置き場（1 か所） | 利用側がすること | 機械の確かめ |
|---|---|---|---|
| 1 docs だけの PR は重い試験を飛ばす | `.github/actions/ci-scope/action.yml` と `scripts/ci/scope.mjs` | 自分の job の中の step として呼び、重い step に `if: steps.<id>.outputs.scope == 'code'` を付ける。docs の時に残す短い試験の一覧は repo が持つ | `tests/ci-scope.test.mjs`（空・読めない・奇妙な path・コードの path・push は code） |
| 2 門の検査は印のある comment だけ | `scripts/sds/gate-marks.mjs` と kit の呼び出し側（shirube#119 で入る） | kit の版上げで取り込む | `tests/sds-gate-caller-trigger.test.mjs`（`if:` が検査器の印と一致、前の判定が残る負例） |
| 3 PR の古い試験の実行を次の push で取り消す | 各 `ci.yml` の `concurrency`（PR だけ取り消し、main は取り消さない） | `cancel-in-progress` を `pull_request` の時だけ true にする。門の判定は取り消さない（呼び出し側に置かない） | `scripts/ci/pattern-check.mjs` の P1 |
| 4 1 分未満の job をまとめる | 各 `ci.yml` | 必須の check の名前と権限を変えずにまとめられる物だけまとめる。まとめられない物は理由を記録に書く | 同 P3・P4（名前が残る・必須の job に job-level の `if:` を付けない） |
| 5 準備の繰り返しをやめる | 各 `ci.yml` | `setup-node` の `cache:`。PostgreSQL などを毎回入れ直さず、固定した image を service container で使う | 同 P2（依存を入れる job は cache を持つ） |

## 使い方

1. 利用側の job に、`actions/checkout`（`fetch-depth: 0`）の後で `id: scope` の step として `watchout/shirube/.github/actions/ci-scope@<40 桁の commit>` を呼ぶ。分岐は step の `if:` だけで行い、job の `if:` と workflow の `paths`・`paths-ignore` は使わない（必須の check が pending のまま残る、または名前が消える）。
2. docs の時に残す短い試験の一覧は、その repo が持つ。docs を読む試験を落とさないため、一覧に無い試験が docs・設計の file を読んでいないことを repo の試験で確かめる。
3. 型への適合は `node scripts/ci/pattern-check.mjs <ci.yml> --required "<必須の check の表示名,…>"` で確かめる（表示名は job の `name:`、無ければ job の id）。

## 判断（1 行ずつ）

- docs と判定する条件は、全部の変更 path が許可の glob に当たり、かつコード・道具の file でない時だけ。許可は `docs/**`・`aidlc/**`・ルートの `*.md`。`.github/`・`.shirube/`・`.claude/`・`.codex/`・`package*.json`・lockfile・コードの拡張子は、glob が当てても code。
- 名前の変更（rename）は元の path も数える（`--no-renames`）。code から docs へ動かした変更を docs にしない。
- 型は step で動く。job を足さない（1 job は 1 分に切り上げて課金されるため）。
- shirube 自身は docs の絞りを使わない: test 約 40 秒・hygiene 約 13 秒でどちらも 1 分課金のため減る分がほぼ無く、33 の試験が docs を読む。

## 未観測

private repo の composite action を別の private repo から呼べるか（Actions のアクセス設定）、GitHub 上での `github.action_path` の解決は、取り込む repo で観測するまで未観測。
