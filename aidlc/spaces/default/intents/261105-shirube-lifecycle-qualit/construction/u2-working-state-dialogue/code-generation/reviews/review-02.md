## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-18T08:03:34Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | scripts/working-state/guidance.mjs:60（worktree /Users/yuji/Developer/.worktrees/shirube-u2-design）、wrong_target の行 | wrong_target の案内は、出典の file が名指した対象名（`namedTarget`）を、長さ 64 以下で制御文字が無ければそのまま案内の text に写す。秘密らしさの判定（BR5.2 の集合 a〜e）は通らない。実測: `namedTarget` に `ghp_` で始まる 40 文字の架空 token を入れた wrong_target の項目から `buildGuidance` を呼ぶと、`guidance.text.includes(token)` が true だった。同じ text は `selectionToC02Wire` の guidance として U3 へ渡る。試験（working-state-guidance-text T7 系）が負例にしているのは長すぎる名前・改行・「」・ESC だけで、秘密らしい名前の負例は無い。攻める側に要る最小の権限は、consuming repo の対象を名指す欄に秘密らしい文字列を置ける（または誤って置かれる）こと。U2 には `namedTarget` を読む取り出しは無く、届くのは U3 の配線の後。大きさは資格情報の漏れ（致命）、起きやすさは低（既に file にある値の写しで、置くには条件が要る）。 | 案内に写す前に、`namedTarget` を value-exposure の判定（`classifyValue`）に通し、secret_like・invalid_format なら「対象の名前は表示しません」にする。あるいは対象名の許される形（参照名の形）に限る。秘密らしい架空の対象名の負例を試験に足す（token は分割して書き、gitleaks に拾われない形にする）。直せない場合は、U3 の配線で渡す前に判定する契約として「U2 が保証しないこと」に書く。 | Resolved (reviewer) |
| R-02 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/code-generation/traceability.json > coverage の NFR6.2・NFR4.3・NFR1.1a・NFR8.1a・BR9.4・AC1.3.3 | 試験が直接見ていない項目が OK と数えられている。NFR6.2（自動の再試行 0 は起動回数 1 の試験で間接）、NFR4.3（共有の可変の状態の専用の試験なし）、NFR1.1a・NFR8.1a（記録だけで試験なし）、BR9.4（専用の試験なし）、AC1.3.3（BR9.3 の部分は Deferred なのに OK）。code-summary.md の備考には開示されているが、機械の読み手には OK だけが見える。OK の target はどれも code-summary.md で、試験の実在は機械で確かめられない（開示済みの外れ）。実際に試験 file の SHA-256 は worktree の実物と照合して一致した（answers.mjs・probe-run.mjs・answers-order・knip.jsonc を確認）。 | 追跡表の該当 entry の `note` に「間接」「記録のみ」「部分」を書き、AC1.3.3 は BR9.3 の部分を `note` で明示する。後の単位で作業場の木が更新された時に、試験 file の実在を機械で確かめる形へ戻す。 | Resolved (reviewer) |
| R-03 | Minor | scripts/working-state/probe-run.mjs:51-58（stopGroup・halt）と scripts/working-state/read-check.mjs の interpretProbe | 子を止めたか確かめられなかった場合（`stop.confirmed === false`）も、LC2 は `stop.reason` だけを読み、timed_out か budget_exceeded にする。`confirmed` はどこでも読まれない。成功には読み替えないので S8 には反しない（試験 T2.2 で確認）。ただし、止まらなかった子の残存が観測結果に現れず、原因が確かめられた停止と同じになる。 | 止めた確認が false の時は、notes に固定の印（件数だけ）を足して記録に残すか、残存の可能性を「U2 が保証しないこと」に書く。macOS の EPERM は groupGone が ESRCH だけを「消えた」と読むので、失敗側（false）に倒れることを確認した。 | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/code-generation/code-summary.md > 試験の実行と TDD | Red の証拠が弱い。Step 3〜9 の Red は「module・関数が無い」型で、挙動の食い違いを示した Red ではない。さらに 11 件の Green の commit が既存の試験 file を変更し、そのうち 6 件の試験の追加（T5.2-・T5.1-・T1.4+・T6.2m・T2.2 の 2 件）は Red を経ていない。code-summary は再実行の表であること、先に落ちる確認を経ていないことを自ら開示している。379 件が通る（node v24.22.3、379 pass / 0 fail / cancelled / skipped / todo）ことと、逆の確かめ（origin/main で 1256、差が 379）が補う。 | 開示のとおり PR 本文に残す。追加の試験は、その実装を一時的に壊して落ちることを確かめた記録を足すか、PR の独立監査の項目に残す。 | Resolved (reviewer) |
| R-05 | Major | scripts/working-state/guidance.mjs:107（`根拠の参照: ${draft.observationRefs.join(", ")}`）、由来は scripts/working-state/observation.mjs:90（`observationId` = `itemKey\|sourceKind\|locator\|observedAt`） | R-01 と同じ種類の漏れが、別の道で案内の文と C02 の受渡し形に残る。架空の token 形（`ghp_` + `u`×12）を sds_pin の locator にして観測し、buildDraft → buildGuidance を流すと（作業用の script、worktree は変えていない）、`sds_pin:（表示しません）` と伏せた行のすぐ下の「根拠の参照:」の行に `sds_commit\|sds_pin\|ghp_uuuuuuuuuuuu\|…` がそのまま出た（`guidance.text.includes(secret) === true`）。observationRefs は guidance.observationRefs・draftToC02Wire（c02-wire.mjs:44）・selection の observationRef にも渡る。伏せる行を直しても、同じ案内の文の中で値が見える。code-summary.md の持ち越しの節は「candidateRef は案内の文ではない」と書くが、案内の文に出る道はそちらではなく observationRefs で、開示は実態より狭い。攻める側に要る最小の権限: 読み取り要求の locator を決められること（呼出側の adapter か、対象の根の下で読まれる file 名を決められること）。初期の項目一覧の locator は固定の名前なので、U2 単体では呼出側の制御の範囲。対象外の前提（root・Owner の端末）には当たらず、大きさは致命（秘密の漏れ）、起きやすさは低〜極低。 | 案内の `根拠の参照` の行に出す参照を、同じ classifyValue の判定に通して「（表示しません）」にするか、observationId から locator を外す設計の判断を Owner に諮る。直せないなら、code-summary.md の持ち越しの節に「observationRefs が locator を含み、案内の文・C02 の wire に出る」と書き、「U2 が保証しないこと」に足して独立監査の項目にする。candidateRef と同じく設計の判断なので、直す場合も判定の持ち主は value-exposure の 1 か所のままにし、規則を足さない。負例の試験（秘密らしい locator で「根拠の参照」と wire に写らない）を足す。 | New |
| R-06 | Minor | scripts/working-state/guidance.mjs:29 | `const [, , SECRET_LIKE] = VALUE_CLASSIFICATIONS` は配列の位置 3 番目に結ばれる。value-exposure 側が分類の並びを変えると、黙って別の分類を「秘密らしい」と読み、伏せる判定が外れる。 | 分類の名前を value-exposure から名前つきで export して使うか、並びを固定する試験を足す。 | New |

> R-01 Reviewer note: 対象違いの名前（guidance.mjs:60）と出典の種類・位置（guidance.mjs:33-34 `nameOr`/`sourceName`）は、classifyValue に通す形になった。判定は value-exposure の 1 か所のままで、規則の重複は無い（SECRET_LIKE は VALUE_CLASSIFICATIONS から取る）。T7.7- の 2 試験は、旧 `safeOr` なら秘密らしい名前が安全な文字・64 字以内で通って案内の文に出るため、旧実装では落ちる実の負例（code-summary.md の 2 回の Red 失敗の記録と合う）。ただし同じ locator が案内の別の行に残る。下の新しい指摘を参照。

> R-02 Reviewer note: NFR6.2・NFR4.3・NFR1.1a・NFR8.1a・BR9.4・AC1.3.3 の note に「試験が直接見ていない」「間接」「記録だけ」が入り、AC1.3.3 は BR9.3 の部分が Deferred と明記された。

> R-03 Reviewer note: `stop.confirmed === false` の子の残存は、code-summary.md の「記録に出ない既知の限り」に、根拠の grep つきで開示された。許された直し方の 1 つ（限りとして書く）に当たる。

> R-04 Reviewer note: Red を経ていない 6 件の追加試験と Step 3〜9 の Red の弱さは、code-summary.md の独立監査の項目に開示された。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `node --test tests/working-state-*.test.mjs`（node v24.22.3、worktree HEAD 6d84b3c） | tests 381 / pass 381 / fail 0 / cancelled 0 / skipped 0 / todo 0 | 作者の報告と一致 |
| `node --test tests/working-state-coverage.test.mjs`（LC7） | tests 9 / pass 9 / fail 0。記録は `verdict: pass`・`observation: observed`・25 file すべて 100%（guidance.mjs は 120/120）・子の試験 372 件 pass・unobserved 空 | 行の網羅率 100% を観測から確認 |
| `git diff --stat origin/main -- package.json package-lock.json .github .shirube scripts/hygiene` | 出力なし | 保護対象への変更なし |
| `git diff --stat origin/main -- knip.jsonc` | 1 行追加・1 行削除 | 申告どおり |
| SHA-256（`git show HEAD:<path>`） | guidance.mjs `ee9ac9ea…f698`、tests/working-state-guidance-text.test.mjs `f93eb1ac…0212a`、item-state.mjs `7e325d8a…cc53`、probe-run.mjs `b581642d…29cf9`、read-check.mjs `a298d84a…678e` | code-summary.md の表のうち guidance.mjs・item-state.mjs・probe-run.mjs・read-check.mjs は一致。tests/working-state-guidance-text.test.mjs の値は表に見つけられず、本文の差分の記述の確認に留まる（観測できなかった分として記録） |
| 秘密らしい locator での再現（scratchpad の作業用 script） | 「根拠の参照」の行に locator が出た。questions は空（初期の項目一覧に選べる食い違いの項目が無いため）。candidateRef の道は、選べる項目が一覧に入るまで実際には到達しない | 上の Major の根拠。candidateRef は開示のとおり潜在の道 |

### Summary

R-01 の直し（対象の名前・出典の種類と位置を classifyValue に通す）は正しく、判定の複製もなく、T7.7- は実の負例です。R-02〜R-04 は開示で足りています。ただし同じ locator が案内の「根拠の参照」の行と C02 の wire に生のまま残り、開示は candidateRef しか挙げていないので、これを Major として残します。Major は 1 件で、READY の条件（Critical 0・Major 2 以下）の内です。独立監査では、この件と candidateRef を合わせて設計の判断として見てください。
