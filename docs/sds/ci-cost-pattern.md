# CI の費用を減らす型（CI-COST-REDUCE）

正本の決定: Owner の OD-COMPANY-CI-REDUCE-ALL-EXCESS-20261124-001（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-7124878927 、本文 SHA-256 `941f82244dd39456435e468b388b869ae950fd4b0a2b201123d83beac9e6641c`）と CTO の決め（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-7124863123 、`059d610154b40d5ba472839cd0a9e14815e8c8acf2942f83c53928e9fd86bc4d`）。判定の中身は変えない。変えないもの: コードを変える PR の全試験、main の後の試験、base が動いた時の取り直し、網羅率の床、必須の check の名前と数。

この文書は型を 1 か所に置く。各 repo は写さず、commit を固定して参照する。

## 型の 5 つ

| 削減 | 置き場（1 か所） | 利用側がすること | 機械の確かめ |
|---|---|---|---|
| 1 docs だけの PR は重い試験を飛ばす | `.github/actions/ci-scope/action.yml` と `scripts/ci/scope.mjs` | 自分の job の中の step として呼び、重い step に `if: steps.<id>.outputs.scope == 'code'` を付ける。docs の時に残す短い試験の一覧は repo が持つ | `tests/ci-scope.test.mjs`（空・読めない・奇妙な path・文書でない種類・実行 bit・symlink・git の記録の欠け・push は code） |
| 2 門の検査は印のある comment だけ | `scripts/sds/gate-marks.mjs` と kit の呼び出し側（shirube#119 で入る） | kit の版上げで取り込む | `tests/sds-gate-caller-trigger.test.mjs`（`if:` が検査器の印と一致、前の判定が残る負例） |
| 3 PR の古い試験の実行を次の push で取り消す | 各 `ci.yml` の `concurrency`（PR だけ取り消し、main は取り消さない） | `cancel-in-progress` を `pull_request` の時だけ true にする。門の判定は取り消さない（呼び出し側に置かない） | `scripts/ci/pattern-check.mjs` の P1（記録だけ。group は下の表の形だけ・取り消しの条件はちょうど PR だけ・job 自身の concurrency は表の外） |
| 4 1 分未満の job をまとめる | 各 `ci.yml` | 必須の check の名前と権限を変えずにまとめられる物だけまとめる。まとめられない物は理由を記録に書く | 同 P3・P4（名前が残る・必須の job に job-level の `if:` を付けず、`needs` をどれだけ辿っても `if:` を持つ job に届かない） |
| 5 準備の繰り返しをやめる | 各 `ci.yml` | `setup-node` の `cache:`。PostgreSQL などを毎回入れ直さず、固定した image を service container で使う | 同 P2（記録だけ。依存を入れる job は cache を持つ。install は引用符・backslash・行継続を外してから語で広く拾う: 下の表） |

## 使い方

1. 利用側の job に、`actions/checkout`（`fetch-depth: 0`）の後で `id: scope` の step として `watchout/shirube/.github/actions/ci-scope@<40 桁の commit>` を呼ぶ。分岐は step の `if:` だけで行い、job の `if:` と workflow の `paths`・`paths-ignore` は使わない（必須の check が pending のまま残る、または名前が消える）。
2. docs の時に残す短い試験の一覧は、その repo が持つ。docs を読む試験を落とさないため、一覧に無い試験が docs・設計の file を読んでいないことを repo の試験で確かめる。
3. 型への適合は `node scripts/ci/pattern-check.mjs <ci.yml> --required "<必須の check の表示名,…>"` で確かめる（表示名は job の `name:`、無ければ job の id）。
4. 後に回す物（落とさない）: 型の 5（準備のやり直しをやめる）を各 repo の `ci.yml` に当てる時、install を `npm ci --ignore-scripts` にして全部の package の install script を動かさない。workflow の変更なので、CI の費用を減らす workflow の束（#119 と各 repo への当て）に入れ、Owner の承認を 1 つの組で伺う。

## 判断（1 行ずつ）

- docs と判定する条件は、全部の変更について 4 つがそろう時だけ: (1) 隠し path（どの段も `.` で始まる）でない、(2) 種類が文書（`md mdx txt rst adoc png jpg jpeg gif webp pdf`）、(3) 変更の前と後の git の mode が `100644`（追加と削除は無い側が `000000`。実行 bit・symlink・submodule・型の変更は code）、(4) 許可の glob に当たる。許可は `docs/**`・`aidlc/**`・ルートの `*.md`。許可は場所であって種類ではない: glob が当てても、文書でない種類（拡張子なし・svg・json・yaml・source・script・binary）は code。mode は `git diff --raw -z` で読み、読めない記録は code。
- 名前の変更（rename）は元の path も数える（`--no-renames`）。code から docs へ動かした変更を docs にしない。
- 型の検査は、YAML を `scripts/ci/yaml-read.mjs`（公開の `yaml` library 2.9.1 を厳しい設定で使う読み手）で 1 回だけ構造にし、規則 P1〜P7 は構造だけを見る。読めない・壊れた YAML・library を読み込めない・空の `steps` は P7（FAIL）。
- P1・P2 は「記録だけ」: findings（`level: "record"`）に出すが verdict を FAIL にしない（CTO の裁定 https://github.com/watchout/shirube/pull/121#issuecomment-7128228425 ）。止める検査は P3〜P7 と読み手。理由: P1・P2 は費用を減らす努力の確かめで、抜けても費用が増えるだけで判定の中身は変わらない。
- 読み手の設定: YAML 1.2・core schema、key の重複は誤り、merge key・anchor・alias・tag は拒む、原文に行頭が `%` の行が 1 つでもあれば（directive。文書の前・後ろ・途中のどこでも）止める、文書は 1 つだけ、library の error も warning も止める。library を読み込めない・版が固定（2.9.1）と違う時も止める。library が受けても YAML 1.1 の parser（libyaml・Ruby の Psych）が拒む形（flow の中の `:` `?`、`:` `?` で始まる plain、`? ` の明示 key、tab の字下げ）と、字の一覧（制御文字・tab 以外の空白・BOM・孤立 surrogate）の外は自分の側で拒む。数と真偽は書かれたままの text（`1.0` は `"1.0"`）。
- 依存: `yaml` 2.9.1 を devDependency に exact で固定（package.json と package-lock.json）。導入の形は lockfile で、test job が既に `npm ci` を実行し `yaml` は既に lockfile にあった（他の依存の依存）ので、gate の実行に network の install を足さず、package の数も増えない。install の script を持たない。導入前の `--ignore-scripts` は `ci.yml`（守る物）に足さず、試験 Y7 が 3 つを毎回確かめて代える（CTO の裁定 https://github.com/watchout/shirube/pull/121#issuecomment-7129764007 ）: (i) `yaml@2.9.1` の package.json に preinstall・install・postinstall・prepare が無い、(ii) lockfile の integrity が固定した値と同じ、(iii) `yaml` 自身が package を連れて来ない（dependencies の類が無く、前から他の package の依存として lockfile にある）。助言 GHSA-48c2-rrv3-qjmp（< 2.8.3）と GHSA-f9xv-q969-pqx4（< 2.2.2）は 2.9.1 で直っている。取り込む repo は `yaml` を lockfile で固定して入れる（無ければ読み手が読み込めず P7 で止まる）。
- 検査は「許す形の表」に合う物だけを通し、表の外は findings（fail closed）。悪い形を探す方式にしない（言い換えで抜けるため）。表:
  - P1 の group: 文字と `${{ }}` だけで、式は次の 3 つだけ（空白の数は問わない）。(a) `github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id)`、(b) `github.event.pull_request.number || github.run_id`（以上は PR の番号ごとの group を作り、PR 以外の run は run ごとの group になる）、(c) `github.workflow`（飾りだけ。(a)(b) と一緒の時だけ可）。(a)(b) のどれかが 1 つ要る。branch 名（`github.head_ref`）は表に無い（別の fork が同じ branch 名を使うと group が重なる）。job 自身の `concurrency` は表の外（group を共有すると他の run の待ちを置き換える）で、workflow の 1 か所に置く。
  - P2 の install: run の comment 行を落とし、backslash+改行で行を継ぎ、引用符と backslash を外す（`n"pm" ci`・`npm c\i` は `npm ci`）。それを `;` `&` `|` 改行で命令に切り、語に分け、`npm` `pnpm` `yarn` `bun`（path・`.cmd`・`.exe` の名前も）の後ろに `ci` `install` `i` `add` のどれかがある命令、または `yarn` だけ（option のみ）の命令を install とする。`$` で始まる語（変数・展開）は package manager かもしれないので package manager として数える。多く拾う方が厳しい側。script の中に隠れた install は見ない。
  - P4: `needs` を辿り切った上流のどれかに job-level の `if:` があれば、必須の job は skip され得る。
- 型は step で動く。job を足さない（1 job は 1 分に切り上げて課金されるため）。
- shirube 自身は docs の絞りを使わない: test 約 40 秒・hygiene 約 13 秒でどちらも 1 分課金のため減る分がほぼ無く、33 の試験が docs を読む。

## 未観測

private repo の composite action を別の private repo から呼べるか（Actions のアクセス設定）、GitHub 上での `github.action_path` の解決は、取り込む repo で観測するまで未観測。
