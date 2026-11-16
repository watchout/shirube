**Collaborator:** aidlc-developer-agent

# コード生成の記録（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 受付の file `scripts/hygiene/audit-admission.mjs`。コードと試験と文書は作業用の worktree `shirube-audit-intake-extra-impl-20261116`（clone の隣の worktree）（branch `adf-lead/audit-intake-extra-impl-20261116`、base = origin/main `43819a5`）にある。この記録の file の path は、特に書かない限り worktree の root からの相対。commit・push・PR は作っていない（Step 15 は作る席の仕事）。

> **設計の正本は統合済みの #107（main 43819a56）。作業場の functional-design・nfr-requirements の写しは統合前の古い版（BR3.7・NFR1.8・理由 9 つ目が無い）。実装は統合版に従う。**

## Summary

- 受付の判定が、対象ごとの任意の欄 `extra_checkouts`（`[{repo, commit}]`、4 件まで）を受け入れる。schema の版は `sds-audit-request/1` のまま。
- 判定の流れ: 宣言は依頼だけから読み、GitHub への問い合わせより前に検査する（BR1.8）。job の記録の commit から宣言したものを除いた残りがちょうど 1 つで、それが `[base, head]` を両親とする統合の版であること。宣言した各 commit が対象のどれかの job の記録に全桁一致で出て（Q1 = B）、宣言した repo に実在すること（1 件 1 回、再試行しない。BR3.2 の同じ応答の `sha` が全桁一致し、`parents` が 40 桁の小文字 16 進の配列として読めた時だけ「実在」）。さらに BR3.7: 宣言した commit が対象の base・head そのもの、または両親のどれかが base・head なら拒否（同じ応答を読むだけで、問い合わせを足さない）。
- 宣言を持たない依頼は今と同じ判定・同じ理由・同じ問い合わせの並び（NFR5.4 を試験の literal で固定）。
- 新しい理由の文は 9 つ（`rules.md` の一覧・NFR1.7 と一致。試験 `NFR1.7` が 9 つをそれぞれの場面から出す）。理由に宣言の値を載せない。受理の出力のキーは宣言なしと同じ。
- 判定の全部は 1 file（`audit-admission.mjs`、238 行）に収めた。新しい `scripts/` の file・依存・workflow・package・profile・`.github/`・`.shirube/`・`configs/` は触っていない。
- Step 15 の「同じ PR に足す」は、設計の PR #107 が統合済みなので、**新しい PR**（`adf-lead/audit-intake-extra-impl-20261116` から切る）になる。
- この記録の作った Step は 3〜14。Step 1・2（設計の PR #107 と設計監査の PASS）は作る席の仕事で、ここでは触れていない。

## Files

| file | 区分 | 行数 | 内容 |
|---|---|---|---|
| `scripts/hygiene/audit-admission.mjs` | 変更 | 183 → 238（BR3.7 で +11。`WHY` に 9 つ目、`confirmDeclared` が base・head を受け、`existsIn` が両親を返す）（+52 / −8 の差分） | 定数 `EXTRA_FIELD`・`EXTRA_MAX`（export）、固定の理由 `WHY`、`declared`・`isPair`、`mergeCandidate`、`confirmDeclared`・`existsIn`、`targetCheck`・`workflowCheck`（任意の第 4 引数 `seen`）・`checkoutProof` の変更 |
| `docs/sds/audit-method.md` | 変更 | +2 | §2 に追加 checkout の段落（欄の名前と形、規則、保証しないこと、`/1` のまま） |
| `kit/skills/sds-audit/SKILL.md` | 変更 | +1 −1 | §2 の依頼の形の文に欄の説明を足した |
| `tests/audit-intake-extra-fixtures.mjs` | 新規（補助） | 68 | repo と commit の path ごとに応答する `api` の差し込み、宣言付きの依頼・job の記録を作る補助 |
| `tests/audit-intake-extra.test.mjs` | 新規 | 84 | BR1.1〜BR1.8（宣言の読み取り。問い合わせ 0 回の確認つき） |
| `tests/audit-intake-extra-derive.test.mjs` | 新規 | 111 | BR3.7・BR3.2 の両親が読める条件・A1〜A5（宣言の全部が見えること、`git log -1 --format=%H` の出力の形だけ、対象をまたいだ汚染、両親の形、`preflight` の問い合わせの並び）・理由 9 つ |
| `tests/audit-intake-extra-proof.test.mjs` | 新規 | 143 | BR2.x・BR3.x、受理の出力、総予算、決定性、問い合わせの並びの literal、`verifyAudit` 経由の受付と返却の確認 |
| `tests/audit-intake-extra-docs.test.mjs` | 新規 | 53 | 実装の定数と 2 つの文書の揃い、食い違いの負例、BR3.7 の 1 文が両方の文書にあること |
| `tests/audit-intake-extra-coverage.test.mjs` | 新規 | 68 | 行の網羅率の実測（子の process の lcov）と判定の負例 |

変えていない物（差分で確認）: `package.json`・lockfile・`.github/`・`.shirube/`・`configs/`・`scripts/sds/`・`scripts/hygiene/lib.mjs`・既存の試験 `tests/audit-admission.test.mjs`・`tests/audit-counterexamples.test.mjs`。`audit-admission.mjs` の `import` は Node 組込み（`node:child_process`・`node:crypto`・`node:fs`・`node:url`）と `./lib.mjs` だけ。

## Test execution

実行した場所は worktree（Node v24.22.3、`npm ci` 済み。npm audit の通知だけ）。

- Step 3（基準）: 既存の 2 本 + 周辺の既存試験を、変更前の checker で実行して緑（試験 76 件、失敗 0）。
- Step 5 Red（実装なし）: `node --test tests/audit-intake-extra.test.mjs` → tests 10、pass 1、fail 9。失敗の中身は、宣言を拒否すべき所で例外が出ない（`Missing expected exception: Invalid extra_checkouts declaration`）か、別の理由（`actual: Error: Missing or ambiguous checkout commit`）で止まること。つまり実装が無いための失敗（構文の誤りではない）。pass の 1 件は「欄なし・空の配列は今と同じ」の特性の試験。
- Step 6 Green（宣言の読み取りだけ実装）: 6 pass、4 fail（宣言が受理されるべき試験は、Step 8 の判定が無いので `Missing or ambiguous checkout commit` で落ちる。想定どおり）。
- Step 7 Red: `node --test tests/audit-intake-extra-proof.test.mjs`（Step 6 の実装だけで）→ tests 17、pass 1、fail 16。例: 宣言付きの受理が `Error: Missing or ambiguous checkout commit` で落ちる、`expected 'Undeclared extra checkout commit'` に対し `Missing or ambiguous checkout commit`。pass の 1 件は NFR5.4（宣言なしの問い合わせの並びが今と同じ）の特性の試験。
- Step 8 Green: 新しい 2 file と既存の `tests/audit-admission.test.mjs` を合わせて tests 94、pass 94、fail 0。
- Step 10: 返却の確認の経路で再観測が変わる負例（`NFR1.5` の 2 件）を足して、`audit-intake-extra-proof.test.mjs` は tests 18、pass 18。
- Step 11・12 の後、`npm test`（`node --test tests/*.test.mjs tests/u2/*.test.mjs`）全体: tests 1077、pass 1077、fail 0、skipped 0、cancelled 0。
- Node の版違い（初回、BR3.7 の前）: `/opt/homebrew/opt/node@26/bin/node`（v26.13.1）と `node@22`（v22.23.5）で新旧の 6 file を流し、どちらも tests 112、fail 0。
- **BR3.7 の追加（差し戻し F1、読み先を直した後）**:
  - Red（実装前）: 新しい `tests/audit-intake-extra-derive.test.mjs`（13 本）を、BR3.7 の実装がない状態で実行 → pass 7、fail 6。失敗の期待は `expected: { message: 'Declared extra checkout derives from requested base/head' }`（5 本。双子の統合の版・base／head そのもの・両親の片方・宣言の順・理由 9 つ）と `expected: { message: 'Declared extra checkout not found in declared repo' }`（両親が読めない応答。BR3.2）。A1〜A5 の 5 本は Red でも緑だった（既にある挙動を固定する試験で、変異で落ちることを下で確かめた）。
  - Red（docs）: `tests/audit-intake-extra-docs.test.mjs` に BR3.7 の 1 文の確認を足し、文書を直す前に実行 → tests 6、pass 5、fail 1（`AssertionError: base・headに由来してはならない`）。B1 の「同じcommitの重複」は基準の `audit-method.md` に 0 件（`git show origin/main:docs/sds/audit-method.md` で確認）で、新しい段落にだけある。
  - Green: derive 13 本 pass。実装の後、新旧 7 file（既存 2 + `audit-intake-extra*.test.mjs` 5）の `node --test` は tests 126、pass 126、fail 0（Node 24.22.3）。Node 26.13.1 と Node 22.23.5 でも同じ 7 file が tests 126、pass 126、fail 0。
  - `npm test` 全体（Node 24）: tests 1091、pass 1091、fail 0、skipped 0。
  - 新しい試験の件数: 新 5 file で 50 本（extra 10、proof 18、docs 6、coverage 3、derive 13）。この差し戻しで足したのは derive 13 本と docs 1 本（BR3.7 の文）。proof の 18 本は本数が変わらず、題 `BR2.5/FR2.8`（B6）、BR3.6 の許す理由に 9 つ目、BR3.6 の事例に「宣言の commit の両親が base」を 1 件足した。
  - 既存の fixture の `parents: []` は配列なので BR3.2 の変更で壊れなかった。
- **変異による確認（A1〜A5・F1）**: 実装を scratchpad の写し（作業用の一時 directory の `mut/`。repo の外）で 1 か所ずつ壊し、derive・proof・extra の 3 file を流した。12 の変異がすべて「落ちた」（生き残り 0）。worktree には変異した file を置いていない（`git status` で確認）。
  - A1: `every` を `some` に → A1 の試験が落ちる。
  - A2: 記録の読み取りの形を「40 桁のどこでも」に緩める → A2 の試験が落ちる。
  - A3: `seen` を対象の間で共有 → A3 の試験が落ちる（A1・A2・理由 9 つも落ちた）。
  - A4: 両親の比較を、`[base, head]` の部分集合（`[head, head]` が通る）と「両方を含む」（3 つ目の親が通る）に緩める → どちらも A4 の試験が落ちる。
  - A5: 宣言の commit を PR の repo にも問い合わせる → A5 の試験が落ちる。
  - F1: commit そのものの判定を外す・base だけ・head だけ・先頭の親だけ・両親の形を見ない・両親が無い応答を通す → それぞれ BR3.7／BR3.2 の試験が落ちる。
- CI 上での実行は未確認（ここは手元の実行だけ）。lcov の出力の形（`SF`・`DA`・`LF`・`LH`）は Node 24 と 26 で同じ（初回の確認）。

## Coverage

- 実測の命令（`NODE_TEST_CONTEXT` を外して実行）: `node --test --experimental-test-coverage --test-coverage-include='scripts/hygiene/audit-admission.mjs' --test-reporter=lcov tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs tests/audit-intake-extra.test.mjs tests/audit-intake-extra-proof.test.mjs tests/audit-intake-extra-derive.test.mjs`
- 結果（BR3.7 の後、Node 24.22.3）: LF 238、LH 231、通らない行は 23〜26 行目と 236〜238 行目だけ（R1 と R2。行番号は WHY の 1 行ぶん下がった）。`derive` の試験を除いた 4 file でも LF 238、LH 231（足した行は proof の BR3.6 の事例でも通る）。網羅率の試験の SUITE には derive を足した。（初回の実測は LF 227、LH 220、通らない行は 22〜25 と 225〜227。）
- 通らない行の中身: R1 = `function github(path) {…}` の 4 行（内容の SHA-256 `93804d44400ca198f8bda0061dda2ee0e5f0f7d6682edcd63e46bfc7e71a4ae7`）、R2 = 命令行の入口の本体 3 行（`c9424673d1663dae3b883f57e814e4342fc09ea3d2e0ba7a48a3594f947abf08`）。どちらも基準の版と同じ内容で、実際の GitHub と実際の process を要するための既存の通らない範囲。この取り組みで足した行に通らない行は 0。
- 機械の確認: `tests/audit-intake-extra-coverage.test.mjs` が、子の process で上の lcov を作り、通らない行の連続した範囲ごとに内容の SHA-256 が R1・R2 のどちらかと一致することを確かめる。未計測・行 0・LF と DA の不一致・LH の不一致・子の失敗（終了コード・signal・起動失敗）・別の範囲・範囲の内容の変化・範囲の結合は失敗（負例の fixture あり）。申告ではなく実行の出力から作る。
- 注意: この判定は `audit-admission.mjs` 1 file の行を対象にする。CI 全体の網羅率の床（`scripts/**` で 80%）は変えていない（NFR3.8）。

## 技術検査

すべて worktree で、BR3.7 の後に実行し直した（lint は出力なし。hygiene は verdict PASS、depcruise は違反なし。数字は下の表）:

| 命令 | 結果 |
|---|---|
| `npm run lint:structural` | 出力なし、終了コード 0 |
| `npm run lint:guard` | 出力なし、終了コード 0 |
| `npm run hygiene:lines` / `hygiene:ratchet` | verdict PASS（files 109、baseline_entries 0、failures なし） |
| `npm run hygiene:jscpd` | PASS（clones 0） |
| `npm run hygiene:budget` | PASS（total 4820 / limit 20000、最大の file は `audit-admission.mjs` の 238 行） |
| `npm run hygiene:coverage` | PASS（files 46、uncovered なし） |
| `npx --no-install depcruise --config .dependency-cruiser.cjs scripts configs` | 依存の違反なし（54 modules） |
| `wc -l` | `audit-admission.mjs` 238 行（≦300）、新しい試験の file は最大 143 行（proof）。関数の行数（≦50）と複雑さ（≦10）は `lint:structural` が通ったので範囲内 |

設計の確認の grep: `extra_checkouts` の literal は `audit-admission.mjs` に 1 か所（定数の定義）だけ（NFR7.1、試験でも確認）。足した行に `Date.now`・`new Date`・`Math.random`・`randomUUID`・書き込み・`process.env` は無い（NFR6.2・NFR6.3）。

実行していないもの:
- CI（GitHub Actions）上の全部の実行（この記録は手元の実行だけ）。
- gitleaks（CI の検査。fixture は架空の repo 名・架空の 16 進の commit だけで、`token:` の形は置いていない）。
- 実際の `gh api` を使う実機の確認（R1・R2 は通らない範囲のまま）。

## Deviations

1. **Step 11・Step 12(a) の Red を先に記録していない。** 文書の段落（Step 11）は、試験を書く前に先に直した。網羅率の判定の関数 `judge`（Step 12）は、判定の関数と負例を一緒に書いてから実行した。代わりに、食い違えた文書・別の上限・別の名前・範囲の変更・範囲の結合・形の違う報告・子の失敗の負例 fixture が、「試験が壊れた入力を通さない」ことを示す（負例が緑 = 判定が壊れた入力を拒否している）。TDD の順の逸脱として記録する。
2. **Step 10 の `verifyAudit` 経由の試験は、別 file ではなく proof の試験に含めた。** 補助の `intake()` が `verifyAudit` を呼ぶので、Step 7 の試験が受付と返却の確認の経路をすでに通している。返却の確認の再観測の負例のうち 2 件目（宣言した commit が 2 回目の観測で job の記録から消える）は、実装の後に足して最初から緑だった（その経路は Step 8 の実装で既に正しいことの確認で、Red は無い）。
3. **作業場の木に試験 file の写しを置いた。** 追跡表の検査（`aidlc engine sensor-traceability`）は、OK の目標を作業場の木の中の 1 つの実在する file として照らす。作業場の木は古く git を使えないので、学び（`261110-shared-coverage-gate:code-generation:baa766d8…`）のとおり、新しい試験 6 file（`tests/audit-intake-extra*.mjs`。BR3.7 の後に derive を足し、全部を再コピーして `cmp` で一致を確認）を **同じ内容**（worktree の file と `cmp` で一致を確認）で作業場の `tests/` に置いた。作業場の木の `audit-admission.mjs` は古いままなので、写しは実行しない。作業場の更新の時に取り除くか置き換える。単位の変更の証拠は worktree 側の実行（上）である。追跡表の検査は、初回はこの写しの後に `pass: true`（findings 0）。BR3.7 の後の再実行は 8 に書いた事情で、その時は流せなかった。後で active intent をこの取り組みへ切り替えて流し直し、traceability と required-sections はどちらも `passed`（作る席の観測）。
4. **追跡表の形。** 検査は OK の目標を 1 つの file としてしか受けないので、1 つの要件に複数の file が関わる場合は、主に証明する 1 つの file（多くは試験）を書いた。追跡表は、統合済みの設計（requirements・rules・nfr-requirements の表）の子の ID だけで追い、子を持つ親（NFR1〜NFR9 の見出し）の行は、NFR3 のほかは置かない。NFR3 の親の行は、作業場の engine の追跡表の検査が上流（nfr-requirements の追跡表）の ID として NFR3 を数えるので残し、子の 8 行を並べた（親の行を外すと検査が `missing_from_upstream_ids: NFR3` で失敗した）。最初の版は NFR3 を親の 1 行だけにし、NFR3.1〜NFR3.8・NFR4.1〜NFR4.3・NFR7.2・NFR7.3・NFR8.4 の 14 件の子を落としていた（「NFR3 には sub が上流に無い」と書いたのは誤り。`observability-requirements.md` に NFR3.1〜NFR3.8 がある）。実装監査の差し戻し F01 を受け、この 14 件を足した。NFR3.6（実行した命令・Node の版・対象 file の SHA-256 を持つ実測の記録）、NFR4.5（将来の追加は別の取り組み）、NFR9.3（PR の label・Owner の exact-head・統合の分担は PR の手順）は `N/A` とし、理由と引き継ぎ先（NFR3.6 は Build and Test の段の記録）を目標に書いた。**確かめ方**: 自分で並べた集合の中の一致ではなく、統合済みの設計の file から ID を機械で抜き出して表と比べた（比べた命令と結果は PR の依頼に書く）。結果は、設計の子の ID 92、`upstream_ids` 93、`coverage` 93 で、93 − 92 = 親の見出し NFR3 の 1 行だけが多く、欠け・重複が 0、子の側の余分が 0。
5. **`existsIn` の `try/catch`。**
   - 採った判断: 例外は観測できず = 拒否にする。理由は固定の文（`Declared extra checkout not found in declared repo`）。
   - 採らなかった代替: 例外をそのまま伝える。理由が固定の文でなくなり BR3.6 に反する。
   - この `catch` は、実装の誤りで出た例外も「見つからない」に丸める（拒否側に倒れるので成功と読まれないが、誤りの原因が理由から見えなくなる）。NFR1.1 の「例外を飲み込んで続ける分岐を足さない」に対し、続行する分岐ではなく拒否の経路である（試験: 404・期限切れ・別の sha・形の違う応答・null・両親が読めない 11 通り）。
6. **`workflowCheck` に任意の第 4 引数 `seen` を足した。** 他の呼び出し側（CI の記録の経路: `scripts/sds/ci-record-design-audit.mjs` など。変更していない）は `seen` を渡さないので、宣言を受け付けない。宣言を持つ対象は、従来の「統合の版 1 つ」の規則で判定され、2 つ目の checkout を持つ対象は `Missing or ambiguous checkout commit` で拒否される = 宣言があれば拒否側に倒れる（安全側。試験 `NFR2.2` で固定）。CI の記録の経路で宣言を使えるようにするのは、この取り組みの範囲の外（別の判断）。作る席・監査の席への引き継ぎ事項として書く。
7. **設計の読み先を誤った（作業場の木の古い設計）と、その直し。** 最初の実装は、作業場の木の `aidlc/...` の functional-design・nfr-requirements を設計として読んだ。これは設計の PR #107 が統合される前の版で、BR3.7・NFR1.8・NFR1.7 の 9 つ目の理由が無い（dispatch の指し先の誤り。coordinator が認めた）。結果、実装に BR3.7 が無く、理由は 8 つだった。直し: coordinator の差し戻しで、設計の正本を worktree の統合版（#107、main 43819a56）に切り替え、BR3.2・BR3.7・NFR1.7・NFR1.8・T8 を読み直して Red（derive の 13 本中 6 本が失敗）→ Green。作業場の木の承認済みの設計記録は書き換えていない（古い版のまま）。作業場の木の `rules.md` に `BR3.7` は 0 件。
8. **追跡表の検査（センサー）が今は流せない。** `aidlc engine sensor-traceability` は、今の active intent（`aidlc/spaces/default/intents/active-intent` が `261110-shared-coverage-gate` を指している。この作業の途中で別の席が切り替えたと見られる）の `unit-of-work-dependency.md` を読み、`cannot derive the construction unit from output path while unit-of-work-dependency.md declares Units` で `pass: false`（findings_count 1、gaps・orphans・missing_from_table・missing_from_upstream_ids・invalid_targets は空）になる。active-intent の cursor は私の持ち物でないので触っていない。代わりに scratchpad の読むだけの script で、`upstream_ids` と `coverage` の行が 1 対 1（missing 0、orphan 0、重複 0。最初の版は 79 件）、OK の目標の file が作業場の木と worktree の両方に実在することを確かめた。ただしこの確かめは自分で並べた集合の中の一致で、統合済みの設計の全 ID を追った証拠にならなかった（差し戻し F01 は 14 件の欠落を見つけた）。今の版は 4 に書いた機械の抜き出しで 92 件を確かめた。作業場の木の設計記録は BR3.7・NFR1.8 を知らないので、cursor が戻って upstream-coverage が作業場の木の設計を読む形で流れるなら、BR3.7・NFR1.8（NFR1.7 も）は「上流に無い」と出る可能性がある。この場合は設計の写しの更新（作る席・coordinator の仕事）で解く。
9. **`declared(t)` を 3 か所で呼ぶ**（`requestChecks`・`targetCheck`・`checkoutProof`）。結果は同じ入力から同じなので副作用は無い。1 か所にまとめる整理はしていない（関数の行数・複雑さは上限内。S2 に従い、使う所が 3 つあるが同じ判断を再定義していない）。

## 前提

- 宣言の repo は sds-gate の token で読めること。CI の記録の経路は宣言を使えず、宣言があれば拒否側に倒れる（失敗を成功に読み替えない）。gate の token の範囲を広げるのは別の判断。

## 引き継ぎ（Step 15 の作る席へ）

- 監査依頼の `verifier_sha256` は、この worktree の `audit-admission.mjs` の最終の bytes から計算する（この記録の後に変えると変わる）。
- 事前の確かめ（devsecops・architecture-reviewer・quality の読む役）は、まだ呼んでいない（この dispatch の範囲外）。KY の先回りとして、特に次を読んでほしい: (a) 宣言した repo の妥当性は照らさないこと（保証しないこととして文書に書いた）、(b) 6 の CI の記録の経路は宣言を受けない（拒否側）こと、(c) 宣言した commit が同じ job の記録に出ても、その commit が宣言した repo の何であるか（branch の先頭か、無関係の commit か）は見ないこと。
- R3: 統合の前に、対象 head への Owner の exact-head を arc 経由で確かめ、作者以外の席（suite-lead）が統合する。
