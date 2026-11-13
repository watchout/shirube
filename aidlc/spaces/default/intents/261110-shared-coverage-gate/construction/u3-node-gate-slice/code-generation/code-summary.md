# U3 u3-node-gate-slice 実装の要約

実装は clone の worktree（PR #104 の branch `adf-lead/u3-node-gate-slice-20261112`）で行った。作業場の木は古く、Owner の作業場では git を実行しないため、実装の実物と commit は PR の branch にある。追跡表の検査が作業場の木の中の file を探すので、`scripts/coverage-gate/` の 13 file と試験 14 file・補助 1 file は PR の branch と同じ内容で作業場の木にも置いた（未追跡。作業場の木が main に合わせて更新される時に取り除くか、統合済みの同じ内容で置き換わる）。単位の設計・計画の記録も PR の branch の版を作業場の木へ写した（作業場の木の版は監査の返却を反映する前の古い版だったため）。作業場の木の `knip.jsonc` は古いままで、単位の変更の証拠は PR の branch 側の実行にある。

## 作った・変えた file

- `scripts/coverage-gate/`（新規 13 file、合計 1,004 行、いずれも 300 行以内）: `order`（14）、`sanitize`（17）、`events`（53）、`lcov`（101）、`judge`（138）、`input`（94）、`resolve`（33）、`report`（168）、`events-reporter`（27）、`runner`（94）、`measure-node`（116）、`emit`（43）、`cli`（106）（round 1 の是正後は `resolve` 42・`emit` 100・`cli` 103、下の節）。判定・入力の検査・変換・整形の核 7 file は時刻・乱数・環境・file・子プロセスに触れない。file・子プロセス・環境に触れるのは `resolve`、`runner`、`measure-node`、`emit`、`cli` と報告係 `events-reporter` だけ。
- `tests/coverage-gate-*.test.mjs`（新規 14 file）と `tests/coverage-gate-fixtures.mjs`（共有の架空 fixture）: 試験 175 件（`node:test` と `node:assert/strict`）。
- `knip.jsonc`（変更、1 行）: entry に `scripts/coverage-gate/cli.mjs!` と `scripts/coverage-gate/events-reporter.mjs!` を足した（下の「計画からの差異」）。
- 単位の記録: `self-coverage-input.json`、`self-coverage-result.json`（OB5）、`source-manifest.json`、`traceability.json`、この要約。設計の記録の修正は別 commit（下記）。

## 主な実装の判断

- 区分（一致・不一致・観測できず）と理由コードの決定は `judge.mjs` の 1 つの表だけ。入口は文書を作った後に判定を読み直さず、終了コードは区分から 1 か所で写す（0・1・2）。
- 測定は子プロセス 1 つ、再試行なし。子の環境は許可した名前の一覧（`PATH`・`HOME`・`LANG`・`LC_ALL`・`TZ`）だけで空から作り、値は門が置く。上限は期限と総予算の小さい方で、process group ごと止める（猶予後に強制終了）。孫が残らないことを試験で確かめた。
- 値は lcov の `DA` の行から数え直す。`LH`/`LF` と食い違えば壊れた記録。観測できない値は null。
- 結果の文書・job summary・notice・出力値は 1 つの文書から作る。notice の `%` は GitHub の workflow command の escape（`%25`）。
- 入口の失敗（引数・環境・書き込み・予期しない例外）は結果の文書を作らず、標準エラーに 1 行の JSON `{"code","message"}`。入力の失敗だけは結果の文書に残して終了コード 2。
- 実行の識別子は入口が環境から 1 回だけ読む（`<ID>-<ATTEMPT>`、無ければ `local`）。

## 試験の観測（Red → Green）

- Red-1: 実装が無い状態で 7 file が `ERR_MODULE_NOT_FOUND`（tests 7・pass 0・fail 7）。Red-2: 判定・入力・解決が同じ失敗、Green-2 で 43 件合格。Red-3: report が同じ失敗、Green-3 で 18 件合格。Red-4: emit と cli が同じ失敗（tests 2・pass 0・fail 2）、Green-4 で 27 件合格。門の試験の全体は 175 件合格。
- 版: Node 22.23.4・24.22.1・26.12.1 のそれぞれで門の試験 175 件が合格。CI の `test` job は Node 26 を使うので、実際の子を起こす試験は版に依らない形にした。
- 全体: 作業木で `npm test` 936 件すべて合格（実行 936・合格 936・失敗 0・skip 0）。base（`origin/main` `a194a178b809b45a2a9d9f1190c76c13273b70c7`）で `npm test` は 761 件合格で、761 + 175 = 936 と一致した。`package.json`、`.github/workflows/ci.yml`、`scripts/hygiene/lib.mjs` の SHA-256 は base と PR の branch で同じ。base との差分は新しい file と `knip.jsonc` の 1 行だけ（逆向き: 足した file を除くと base に戻る）。
- 自己の網羅率（OB5）: 門で `scripts/coverage-gate/`（13 file）を測り、一致、coveredLines 1004 / totalLines 1004（100.00%）。独立に組込みの lcov（Node 26）で別に数えた結果と、13 file・1004/1004・file ごとの数まで一致した。入力は試験を 14 個の file 名で並べた（`resolveTargets` はワイルドカードを解決しない）。runId は `local`、toolVersion は 24.22.1。この結果は作業場の手元の実行で、workflow 上の実行ではない。
- 構造の検査: lint:structural、lint:guard は指摘なし。own-code budget（OWN-01）は合計 3,766 / 上限 4,000 で通る。jscpd は重複 0。dependency-cruiser は違反なし（46 module）。knip は設定を変えた後に通り、使われない file を置くと落ち、消すと通ることを確かめた。

## 独立の実装監査 round 1 の是正（F01・O01）

round 1（返却 https://github.com/watchout/shirube/pull/104#issuecomment-6839752999）は F01（結果の書き込みがリンクをたどって入力・追跡 file を書き換える。低 × 重大）で BLOCK。O01（拒まれた入力の絶対 path が出力に出る）は観察。是正の方向は arc の答え（https://github.com/watchout/shirube/pull/104#issuecomment-6839801650。Owner の言葉ではない）。作者は返却の BLOCK を、機械の受領ではなく作者の記録として受けた。順序は、設計（security-design の SC4・SC6・SC7、rules の BR5.1）を先に直し（commit 4ab9810）、試験だけの Red（commit 6261ad8。実際の filesystem で 2 つの反例を含む負例）、その後に実装の Green。

- 採った判断: 結果の path を文字列でなく実体で判定する（`emit.mjs` の `guardResultPath`: 親 directory の `realpath` + file 名、既にリンクか folder なら拒否、`--input` と同じ実体（名前または dev・ino）なら拒否、repo の root の実体の下で追跡された file なら拒否）。一時 file は毎回新しい名前（乱数は `emit.mjs`）を `O_CREAT|O_EXCL|O_NOFOLLOW`・0600 で作り、fsync して rename。作れなかった一時 file は自分で消し、他者の file は消さない。以降の削除と書き込みは、検査した実体 path だけを使う。拒まれた入力の repo の外の path（絶対 path、`..` で外へ出る path）は `<outside the repository>` に置き換える（`resolve.mjs`）。
- 採らなかった代替: 「結果は repo の下だけ」にする（arc の勧めの文面）— 既存の試験・設計が repo の外の directory への結果を許しており、実体で追跡 file を判定すれば外の file は守る対象でないため、許す形を保った（deviation_ledger に書く）。固定の `.tmp` 名のまま `lstat` だけで検査する — 検査と書き込みの間にリンクを置かれる余地が残るので、書き込み自体を `O_EXCL|O_NOFOLLOW` にした。
- 観測: 追加 12 件（emit 7・cli 4・resolve 1）。門の試験 187 件が Node 24.22.3 で合格（失敗・skip・todo 0）。`npm test` 全体 948 件合格（761 + 187）。lint:structural・lint:guard・jscpd・dependency-cruiser（46 module）・knip・OWN-01（3,846 / 4,000）は指摘なし。自己の網羅率は 13 file で 1067 / 1067（100.00%、toolVersion 24.22.3、runId `local`。`self-coverage-result.json` を取り直した。手元の実行で、workflow 上の実行ではない）。`scripts/coverage-gate/` の行数は cli 103・emit 100・resolve 42（ほかは変更なし。合計 1,067 行、いずれも 300 行以内）。
- 観測していない: Node 22・26 での再実行、Linux の runner でのリンク関連の試験（push 後の CI の Node 26 job で確かめる）。リンクを置く試験は macOS の手元の実行。Windows は対象外（`O_NOFOLLOW` が無い環境の保証はしない）。

## 実行していない・観測していないもの

- 配線された workflow での実行（AC10.1.3）は U7 の範囲で、この単位では観測していない。入口はどの workflow からも呼ばれない。
- CI の `test` job（Node 26）と hygiene（Node 22）の結果は、この head を push して確かめるまで観測していない。Linux の runner で process group の停止が孫まで届くことは、手元（macOS）の試験では確かめたが、Linux では未観測。
- Node 23 以上の保証はしない。24・26 の実測は手元の事実で、CI の保証ではない。
- 見直し役は、この作業場の区分が `none`（Owner 決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125）のため呼んでいない。見直し済みとは書かない。サブエージェントも呼んでいない。
- この head の独立の実装監査・作者の受領・作者以外の suite-lead による統合は、未実施。

## 計画からの差異

- 計画 Step 10「既存の検査の設定を変えない」から外れた。knip が新しい 13 file を未使用と判定し hygiene が通らないため。arc の答え（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830。Owner の言葉ではない）に従い、knip.jsonc の entry 2 行と、試験が直接 import する 17 個の export への `/** @public */`（17 か所）にした。採った判断 = entry 2 行＋@public 17 か所。採らなかった代替 = D（glob の entry。中の未使用を見なくなる）／G（試験を直して export を減らす）／B（設定を変えず hygiene を赤のまま U7 へ）／C（別 PR）。17 個すべてが試験から import されていることを script で確かめた（tagged 17・unimported 0）。
- 先頭が `-` の試験 file は、`./` の前置では守れない（Node が `./` を取り除く）ので、絶対 path で渡し、出来事の名前は受け取り側で相対に戻す。設計の記録（security-design、nfr-design の追跡表）を先に直した。
- reliability-design RL2 の「両方が同時なら総予算を先に」は BR2.3（期限と総予算が等しい時は `timed_out`）と食い違っていた。BR2.3 を採って実装し、RL2 の文を直した。
- Node 22 は試験の file 自体も網羅率の記録に含める。判定は宣言した分母との共通部分だけを見るので結果は変わらない。
- 試験は計画のおよそ 90 件に対し 175 件（部品ごとの負例を足した）。
- 自己の網羅率の入力は、ワイルドカードが使えないため 14 個の file 名で並べた。
- 追跡表で AC10.1.3（workflow での実行）は U7 へ持ち越す。この単位の追跡表の NFR はすべて試験か記録に結べた。
