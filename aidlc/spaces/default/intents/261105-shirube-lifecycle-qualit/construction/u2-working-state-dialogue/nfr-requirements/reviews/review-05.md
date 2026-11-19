## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-18
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
| R-10 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/performance-requirements.md > NFR6.1 の合否欄 | ローカル読取り・子 process に profile が足りない場合は Build and Test で測ると書いているが、足りなかった時の扱いは後続分担欄の 1 文だけで、合否欄に負例が無い。 | 合否欄に「予算の不足で正常な対象が観測不能になる場合は、その差を記録し、成功にも黙った緩和にもしない」という負例を足す。 | Unresolved |
| R-11 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > NFR2.2 要件欄の括弧書き | 「理由は固定の分類で、現行の規則では secret_like のみ。FD-GAP-2 の直しで分類が増えても…」が古いまま。FD-GAP-2 は直し済みで、同じ file の「機能設計の直し（済み）」は固定の拒否分類を secret_like と invalid_format とし、機能設計 rules.md の BR5.2 も secret_like・invalid_type・too_long などを挙げている。同じ file の中で分類の数が食い違う | 括弧書きを「理由は入力から作らない固定の分類（機能設計 BR5.2 の集合）。分類が何であっても、入力が写らない・value も digest も持たない条件は変わらない」の形に改め、「のみ」と「増えても」を外す | Unresolved |
| R-12 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/performance-requirements.md > 表の下の matchGroup の段落 | 開いた形の matchGroup 比較は「追加の読取り・回数・時間を作らず、予算に新しい消費を足さない」という要件だが、ID も合否欄も無い。ほかの要件は表の ID・合否（負例つき）で追跡しているので、この文だけ追跡表（traceability.json）と試験に結べない | NFR6.1a の補足か、新しい派生 ID（例 NFR6.1d）として表に入れ、合否を足す（例: 開いた形の一致比較で追加の取得 0・予算の消費の増加 0 を負例つきで示す）。traceability.json の NFR6 の target にも足す | Unresolved |
| R-13 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/security-requirements.md > NFR2.6 合否欄の T3.4p と traceability.json > coverage NFR2 | 見直し 08 から引き継いだ withheld の不変条件の試験 T3.4p（長さの区分・一致の番号なし、一致の採番に入らない、判定できない時は secret_like）は、NFR にだけ ID があり、機能設計 rules.md BR3.4 の tests 欄（T3.4+・T3.4-・T3.4o）にも機能設計の試験の一覧にも無い。作る段が機能設計の試験一覧だけを見ると拾い落とす | NFR2.6 に「T3.4p は機能設計の試験一覧に無い新しい試験で、Code Generation の試験計画に足す」と明記する（機能設計側へ足すのは持ち越しでよい） | New |
| R-14 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/reliability-requirements.md > NFR4.2・NFR5.1 の合否、security-requirements.md > NFR2.6 | 「同じ分類の中での中身だけの変化は検出しない」の「中身だけ」が定義されていない。機能設計 BR6.2 は、開いた形でも presence・lengthBucket・matchGroup の変化は検出する（T8.3o の入力は「長さの区分と一致の番号が同じ」入力）と書いている。NFR の文面のままだと、同じ分類で長さの区分だけが変わる入力に「検出しないことを固定する負例」を書く誤読ができ、BR6.2 と矛盾する。保証を広げる方向の矛盾ではないので Minor | 「検出しない」の範囲を「同じ分類・同じ presence・同じ lengthBucket・同じ matchGroup の中での値だけの変化」と書き、長さの区分・一致の番号の変化は検出する（BR6.2）と 1 文足す | New |
| R-15 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/performance-requirements.md（matchGroup の段落）・scalability-requirements.md > Not Set | 「分類を開いた形の事実に入れるのは arc の読みで Owner に確認中」の注記が security・reliability・tech-stack・observability・traceability にはあるが、performance の「開いた形の固定の分類の判定（F02）」と scalability の「F02」の文には無い。Owner の権限として引いてはいない（誤りではない）が、Owner が別の読みを示した時に直す場所の一覧から漏れる | 2 つの文に「F02、arc の読みで Owner に確認中」と添える。あわせて Owner が別の読みの時に直す文書の一覧を security の該当節に 1 行置く | New |
| R-16 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-requirements/reliability-requirements.md > NFR4.2 の「合否」列 | 要件の文には T6.2m〜p が引かれているが、合否の列の負例は「古い応答が後から届く」「開いた形の中身だけの変化」のままで、今回足した判定の順の合否が載っていない。T6.2p（別の出典が wrong_target・invalid・conflict・unobservable に変わったら、値が回答と一致しても一致を確認と示さず無効にする）は、この直しの中心の負例であり、合否の列に無いと NFR4.2 の合否だけを読む人が見落とす。機能設計側に T6.2m〜p は定義済みなので、試験に結べないほどではない | 合否の列に「全出典が回答と同じ値なら観測 digest が変わっても一致を確認（T6.2m）、別の出典が 4 状態のどれかなら値が一致しても無効（T6.2p）、値が食い違う・観測できない・開いた形は無効（T6.2n・o）」と 1 文足す。作る段の試験の手順で足してもよい | New |

> R-06 Not re-checked this round

> R-10 Not re-checked this round

> R-11 Not re-checked this round

> R-12 Not re-checked this round

> R-13 Not re-checked this round

> R-14 Not re-checked this round

> R-15 Not re-checked this round

### Validation Tool Results
| Tool | Result | Interpretation |
|---|---|---|
| (none listed) | n/a | この段の定義に検証ツールは無い。traceability.json は JSON として読めることだけ確認した。 |

### Summary
NFR4.2 の新しい文は、機能設計の BR6.2 の (1)・(2)、BR6.3、W06 手順 1、T6.2m〜p と条件（閉じた形、値の digest の一致、4 状態の出典が無い）・分岐とも一致し、開いた形を (2) に入れる扱いも保たれている。draft・selection の無効化は BR8.3 のとおり別の文で残り、数値・予算・ほかの NFR は変わっていない。「影響しない」と書いた各文書も確認した。NFR2.6 の withheld・開いた形は (1) に入らず従来どおり、NFR5.1 は不一致の文面が合わなくならず、NFR9.2 の「一致を確認」は閉じた形で全出典が同じ値の時だけという書き方で矛盾しない。Critical・Major は無く、Minor 1 件（合否の列の書き足し）だけなので READY。
