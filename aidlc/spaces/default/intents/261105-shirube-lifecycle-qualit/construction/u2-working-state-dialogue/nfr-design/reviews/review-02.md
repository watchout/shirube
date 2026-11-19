## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17T06:37:21Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Dependency Direction と Components 表（LC3・LC4・LC5） | 部品どうしの流れの向きが定義されておらず、書かれた図に実際に要る辺が欠けている。図は `LC3 → LC5`（回答が観測 digest を読む）だけを示す。しかし functional-design の entities.md では draftDigest が items と answers から導かれ、ConfigurationDraft は answers を含む。LC3 が draft を作るには LC5 の回答が要る（LC5 → LC3 が欠けている）。BR4.3 は LC4 に「有効な回答がある項目は再び聞かない」を求めるので、LC5 → LC4 も欠けている。BR6.2（観測が変われば回答を無効にして項目を BR3.1 で再評価する）は LC3 と LC5 の両方の「受け持つ規則」に載り、持ち主が 2 つある。同じ BR6.2 が LC3 から LC5 へ、LC5 から LC3 へ回る循環になり、「LC3 が項目状態を決める唯一の持ち主」とも食い違う。矢印が「流れ」か「依存」かも書かれていない（「核は LC6 に依存しない」と `LC4・LC5 → LC6` が両立しない読み方もできる）。 | 矢印を「A の出力を B が読む」と定義し、LC3 の項目状態（回答を含まない）→ LC5 の回答の有効・無効（観測 digest で判定）→ LC3 または LC4 の draft・質問（回答の有効集合を引数で受ける）という一方向の形に組み直す。BR6.2・BR8.3 の持ち主を 1 部品に決め、もう一方は引数で受けるだけにして、循環が無いことを依存図で示す。 | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表 LC1 の行（BR2.1〜BR2.3） | 判定が adapter（LC1）に割り当てられており、「核は純粋・adapter は輸送と形式だけ」の主張と食い違う。BR2.2 は present / unsupported_version / cannot_start / missing / timed_out の分類、BR2.3 は観測した版と必要な版（pin など別の出典から読む値）の 3 値比較で、どちらも判定であり、必要な版は他の項目の観測を前提にするので I/O の層だけでは決められない。BR2.1（未導入の確定）も LC1 と LC2 の両方に載っている。tech-stack-decisions の NFR5.1a と reliability-design の RL3 は、判定は純粋な核、adapter は I/O と時計だけとしている。 | BR2.2 の分類と BR2.3 の版比較を核（LC2 など）へ移し、LC1 は「道具の起動・終了コードと出力の取得・時計」だけにする。BR2.1・BR1.2・BR7.2 のように 2 部品に載っている規則は、判定の持ち主 1 つと I/O の部分を分けて書く。構造の試験で LC1 に判定が無いことを確かめる、と記す。 | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/security-design.md > SC1 と SC5（子 process の起動） | 子 process の起動の安全の設計が無い。functional-design の BR2.2 は tool_node・tool_aidlc を「子 process を起動して」確かめる。security-design は読取りの path（SC5）と資格情報（SC1）だけを扱い、起動する道具を何にするか（固定の名前の集合か）、実行ファイルをどこから探すか（対象 repo の相対 path や PATH を使うと対象側の物が動く）、shell を通さないか、引数を固定にするか、子へ渡す環境変数（書ける資格情報・token を継承しないか）、cwd、標準入力、出力の大きさを決めていない。観測のために対象が用意した実行ファイルを動かす経路は、「読取り専用」「許可外の読書き 0」（SC1・SC5）の外にある。S9 も子の環境への資格情報の継承までは言っていない。 | security-design に子 process の起動の節を足す。起動する道具を catalog の固定の名前に限り、解決は対象の外の信頼した場所だけにする、shell を使わず引数は固定、環境変数は許可した名前だけを渡す（書ける資格情報を渡さない）、cwd・標準入力・出力の大きさ・時間の枠（PF1）を宣言する、対象が置いた実行ファイルの負例を試験に挙げる、を設計として書く。 | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表（規則の割り当て） | BR8.4・BR9.1・BR9.2・BR9.3 がどの部品にも割り当てられていない（BR9.1 の「同じ項目の観測が複数届いたら observedAt が最も新しい結果だけを使う」を選ぶ部品も無い）。reliability-design RL2・RL5 と security-design SC6 には書かれているが、部品表から辿れない。 | 部品表に、横断の規則（BR8.4・BR9.1〜BR9.3）の持ち主か、「全部品が守る」と書いた行を足す。観測の最新選択は LC2 か LC1 かを決める。 | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/performance-design.md > PF1（核は予算を知らない） | NFR6.1 は「adapter が profile を読み、核へ明示入力として渡す」と定めるのに、設計は「核は予算を知らない」と書く。予算超過の結果を Observation にして渡すという形は筋が通るが、要件の文と違うことが書かれていない。 | 要件どおりに核へ渡すか、渡さない理由と採らなかった代替を 1 行書く（deviation の記録）。 | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Placement Not Decided Here | functional-design の仮定 A-07（initialCatalog の出典の割当は想定で、実物の位置との突き合わせを NFR 要件・置き場の設計で行って確定する。確定までは「確認できず」）が、NFR 要件・NFR 設計のどちらにも出てこない。置き場と分母は Infrastructure Design へ送る約束があるが、A-07 は送られていない。 | Placement の節に A-07 を名指しで足し、Infrastructure Design で突き合わせて確定する、確定までは「確認できず」と示す、と書く。 | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/observability-design.md > OB5（診断は成功と失敗を区別して残す） | 「残す」「ログ」の出先が決まっていない。security-design は「ログに写らない」と書くが、U2 が何を・どこへ出すかが無い。永続化しない（Q2 = A）との境も書かれていない。 | 診断の出先（呼出側へ返す値か、試験の出力のみか）を 1 行決め、U2 自身は保存しないと明記する。 | Resolved (reviewer) |
| R-08 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表（LC1 の行）と security-design.md > SC5 | BR1.1（対象の未指定の停止・wrong_target）、BR1.4、BR1.5、BR1.6 は LC1 の「I/O の部分だけ」にしか載らず、判定の持ち主が表のどこにも無い。一方 SC5 は LC1 が `..`・symlink・循環・別綴りの同一 path を拒否し、同じ実体を 1 つとして数えると書いている。これは out_of_boundary の分類と重複の判定で、表の「LC1 は分類・比較・判定をしない」と構造の試験の項に反する。BR1.1 の targetRef 未指定の停止も持ち主が無い。 | BR1.1・BR1.4・BR1.5・BR1.6 の判定（targetRef 未指定、out_of_boundary、同一実体の重複、budget_exceeded、changed_during_read）の持ち主を LC2 または LC3 のどちらかにして表へ書く。SC5 の path の判定は、LC1 が解決後の実 path と境界の事実を返し、拒否の判定は核が行う形に直す。 | New |
| R-09 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表（LC2・LC3 の行） | BR3.4 の持ち主は LC2 とされるが、LC3 は「invalid に分ける」とも書いている。型・形式・範囲の不正（invalid）と出典の破損（malformed）が別の部品に分かれて見え、1 規則 1 持ち主の線引きが曖昧。 | invalid（値の型・形式・範囲）の判定と malformed（出典の破損）の判定の持ち主を表で明示する。 | New |
| R-10 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/security-design.md > SC1a の時間・出力の枠 | 枠を超えた時に「子を止める」とだけあり、子が孫を作った場合の終了（process group 単位）と、出力を読みながら大きさを数える（読み終えてから数えない）ことが書かれていない。 | 子と孫をまとめて止めること、出力は上限に達した時点で読取りを打ち切ることを 1 行ずつ足す。 | New |

> R-01 Reviewer note: Dependency Direction に矢印の定義（A の出力を B が引数で受ける）と図がある。LC3 は回答を入力に取らず、functional-spec の状態機械（回答済みでも項目状態は missing・conflict のまま）と整合する。BR6.2 は LC5 だけ、BR8.3 も LC5 だけ。LC1→LC2→LC3→LC5→LC4 は一方向で循環は無い。

> R-02 Reviewer note: BR2.1〜BR2.3 と BR9.1 の判定は LC2 に移り、LC1 は生の事実だけを返す。BR6.2・BR8.3 の持ち主は 1 部品になった。構造の試験の項に「LC1・LC6 に判定が無い」がある。ただし LC1 に載せた BR1.x の扱いは下の新しい指摘 1 で残っている。

> R-03 Reviewer note: SC1a を足した。固定の名前の集合、対象の外の信頼した場所だけで解決、shell なし、環境変数は許可名だけ、cwd は対象の根でない固定の場所、標準入力は閉じる、時間・出力の枠、負例の試験が揃っている。信頼した場所の一覧は Infrastructure Design で確定し、確定までは起動を実装しないと条件が付いている。

> R-04 Reviewer note: BR8.4・BR9.3 は横断の行に持ち主の扱いを書いた。BR9.1 は LC2、BR9.2・BR9.4 は LC4 に割り当てた。

> R-05 Reviewer note: PF1 は NFR6.1 どおり、予算の識別（profile の版と値）を LC1 が明示入力として核へ渡す形になった。超過の事実は LC1、観測不能にする判定は LC2 で、持ち主は 1 つ。

> R-06 Reviewer note: logical-components の Placement 節に仮定 A-07 を名指しで足し、Infrastructure Design で突き合わせるまで「確認できず」とした。

> R-07 Reviewer note: logical-components の Shared Resources と observability-design OB5 に診断の出先を決めた。U2 は file・log を書かず保存もしない（Q2 = A）と書いてある。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability（nfr-design の traceability.json） | pass: true、gaps・orphans・invalid 0 | 追跡表の構造は整合している。上の指摘は追跡表の外の設計上の持ち主の話。 |

### Summary

前回の 7 件はすべて解消され、LC3↔LC5 の循環と LC1 の判定の持ち込みは直った。残る主な懸念は、BR1.1・BR1.4〜BR1.6 の判定の持ち主が表に無く、SC5 が LC1 に path の判定を残していて「adapter は判定しない」と食い違う点（Major 1 件）。Critical は無く Major は 2 件以下なので READY とするが、承認の前にこの持ち主の記述を直すことを勧める。
