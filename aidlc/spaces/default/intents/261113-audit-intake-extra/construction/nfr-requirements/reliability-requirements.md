**Collaborator:** aidlc-architect-agent

# 信頼性の要件（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file。受付は 1 回の起動で判定して終わる、読み取りだけの処理で、稼働率の目標（SLA・SLO）を持たない。ここで決めるのは、**後方互換・決定性・どの時点で止まっても安全であること・戻し方**。

## 上流

- requirements: `aidlc/spaces/default/intents/261113-audit-intake-extra/inception/requirements-analysis/requirements.md`（NFR1・NFR2・NFR6）。
- functional-design: `aidlc/spaces/default/intents/261113-audit-intake-extra/construction/functional-design/functional-spec.md` §3・§4・D6・D7、`rules.md` BR2.1・BR3.4・BR3.5。

## 要件

| ID | 要件 | 測り方 |
|---|---|---|
| NFR2.1 | 宣言を持たない依頼の判定結果と、拒否の理由の文は、基準の版と変わらない（既存の 3 つの拒否の文を含む。D6）。受理する時の出力の形・値も変わらない | 既存の試験 2 本（`tests/audit-admission.test.mjs`・`tests/audit-counterexamples.test.mjs`）を変更せずに流して通ること（FR4.4）。宣言のない 2 つの checkout が今と同じ理由で拒否される回帰の負例（FR4.2） |
| NFR2.2 | `verifyAudit(args, api, now)` の入口の形・命令行の引数・出力の形を変えない。`scripts/sds/gate.mjs` と `design-gate.mjs` の呼び出しは変更なしで動く | 差分に両 gate の file の変更が無いこと。`verifyAudit` の引数の個数と順序が基準の版と同じであること |
| NFR2.3 | 版の食い違いは拒否側に倒れる。中継が固定している古い checker は新しい欄を無視し、2 checkout の PR を今と同じく拒否する（安全）。新しい checker が古い形の依頼を受けても、宣言なしとして今と同じに扱う | 宣言なしの依頼の回帰（NFR2.1）。古い checker の挙動は、基準の版の checker に新しい欄つきの依頼を渡す差分の試験ではなく、基準の版の判定の読みと、要件の Open questions の記録で確かめる（古い bytes を試験に持ち込まない） |
| NFR1.6 | どの時点で止まっても、(1) 止まったことに気づける（拒否や「観測できず」を成功と記録しない）、(2) 作りかけを片付けられる（受付は保存しない・書かないので、片付けるものが無い）、(3) 決まった状態からやり直せる（同じ依頼を同じ版の checker にもう一度渡せる）、(4) やり直しても効果が二重に出ない（読み取りだけで、外への効果が無い） | 例外で止まる負例が BLOCKED と理由を返し、`process.exitCode = 1` になること（今の入口の形）。同じ入力を 2 回流して同じ出力になること（NFR6.1） |
| NFR6.1 | 決定性（S4）。判定は、依頼・job の記録・GitHub の応答・呼び出し側が渡す `now` と `api` だけで決まる。同じ入力 2 回で出力が 1 byte も違わない | 同じ入力と同じ差し込みで 2 回流し、出力の文字列が一致すること（正例と代表の負例） |
| NFR6.2 | 新しく足す判定の関数は、現在時刻・乱数・識別子を自分で取らない（`Date.now`・`new Date()` の引数なし・`Math.random`・`randomUUID` を足さない）。時刻の既定の取得は、今ある入口の引数の既定値 1 か所のまま（アダプタの端） | 差分の確認と、足した行に上の語が現れないことを `grep` で測った結果を記録に書く |
| NFR6.3 | 外への効果は無い（読み取りだけ。S7 は適用外の理由: 副作用の無い読み）。問い合わせは冪等で、同じ宣言を何度問い合わせても結果は同じ | 受付が GitHub への書き込み・ファイルの書き込みの呼び出しを足さないこと（差分の確認） |

## 戻し方・同居（S6）

- 受付は schema・DB を持たず、依頼の schema の版も `/1` のまま（欄を足すだけ）。戻すには、この取り組みの commit を `git revert` で取り除けば、基準の版の振る舞いに戻る（試験で確かめる戻りは、既存の試験 2 本が変更なしで通ること）。
- 新旧の同居: 新しい checker は古い形の依頼を受け、古い checker は新しい欄を無視して拒否する（NFR2.3）。追加 → 移行 → 削除の順の変更は無い（削除を含まない）。
- 中継の固定の版を替えるまでは、2 checkout の PR は通らない。これはこの取り組みの外（CTO）。

## 対象外

- 稼働率・復旧時間の目標、冗長化、バックアップ（受付は保存しない。起動のたびに独立）。
- 実 CI の job の記録の実物での確かめ（取得できる場合は build-and-test）。
