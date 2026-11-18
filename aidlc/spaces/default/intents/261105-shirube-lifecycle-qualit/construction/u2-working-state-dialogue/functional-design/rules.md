# U2 — Business Rules

## Sources and Scope

[entities.md](entities.md) のモデルに対する U2 の判定の正本。YAML が規則の正本で、[functional-spec.md](functional-spec.md) の規則表は派生 view。[確認済みの問いと答え](functional-design-questions.md)（Q1 = A・Q2 = A、要約確認とその条件）と仮定 A-01〜A-06 に従う。

規則 ID は `BRx.y`。各規則に正例（`T<x.y>+`）と負例（`T<x.y>-`）の試験を最低 1 つずつ置く（試験の中身は [functional-spec](functional-spec.md#acceptance-and-test-design--not-executed)。未実行）。判定の理由コードと四条件は ConformanceGate（U1）が唯一持ち、U2 の規則はそれを再定義しない（BR7.6）。

## Rules — Source of Truth

```yaml
ruleset: shirube-u2-functional-rules/1
owner: DialogueExperience
principle: 観測した事実だけを示し、確認できていない事を確認済みと示さない。回答は対話の間だけ保持し、観測が変われば無効にする。
policy:
  persistence: none            # Q2 = A
  conflict_resolution: no-rank-show-all-sources   # Q1 = A
  gate_reason_codes: read-only-from-u1
rules:
  - id: BR1.1
    statement: 対象は呼出側が渡し、席が推測して探さない。観測は渡された対象に結ぶ。
    category: validation
    applies_to: [ConfigurationDraft, ObservedItem]
    trigger: dialogue-started
    logic: >
      IF targetRef が渡されない THEN 観測せず、対象が要ると示して止まる。観測した出典が別の対象を名指す（ObservedItem.namedTarget が渡された対象と違う = targetMatch が differs）THEN その出典の値を使わず wrong_target とする。出典が対象を名指さない時は、項目一覧がその出典に書いた targetBinding で決める: by-location（対象の根の下の位置で読む出典）は読む位置で対象に結ばれているので matches、named（出典が対象を名指す必要がある出典）は unspecified とし、確認済みの根拠にせず、その単位を unavailable（原因 malformed。新しい原因は足さない）として扱う。unspecified の出典は値・digest・presence を持たず、他の出典に有効な値があっても、必須の出典が unspecified なら項目を confirmed にしない（BR3.1 の unobservable）。targetBinding が書かれていない出典は named として扱う（失敗側）。対象を repo の探索や直前の記憶から補わない。出典が名指した対象は実際の読取りの結果だけから作り、項目一覧の宣言や呼出側の対象を写さない。
    violation: wrong_target / unobservable（malformed）/ 対象の指定を求めて停止
    source: [FR1.1, FR2.2, AC1.1.1]
    tests: [T1.1+, T1.1-, T1.1u]
  - id: BR1.2
    statement: 観測は実際の読取りの結果だけ。宣言・cache・既定値・期待値を観測へ写さない。
    category: constraint
    applies_to: [ObservedItem]
    trigger: observation-built
    logic: >
      IF 値が実際の読取りで得られていない THEN observed にしない。宣言された値（pin の desired、cache、設定の既定）を観測値として示さない。既存の status の読取り表示は入力の 1 つにすぎず、それだけで確認済みとしない。
    violation: unobservable（原因を付ける）
    source: [FR2.1, NFR5, S5, AC2.2.4, AC3.2.4]
    tests: [T1.2+, T1.2-]
  - id: BR1.3
    statement: 観測は一致・不一致・観測できずの 3 値を持ち、観測できずを成功へ読み替えない。
    category: constraint
    applies_to: [ObservedItem, DraftItem]
    trigger: observation-evaluated
    logic: >
      IF 読めない・途中で変わった・権限不足・予算超過 THEN unavailable とし原因を持つ。unavailable の項目を confirmed にも missing にも変えない。
    violation: unobservable
    source: [NFR5, S5, S8, AC1.1.2, AC1.1.5, AC2.2.2]
    tests: [T1.3+, T1.3-]
  - id: BR1.4
    statement: 読取りには回数・時間・応答の大きさの予算を宣言し、使い切ったら観測不能にする。
    category: constraint
    applies_to: [ObservedItem]
    trigger: read-started
    logic: >
      IF 1 回の読取りの時間・応答の大きさ・全体の回数のどれかが宣言を超える THEN そこで止めて budget_exceeded または timed_out とする。自動の再試行は状態が変わった時だけ（無条件の再試行はしない）。読取り経路に書ける資格情報を要求しない。具体の数値は NFR 要件で決める。
    violation: 'unobservable: budget_exceeded / timed_out'
    source: [NFR6, S5, S9, AC1.1.5]
    tests: [T1.4+, T1.4-]
  - id: BR1.5
    statement: 対象の根の中だけを読む。同じ実体は 1 つとして数え、根の外は読書きしない。
    category: constraint
    applies_to: [SourceRef, ObservedItem]
    trigger: path-resolved
    logic: >
      IF path が根の外へ出る（symlink・`..`・別綴り）か循環する THEN out_of_boundary として拒否する。許可範囲内の同じ実体は重複して数えない。特殊文字・空白・非 ASCII・長い名前は通常の名前と同じに扱う。OS の付随ファイル・編集の一時ファイルは値として読まない。許可対象外への読書きは 0。
    violation: 'unobservable: out_of_boundary'
    source: [NFR3, AC1.1.4, AC1.3.5]
    tests: [T1.5+, T1.5-]
  - id: BR1.6
    statement: 読取り中に変わった・書込み途中の物は完全な値として使わない。
    category: constraint
    applies_to: [ObservedItem]
    trigger: read-completed
    logic: >
      IF 読取りの前後で内容の digest が変わる、または書込み途中と判る THEN changed_during_read とし値を使わない。確認の後に変わった物は再読するか古いと示す。
    violation: 'unobservable: changed_during_read'
    source: [NFR4, AC1.3.4]
    tests: [T1.6+, T1.6-]
  - id: BR2.1
    statement: 未導入の確定は、親が確認でき、そこに無いと分かる時だけ。404 だけ・権限不足・取得失敗では確定しない。
    category: validation
    applies_to: [ObservedItem, DraftItem]
    trigger: absence-evaluated
    logic: >
      IF 親（対象・ref・親の一覧）が読めて、その中に項目が無いと確認できた THEN 未導入（missing）。IF 404 だけ・権限拒否・取得失敗・予算超過 THEN unobservable（not_found_unconfirmed / permission_denied / fetch_failed / budget_exceeded）とし、未導入と断定しない。
    violation: unobservable
    source: [FR1.1, AC1.1.2]
    tests: [T2.1+, T2.1-]
  - id: BR2.2
    statement: 道具は「ある・無い・非対応の版・起動できない・応答しない」を区別する。manifest の宣言だけで対応済みとしない。
    category: validation
    applies_to: [ToolProbe, DraftItem]
    trigger: tool-probed
    logic: >
      IF 子 process を時間の上限つきで起動し、機械可読な出力と終了コードを得た THEN present / unsupported_version を判定する。IF 起動できない THEN cannot_start、実行ファイルが無い THEN missing、応答しない THEN timed_out。足りない道具・必要な版・次の操作を案内に載せる。依存する開始を止めるのは U3 で、U2 は止まる理由を示すだけ。
    violation: tool_missing / tool_unsupported_version / tool_cannot_start / timed_out
    source: [FR1.4, AC1.1.3]
    tests: [T2.2+, T2.2-]
  - id: BR2.3
    statement: 版の適合は、観測した版と必要な版を突き合わせて 3 値で示す。必要な版を宣言から写さない。
    category: validation
    applies_to: [ToolProbe, DraftItem]
    trigger: version-compared
    logic: >
      IF 必要な版が対象の pin・契約から読め、観測した版と比べられる THEN 一致・不一致を示す。比べられない THEN unobservable。version-compare で比べ、文字列の見た目の一致だけで判断しない。
    violation: unobservable / unsupported_version
    source: [FR1.1, FR1.4, NFR8, AC1.1.1]
    tests: [T2.3+, T2.3-]
  - id: BR3.1
    statement: 各項目は項目状態をちょうど 1 つ持つ。決める順は wrong_target → invalid → conflict → unobservable → missing → confirmed。
    category: policy
    applies_to: [DraftItem]
    trigger: item-evaluated
    logic: >
      出典ごとの読取り結果は 5 つのどれか 1 つ: value（有効な値）、absent（出典は読めたが項目が無い）、unavailable（読めない）、wrong_target（別の対象を名指す）、invalid（値はあるが形式・範囲が不正、または秘密らしい。BR3.4・BR5.2）。requiredForConfirmed は項目一覧の各出典に必ず書かれ、書かれていない出典は必須（true）として扱う（失敗側）。requiredForConfirmed が false と書かれた出典の absent だけを無視する。出典の対象の結びが unspecified（BR1.1。targetBinding = named なのに出典が対象を名指さない）の単位は unavailable（原因 malformed）として数える。開いた形（valueForm = open）の項目は観測値を持たないので、「有効な値」は presence = value（値の保持はしない）で表し、値が「異なる」かは出典どうしの matchGroup（BR8.3）が違うことで決める。決める順は次のとおりで、どの組み合わせでもちょうど 1 状態に決まる。
      (1) いずれかの出典が wrong_target THEN wrong_target。
      (2) (1) でなく、いずれかの出典が invalid THEN invalid。
      (3) (1)(2) でなく、有効な値を持つ出典が 1 つ以上ある場合: 有効な値が 2 つ以上で異なる、または必須の出典が absent（読めて項目が無い）THEN conflict（candidates に値と「この出典には無い」を載せる）。それ以外で必須の出典が 1 つでも unavailable THEN unobservable。それ以外（必須の出典が全部 value で一致）THEN confirmed。
      (4) (1)(2) でなく、有効な値を持つ出典が無い場合: 必須の出典が 1 つでも unavailable THEN unobservable。それ以外（読めた全出典に項目が無い）THEN missing。
      confirmed は必須の出典がすべて観測できて一致した時だけ（必須の出典が absent なら confirmed にならない。sds_commit は sds_pin と workflow_caller の両方が必須で、片方にだけ値があれば conflict になり、userAnswerable でないので fix-source を示す）。「一部の出典にだけ値がある」は (3) の conflict（値のある出典と無い出典をそのまま示し、利用者に選んでもらう。順位をつけない）。
    violation: 1 状態に決まらない組み合わせを作らない（上の 4 つの場合を全組み合わせの試験で確かめる。sds_commit の出典の組み合わせと requiredForConfirmed の記載が無い場合は T3.1x）。読める項目を既定で unobservable にしない
    source: [FR2.1, AC1.3.1, AC3.2.2]
    tests: [T3.1+, T3.1-, T3.1x]
  - id: BR3.2
    statement: 出典が食い違ったら順位をつけず、すべての出典と値を示して利用者に選んでもらう。黙って片方を採らない。
    category: policy
    applies_to: [DraftItem, GuidanceMessage]
    trigger: conflict-detected
    logic: >
      IF state = conflict THEN candidates に読めた全出典を載せる（値のある出典は presence = value と値・digest、項目が無い出典は presence = absent で「この出典には無い」。値は持たない）。userAnswerable な項目なら nextAction = choose-source とし、選べるのは candidates の 1 つ（value の値、または absent = 「無いまま」）に限る。userAnswerable でない項目なら nextAction = fix-source とし、全出典を並べて示すだけで、採る出典は出典の持ち主が決める（BR4.2。利用者に選ばせない）。開いた形（valueForm = open）の項目の食い違いは、値を持たないので候補に値・digest・表示値を載せず、出典・presence・lengthBucket・matchGroup だけを並べ、userAnswerable に関わらず nextAction = fix-source とする（利用者に選ばせる値を示せないため。Owner の決定 120（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6963254137 、本文 SHA-256 `c7b7d6ddfdc77770d380bd885b5761b4205df13bb20f962300b51bbc610519d4`、arc が中継）。AC1.3.2 は、閉じた形では値と出典、開いた形では出典・presence・一致不一致を示すこととして読む）。順位・優先関係を作らず、契約にも足さない（Q1 = A、Q3 = A）。選ばれた候補は GuidanceSelection とし、あわせて Answer としても保持する（値のある候補 = kind value、absent の候補 = kind keep-absent で value・valueDigest は持たず selectedCandidateRef を持つ）。再質問の判定（BR4.3）は Answer で行う。出典のファイルは書き換えない（適用は U5）。判断が要る項目だけ保留し、他の回答は保持する。値の比較は項目の normalization の 1 つの規則で行う。
    violation: conflict のまま保留（上書き・自動採用をしない）
    source: [FR2.2, AC1.3.2, Q1]
    tests: [T3.2+, T3.2-, T3.2k, T3.2o]
  - id: BR3.3
    statement: 対象違いの出典は使わず、出典と食い違いを示す。
    category: validation
    applies_to: [DraftItem]
    trigger: wrong-target-detected
    logic: >
      IF 出典が別の repo・別の対象を名指す THEN wrong_target とし、その値を candidates にも confirmedValue にも入れない。どの出典がどの対象を名指しているか（ObservedItem.namedTarget）を示す。同じ項目の別の出典に有効な値があっても項目は wrong_target のままで、その値は「参考（採用していない）」として別に示し、採らない。次の操作は対象の指定の見直し（nextAction = review-target、BR4.2）。
    violation: wrong_target
    source: [FR2.2, AC1.3.2]
    tests: [T3.3+, T3.3-]
  - id: BR3.4
    statement: 値が不正・破損している時は、既定値で埋めず、読めた分を使い、不正な項目を数えて示す。
    category: validation
    applies_to: [DraftItem, ObservedItem]
    trigger: value-validated
    logic: >
      IF 値の型・形式・範囲が不正、または観測した値が秘密らしい（BR5.2 の集合）THEN invalid とし、**値は保持も表示もしない**（Owner の決定 116（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6962989955 、本文 SHA-256 `3986367dcee537139c1065e71d9db339cd085e10f8fbf4f5cf1d7c771e5f3a6a`、arc が中継））。invalid の出典について作る物は、項目・出典・固定の分類（invalid_format = 形式・範囲が不正、secret_like = 秘密らしい）だけで、値・valueDigest・候補・案内文の中の値の一部は作らない。分類は入力から作らない固定の値で、判定は BR5.2 の集合と ItemCatalogEntry の許される形式の 1 か所の関数が持つ（回答と観測で同じ関数。S3）。次の操作は出典の持ち主への直しの依頼（fix-source、BR4.2）。形式に合う値だけを保持・表示・digest の対象にし、さらに閉じた形（valueForm = closed）の項目に限る。開いた形（valueForm = open。string・list）の観測値は、形式に合っても保持・digest・表示をしない（Owner の決定 120（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6963254137 、本文 SHA-256 `c7b7d6ddfdc77770d380bd885b5761b4205df13bb20f962300b51bbc610519d4`、arc が中継））。示すのは presence・lengthBucket・出典どうしの一致不一致（matchGroup）・出典だけで、値の比較は核がメモリ上で normalization の規則で行い、結果の番号だけを残す。秘密らしい・形式の不正の判定（上）は開いた形にも当て、当たれば invalid（secret_like / invalid_format）とする。開いた形でも、この固定の分類は観測の事実（ObservedItem.withheld・ObservationFact.withheld、BR8.3）に入れる（独立設計監査 2 回目の F02。決定 116 が許す固定の分類であり、決定 120 の「値・digest・表示を持たない」には反しない）。受け渡しは次の 1 経路だけ: LC2 が LC1 から受けた開いた形の生の値を、共有の判定の関数（BR5.2 の持ち主）へ 1 回だけ通し、返ってきた分類（有効 | invalid_format | secret_like。判定できない時は secret_like）だけを残して、生の値は同じ呼び出しの中で捨てる（保持・digest・ログ・案内文・試験の出力のどれにも写さない）。分類が invalid_format / secret_like の時は、その出典は withheld を持ち、lengthBucket・matchGroup を持たず、出典どうしの一致の比較（matchGroup の採番）に入らない。分類が有効の時は withheld を持たず、presence・lengthBucket・matchGroup だけを持つ。分類（有効・invalid_format・secret_like）の変化は観測の事実の変化で、BR6.2・BR8.3 のとおり古い回答・draft を無効にする。同じ分類の中で生の値だけが変わる変化は、決定 120 の限界のとおり検出しない。IF 出典の file が破損 THEN その出典に依存する項目を malformed の unobservable とし、他の項目は使い続ける。破損した 1 件を理由に全体を捨てない。未知の項目は無視せず「未知の項目あり」と示す。
    violation: 'invalid / unobservable: malformed。不正・秘密らしい観測値、および開いた形の観測値の、値・digest・候補・案内文・ログへの写しは 0'
    source: [FR2.2, AC1.3.2, AC1.3.5, AC2.2.3]
    tests: [T3.4+, T3.4-, T3.4o]
  - id: BR3.5
    statement: 「適用中の規格」として示すのは、対象から実際に観測できた物と、その版の識別だけ。
    category: constraint
    applies_to: [DraftItem, GuidanceMessage]
    trigger: standards-listed
    logic: >
      IF 規格・版が対象の pin・設定・workflow から読めた THEN 出典と版の識別を添えて示す。読めない規格は「適用中」と示さず「確認できず」とする。AI-DLC の版・Shirube の版・保護対象の一覧を、読めた範囲で示す。必須検査名（required_checks）は U2 の項目一覧に入れず、「U2 では確認していない」と示す（Q5 = A、entities の notHandledByU2）。
    violation: unconfirmed として示す
    source: [FR2.1, AC1.1.1, AC1.3.1]
    tests: [T3.5+, T3.5-]
  - id: BR4.1
    statement: 質問は「不足」と「食い違い」（利用者が直せる不正）だけから作る。
    category: policy
    applies_to: [ConfigurationDraft]
    trigger: questions-built
    logic: >
      IF state ∈ {missing, conflict} かつ userAnswerable THEN 質問にする。ただし開いた形（valueForm = open）の項目の conflict は、値を並べて選ばせられないので質問にせず、BR3.2 のとおり fix-source を示す（T4.1 の負例）。invalid は利用者が直せる時だけ質問にする。confirmed・unobservable・wrong_target は質問にしない。state ∈ {missing, conflict} でも userAnswerable でない項目は質問にせず、次の操作を BR4.2 のとおり示す（Q3 = A。利用者が自分では答えられない値を質問にすると推測の値が入るため）。
    violation: 質問を作らない
    source: [FR2.1, AC1.3.1]
    tests: [T4.1+, T4.1-]
  - id: BR4.2
    statement: 観測できない項目は質問にせず、確認のしかた（権限・道具・場所）を案内する。
    category: policy
    applies_to: [GuidanceMessage]
    trigger: unobservable-guided
    logic: >
      IF state = unobservable THEN nextAction は confirm-permission / install-or-upgrade-tool 等の安全な確認操作とし、値を尋ねない。利用者に推測の値を答えさせて埋めない。行き止まりを作らない: state = wrong_target は nextAction = review-target（対象の指定の見直し）、利用者が直せない invalid は nextAction = fix-source（出典の持ち主へ直しを頼む。U2 は書き換えない）とし、質問にはしない。userAnswerable でない項目の missing（読めた全出典に項目が無い）と conflict も nextAction = fix-source とし（Q3 = A）、conflict は全出典と値を並べて示して採るのは出典の持ち主（順位なし）、道具の項目（出典が tool_probe）で道具の導入・版が足りない時は nextAction = install-or-upgrade-tool とする。どの場合も推測の値を答えさせて埋めず、出典を書き換えない。
    violation: 案内だけを返す
    source: [FR2.1, AC1.3.1, AC3.2.2]
    tests: [T4.2+, T4.2-]
  - id: BR4.3
    statement: 確認済みの項目と、現在の観測に結びつく有効な回答がある項目は、再び聞かない。
    category: policy
    applies_to: [ConfigurationDraft]
    trigger: questions-built
    logic: >
      IF state = confirmed OR 有効な回答（AnswerState = answered かつ boundObservationDigest が現在と一致） THEN その項目を質問に含めない。同じ問いを 2 回示さない。
    violation: 再質問しない
    source: [FR2.1, AC1.3.1]
    tests: [T4.3+, T4.3-]
  - id: BR4.4
    statement: 読めない値を既定値・利用者の推測・Owner の回答として作らない。
    category: constraint
    applies_to: [ConfigurationDraft, Answer]
    trigger: draft-built
    logic: >
      IF 値が読めない・答えが無い THEN 空のまま missing / unobservable とする。値・回答・Owner の答えを作る処理を持たない。
    violation: 空のまま保つ
    source: [FR2.1, FR2.3, AC1.3.1]
    tests: [T4.4+, T4.4-]
  - id: BR5.1
    statement: 回答はデータとして受け、型・長さ・文字の範囲・path の境界を検査する。命令として評価しない。
    category: validation
    applies_to: [Answer]
    trigger: answer-received
    logic: >
      許される形式は valueType ごとに決める（entities の ItemCatalogEntry.note）。IF 型・長さ・文字（空白・Unicode・区切り・制御文字）が不正、または過大 THEN rejected とし、理由は固定の分類（secret_like・invalid_type・too_long・invalid_character・invalid_format・out_of_boundary・stale_answer・duplicate_conflict）から返す。aidlc_settings の要素の細かい形は Code Generation で確定し（A-08）、確定までは狭く取って迷えば rejected。確定した時は同じ PR で entities・rules にも足す。無言で切り捨てて受け入れない。受け入れた値は表示先に合わせて escape し、中の文を命令として実行しない。形式の不備・過大入力を依存の判定の材料にしない。
    violation: rejected（理由つき）
    source: [NFR3, AC1.3.5]
    tests: [T5.1+, T5.1-]
  - id: BR5.2
    statement: 秘密らしい入力は保持せず、写さず、有無と参照名だけで案内する。回答だけでなく、観測した値（file の内容・道具の出力）にも同じ判定を当てる。
    category: constraint
    applies_to: [Answer, GuidanceMessage, ObservedItem, DraftItem]
    trigger: answer-received | value-observed
    logic: >
      秘密らしさの判定の最小の集合（どれか 1 つに当たれば秘密らしい）: (a) 秘密鍵・証明書の見出し行（`-----BEGIN ... PRIVATE KEY-----` の形）、(b) 既知の token の接頭辞（`ghp_`・`gho_`・`ghu_`・`ghs_`・`ghr_`・`github_pat_`・`AKIA`・`sk-`・`xoxb-`・`xoxp-`）で始まる語、(c) `Bearer ` に続く長い語、(d) 3 つの部分を `.` でつないだ JWT の形、(e) 空白を含まない 20 文字以上の英数字・記号（`+/_-=`）の連なりで、その項目の許される形式（valueType・normalization）に当たらないもの。
      判定が確実でない時の既定は fail closed: 項目の許される形式に当たらない文字列の回答は保持せず rejected とする（秘密を見逃して保持するより、拒否して参照名を求める方を選ぶ）。
      IF 秘密らしい THEN rejected とし、値を保持・表示・記録しない。rejected の回答は value も valueDigest も持たない（digest は推測の足場になる）。rejectionReason・案内・ログ・試験の出力に入力の値の一部も写さない（理由は入力から作らない固定の分類 secret_like だけ）。案内は「その設定が有るか」と「参照名」だけを求める。公開される成果物・出力・ログへの転記は 0。fixture・例は架空の値だけ。観測した値（file の内容・道具の出力）にも同じ集合と fail closed を当てる（Owner の決定 116（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6962989955 、本文 SHA-256 `3986367dcee537139c1065e71d9db339cd085e10f8fbf4f5cf1d7c771e5f3a6a`、arc が中継））: 秘密らしい、または許される形式に当たらない観測値は、値・valueDigest・候補・案内文を作らず、項目・出典・固定の分類（secret_like / invalid_format）と「出典を直す」次の操作だけを示す。未加工の道具の出力は保持せず、形式に合う版の識別だけを取り出す。取り出せなければ観測値なしの invalid_format とする。観測の事実（BR8.3）には、値を保持しない出典の分類だけが入り、値の digest は入らない。開いた形（string・list）の観測値は、秘密らしさを形式では判定できないので、秘密らしくなくても保持・digest・表示をしない（Owner の決定 120）。回答のうち開いた形の項目の値は、この節の (a)〜(e) の選別と fail closed を通った時だけ受け、案内・ログ・試験の出力へは写さない（presence と長さの区分だけ）。
    violation: rejected（値も digest も理由への写しも残さない）
    source: [FR2.3, NFR2, AC1.3.3]
    tests: [T5.2+, T5.2-, T5.2o]
  - id: BR5.3
    statement: 回答ごとに独立に扱う。1 件の不正が他の回答を失わせない。
    category: policy
    applies_to: [Answer, ConfigurationDraft]
    trigger: answer-received
    logic: >
      IF 1 件が rejected THEN 他の answered の回答はそのまま保持する。不足は残った項目として示す。
    violation: 他の回答は保持
    source: [FR2.4, AC1.3.2, AC1.3.5]
    tests: [T5.3+, T5.3-]
  - id: BR5.4
    statement: 同じ回答の二重の送信で重複や二重の効果を作らない。
    category: constraint
    applies_to: [Answer]
    trigger: answer-received
    logic: >
      IF (itemKey, valueDigest) が同じ回答が再び届く THEN 1 件のまま（既存の answerId を返す。kind = keep-absent の回答は (itemKey, selectedCandidateRef) で同じかを見る）。同じ項目の別の値は、「最新」= 呼出側が渡す answeredAt が新しい方を有効とし、前を invalidated にする。届いた順では決めない。answeredAt が既存の有効な回答より前の（遅れて届いた古い）回答は保持せず、古い回答として示す。answeredAt が同じで値が違う時は既存を保ち、新しい方を曖昧として rejected にする。
    violation: 重複しない
    source: [S7, NFR4]
    tests: [T5.4+, T5.4-]
  - id: BR6.1
    statement: 回答はその対話の間だけ保持する。U2 は何も永続化しない。
    category: constraint
    applies_to: [DialogueSession, Answer]
    trigger: dialogue-closed
    logic: >
      IF 対話が閉じる THEN 回答・draft・選択はすべて消える。次の対話は観測から不足だけを再び聞く（Q2 = A）。保存の置き場・形式は U2 の範囲に無い。保存の失敗を成功と記録しない（保存しないため該当する失敗の種類を作らない）。
    violation: 保持を主張しない
    source: [FR2.4, Q2]
    tests: [T6.1+, T6.1-]
  - id: BR6.2
    statement: 有効な回答は回答した時点の観測の digest と結び、観測が変われば無効にして不足へ戻す。
    category: constraint
    applies_to: [Answer, DraftItem]
    trigger: reobserved
    logic: >
      項目の観測 digest は、その項目の全出典の観測の事実（BR8.3 で定める。参照名からは作らない）を単位の辞書順に並べた正規の JSON の SHA-256。回答は、回答した時点の項目の観測 digest を boundObservationDigest（1 件）に持つ。IF 再観測で項目の観測 digest が boundObservationDigest と異なる THEN state = invalidated とし、項目を BR3.1 で再評価して missing / conflict 等に戻し、利用者に示す。他の回答は保持する。この無効化が検出する「中身の変化」は、閉じた形の項目では値の digest の変化、開いた形（valueForm = open）の項目では presence・lengthBucket・matchGroup・出典・対象の結び・原因と、固定の分類（withheld = 有効・invalid_format・secret_like。BR3.4、F02）の変化までで、開いた形の中身だけの変化（同じ分類の中で、長さの区分も一致の番号も同じ）は検出しない（観測値を保持も digest もしないため。Owner の決定 120（https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6963254137 、本文 SHA-256 `c7b7d6ddfdc77770d380bd885b5761b4205df13bb20f962300b51bbc610519d4`）から必ず出る範囲。U2 が保証しないこと）。開いた形の回答は「回答済み」のままで、実物との一致は確認済みと示さない（BR6.3・BR6.4）。
    violation: invalidated
    source: [FR2.4, NFR4, AC1.3.2, AC1.3.4]
    tests: [T6.2+, T6.2-]
  - id: BR6.3
    statement: 回答した・再観測で一致した・適用した、を区別し、答えただけで設定完了と示さない。
    category: policy
    applies_to: [Answer, GuidanceMessage]
    trigger: status-shown
    logic: >
      IF 回答があるだけ THEN 「回答済み・未適用」と示す。IF 再観測で実際の設定が回答と一致 THEN 「一致を確認」と示す（閉じた形の項目だけ。開いた形は BR6.4 のとおり比べられず、「一致を確認」と示さない）。適用の実行と結果は U5 の持ち物で、U2 は適用済みを主張しない。保持に失敗した・確認後に設定が変わった場合は完了としない。
    violation: 未完了として示す
    source: [FR2.4, AC1.3.4]
    tests: [T6.3+, T6.3-]
  - id: BR6.4
    statement: 採用した回答と実際の設定を照合して示す（継続利用の確認は再観測で行う）。
    category: policy
    applies_to: [Answer, DraftItem]
    trigger: reobserved
    logic: >
      IF 回答が採用され、その後の再観測で実際の設定が読めた THEN 一致・不一致を示す（閉じた形の項目）。読めない THEN 観測できず。保存した回答の照合はしない（Q2 = A）。開いた形（valueForm = open。string・list）の項目は、観測値を保持しない（Owner の決定 120）ので回答と比べられない。比べられない THEN 「比べられず観測できず」と示し、「一致を確認」「確認済み」とは示さない（中身だけを変えた再観測でも同じ。S5）。実物との一致の確かめは、実適用側（U3・U5）が実物を読み直して行う前提で、U2 は保証しない。
    violation: unobservable（開いた形は「比べられず観測できず」）
    source: [FR2.4, AC3.2.5]
    tests: [T6.4+, T6.4-, T6.4o]
  - id: BR6.5
    statement: 対話をまたぐ保存と中断後の再開は U2 に含めず、後の単位へ持ち越す。落とさず記録する。
    category: constraint
    applies_to: [traceability, functional-spec]
    trigger: design-recorded
    logic: >
      AC3.1.3（US3.1）の「中断後に有効な回答・履歴を保持して未完了箇所から進む」は、Q2 = A により U2 では行わない。story map の割当（US3.1 = u3-native-operation-control と u5-safe-versioned-distribution）に従い、U3 が主、U5 が実適用側で扱う。U2 は引き継ぐ形として、回答と観測の結びつけ（BR6.2）と ConfigurationDraft の形だけを渡す。割当の変更は Owner の判断で、U2 は変更しない。
    violation: traceability に Deferred として残す
    source: [Q2, Owner の条件, AC3.1.3]
    tests: [T6.5+, T6.5-]
  - id: BR7.1
    statement: 案内は「結論と対象 → 次の操作 → 原因・未確認 → 証拠の参照」の順で示す。
    category: policy
    applies_to: [GuidanceMessage]
    trigger: guidance-built
    logic: >
      IF 案内を作る THEN conclusion と targetRef を先に、次に nextAction、次に causes と unconfirmed、最後に observationRefs を並べる。例: 「sample-work の設定を一部確認できました。接続権限は未確認です。次は対象の読取り権限を確認してください。」
    violation: 並びを守る
    source: [NFR9, AC1.1.1, AC2.2.5]
    tests: [T7.1+, T7.1-]
  - id: BR7.2
    statement: 状態は平文で区別し、色・配置・偽の進捗に頼らない。
    category: constraint
    applies_to: [GuidanceMessage]
    trigger: guidance-rendered
    logic: >
      IF 表示する THEN 既定・空・読込中・成功・エラー・部分成功・無効を別の表示にし、確認済み・不足・食い違い・観測不能を文字で区別する。生のエラー文だけ・色だけ・偽の進捗の棒を使わない。
    violation: 文字で区別
    source: [NFR9, AC2.2.5]
    tests: [T7.2+, T7.2-]
  - id: BR7.3
    statement: 同じ観測と入力は、対話先の LLM が変わっても同じ意味の案内になる。
    category: constraint
    applies_to: [GuidanceMessage]
    trigger: guidance-built
    logic: >
      IF 同じ観測・同じ明示入力 THEN 同じ GuidanceMessage の内容を作る。adapter は輸送と表示だけを変え、判定・状態名・理由の意味を再定義しない（S2・S3）。
    violation: 内容が同じ
    source: [NFR5, NFR9, AC2.2.4]
    tests: [T7.3+, T7.3-]
  - id: BR7.4
    statement: 人待ちは 1 回だけ示して止まる。待つ間に成果物・後継記録・再試行の記録を作らない。
    category: constraint
    applies_to: [GuidanceMessage]
    trigger: wait-for-person
    logic: >
      IF 人の判断・回答が要る THEN blocking = true の案内を 1 回だけ出して止まる。待機中に自動の効果・成果物を作らない。状態が変わらない再試行を繰り返さない。
    violation: 1 回で停止
    source: [R2, NFR6, S8]
    tests: [T7.4+, T7.4-]
  - id: BR7.5
    statement: 確認できていない事を確認済みと示さない。1 件でも示せば不合格。
    category: constraint
    applies_to: [GuidanceMessage, DraftItem]
    trigger: guidance-built
    logic: >
      IF 項目が confirmed でない THEN 案内は確認済みとして扱わない。未確認の件数と項目を示す。「成功」の語は、必須の出典がすべて観測でき一致した項目にだけ使う。
    violation: unconfirmed として示す
    source: [NFR9, AC1.1.2, AC1.3.1, AC2.2.2, AC2.2.5]
    tests: [T7.5+, T7.5-]
  - id: BR7.6
    statement: 理由コードは U1 の結果を読んで示す。U2 は新しいコードを作らず、項目状態を理由コードにしない。
    category: constraint
    applies_to: [GuidanceMessage]
    trigger: guidance-built
    logic: >
      IF ConformanceGate の結果が入力にある THEN その reasonCode を 1 つの意味のまま示す。結果が無い・読めない THEN 理由コードを作らず「結果を確認できず」と示す。U2 の項目状態・観測不能の原因は理由コードの集合に加えない。
    violation: 「結果を確認できず」
    source: [contract E05, S3, AC2.2.1, AC2.2.2]
    tests: [T7.6+, T7.6-]
  - id: BR7.7
    statement: 初回の確認表示（設定 A 不足・権限 B 観測不能）を、A と B を区別して必ず示す。追加機能のために削らない。
    category: policy
    applies_to: [GuidanceMessage]
    trigger: guidance-built
    logic: >
      IF 入力が「A が missing、B が unobservable」 THEN 別々の項目として、原因・安全な次の操作（設定の確認、権限の確認）・開始できない理由を示す。この案内は他の機能の追加で省かない。
    violation: A と B を区別
    source: [FR8.1, AC3.2.2]
    tests: [T7.7+, T7.7-]
  - id: BR8.1
    statement: 選択・設定の回答は、開始・適用の許可でも公開の Owner 決定でもない。
    category: constraint
    applies_to: [GuidanceSelection, ConfigurationDraft]
    trigger: selection-made
    logic: >
      IF 利用者が候補を選ぶ・設定を答える THEN C02 の draft / selection として渡せる形にするだけ。explicitStart・適用の入力・許可を U2 は作らない。
    violation: 許可を作らない
    source: [C02, AC1.3.2, AC3.3.5]
    tests: [T8.1+, T8.1-]
  - id: BR8.5
    statement: U2 の内部の構造体は、C02 の既存の受渡し形（contract-summary の「既存entityの受渡し形と所有」）へ決まった変換で渡し、契約は変えない。
    category: constraint
    applies_to: [ConfigurationDraft, GuidanceSelection]
    trigger: wire-handoff
    logic: >
      内部（Answer の列・GuidanceMessage の構造体）は保ち、C02 へ渡す時は LC5 の変換（toC02Wire、純粋な関数）だけを通す。ConfigurationDraft: draftId・targetRef・missingItems（string[]）・conflicts（string[]）・observationRefs（Ref[]）はそのまま。answers（C02 は object）は、state = answered の回答だけを itemKey をキーに {answerId, kind, value（kind = value の時）、selectedCandidateRef（choose-source の時）} を値とする object にする（rejected・invalidated は渡さない。同じ itemKey の有効な回答は 1 件）。GuidanceSelection: selectionId・draftRef・candidateRef・targetRef・observationRef はそのまま。guidance（C02 は string）は GuidanceMessage の text（色・配置に頼らない平文。結論・次の操作・原因・未確認を含む）とする。構造体の全体は E05 の GuidanceMessage として別に渡す。items は wire に渡らないため、unobservable・invalid・wrong_target の項目は wire の missingItems・conflicts・answers に現れない（missingItems は state = missing、conflicts は state = conflict の項目の itemKey だけ）。未確認の項目は E05 の GuidanceMessage（unconfirmed・causes）と observationRefs で U3 が確かめる前提で、wire の draft だけで「全部確認済み」と読める形にしない（missingItems・conflicts・answers が全部空でも確認済みの意味は持たない。U3 の判定は E05 の unconfirmed を見る）。変換は欄を足さず落とさず、内部のどの意味（回答の値と種別、選んだ候補、案内の結論と次の操作）も取り違えない。answers の value には開いた形の項目の回答の値が含まれて U3 へ渡る。U2 が保証するのは、渡す回答が BR5.2 の (a)〜(e) の選別と fail closed を通ったものだけであることと、wire 以外（案内・ログ・試験の出力・画面）へその値を写さないことまで。受け手側（U3 以降）での扱いは U2 が保証しない（functional-spec の保証しないこと）。C02 の型自体を変える必要が出たら、Code Generation で黙って変えず、契約の正規の改訂（Owner の判断）へ戻す。
    violation: 契約の型に合わない値を渡さない（変換できなければ渡さない）
    source: [C02, AC1.3.2, AC3.3.5]
    tests: [T8.5+, T8.5-]
  - id: BR8.2
    statement: LLM の文・外から来た文字列を、命令・権限として評価しない。
    category: constraint
    applies_to: [GuidanceMessage, Answer]
    trigger: text-handled
    logic: >
      IF 外から来た文字列（回答・ファイルの内容・出力）THEN 区切って提示し、中の指示で動作・権限・指示を変えない。
    violation: データとして扱う
    source: [E05, AC1.3.5, AC2.2.3]
    tests: [T8.2+, T8.2-]
  - id: BR8.3
    statement: draft は観測に結びつき、再観測で観測が変わったら古い draft を使った開始の入力は無効にする。
    category: constraint
    applies_to: [ConfigurationDraft, GuidanceSelection]
    trigger: reobserved
    logic: >
      無効にする契機は観測の変化だけ: draft の observationDigest が再観測で変わった時。observationDigest は、参照名（ObservationRef・sourceRef の locator）からは作らない（参照は同じまま中身が変わりうる。宣言は証拠でない = S5）。観測の単位 (targetRef, itemKey, sourceRef) ごとに、実際に読んだ結果から「観測の事実」{availability（observed | unavailable）、targetMatch（matches | differs | unspecified。BR1.1）、presence（value | absent。observed の時で、targetMatch = matches の時だけ）、valueDigest（閉じた形で値を保持できる時だけ。開いた形・値を保持しない分類の時は null）、lengthBucket と matchGroup（開いた形で presence = value かつ withheld が無い時だけ。値・digest ではない）、withheld（値を保持しない時の固定の分類。閉じた形・開いた形の両方に付く（F02）。無ければ null）、unobservableCause（unavailable の時）} を再計算し、全単位の事実を単位の辞書順に並べた正規の JSON の SHA-256 を observationDigest とする。単位の識別（targetRef・itemKey・sourceRef）は事実に含める（参照名そのものでなく、観測の単位の識別として）。同じ参照で中身が変わる、observed → unavailable、項目が現れる・消える、は digest が変わる。回答を足す・直すだけでは古い draft・selection を無効にしない（回答の有効・無効は BR6.2 が決める。answers は observationDigest の入力に入れない）。IF observationDigest が変わる THEN 古い draft・selection を無効とし、新しい draft を作って示す。古い draft を開始の入力に使えない。再観測は呼出側の要求で起こし、U2 が自分で契機を作らない。「中身が変わる、は digest が変わる」「実物だけを変えた入力が不一致になる」（AC2.2.4）は閉じた形の項目に限る。開いた形（valueForm = open）の項目は値も digest も持たない（Owner の決定 120）ので、中身だけの変化（同じ分類の中で長さの区分・一致の番号が同じ）は observationDigest に現れず、U2 は検出しない。ただし固定の分類（有効・invalid_format・secret_like）の変化は観測の事実に入るので、開いた形でも有効 ↔ invalid_format・有効 ↔ secret_like・invalid_format ↔ secret_like の変化で observationDigest が変わり、古い draft・selection・回答は無効になる（F02。負例 T8.3p）。これは U2 が保証しないこととして記録し（functional-spec の保証しないこと）、実適用側（U3・U5）が実物を読み直して確かめる前提にする。承認済みの要件の段は開き直さず、AC1.3.4・AC2.2.4 の読みとして traceability.json に記録した。
    violation: 古い draft を拒否
    source: [C02, NFR4, AC1.3.4]
    tests: [T8.3+, T8.3-, T8.3o, T8.3p]
  - id: BR8.4
    statement: U2 は外部への効果を出さない。効果の入力の形（requestId・idempotencyKey ほか）は U3・U5 の持ち物。
    category: constraint
    applies_to: [ConfigurationDraft]
    trigger: effect-boundary
    logic: >
      IF 外部への効果が要る THEN U2 は作らず、draft・selection を渡すだけ。U2 の読取りは副作用を持たない。
    violation: 効果 0
    source: [S7, C02]
    tests: [T8.4+, T8.4-]
  - id: BR9.1
    statement: 核は現在時刻・乱数・識別子を自分で取得しない。呼出側が明示入力で渡す。
    category: constraint
    applies_to: [ConfigurationDraft, Answer, GuidanceMessage]
    trigger: core-invoked
    logic: >
      IF 時刻・ID が要る THEN 引数で受ける。時計を読むのは adapter。観測の時刻は添えて示し、古い観測を新しいものとして示さない。「最新」を決める単位は観測の単位 (targetRef, itemKey, sourceRef) で、項目だけでは決めない。同じ単位の観測が複数届いた時は observedAt が最も新しい 1 件だけを使い、同じ単位の古い観測（遅れて届いたものを含む）は捨てる。開いた形の matchGroup（BR8.3）は、この「最新 1 件」を決めた後の全出典を対象に振る。単位が違う観測（同じ項目の別の出典）は互いに捨てず、すべて LC3 へ渡す（時刻の違う 2 出典、片方だけの更新、古い応答の遅着でも、全出典が残る。BR3.1 の必須 2 出典と食い違いの全出典表示を成り立たせるため）。observedAt が同じで内容が違う同じ単位の 2 件は、どちらも採らず、その単位を unobservable（changed_during_read）とする。
    violation: 引数で受ける
    source: [S4, NFR5, AC2.2.4]
    tests: [T9.1+, T9.1-]
  - id: BR9.2
    statement: U2 は U3 の正規開始・U5 の実適用・U6 の選択→再確認→切替を完成させない。
    category: constraint
    applies_to: [traceability, functional-spec]
    trigger: scope-checked
    logic: >
      IF 機能が開始・適用・切替の実行を含む THEN U2 の範囲外。U2 は確認表示と質問と回答の保持（対話の間）までで、その結果を他の単位に渡す。
      線の引き方（契機と出力で分ける）: U2 が行うのは、(i) 呼出側の要求で起こる再観測と、その結果による回答の無効化・項目の再評価・新しい draft の提示（BR6.2・BR8.3）、(ii) 出典の食い違い（choose-source）と不足への回答の受付だけ。選べるのは出典の値（Q1 = A）に限る。U6 の持ち物は、利用者が「次の操作」の候補を選ぶこと、その選択を契機にした再照合、解消した項目と残る項目の案内の切替（AC3.3.2）。U2 の案内の「次の操作」は表示するだけで、選択を受けて再照合・切替を行わない。
    violation: 範囲外として拒否
    source: [unit-of-work U2, AC3.2.3, AC3.2.5]
    tests: [T9.2+, T9.2-]
  - id: BR9.3
    statement: 試験・fixture・例は架空の対象だけを使い、他 repo の非公開本文を転記しない。
    category: constraint
    applies_to: [tests, fixtures]
    trigger: fixture-built
    logic: >
      IF fixture・例を作る THEN 架空の対象（例: sample-work）と架空の値だけ。秘密らしい値の fixture は gitleaks に拾われない形で作る。
    violation: 架空だけ
    source: [team.md, AC1.3.3]
    tests: [T9.3+, T9.3-]
  - id: BR9.4
    statement: U2 の成功を初回ゴール全体の成功と言わない。実測の証拠に基づいて示す。
    category: constraint
    applies_to: [functional-spec, GuidanceMessage]
    trigger: completion-shown
    logic: >
      IF 完了範囲を示す THEN 実コード差分・実行結果・必要な監査が揃う範囲だけを完了とする。文書・モック・既存 status の読取りだけ・exit 0 だけで完了としない。U2 の寄与と他単位の条件を分けて示す。
    violation: 証拠不足として拒否
    source: [FR8.1, AC2.2.5, AC3.2.4]
    tests: [T9.4+, T9.4-]
```

## Derived Notes

- 規則は全 43 件・9 グループ: 観測（BR1）、不在と道具（BR2）、項目状態（BR3）、質問（BR4）、回答の受付（BR5）、保持（BR6）、案内（BR7）、選択と引渡し（BR8）、境界（BR9）。
- Q1 = A は BR3.2、Q2 = A は BR6.1・BR6.5 に反映した。Owner の条件（持ち越しを落とさない）は BR6.5 と traceability.json の AC3.1.3 の行。
- Owner の決定 116・120 は BR3.2・BR3.4・BR5.2・BR8.3 に反映した（閉じた形の観測値だけを保持・表示し、開いた形の観測値は presence・lengthBucket・matchGroup と、形式に合わない・秘密らしい時の固定の分類だけ。固定の分類は開いた形でも観測の事実に入れ、分類の変化で古い回答・draft を無効にする = 設計監査 2 回目の F02、見直し 07 の R-25・R-26）。対象の結び（targetBinding・namedTarget・targetMatch）は BR1.1。

## Assumptions & Open Questions

None。
