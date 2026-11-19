## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/traceability.json > coverage NFR1 と tech-stack-decisions.md NFR1.1c・observability-requirements.md NFR1.1b・performance-requirements.md NFR1.1a | NFR1 の対応先に「NFR1.1」と書いてあるが、6 文書のどこにも NFR1.1 という ID の要件が無い（1.1a・1.1b・1.1c だけ）。行の網羅率 100% が 3 文書に分かれ、まとまった合否が無い。NFR1.1c には合否の列が無く、負例（分母 0・部分集合・skip・閾値緩和・除外）も書かれていない。NFR1.1b は分母 0 を「失敗または未確認」と書き、どちらかが決まらない。上流 NFR1 が求める「scripts と適用される src を含む」「除外は項目・理由を PR に書き独立監査で確認」も、どの NFR にも写っていない。分母を未確定とする書き方自体は正直で、100% 達成済みとも書いていない | NFR1.1 を 1 つの要件として立てる（または traceability の対応先を実在する 1.1a・1.1b・1.1c に直す）。合否を分母 0・未計測・部分集合・skip・閾値緩和・計測不能の負例まで書き、分母 0 は「失敗」に一本化する（「未確認」を成功側に読ませない）。除外は項目と理由を PR に書き独立監査で確認する旨と、対象に scripts と適用される src を含む旨を足す | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/performance-requirements.md > NFR6.1・NFR6.1a | 予算の扱いが 3 点で決まらず、実装者が推測することになる。(1) NFR6.1 の合否は「予算が呼出側の値で拡大・無限化されない」だが、共通契約（contract-summary の budget）は予算を外側から渡す入力（AdmissionContext.budget）としており、U2 で予算を誰がどの経路で決めるかが無い。(2) その profile の値（maxRequests・maxBytesPerResponse など）は GitHub への取得向けで、ローカル file の読取りと子 process（BR1.4・A-03）に当てはまる証拠が無い（「Build and Test で実測」とだけある）。(3) NFR6.1a は「1 件の超過で他の項目を保つ」とするが、引いている BR3.4 は破損 file の規則で、予算超過の規則ではない。BR1.4 は全体の回数・時間を超えたらそこで止めるとあり、残りの出典は読めないので「他の項目は保たれる」と食い違う可能性がある | U2 での予算の入力経路（信頼する profile を固定で読むのか、呼出側が渡すのか）と、呼出側が緩めた値を拒否する負例を決めて書く。ローカル読取りと子 process に使う予算の項目（時間・回数・大きさ）と、profile の値が足りるかは未確認と明記する。NFR6.1a は引用先を BR1.3・BR1.4 に直し、「全体の予算を使い切った後の残りの出典は観測不能」の扱いを書く（または機能設計へ戻す） | Resolved (reviewer) |
| R-03 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > NFR2.1 | 「書ける資格情報を観測・試験・汎用 build に渡さない」の根拠として BR2.1 を引いているが、BR2.1 は未導入の確定条件の規則。資格情報の規則は BR1.4（読取り経路に書ける資格情報を要求しない）で、後半（権限拒否を未導入にしない）だけが BR2.1 に当たる | 前半の根拠を BR1.4 に直し、BR2.1 は後半に付ける | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > NFR2.2 と「機能設計の直し待ち」FD-GAP-2 | 「本書はその直しに左右されない形で書く」と言いながら、NFR2.2 は「理由は固定の分類 secret_like のみ」と、FD-GAP-2 が見直しの対象にしている点を固定して書いている。直しで拒否の分類や valueType が変わると、NFR2.2 の文面が合わなくなる | NFR2.2 の分類名は BR5.2 の現行の定めを指す書き方（「機能設計が定める固定の分類」）にし、負例の合否は「入力が理由・案内・ログに写らない」だけで成り立つ形にする | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/traceability.json > pending_functional_design_fixes FD-GAP-3 の affects と reliability-requirements.md NFR4.1 | FD-GAP-3 の影響先を NFR2.2・NFR4.1 としているが、reliability-requirements.md の NFR4.1 には FD-GAP への言及が無い。逆に observability の FD-GAP-3 は対応する NFR が書かれていない。3 件の名指しが文書ごとに食い違う（performance・scalability・tech-stack には言及なし） | 影響先の NFR に FD-GAP の参照を足すか、traceability の affects を各文書の記載に合わせて直す | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > 「機能設計の直し待ち」冒頭の「Owner の決定 95」 | 直しを確認の段の前に必ず行う条件の根拠を「Owner の決定 95」とだけ書いており、公開本文の URL と SHA-256 が NFR 文書・traceability に無い（URL は questions 末尾にあるが SHA-256 は無い） | 条件の根拠を `control_source_ref`（URL と本文 SHA-256）で引くか、「arc が入力した条件」とだけ書いて Owner の権限として引用しない | Unresolved |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/scalability-requirements.md > NFR4.3 | NFR4.3 は引用する BR が無く、機能設計の規則に結び付かない（対話ごとの状態の分離は BR6.1 などから導けるが明記が無い）。reliability の NFR4.1 など他の NFR は BR に結び付いている | 根拠の BR（例: BR6.1）を示すか、機能設計に無い新しい要件であることを明記する | Resolved (reviewer) |
| R-08 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/tech-stack-decisions.md > NFR1.1c | 行の網羅率の測り方について、この取り組みで既に採った実践（依存を入れた環境で既存の試験が全部通ることを確かめてから値を読む、除外は範囲の内容の SHA-256 で名指す、報告の形が取れない版は失敗）が NFR に書かれていない。後の設計・Code Generation が拾い落とす恐れがある | NFR1.1 の合否にこれらを短く足す、または Infrastructure Design で確定する項目として明記する | Resolved (reviewer) |
| R-09 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/ 全体 > S1・S6・S9 | S2〜S5・S7・S8 は明示されているが、S1（引退）・S6（新旧同居）・S9（資格情報）の適用または非適用の理由が一箇所にまとまっていない（S6 は NFR8.2、S9 は NFR2.1、S1 は未記載で、いずれも保存しない U2 では非適用と読めるが書かれていない） | S1 を「何も永続化しないので非適用」と 1 行明記し、S6・S9 の参照先を揃える | Resolved (reviewer) |
| R-10 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/performance-requirements.md > NFR6.1 の合否欄 | ローカル読取り・子 process に profile が足りない場合は Build and Test で測ると書いているが、足りなかった時の扱いは後続分担欄の 1 文だけで、合否欄に負例が無い。 | 合否欄に「予算の不足で正常な対象が観測不能になる場合は、その差を記録し、成功にも黙った緩和にもしない」という負例を足す。 | New |

> R-01 Reviewer note: tech-stack-decisions.md に主の要件 NFR1.1 がある。合否（確定した分母で 100% を実測し、分母の file 一覧・行数・実測値を記録）と負例（分母 0・未計測・部分集合・skip・閾値緩和）を持ち、分母 0 は失敗と明記されている。NFR1.1a（performance）と NFR1.1b（observability）は主の要件を指し、traceability.json の NFR1 とも合っている。

> R-02 Reviewer note: NFR6.1 は信頼版 profile の値そのものを決定とし、adapter が読んで核へ明示入力として渡し、呼出側は上書きできない。ローカル読取り・子 process にも同じ 1 取得の時間と応答の大きさを当て、十分性は未測定で Build and Test で測ると書いている。NFR6.1a は 1 取得の超過と総量の超過を分け、malformed（BR3.4）と混同していない。

> R-03 Reviewer note: NFR2.1 は読取り経路の資格情報に BR1.4 を引き、権限拒否の部分に BR2.1 を引いている。

> R-04 Reviewer note: NFR2.2 は、理由の分類が現行では secret_like のみであり、FD-GAP-2 の直しで増えても条件は変わらないと書いている。

> R-05 Reviewer note: FD-GAP-3 の効果の対象は、security（NFR2.2・NFR4.1）、observability（NFR2.2・NFR4.1）、traceability.json（NFR2.2・NFR4.1）で揃っている。

> R-06 Reviewer note: 決定 95 の参照は URL のみで本文 SHA-256 が無い。作者が URL のみを受容しており、arc の入力であって Owner の権限の主張ではない。確認の段の前に SHA-256 を足すか、権限として引かない旨を明記すればよい。ブロックしない。

> R-07 Reviewer note: NFR4.3 に根拠（Q2 = A で何も永続化しない、BR9.1 の明示入力）が付いた。

> R-08 Reviewer note: NFR1.1 に、範囲の内容の SHA-256 による除外、依存を入れた環境での測定、NFR1.1b に子 process の lcov 解析と、報告の形が取れない版は失敗にする旨が入った。

> R-09 Reviewer note: tech-stack-decisions.md の統合行で S1・S6・S9 の適用と非適用を 1 か所に示した。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| 相互参照の手動確認 | 通過 | NFR1.1・1.1a・1.1b、NFR2.1〜2.5、NFR3.1〜3.2、NFR4.1〜4.3、NFR5.1・5.1a・5.2、NFR6.1・6.1a・6.1b・6.1c・6.2、NFR8.1・8.1a・8.2、NFR9.1〜9.2、NFR10.1〜10.2 が traceability.json の coverage と一致し、要件 ID の重複は無い。 |
| BR 数の確認 | 42 件 | NFR1.2 の「FD の 42 規則」と一致する。 |

### Summary

前回の Major 2 件と Minor 7 件のうち 8 件は直っており、R-06 のみ Minor として残る。編集による新しい矛盾は無く、新規の指摘は Minor 1 件で、Critical 0・Major 0 のため READY とする。
