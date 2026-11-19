## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17 (依頼に `Date for this review:` の行が無かったため、実行環境の日付を使用)
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/traceability.json > coverage NFR1 と tech-stack-decisions.md NFR1.1c・observability-requirements.md NFR1.1b・performance-requirements.md NFR1.1a | NFR1 の対応先に「NFR1.1」と書いてあるが、6 文書のどこにも NFR1.1 という ID の要件が無い（1.1a・1.1b・1.1c だけ）。行の網羅率 100% が 3 文書に分かれ、まとまった合否が無い。NFR1.1c には合否の列が無く、負例（分母 0・部分集合・skip・閾値緩和・除外）も書かれていない。NFR1.1b は分母 0 を「失敗または未確認」と書き、どちらかが決まらない。上流 NFR1 が求める「scripts と適用される src を含む」「除外は項目・理由を PR に書き独立監査で確認」も、どの NFR にも写っていない。分母を未確定とする書き方自体は正直で、100% 達成済みとも書いていない | NFR1.1 を 1 つの要件として立てる（または traceability の対応先を実在する 1.1a・1.1b・1.1c に直す）。合否を分母 0・未計測・部分集合・skip・閾値緩和・計測不能の負例まで書き、分母 0 は「失敗」に一本化する（「未確認」を成功側に読ませない）。除外は項目と理由を PR に書き独立監査で確認する旨と、対象に scripts と適用される src を含む旨を足す | New |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/performance-requirements.md > NFR6.1・NFR6.1a | 予算の扱いが 3 点で決まらず、実装者が推測することになる。(1) NFR6.1 の合否は「予算が呼出側の値で拡大・無限化されない」だが、共通契約（contract-summary の budget）は予算を外側から渡す入力（AdmissionContext.budget）としており、U2 で予算を誰がどの経路で決めるかが無い。(2) その profile の値（maxRequests・maxBytesPerResponse など）は GitHub への取得向けで、ローカル file の読取りと子 process（BR1.4・A-03）に当てはまる証拠が無い（「Build and Test で実測」とだけある）。(3) NFR6.1a は「1 件の超過で他の項目を保つ」とするが、引いている BR3.4 は破損 file の規則で、予算超過の規則ではない。BR1.4 は全体の回数・時間を超えたらそこで止めるとあり、残りの出典は読めないので「他の項目は保たれる」と食い違う可能性がある | U2 での予算の入力経路（信頼する profile を固定で読むのか、呼出側が渡すのか）と、呼出側が緩めた値を拒否する負例を決めて書く。ローカル読取りと子 process に使う予算の項目（時間・回数・大きさ）と、profile の値が足りるかは未確認と明記する。NFR6.1a は引用先を BR1.3・BR1.4 に直し、「全体の予算を使い切った後の残りの出典は観測不能」の扱いを書く（または機能設計へ戻す） | New |
| R-03 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > NFR2.1 | 「書ける資格情報を観測・試験・汎用 build に渡さない」の根拠として BR2.1 を引いているが、BR2.1 は未導入の確定条件の規則。資格情報の規則は BR1.4（読取り経路に書ける資格情報を要求しない）で、後半（権限拒否を未導入にしない）だけが BR2.1 に当たる | 前半の根拠を BR1.4 に直し、BR2.1 は後半に付ける | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > NFR2.2 と「機能設計の直し待ち」FD-GAP-2 | 「本書はその直しに左右されない形で書く」と言いながら、NFR2.2 は「理由は固定の分類 secret_like のみ」と、FD-GAP-2 が見直しの対象にしている点を固定して書いている。直しで拒否の分類や valueType が変わると、NFR2.2 の文面が合わなくなる | NFR2.2 の分類名は BR5.2 の現行の定めを指す書き方（「機能設計が定める固定の分類」）にし、負例の合否は「入力が理由・案内・ログに写らない」だけで成り立つ形にする | New |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/traceability.json > pending_functional_design_fixes FD-GAP-3 の affects と reliability-requirements.md NFR4.1 | FD-GAP-3 の影響先を NFR2.2・NFR4.1 としているが、reliability-requirements.md の NFR4.1 には FD-GAP への言及が無い。逆に observability の FD-GAP-3 は対応する NFR が書かれていない。3 件の名指しが文書ごとに食い違う（performance・scalability・tech-stack には言及なし） | 影響先の NFR に FD-GAP の参照を足すか、traceability の affects を各文書の記載に合わせて直す | New |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > 「機能設計の直し待ち」冒頭の「Owner の決定 95」 | 直しを確認の段の前に必ず行う条件の根拠を「Owner の決定 95」とだけ書いており、公開本文の URL と SHA-256 が NFR 文書・traceability に無い（URL は questions 末尾にあるが SHA-256 は無い） | 条件の根拠を `control_source_ref`（URL と本文 SHA-256）で引くか、「arc が入力した条件」とだけ書いて Owner の権限として引用しない | New |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/scalability-requirements.md > NFR4.3 | NFR4.3 は引用する BR が無く、機能設計の規則に結び付かない（対話ごとの状態の分離は BR6.1 などから導けるが明記が無い）。reliability の NFR4.1 など他の NFR は BR に結び付いている | 根拠の BR（例: BR6.1）を示すか、機能設計に無い新しい要件であることを明記する | New |
| R-08 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/tech-stack-decisions.md > NFR1.1c | 行の網羅率の測り方について、この取り組みで既に採った実践（依存を入れた環境で既存の試験が全部通ることを確かめてから値を読む、除外は範囲の内容の SHA-256 で名指す、報告の形が取れない版は失敗）が NFR に書かれていない。後の設計・Code Generation が拾い落とす恐れがある | NFR1.1 の合否にこれらを短く足す、または Infrastructure Design で確定する項目として明記する | New |
| R-09 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/ 全体 > S1・S6・S9 | S2〜S5・S7・S8 は明示されているが、S1（引退）・S6（新旧同居）・S9（資格情報）の適用または非適用の理由が一箇所にまとまっていない（S6 は NFR8.2、S9 は NFR2.1、S1 は未記載で、いずれも保存しない U2 では非適用と読めるが書かれていない） | S1 を「何も永続化しないので非適用」と 1 行明記し、S6・S9 の参照先を揃える | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| 規則 ID の実在確認（rules.md の BR1.1〜BR9.4 を目視で突き合わせ） | 6 文書が引く BR（BR1.2・1.4・1.5・1.6・2.1・2.3・3.1・3.4・5.1〜5.4・6.1〜6.3・7.1〜7.7・8.1〜8.4・9.1・9.3・9.4）はすべて実在し、規則数も「42」と一致。内容の食い違いは NFR2.1 と NFR6.1a の引用先のみ | 引用先の不一致は上の Minor・Major に記載 |
| FD-GAP-1〜3 と機能設計の突き合わせ | FD-GAP-1: BR4.1 は質問を userAnswerable な項目に限り、BR4.2 は unobservable・wrong_target・利用者が直せない invalid の行き先だけを定めており、答えられない項目の conflict・missing の行き先が無い（記述は正確）。FD-GAP-2: entities.md の ItemCatalogEntry には valueType があるが initialCatalog の各項目に無い（正確）。FD-GAP-3: BR3.2 の選択が Answer と GuidanceSelection.candidateRef の両方に現れる（正確） | 3 件とも実在し、traceability.json と NFR 文書に名指しされている |
| NFR1〜NFR10 の被覆 | NFR7 は BR8.4 を根拠とする非適用で妥当。他は NFRx.y で覆われているが、NFR1 の「NFR1.1」だけ実在しない | 上の Major（NFR1.1）に記載 |
| 数値の確認 | p95・スループット・稼働率は置かれず、予算は共通 profile の参照で複製なし（S3 に適合）。profile の適合性は上の Major（予算）に記載 | 作り事の数値は無い |

### Summary

NFR1〜NFR10 の被覆、根拠のない数値を置かないこと、行の網羅率の分母を未確定と正直に書くこと、FD-GAP-1〜3 の名指しと正確さは満たしている。残る問題は、実在しない「NFR1.1」の参照と合否のまとまらない網羅率の要件、および予算の入力経路・適用範囲・単位ごとの超過の扱いの 3 点で、いずれも要件の書き直しで直せる範囲のため、Major 2 件・Minor 7 件で READY とする（Code Generation の前に Major 2 件を直すことを強く勧める）。
