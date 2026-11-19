## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-18
**Iteration:** 1
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
| R-08 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表（LC1 の行）と security-design.md > SC5 | BR1.1（対象の未指定の停止・wrong_target）、BR1.4、BR1.5、BR1.6 は LC1 の「I/O の部分だけ」にしか載らず、判定の持ち主が表のどこにも無い。一方 SC5 は LC1 が `..`・symlink・循環・別綴りの同一 path を拒否し、同じ実体を 1 つとして数えると書いている。これは out_of_boundary の分類と重複の判定で、表の「LC1 は分類・比較・判定をしない」と構造の試験の項に反する。BR1.1 の targetRef 未指定の停止も持ち主が無い。 | BR1.1・BR1.4・BR1.5・BR1.6 の判定（targetRef 未指定、out_of_boundary、同一実体の重複、budget_exceeded、changed_during_read）の持ち主を LC2 または LC3 のどちらかにして表へ書く。SC5 の path の判定は、LC1 が解決後の実 path と境界の事実を返し、拒否の判定は核が行う形に直す。 | Resolved (reviewer) |
| R-09 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表（LC2・LC3 の行） | BR3.4 の持ち主は LC2 とされるが、LC3 は「invalid に分ける」とも書いている。型・形式・範囲の不正（invalid）と出典の破損（malformed）が別の部品に分かれて見え、1 規則 1 持ち主の線引きが曖昧。 | invalid（値の型・形式・範囲）の判定と malformed（出典の破損）の判定の持ち主を表で明示する。 | Resolved (reviewer) |
| R-10 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/security-design.md > SC1a の時間・出力の枠 | 枠を超えた時に「子を止める」とだけあり、子が孫を作った場合の終了（process group 単位）と、出力を読みながら大きさを数える（読み終えてから数えない）ことが書かれていない。 | 子と孫をまとめて止めること、出力は上限に達した時点で読取りを打ち切ることを 1 行ずつ足す。 | Resolved (reviewer) |
| R-11 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表 LC2 の行（「呼出側の明示入力（targetRef・予算の値）」）と Dependency Direction の「予算」の項 | LC2 の行は予算の値を呼出側の明示入力と書くが、Dependency Direction と performance-design PF1 は、予算の値は LC1 が信頼版の profile から読んで LC2 へ渡し、呼出側の値は使わないと書く。純粋な核の LC2 は値の出どころを区別できず、呼出側が直接渡す経路が設計上は閉じていない。 | LC2 の行の「予算の値」を「LC1 が profile から読んで渡した予算の値と識別（profile の版・値）」に直し、呼出側から LC2 へ予算の値を渡す経路が無いことを構造の試験の項目に足す。 | New |
| R-12 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/performance-design.md > PF1 と logical-components.md > 予算 | 予算の profile 自体が読めない・破損・欠落している時の扱いが書かれていない。LC1 が枠を適用できないまま読取りを進めると、枠なしの読取りになりうる。 | profile が読めない時は読取りを始めず、その観測を観測不能（理由は固定の分類）にし、既定の予算で代用しないと PF1 に 1 行足す。 | New |
| R-13 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > LC3（invalid）と LC5（回答の検査）、security-design.md > SC2 | valueType ごとの許される形式を、LC3 の invalid の判定と LC5 の回答の検査（invalid_format など）の両方が使うが、その形式の定義の持ち主が 1 つと書かれていない。同じ判断が 2 か所で下せる状態になりうる（S3）。 | valueType ごとの許される形式の表を 1 つの部品または 1 つの値として持ち主を決め、LC3 と LC5 がそれを引数で受けて使うと書く。 | New |
| R-14 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/security-design.md > SC5 | 「解決 → LC2 が判定 → 許した実体だけ読む」の間に、解決した実体が別の物に差し替わる場合の扱いが無い。読取りの前後 digest（BR1.6）は内容の変化は拾うが、判定した実体と読んだ実体が同じことは確かめない。 | LC1 が読む時に、判定を受けた実体と同じ同一性（解決時の事実）であることを確かめ、違えば読まずに観測不能にすると足す。 | New |
| R-15 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > 冒頭の「file 名・module 名を決めない」と Components 表 LC2・LC3・Dependency Direction・Structural Checks の `value-exposure.mjs` | 冒頭は「ここでは file 名・module 名を決めない（置き場は Infrastructure Design）」と書くが、判定の関数は `value-exposure.mjs` という file 名で 4 か所に出る。また判定の持ち主は LC3 とされる一方、関数は「LC3 を含む他の部品を import しない末端」とされ、LC3 の中の物か、LC3 が持ち主になる独立の物かが読み取れない。独立の末端 module なら、依存の向きの図（LC1→LC2→LC3→LC5→LC4）にもその位置が無い。 | `value-exposure.mjs` を「判定の関数（名前は仮、置き場は Infrastructure Design）」と書くか冒頭の文を直す。あわせて Dependency Direction の図に、LC2 と LC5 が呼ぶ末端の関数と、その持ち主が LC3 であることを 1 行で足す。 | New |
| R-16 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > Components 表 LC3 と LC5 の「判定の持ち主である規則」の列（BR5.2） | BR5.2 が LC3（判定の関数）と LC5（BR5.1〜BR5.4 の範囲）の両方に載り、1 つの規則の持ち主が 1 部品という冒頭の原則と形の上で食い違う。BR3.4 のように LC2・LC3 の分担は明記されているが、BR5.2 は書かれていない。 | BR5.2 の持ち主は LC3 の関数だけで、LC5 は呼んで回答を rejected にする側（適用）であることを、LC3 と LC5 の行に 1 行ずつ書く。 | New |
| R-17 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/nfr-design/logical-components.md > LC1 の「返すのは生の事実」と LC2「分類の前の値は LC2 の中だけで持つ」、Failure Domains の「値・digest を LC2 の関数の外へ出す」、Structural Checks | 開いた形の生の値は、LC1 が読んで返す出力（生の事実）に含まれ、LC2 に渡るまで LC2 の外にある。構造の試験の対象は LC2 の返す物（Observation・事実・draft・案内・試験の出力）だけで、LC1 の戻り値と、それを LC2 へ運ぶ呼出側が記録・表示しうる経路は対象に入っていない。「LC2 の外へ出さない」は LC1 から LC2 までの区間に当てはまらない。 | 開いた形の生の値が LC1 から LC2 への受け渡しの値としてだけ存在し、呼出側の記録・表示・診断に載らないことを設計に 1 行書き、構造の試験に LC1 の戻り値を診断・記録へ流す経路が無いことを足す。 | New |

> R-11 Not re-checked this round

> R-12 Not re-checked this round

> R-13 Not re-checked this round

> R-14 Not re-checked this round

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| nfr-design/traceability.json の upstream_ids と coverage の突合（自作の突合、32 件） | 一致（抜け 0・余り 0） | NFR2.6・NFR2.6a を含む |
| nfr-requirements 6 文書の NFR 詳細 ID の突合 | 文書内の詳細 ID はすべて upstream_ids に含まれる。含まれないのは見出しの総称（NFR1・NFR2・NFR3・NFR4・NFR5・NFR6・NFR8・NFR9・NFR10）だけ | 抜けなし |
| 決定 116・120 の URL と本文 SHA-256 の突合（functional-design の functional-spec・rules・traceability・questions との比較） | 6962989955 と `3986367d…`、6963254137 と `c7b7d6dd…` が一致。完全な SHA-256 も traceability.json と一致 | 引用に食い違いなし |
| 依存の向きの確認（`value-exposure.mjs` は末端、LC1→LC2→LC3→LC5→LC4） | 循環・逆転なし。LC3 は回答を受け取らず、LC2 は LC3 の項目状態関数を import しない | 変更点 2 は成立（上の Minor 2 件を除く） |
| 実行した試験 | なし | 設計の段で実装・試験はまだ無いので、実行済みとは書かない |

照らした項目: S1〜S9 のうち S3（判定の持ち主 1 か所）・S4（核が時刻・乱数・UUID を取らない。RL3）・S5・S8（観測できず・止められない時を成功にしない。RL1・RL2・SC1a）、行の網羅率 100%（OB5 と LC7、分母は Infrastructure Design で未確定と明記）、守る物（外部への効果 0、新しい依存なし）。

### Summary

Critical・Major は無く、READY。決定 116・120 は機能設計と一致して引かれ、判定の関数を LC1 に依存しない末端に置く形で依存の循環・逆転は起きず、matchGroup の振り方・保証しないこと・対象の結び（unspecified は malformed）も機能設計と矛盾しない。残るのは、関数の file 名と置き場の記述の食い違い、BR5.2 の持ち主の書き方、LC1 の生の値の経路の 3 件の Minor。
