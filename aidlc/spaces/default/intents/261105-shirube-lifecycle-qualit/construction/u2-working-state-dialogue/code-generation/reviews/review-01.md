## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-18T07:43:28Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | scripts/working-state/guidance.mjs:60（worktree /Users/yuji/Developer/.worktrees/shirube-u2-design）、wrong_target の行 | wrong_target の案内は、出典の file が名指した対象名（`namedTarget`）を、長さ 64 以下で制御文字が無ければそのまま案内の text に写す。秘密らしさの判定（BR5.2 の集合 a〜e）は通らない。実測: `namedTarget` に `ghp_` で始まる 40 文字の架空 token を入れた wrong_target の項目から `buildGuidance` を呼ぶと、`guidance.text.includes(token)` が true だった。同じ text は `selectionToC02Wire` の guidance として U3 へ渡る。試験（working-state-guidance-text T7 系）が負例にしているのは長すぎる名前・改行・「」・ESC だけで、秘密らしい名前の負例は無い。攻める側に要る最小の権限は、consuming repo の対象を名指す欄に秘密らしい文字列を置ける（または誤って置かれる）こと。U2 には `namedTarget` を読む取り出しは無く、届くのは U3 の配線の後。大きさは資格情報の漏れ（致命）、起きやすさは低（既に file にある値の写しで、置くには条件が要る）。 | 案内に写す前に、`namedTarget` を value-exposure の判定（`classifyValue`）に通し、secret_like・invalid_format なら「対象の名前は表示しません」にする。あるいは対象名の許される形（参照名の形）に限る。秘密らしい架空の対象名の負例を試験に足す（token は分割して書き、gitleaks に拾われない形にする）。直せない場合は、U3 の配線で渡す前に判定する契約として「U2 が保証しないこと」に書く。 | New |
| R-02 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/code-generation/traceability.json > coverage の NFR6.2・NFR4.3・NFR1.1a・NFR8.1a・BR9.4・AC1.3.3 | 試験が直接見ていない項目が OK と数えられている。NFR6.2（自動の再試行 0 は起動回数 1 の試験で間接）、NFR4.3（共有の可変の状態の専用の試験なし）、NFR1.1a・NFR8.1a（記録だけで試験なし）、BR9.4（専用の試験なし）、AC1.3.3（BR9.3 の部分は Deferred なのに OK）。code-summary.md の備考には開示されているが、機械の読み手には OK だけが見える。OK の target はどれも code-summary.md で、試験の実在は機械で確かめられない（開示済みの外れ）。実際に試験 file の SHA-256 は worktree の実物と照合して一致した（answers.mjs・probe-run.mjs・answers-order・knip.jsonc を確認）。 | 追跡表の該当 entry の `note` に「間接」「記録のみ」「部分」を書き、AC1.3.3 は BR9.3 の部分を `note` で明示する。後の単位で作業場の木が更新された時に、試験 file の実在を機械で確かめる形へ戻す。 | New |
| R-03 | Minor | scripts/working-state/probe-run.mjs:51-58（stopGroup・halt）と scripts/working-state/read-check.mjs の interpretProbe | 子を止めたか確かめられなかった場合（`stop.confirmed === false`）も、LC2 は `stop.reason` だけを読み、timed_out か budget_exceeded にする。`confirmed` はどこでも読まれない。成功には読み替えないので S8 には反しない（試験 T2.2 で確認）。ただし、止まらなかった子の残存が観測結果に現れず、原因が確かめられた停止と同じになる。 | 止めた確認が false の時は、notes に固定の印（件数だけ）を足して記録に残すか、残存の可能性を「U2 が保証しないこと」に書く。macOS の EPERM は groupGone が ESRCH だけを「消えた」と読むので、失敗側（false）に倒れることを確認した。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/code-generation/code-summary.md > 試験の実行と TDD | Red の証拠が弱い。Step 3〜9 の Red は「module・関数が無い」型で、挙動の食い違いを示した Red ではない。さらに 11 件の Green の commit が既存の試験 file を変更し、そのうち 6 件の試験の追加（T5.2-・T5.1-・T1.4+・T6.2m・T2.2 の 2 件）は Red を経ていない。code-summary は再実行の表であること、先に落ちる確認を経ていないことを自ら開示している。379 件が通る（node v24.22.3、379 pass / 0 fail / cancelled / skipped / todo）ことと、逆の確かめ（origin/main で 1256、差が 379）が補う。 | 開示のとおり PR 本文に残す。追加の試験は、その実装を一時的に壊して落ちることを確かめた記録を足すか、PR の独立監査の項目に残す。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `node --test tests/working-state-*.test.mjs`（node v24.22.3） | tests 379 / pass 379 / fail 0 / cancelled 0 / skipped 0 / todo 0 | 作者の報告と一致。 |
| `node --test tests/working-state-coverage.test.mjs`（LC7） | 9 件通る。子の記録は `verdict: pass`、`observation: observed`、分母 25 file が全部 100%（found = hit）、子の tests 370 / pass 370（379 から coverage 自身の 9 件を除いた数）、skip・todo・cancelled・timeout 0、`unobserved: []` | 行の網羅率 100% は機械が読む記録で観測できた。 |
| `git diff --stat origin/main -- package.json package-lock.json .github .shirube scripts/hygiene knip.jsonc` | knip.jsonc の 1 行の差分（`entry` に `scripts/working-state/index.mjs!` を 1 件）だけ。ほかは 0 件 | 依存・workflow・hygiene に触れていない。 |
| source-manifest.json と `git diff --name-only origin/main HEAD`（aidlc/ を除く） | manifest 63 件。変更 64 件のうち manifest に無いのは `docs/audit/u2-working-state-dialogue-design.json`（設計の PR 由来の file）だけ | 開示と一致。 |
| SHA-256 の突き合わせ（answers.mjs・probe-run.mjs・answers-order.test.mjs・knip.jsonc） | code-summary の値と一致 | 記録の値は実物と一致。 |
| 構造の確認（grep） | `Date`・`performance`・`process.env`・`setTimeout`・`node:child_process`・`node:fs` は read-file・probe-*・canonical だけ。核（value-exposure・answers・item-state・normalize・guidance・draft・observation*）に時計・乱数・環境変数・file は無い。always-pass の試験は 0（assert の無い試験に見えた 27 件は、helper の `is`・`ok`・`ng` が assert を持つ） | S4 の核の純粋さを確認。 |

### 確認した観点（所見なし）

- **開いた形の値（決定 116・120・122）**: 観測値は `factOf` が presence・lengthBucket・matchGroup・withheld だけを持ち、値と digest は入らない。判定の関数は value-exposure の 1 か所で、LC2 と LC5 が同じ関数を呼ぶ（S3）。例外は捕まえて捨て、固定の分類 secret_like だけを返す。拒否された回答は value も valueDigest も持たず、理由は固定の分類。開いた形の回答の値が現れるのは C02 の wire だけで、設計（rules.md の BR8.5・security-design SC2）が許す範囲。
- **子 process（probe-*.mjs）**: shell なし・標準入力を閉じる・自分の process group・環境変数は PATH（絞り込み後）・LANG・LC_ALL・HOME だけ・cwd は OS の根・PATH は空でなく絶対で対象の根の外の dir だけ（実体も根の外）・起動の直前に同一性を再確認・出力は読みながら数えて上限で打ち切り・時間の枠で group ごと止める。Windows は起動せず cannot_start（失敗側）。停止の確認は ESRCH だけを「消えた」と読み、EPERM は消えていないと読む（失敗側）。
- **BR6.2・BR6.3 の判定の順**: `isStale` は `answered` かつ観測 digest が変わり、かつ `closedMatches` が偽の時だけ無効にする。catalog が無い・項目が見つからない・開いた形・例外の入力は `closedMatches` が false で、従来の無効化に落ちる（一致と読み替えない）。T6.2m〜T6.2p の試験は閉じた形の一致・keep-absent・別の出典の変化・開いた形を覆う。
- **設計の記録への訂正（1〜6）**: 決定 122 の分類（invalid_format・secret_like）は `FORMATS` の開いた形と `withheld` に実装され、決定 120 の「値と digest は持たない」を緩めていない。A-08 の `SETTING_PAIR_RE`・要素数 1〜64・入れ子の深さ 8 は記録の値と一致した。
- **観測できなかった物**: gitleaks・Linux の runner・Windows・本物の子の起動・SEC-T・Node 26 と 22 の再実行は、code-summary に「観測できなかった」と書かれ、成功とは書かれていない。fixture の token は分割して書かれている（`"gh" + "p_" + ...`、`-----BEGIN ` + `PRIVATE KEY`）。

### Summary

実装は承認済みの設計に沿い、核の純粋さ・開いた形の値の扱い・子 process の枠・BR6.2 の順の直しは確認できた。379 件が通り、分母 25 file の行の網羅率 100% は機械の記録で観測できた。開いた所見は、wrong_target の案内が対象名の秘密らしさを判定せずに写す Major 1 件（U3 の配線の前に直す）と、追跡表の備考・停止の確認の記録・Red の証拠に関する Minor 3 件で、READY の条件（Critical 0・Major 2 以下）を満たす。
