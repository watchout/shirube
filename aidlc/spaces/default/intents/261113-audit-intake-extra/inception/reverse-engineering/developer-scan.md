**Collaborator:** aidlc-developer-agent

# 監査の受付の走査（audit-intake-extra）

## Developer Code Scan Results

事実の基準は公開 main `1dd43e457361d9650153578baa71120788285e98` の実物（作業用の clone の `origin/main`）。作業場の木は古く、手元の別の変更を含むので基準にしない。この走査はこの会話の席が担当し、developer の役の呼び出しは行っていない（Owner の画面での選択）。試験・build・CI・CLI は実行していない。

### 見つけた構造

- `scripts/hygiene/audit-admission.mjs`（180 行）は、Node 組込みと `./lib.mjs` の `parseArgs` だけを使う。入口は `verifyAudit(args, api, now)`（140 行）。GitHub は差し込みの `api` 関数経由で、既定は `gh api`（GET、20 秒、8 MB）。
- 依頼 `sds-audit-request/1` の検査は `requestChecks`（投稿者・schema・期限・`verifier_sha256`・作者と監査の分離・対象の重複）と `targetCheck`（head/base・check run・workflow run）。知らない欄は拒否されず無視される。
- `checkoutProof`（110〜119）は job の記録から `git log -1 --format=%H` の出力の commit を全部集め、`Set` で重複を畳み、大きさがちょうど 1 でなければ `Missing or ambiguous checkout commit` で拒否する。その commit の両親が依頼の `[base, head]` と一致することも確かめる。step の名前・repo・順序は見ない。
- 再利用の `hygiene.yml` は checkout を 2 回行う（呼び出し側の repo と、callee の固定 commit の `.shirube-tools`）。この repo 自身の `ci.yml` は同じ repo の `hygiene.yml` を呼ぶので 2 回目が同じ commit になり、1 つに畳まれる。利用先の repo が `watchout/shirube` の `hygiene.yml` を固定 commit で呼ぶ形では 2 つになる（コードからの導出。実 CI では未確認）。
- 試験 `tests/audit-admission.test.mjs` は GitHub を差し込みの `api` で置き換える。job の記録と commit の fixture は 1 つの merge の commit しか返さず、宣言された別の repo の commit を区別して返す形は無い。
- 依頼の形の記述は 3 か所（実装、`docs/sds/audit-method.md`、`kit/skills/sds-audit/SKILL.md`）。
- 受付の固定: 公開 main・中継の固定 checkout・知らされた `e94a74e9` の checker は同じ bytes（git object id `f20a9d25fc4938ecbcd4e2ed6e0ac5a2e346c89b`、中継の file の SHA-256 `0fdf596fb024b335c1cc6eb5b0d68ebbe1e16da410c94fc74f79a5985e83c38d`）。作業場の木の checker は別の手元の変更を含み、違う。

### すでにあるもの / まだ無いもの

- すでにある: checkout の証明、job と check run の結び付け、両親の検査、差し込みの試験の仕組み、欄を検査する 1 か所、固定の SHA-256 の結び付け。
- まだ無い: 追加の固定 checkout を宣言する欄と文、宣言と照合する判定、宣言した repo での commit の存在の確認、その負例、中継の固定の更新（この取り組みの外）。

### 未確認・限界

- 試験の実行結果・網羅率・行数（試験 file）は測っていない。
- 実 CI で 2 つの checkout が起きた時の job の記録の実物は取得していない。
- 中継の設定の中身・branch protection は読んでいない。arc が知らせた固定の commit `e94a74e9` は、checker の bytes が main と同じことだけ確かめた（中継の設定自体は未確認）。

### Scan Coverage

| 項目 | 状態 |
|---|---|
| `scripts/hygiene/audit-admission.mjs` | 読んだ（全行） |
| `tests/audit-admission.test.mjs` | 構成と fixture・負例の表を読んだ。全件の逐語は読んでいない |
| `tests/audit-counterexamples.test.mjs`・`tests/helpers.mjs` | 受付と関係が無いことを確かめた |
| `docs/sds/audit-method.md`・`kit/skills/sds-audit/SKILL.md` | 依頼の形と手順の文を読んだ |
| `hygiene.yml`・`sds-gate.yml`・`ci.yml` | checkout の形を読んだ |
| `gate.mjs`・`design-gate.mjs` | checker を使う箇所の行を確かめた |
| 実行（試験・CI・CLI） | しない |

## Handoff Summary

監査の受付の checker は 1 つの checkout の CI しか受け入れず、利用先の repo が共有の hygiene を呼ぶ形（checkout が 2 つ）は拒む。依頼に宣言の欄は無く、知らない欄は無視される。直す場所は checker の `checkoutProof` 周り、依頼の形の 3 か所の文、試験の fixture。固定の checker と main は同じ bytes で、この取り組みの出口は main への統合と中継の固定の更新（後者は外）。
