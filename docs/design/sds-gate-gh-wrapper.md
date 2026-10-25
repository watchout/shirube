<!-- sds-gate gh wrapper: the design record. Author = arc. Written after PR-G1 (shirube#69) was opened, for the design audit (audit-method §2 R3/R4 事前監査, §3 D1-D6), following the precedent of Owner decision T154. -->
# sds-gate の gh の包み（PR-G1・PR-G2）— 設計の記録

状態: Owner の決定 [OD] の後、arc が作業指示 [WO] を出し、shirube の席が PR-G1（shirube#69、head `de5d1833`）を作った。audit-method §2 は R3/R4 に事前監査を求めるが、[WO] の流れ（§0）がこれを抜かした（arc の誤り。同じ抜けは 4 回目）。G1 の実装監査 [IA] は G1-1〜G1-5 が全部 PASS で、止める指摘は事前監査の欠け（BF-G1-PREAUDIT-01）の 1 件だけだった。前例の T154（R3 の事前監査を抜いた aun #46・shirube #55 は、事後の設計監査を通してから統合する）に従い、この記録を後から書いて設計の監査を受ける。
範囲: G1（`.github/workflows/sds-gate.yml` の包み）と G2（`sds-gate-self.yml` と `.shirube/sds-pin.json` の版の切り替え）の 2 本。G2 はまだ作っていないので、この記録が G2 の事前の設計になる。
監査項目との対応: GWD-1 = §1・§2、GWD-2 = §5、GWD-3 = §4、GWD-4 = §6、GWD-5 = §7、GWD-6 = §8。

## 1. Owner の原文と決定 ID

| ID と場所 | Owner の原文と、決まったこと |
|---|---|
| [OD] OD-SHIRUBE-GATE-FIX-ADMIN-ENFORCE-TEMP-OFF-20261026-001（iyasaka-arc#49 6404453776） | 質問ボードの組 `shirube-gate-escape` の Q1 に「A」。その前に議論の欄で「壊れた門というのはどういうこと？なんで壊れている？原因は？」と聞き、arc が原因を返した。決まったこと: 直しの 2 本（門の workflow に包みを足す・門の版の切り替え）を作り、どちらも独立の監査を通し、受領は手元で確かめる。2 本を統合する間だけ suite-lead が enforce_admins を外して管理者として統合し、すぐ戻して読み戻す。外している間にほかの PR を統合しない。2 本とも保護面なので exact-head は PR ごとに 1 回 |
| OD-SHIRUBE-MAIN-BRANCH-PROTECTION-AND-SDS-GATE-REQUIRED-20261025-001（#49 6389465250） | shirube の main に branch protection を入れ、`sds-gate` を必須の検査にした（判定 1〜3 で止める）。この記録はその門を直す |
| T154 OD-R3-MISSED-PREAUDIT-RUN-AUDITS-20261020-001（#49 6301299856） | 「とりあえず監査を通しましょう。そもそも監査なしでマージできてしまう仕組みがおかしいよね？」→ 事前監査を抜いた PR は、事後の設計監査を通してから統合する。この記録はその手順に拠る |

## 2. 目的と対象外

目的: R2 以上の PR で、sds-gate の判定 3（監査の受領）が CI の上で受領を確かめ直す時に、必ず FAIL になる障害を直す。直した後も、判定 1〜3 の止め方（必須の検査として統合を止める）は変えない。
原因 [OBS]: 受領の確かめ直しは、CI の作業の記録を `gh api repos/<repo>/actions/jobs/<id>/logs` で読む（`scripts/sds/gate.mjs` と固定 checker `scripts/hygiene/audit-admission.mjs` が、どちらも `execFileSync("gh", ["api", path])` で PATH の gh を呼ぶ）。runner の image `ubuntu24/20261012.334` の gh は 2.102.0 で、gh 2.97.0 から、JSON でない生の応答に端末の制御文字が入っていると `--allow-escape-sequences` が無い限り出力を拒む。runner は作業の記録の各手順の見出しに色の指定（`ESC[36;1m…ESC[0m`）を必ず入れるので、R2 以上の PR は必ず FAIL になる。手元の gh 2.87.3 では起きない。R2 以上の PR が CI でこの経路を通ったのは shirube#68 が初めて。
対象外:
- 固定 checker（`audit-admission.mjs`、sha256 `0fdf596f…`）と `gate.mjs` の変更。変えると checker の版・依頼の `verifier_sha256`・pin が変わり、受領の仕組み全体の改版になる。
- 判定 1〜5 の決まり、status の投稿の形、required checks、branch protection の中身。
- 統合の間だけ enforce_admins を外す手順そのもの（[OD] と作業指示 [WO] §3 が決める。この記録は前提として引くだけ）。
- kodama の pin（`e94a74e9`、G1 より前）。kodama で R2 以上の PR が出ると同じ障害が起きる見込みで、G2 の後に配布キットの版上げで直す（OD-KIT-UPGRADE-STANDING-AND-INCEPTION-WHILE-WAITING-20261021-001 の範囲、別の PR）。

## 3. 設計

### 3.1 G1: 包み（`.github/workflows/sds-gate.yml` の step `Run sds-gate and report a commit status on the PR head` の中）
1. step の最初に、本物の gh の path を `command -v gh` で決め、一時的な directory に POSIX sh の script `gh` を書き、`SDS_REAL_GH` に本物の path を入れて、その directory を PATH の先頭に置く。一時的な directory は step の終わりに消す。
2. 包みの振る舞い: 第 1 引数が `api` で、引数に「`-` で始まらず `/logs` で終わる物」があり、`--allow-escape-sequences` がまだ無く、本物の gh の `api --help` にその flag が載る時だけ、末尾に flag を足して本物の gh を exec する。それ以外は、引数を変えずに本物の gh を exec する（stdout・stderr・終了コードは本物のまま）。
3. `SDS_REAL_GH` が無ければ何も呼ばずに失敗する（fail closed）。包み自身を呼び戻さない（本物の path は PATH を替える前に決める）。
4. flag の有無を `api --help` で確かめるのは、flag と拒否が同じ版（2.97.0）で入ったため。flag を持たない古い gh には足さず、壊さない。
5. 包みの text は再利用 workflow の file の中にあり、門が checkout して identity を確かめる自分の commit（`job.workflow_sha`）から来る。PR の head からは来ない。

### 3.2 G2: 門の版の切り替え（G1 の統合の後）
1. `.github/workflows/sds-gate-self.yml` の `uses: watchout/shirube/.github/workflows/sds-gate.yml@<sha>` を、G1 の統合の commit に替える。
2. `.shirube/sds-pin.json` の `sds_commit` を同じ commit に、`files` の `.github/workflows/sds-gate-self.yml` の sha256 を新しい file の値に替える。
3. それ以外は変えない。`sds-gate-self.yml` は `pull_request_target` で動くので、定義は main の物が使われる。G2 が統合されるまで、G1 の包みは shirube 自身の PR の門には効かない。

### 3.3 統合の手順（前提として引く。中身は [WO] §3）
G1・G2 はどちらも、自分の PR の上では古い門（`@62ff73db`）で判定され、受領の確かめ直しで FAIL になる見込み。そのため [OD] のとおり、統合の間だけ enforce_admins を外して管理者として統合し、すぐ戻して読み戻す。外す条件（test・hygiene が success、門の FAIL の理由が CI の記録の読み出しだけ、受領を手元の固定 checker で `RECEIPT_ACCEPTED`、Owner の exact-head）は suite-lead の 6404494978 のとおり。

## 4. 代替案（採らなかった案と理由）

| 案 | 採らなかった理由 |
|---|---|
| (a) 固定 checker と `gate.mjs` の gh の呼出しに flag を足す | checker の sha256・依頼の `verifier_sha256`・門の tools の identity・pin が変わり、受領の仕組み全体の改版になる。flag を持たない gh（手元の 2.87.3）で壊れる |
| (b) 環境変数で gh の拒否を止める | gh の source（v2.102.0 の `pkg/cmd/api/api.go`）に、この拒否を環境変数で外す道が無い（前の arc が source で確かめた。監査者は自分で読み直す） |
| (c) runner の gh の版を下げる | 外部の部品の版の固定を足すことになり（新しい依存の管理）、GitHub の image の更新とずれ続ける |
| (d) 作業の記録を読まずに、統合の commit を別の API で確かめる | 受領の確かめ方（判定 3）の設計の変更で、固定 checker の改版になる。今回の目的（壊れた経路を元の意味のまま動かす）を超える |
| (e) sds-gate を一時的に必須から外す（Owner の選択肢 B） | 外している間、すべての PR が門なしで統合できる。Owner は A を選んだ |
| (f) 包みを別の script file にする | 保護面の差分が 2 file に増える。step の中に置けば `sds-gate.yml` 1 file の差分に収まる（試験は workflow の本物の text を取り出して動かす） |

## 5. 受入の検証計画

| 受入 | 示す物 | 状態 |
|---|---|---|
| G1-a: 拒否する gh で、log の取得に flag が付き、門が PASS し status が success | `tests/sds-gate-gh-wrap.test.mjs`（stub の gh、GitHub を呼ばない） | 実装済み、CI 成功（shirube#69 の run 40242858304） |
| G1-b: 包みを外すと障害が再現する（log が拒否され、門が FAIL） | 同じ試験の変異 | 同上 |
| G1-c: 引数の形（flag 済み、flag の無い gh、他の呼出し、特殊文字、終了コード、stdout/stderr、SDS_REAL_GH 無し） | 同じ試験 | 同上 |
| G1-d: 実物の gh 2.102.0 で、flag なしは同じ文言で exit 1、flag ありと包みありは exit 0 で log と bytes が同一 | 作者の手元の再現（公式の release をチェックサム照合、空の環境・ダミーの token・localhost のみ） | 実施済み（#24 6404631799）。監査者は記録を読む |
| G2-a: pin と `uses:` が G1 の統合の commit を指し、`files` の sha256 が新しい file と一致 | G2 の差分、kit check | 未実施（G1 の統合の後） |
| 最終: G2 の統合の後、shirube#68 の sds-gate を再実行して PASS | #68 の門の run と status | 未実施。**これが直った証拠**。G1 の試験と手元の再現は前提の確認にとどまる |
| 戻した後: 統合の間に外した enforce_admins が true に戻っている | suite-lead の読み戻し（#24） | 未実施 |

## 6. 秘密・権限・観測・復旧・データ

- 資格情報: 門の workflow は今までどおり `github.token`（読取りと status の投稿）だけを使う。包みは `GH_TOKEN` を新しい所へ渡さず、permissions・secrets・外部への通信を増やさない。
- PR の code: 門は PR の head の code を checkout も実行もしない（包みの text は再利用 workflow の自分の commit から来る）。
- 観測: 門の FAIL の理由は今までどおり JSON と status の説明に出る。包みは出力を変えないので、本物の gh のエラーはそのまま見える。
- 失敗を隠さない: FAIL を捕まえて最後に `exit "$code"` する形は不変。`|| true`・`continue-on-error` を足さない。
- 復旧: G1・G2 は通常の PR の revert で戻せる（戻すのも保護面の PR）。enforce_admins は統合の直後に戻し、suite-lead が読み戻す。戻しに失敗したら suite-lead はほかの統合をせずに止まる。
- データ: 作業の記録の bytes は flag の有無で変わらない（G1-d）。checker が記録から取り出す commit の判断は変わらない。

## 7. 予算と範囲

- G1: `sds-gate.yml` に 32 行、試験 1 file、監査の項目集合 1 file（追加 228 行、削除 0、PR 400 行の上限の中）。own-code の予算（4,000 行、OD-SHIRUBE-OWN-CODE-BUDGET-4000-FOR-S1-20261024-001）の中。
- G2: 2 file の数行の置き換え。
- この記録と設計監査の項目集合は docs だけの PR（R1）に置く。

## 8. 検証可能性と独立性

- 設計の記録（この file）は arc が書いた。PR は shirube の席が作り、監査は devauditor、統合は suite-lead（作者と別の席）。
- 引く記録: [OD] #49 6404453776（本文 sha256 `8062d996…`）、[WO] #24 6404479439（`b7164d35…`）、[OBS] #24 6394017590、G1 の報告 #24 6404631799、G1 の実装監査 [IA] shirube#69 6404803377、suite-lead の統合の条件 #24 6404494978、T154 #49 6301299856。
- この設計監査の受領が、G1 の実装監査のやり直し（[IA] の BF-G1-PREAUDIT-01 の解消）と G2 の実装の前提になる。

## 9. 参照

- [OD] https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6404453776
- [WO] https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6404479439
- [OBS] https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6394017590
- [IA] https://github.com/watchout/shirube/pull/69#issuecomment-6404803377
- T154 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6301299856
