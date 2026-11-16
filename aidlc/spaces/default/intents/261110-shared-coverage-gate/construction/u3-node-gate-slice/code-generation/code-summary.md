# U3 u3-node-gate-slice 実装の要約

実装は clone の worktree（PR #104 の branch `adf-lead/u3-node-gate-slice-20261112`）で行った。作業場の木は古く、Owner の作業場では git を実行しないため、実装の実物と commit は PR の branch にある。追跡表の検査が作業場の木の中の file を探すので、`scripts/coverage-gate/` の 13 file と試験 14 file・補助 1 file は PR の branch と同じ内容で作業場の木にも置いた（未追跡。作業場の木が main に合わせて更新される時に取り除くか、統合済みの同じ内容で置き換わる）。単位の設計・計画の記録も PR の branch の版を作業場の木へ写した（作業場の木の版は監査の返却を反映する前の古い版だったため）。作業場の木の `knip.jsonc` は古いままで、単位の変更の証拠は PR の branch 側の実行にある。

## 作った・変えた file

- `scripts/coverage-gate/`（新規 13 file、合計 1,004 行、いずれも 300 行以内）: `order`（14）、`sanitize`（17）、`events`（53）、`lcov`（101）、`judge`（138）、`input`（94）、`resolve`（33）、`report`（168）、`events-reporter`（27）、`runner`（94）、`measure-node`（116）、`emit`（43）、`cli`（106）（round 1 の是正後は `resolve` 42・`emit` 100・`cli` 103、下の節）。判定・入力の検査・変換・整形の核 7 file は時刻・乱数・環境・file・子プロセスに触れない。file・子プロセス・環境に触れるのは `resolve`、`runner`、`measure-node`、`emit`、`cli` と報告係 `events-reporter` だけ。
- `tests/coverage-gate-*.test.mjs`（新規 14 file）と `tests/coverage-gate-fixtures.mjs`（共有の架空 fixture）: 試験 175 件（`node:test` と `node:assert/strict`）。
- `knip.jsonc`（変更、1 行）: entry に `scripts/coverage-gate/cli.mjs!` と `scripts/coverage-gate/events-reporter.mjs!` を足した（下の「計画からの差異」）。
- 単位の記録: `self-coverage-input.json`、`self-coverage-result.json`（OB5）、`source-manifest.json`、`traceability.json`、この要約。設計の記録の修正は別 commit（下記）。

## 主な実装の判断

- 区分（一致・不一致・観測できず）と理由コードの決定は `judge.mjs` の 1 つの表だけ。入口は文書を作った後に判定を読み直さず、終了コードは区分から 1 か所で写す（0・1・2）。
- 測定は子プロセス 1 つ、再試行なし。子の環境は許可した名前の一覧（`PATH`・`HOME`・`TMPDIR`・`LANG`・`LC_ALL`・`TZ`）だけで空から作り、値は門が置く。上限は期限と総予算の小さい方で、process group ごと止める（猶予後に強制終了）。孫が残らないことを試験で確かめた。
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

## 独立の実装監査 round 2 の是正（F01・F02）

round 2（返却 https://github.com/watchout/shirube/pull/104#issuecomment-6842995633）は、F01（大小文字の別名で追跡 file を結果で上書きできる。重大 × 低）と F02（CLI を directory のリンク経由で起動すると処理せず exit 0 になり古い結果が残る。重大 × 低）で BLOCK。作者は返却の BLOCK を、機械の受領ではなく作者の記録として受けた。設計の文（security-design「追跡されている file なら拒む」、BR5.1、NFR4.4〜4.6）は実体の同一性の判定と矛盾しないので、設計の記録は変えていない。順序は、試験だけの Red（emit 1 件・cli 3 件。実際の filesystem で hard link と別の綴り、リンク経由の起動）、その後に実装の Green。

- 採った判断（F01）: 追跡 file の判定を、名前の一致に加えて実体の同一性（dev・ino）でも行う（`emit.mjs` の `isTracked`。repo の外は対象にしない）。大小文字を区別しない disk では別の綴りが同じ実体になり拒否され、区別する disk では別 file として扱う（試験は disk の性質を調べて両方の場合を assert する）。hard link も同じ実体として拒否する。
- 採らなかった代替（F01）: 全 path を小文字にして比べる — 大小文字を区別する環境の別 file を混同する（監査の remediation も同じ注意）。
- 採った判断（F02）: 直接起動の判定を、実体の path 同士の比較にする（`cli.mjs` の `isDirectRun`: `realpathSync` で `import.meta.url` の file と `process.argv[1]` を比べ、解決できなければ false）。import されたときは動かない性質を保ち、directory のリンク・file のリンクのどちらで起動しても入口へ届く。
- 採らなかった代替（F02）: `--preserve-symlinks-main` を前提にする — 利用者の起動の仕方を縛る。文字列の比較のまま例外を足す — リンクの形ごとに漏れる。
- 観測: 追加 4 件（emit 1・cli 3）。作業木（Node 24）で確認コマンドの実行 634 件すべて合格（失敗・skip・cancelled 0）、`scripts/coverage-gate/` の行の網羅率 100.00%。lint:structural・lint:guard は指摘なし、knip は今回の変更に新しい指摘なし（残りは既存）。`scripts/coverage-gate/` の行数は emit 104・cli 113（いずれも 300 行以内、合計 1,081 行）。自己の網羅率は門で 13 file を測り、一致、1081 / 1081（100.00%、toolVersion 24.22.3、runId `local`。`self-coverage-result.json` を取り直した。手元の実行で、workflow 上の実行ではない）。実際の子の process でリンク経由の起動（directory のリンク・file のリンク）が exit 2 になり古い結果が置き換わることを確かめた。
- 観測していない: Node 22・26 での再実行、Linux の runner での別名の試験（大小文字を区別する disk の側の assert は手元の macOS では実行されない。push 後の CI で確かめる）。独立の再監査、作者の受領、統合は未実施。

## 実装監査 5 回目の直し（記録の版の整合、F01）

実装は広げていない。TMPDIR の是正（commit b3978e1、head 224d961）で runner が 94 行から 98 行、試験が 191 件から 193 件になったのに、自己の網羅率の結果と項目 U3IA-09 の数が前の版のままだった。現在の head の値に揃えた。

- 現在の版（source は head 224d961050ee8e6ab4d438626c9ab1f9ac4152e1 から変えず、main の 62cbacd4 を取り込んだ後の木、Node 24.22.3、手元の実行）: 門の試験 193 件が合格（失敗・skip・cancelled・todo 0）。`npm test` 全体 1041 件が合格（実行 1041・合格 1041・失敗 0・skip 0。他の試験 848 + 門の 193）。取り込む前の 224d961 の木では 954 件（base 761 + 193）で、これは履歴の値（main の他の単位の試験が増える前）。自己の網羅率は 13 file で 1085 / 1085（100.00%）、runner は 98 / 98。`self-coverage-result.json` を `node scripts/coverage-gate/cli.mjs --input self-coverage-input.json --result …` で取り直し（exit 0、outcome match、未計測・未実行・試験失敗の一覧は空）、前の結果との差は coveredLines/totalLines の 1081→1085、runner の 94→98、recordsSha256 だけ。
- 過去の版の値（現在の版の証拠ではない）: 上の「観測」にある 1,081 行・1081 / 1081・runner 94 / 94・門の試験 191 件・全体 952 件は、それぞれ実装監査 round 2 の直しの commit 7edebf6 の時点の実測。TMPDIR の是正の前で、現在の head には当たらない。
- 項目 U3IA-09 を 193 件・1041 件（取り込み前の 224d961 の木では 954 件）に直した（`docs/audit/u3-node-gate-slice-impl.json`、項目集合の SHA-256 は取り直す）。`traceability.json` の NFR7.3・NFR7.4 は同じ `self-coverage-result.json` を指しており、取り直した結果が現在の証拠になる。
- file ごとの lcov の突き合わせ（現在の版、Node 24.22.3、手元の実行）: 門の試験 14 file を `node --test --experimental-test-coverage --test-reporter=lcov` で別に流し（exit 0、16 record）、`scripts/coverage-gate/` の 13 file の LH/LF を、保存した `self-coverage-result.json` の `perFile` と file ごとに比べた。13 file すべて一致し、合計 1085 / 1085。内訳（LH/LF）: cli 113/113、emit 104/104、events-reporter 27/27、events 53/53、input 94/94、judge 138/138、lcov 101/101、measure-node 116/116、order 14/14、report 168/168、resolve 42/42、runner 98/98、sanitize 17/17。source は TMPDIR の是正 head 224d961 から変えていない（この記録の commit は記録の file だけを変える）。
- 範囲: Owner の決定 https://github.com/watchout/shirube/pull/104#issuecomment-6909088047（本文 SHA-256 `1c94aab897f9a4ca28375b96b2a3861a7eab8cad8faa0965a1a468cb0ca91e17`、この PR のこの 1 回だけの 6 回目。記録の試験と網羅率の数を今の head に揃えることだけ）。実装は広げていない。
- 観測していない: Node 22・26 での再実行（監査 5 回目の返却に 22.23.5・24.22.3・26.13.1 で門の試験 193 件の合格の記録があるが、この記録の実行ではない）、配線された workflow での実行（U7）。

## 実行していない・観測していないもの

- 配線された workflow での実行（AC10.1.3）は U7 の範囲で、この単位では観測していない。入口はどの workflow からも呼ばれない。
- CI の `test` job（Node 26）と hygiene（Node 22）の結果は、実装監査 6 回目の依頼で新しい head に固定してから確かめる（この記録を書いた時点では新しい head の CI は未観測。224d961 の CI は test 954 件合格、hygiene 成功）。Linux の runner で process group の停止が孫まで届くことは、手元（macOS）の試験では確かめたが、Linux では未観測。
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
