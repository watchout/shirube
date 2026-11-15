**Collaborator:** aidlc-architect-agent

# 業務規則（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file。規則の値（欄の名前 `extra_checkouts`・上限 4・拒否の理由の文）の持ち主は実装の 1 か所だけで、docs と試験はそれを書き写す・照らすだけ（S3、BR4.1）。判定の核は、現在時刻・乱数・識別子を自分で取らず、依頼・job の記録・GitHub の応答だけで決まる（S4、BR3.5）。

## 規則（source of truth）

```yaml
rules:
  # --- 宣言の読み取り（依頼の段階。GitHub への問い合わせより前） ---
  - id: BR1.1
    statement: 宣言は対象ごとの任意の欄 `extra_checkouts` に書く。欄が無い、または空の配列の対象は、宣言が無いのと同じに扱う。ある対象の宣言は、同じ依頼のほかの対象の判定に効かない。
    category: policy
    applies_to: Target.extra_checkouts
    trigger: 受付が依頼の各対象を読む時
    logic: IF 対象に欄が無い OR 空の配列 THEN 宣言なしとして、今と同じ判定（BR2.1）を受ける。IF 欄が 1 件以上ある THEN その対象の判定にだけ宣言を使う。
    violation: なし（宣言なしは正常）
    source: FR1.1, FR1.2, FR1.3, NFR2

  - id: BR1.2
    statement: 宣言は、repo と commit の 2 つのキーだけを持つ要素の配列でなければならない。配列でない、要素が組でない、キーが足りない・余る場合は拒否する。
    category: validation
    applies_to: ExtraCheckoutDeclaration
    trigger: 欄が存在する時
    logic: IF extra_checkouts が配列でない OR 要素が通常の組（キーが repo と commit だけ）でない THEN 拒否。
    violation: 依頼全体を拒否。理由「Invalid extra_checkouts declaration」。
    source: FR1.4

  - id: BR1.3
    statement: commit は 40 桁の小文字 16 進、repo は owner/name の形（owner は英数字とハイフン、name は英数字と . _ -、name は . だけの並びでない）でなければならない。短縮・前方一致・大文字・経路を含む綴りは受けない。
    category: validation
    applies_to: ExtraCheckoutDeclaration.commit, ExtraCheckoutDeclaration.repo
    trigger: 宣言の要素ごと
    logic: IF commit が 40 桁の小文字 16 進でない OR repo が owner/name の形でない（`..`・`.`・区切りの余り・空を含む）THEN 拒否。
    violation: 依頼全体を拒否。理由「Invalid extra_checkouts declaration」。
    source: FR1.4, NFR1

  - id: BR1.4
    statement: 同じ対象の宣言で、commit が重複してはならない（repo が違っても重複）。
    category: validation
    applies_to: Target.extra_checkouts
    trigger: 宣言が 2 件以上ある時
    logic: IF 同じ commit が 2 件以上 THEN 拒否。（job の記録に出るのは commit だけで、repo を見分けられないため、commit だけで重複を判定する。）
    violation: 依頼全体を拒否。理由「Duplicate extra_checkouts commit」。
    source: FR1.4

  - id: BR1.5
    statement: 1 つの対象で宣言できるのは 4 件まで。5 件以上は拒否する。
    category: constraint
    applies_to: Target.extra_checkouts
    trigger: 宣言の件数を数える時（要素の検査より前）
    logic: IF 件数 > 4 THEN 拒否。
    violation: 依頼全体を拒否。理由「Too many extra_checkouts declarations」。
    source: FR1.5, NFR5

  - id: BR1.6
    statement: 宣言の repo は、その対象の PR 自身の repo と同じであってはならない。比較は大文字小文字を区別しない。
    category: constraint
    applies_to: ExtraCheckoutDeclaration.repo
    trigger: 宣言の要素ごと
    logic: IF lowercase(宣言の repo) == lowercase(対象の repo) THEN 拒否。
    violation: 依頼全体を拒否。理由「extra_checkouts repo equals the PR repo」。
    source: FR1.6

  - id: BR1.7
    statement: 必須の検査が空の対象に宣言を置くことはできない（CI の記録を読まない対象では、宣言が観測されないまま通るため）。
    category: constraint
    applies_to: Target
    trigger: 宣言が 1 件以上ある対象
    logic: IF 宣言が 1 件以上 AND checks が空 THEN 拒否。
    violation: 依頼全体を拒否。理由「extra_checkouts requires a required check」。
    source: NFR1

  - id: BR1.8
    statement: 宣言の読み取り（BR1.1〜BR1.7）は、GitHub への問い合わせより前に、依頼の全部の対象について行う。1 件でも不正なら、問い合わせは 1 回も行わない。
    category: policy
    applies_to: requestChecks（依頼の検査の段階）
    trigger: 依頼を読んだ直後
    logic: FOR 各 target: 宣言を検査する。いずれか不正なら拒否。
    violation: 依頼全体を拒否（BR1.2〜BR1.7 の理由のどれか）
    source: NFR1, NFR5

  # --- job ごとの checkout の判定（job の記録 1 つにつき 1 回） ---
  - id: BR2.1
    statement: 宣言を持たない対象は、今と同じ判定を受ける。job の記録の commit（重複は 1 件に畳む）がちょうど 1 つで、その両親が依頼の base と head でなければならない。拒否の理由の文も今と同じ。
    category: policy
    applies_to: JobCommitSet, MergeVersion
    trigger: 宣言を持たない対象の job ごと
    logic: IF 宣言なし THEN 今の判定（commit の数 == 1、両親 == [base, head]）。理由は「Missing or ambiguous checkout commit」「Tested merge parents differ from requested base/head」のまま。
    violation: 依頼全体を拒否（今と同じ理由）
    source: FR1.3, FR2.2, FR2.8, FR4.4, NFR2

  - id: BR2.2
    statement: 宣言を持つ対象の job は、記録の commit のうち、宣言のどの commit とも一致しないもの（統合の版の候補）が、ちょうど 1 つでなければならない。0 件と 2 件以上は別の理由で拒否する。
    category: validation
    applies_to: JobCommitSet, MergeVersion
    trigger: 宣言を持つ対象の job ごと
    logic: 候補 = 記録の commit − 宣言の commit。IF 候補が 0 件 THEN 拒否（宣言の commit が統合の版と同じ場合を含む）。IF 候補が 2 件以上 THEN 拒否（宣言に無い追加の checkout）。IF 候補が 1 件 THEN BR2.3 へ。
    violation: 0 件は「Missing or ambiguous checkout commit」、2 件以上は「Undeclared extra checkout commit」。依頼全体を拒否。
    source: FR2.1, FR2.3, FR2.7, FR2.11

  - id: BR2.3
    statement: 統合の版の候補の両親は、依頼の base と head でなければならない（今の検査をそのまま保つ）。候補の commit は、対象 PR の repo に問い合わせて観測する。
    category: validation
    applies_to: MergeVersion
    trigger: 候補が 1 件に決まった時
    logic: IF 対象の repo の `git/commits/<候補>` の応答の sha が候補と全桁一致しない OR 両親（並びを問わず）が [base, head] でない THEN 拒否。
    violation: 依頼全体を拒否。理由「Tested merge parents differ from requested base/head」。
    source: FR2.2

  - id: BR2.4
    statement: commit の一致は、40 桁の全桁一致だけ。job の記録からの抽出は今の形（`git log -1 --format=%H` の出力の 40 桁の小文字 16 進）のまま。短縮・前方一致・大文字を一致とみなさない。
    category: validation
    applies_to: JobCommitSet, ExtraCheckoutDeclaration.commit
    trigger: commit を比べる時
    logic: 比較は文字列の完全一致。
    violation: 一致しない = 宣言と別の commit として扱い、BR2.2・BR3.1 で拒否される。
    source: FR2.3

  - id: BR2.5
    statement: 判定は、job の名前・step の名前・step の順序を読まない。
    category: policy
    applies_to: 受付の判定全体
    trigger: 常に
    logic: 名前・順序を入力に使う分岐を持たない。
    violation: 該当なし（設計の制約）
    source: FR2.9

  - id: BR2.6
    statement: 各 job の記録で、宣言の commit が出ていれば、対象ごとの DeclaredSeenSet に足す。job の記録に宣言の commit が出なくても、その job だけでは拒否しない。
    category: policy
    applies_to: DeclaredSeenSet
    trigger: 宣言を持つ対象の job ごと（BR2.2・BR2.3 を通った後）
    logic: seen = seen ∪ (記録の commit ∩ 宣言の commit)。
    violation: なし（拒否は BR3.1 が決める）
    source: FR2.4

  # --- 対象ごとの宣言の確認（その対象の全部の job を通した後） ---
  - id: BR3.1
    statement: 宣言した全部の commit が、その対象のどれか 1 つ以上の job の記録に出ていなければならない。どの job にも出ない宣言は拒否する。（問い Q1 の答え B。要件 FR2.4 の「job の記録に出ていない」は「対象のどの job の記録にも出ていない」と読み替える。）
    category: validation
    applies_to: DeclaredSeenSet
    trigger: 対象の全部の必須の検査の job を BR2.2・BR2.3 まで通した後
    logic: IF 宣言の commit のどれかが seen に無い THEN 拒否。
    violation: 依頼全体を拒否。理由「Declared extra checkout not in CI log」。
    source: FR2.4, FR2.11

  - id: BR3.2
    statement: 宣言した各組は、宣言の repo に実在しなければならない。宣言 1 件につき 1 回だけ、宣言の repo の `git/commits/<commit>` を問い合わせ、返った sha が宣言の commit と全桁一致した時だけ「実在」と数える。失敗・404・期限切れ・読めない形・不一致は、すべて拒否する。再試行はしない。宣言した commit が別の repo にだけある場合も拒否になる。
    category: validation
    applies_to: ExistenceObservation
    trigger: BR3.1 を通った後。宣言の並びの順に、1 件ずつ
    logic: FOR 各宣言: 応答を取る（例外は観測できず）。IF 応答の sha が宣言の commit と全桁一致しない（応答なしを含む）THEN 拒否。問い合わせの上限は 1 回の判定で対象ごとに最大 4 回。
    violation: 依頼全体を拒否。理由「Declared extra checkout not found in declared repo」。
    source: FR2.5, FR2.6, FR2.10, NFR1, NFR5

  - id: BR3.3
    statement: 受け入れの根拠は、job の記録から観測した commit と、GitHub への問い合わせで観測した実在だけ。依頼の宣言の値を、観測した証拠として受付の出力に写さない。受付の出力の形・値は、宣言を持たない依頼と同じ形のまま（`tested_merge` は統合の版の sha）。
    category: policy
    applies_to: ExistenceObservation, receipt
    trigger: 受け入れる時
    logic: receipt の項目を増減しない。宣言の repo・commit を receipt に載せない。
    violation: 該当なし（設計の制約）
    source: FR2.10, NFR2

  - id: BR3.4
    statement: 判定のどの段階で拒否しても、依頼全体を拒否する。一部の対象や一部の宣言だけを受け入れた形を作らない。
    category: policy
    applies_to: verifyAudit
    trigger: 拒否が起きた時
    logic: 例外として伝え、受付は BLOCKED を返す（今と同じ経路）。
    violation: 該当なし（設計の制約）
    source: NFR1

  - id: BR3.5
    statement: 判定の核は、依頼・job の記録・GitHub の応答・呼び出し側が渡す `now` だけで決まる。時刻・乱数・識別子を核が自分で取らない。GitHub への問い合わせは、呼び出し側が渡す `api` を通す。
    category: policy
    applies_to: 判定の核
    trigger: 常に
    logic: 宣言の検査と commit の分類は入力だけの関数にする。問い合わせは `api` 引数を通す。
    violation: 該当なし（設計の制約）
    source: NFR6

  - id: BR3.6
    statement: 拒否の理由は固定の文だけにする。宣言の repo・commit、token、job の記録の中身を理由に載せない。
    category: policy
    applies_to: Rejection.reason
    trigger: 拒否の理由を作る時
    logic: 理由は BR の一覧にある固定の文。宣言の値や GitHub の応答の本文を連結しない。
    violation: 該当なし（設計の制約）
    source: NFR8

  # --- 文書の揃い ---
  - id: BR4.1
    statement: 欄の名前と件数の上限の値の持ち主は、実装の 1 か所の定数だけ。`docs/sds/audit-method.md` と `kit/skills/sds-audit/SKILL.md` §2 はそれを書き写し、判定には使わない。3 か所の食い違いは、試験が実装の定数と 2 つの文書の文を照らして検出する。
    category: policy
    applies_to: 実装、`docs/sds/audit-method.md`、`kit/skills/sds-audit/SKILL.md`
    trigger: 文書を直す時、試験を流す時
    logic: 試験が定数を読み、2 つの文書の文に同じ欄の名前と同じ上限が書かれていることを確かめる。
    violation: 食い違えば試験が失敗する
    source: FR3.3, NFR7

  - id: BR4.2
    statement: 文書には、(1) 欄の名前と形、(2) 判定の規則（統合の版はちょうど 1 つ、宣言のどの組もどれかの job に出て宣言の repo に実在する、宣言していない commit は拒否、同じ repo と 5 件目は拒否）、(3) 受付が保証しないこと（宣言した commit の中身・宣言した repo の妥当性は照らさず、保証するのは完全一致と実在だけ。受けるか差し戻すかは独立の監査の席が宣言を見て決める）を書く。schema の版は `/1` のままと書く。
    category: policy
    applies_to: `docs/sds/audit-method.md`（1 段落）、`kit/skills/sds-audit/SKILL.md` §2（依頼の形の文）
    trigger: code-generation で文書を書く時
    logic: 上の 3 点が両方の文書にある（audit-method は規則と保証しないこと、SKILL は形と欄の説明）。
    violation: 監査の項目で照らす
    source: FR3.1, FR3.2
```

## 規則の要約（rules の derived view）

| 群 | 規則 | 内容 | 拒否の理由の文 |
|---|---|---|---|
| 1 宣言の読み取り | BR1.1〜BR1.8 | 欄は任意・対象ごと・4 件まで・形と commit の書式・重複なし・PR 自身の repo と同じは不可・必須の検査が空は不可・問い合わせの前に全部検査 | Invalid extra_checkouts declaration／Too many extra_checkouts declarations／Duplicate extra_checkouts commit／extra_checkouts repo equals the PR repo／extra_checkouts requires a required check |
| 2 job ごと | BR2.1〜BR2.6 | 宣言なしは今と同じ。宣言あり: 統合の版の候補がちょうど 1・両親は base と head・全桁一致・名前と順序を読まない | Missing or ambiguous checkout commit／Undeclared extra checkout commit／Tested merge parents differ from requested base/head |
| 3 対象ごと | BR3.1〜BR3.6 | 宣言はどれかの job に出る・宣言の repo に実在（1 件 1 回）・出力は同じ形・全体を拒否・決定性・固定の理由 | Declared extra checkout not in CI log／Declared extra checkout not found in declared repo |
| 4 文書 | BR4.1〜BR4.2 | 3 か所の揃い・文書に書く内容 | （試験の失敗） |

## 上流

- requirements: `aidlc/spaces/default/intents/261113-audit-intake-extra/inception/requirements-analysis/requirements.md`。各規則の `source` は、その requirements の FR・NFR の ID。対応表は `traceability.json`。

## 設計上の判断（deviation と採らなかった代替）

- 採った判断: 要件の FR2.4 を「対象のどの job の記録にも出ない組は拒否」と読み替える（問い Q1 の答え B、arc の答え）。採らなかった代替: A（全部の job に求める）は片方の検査の job だけが追加の checkout を持つ PR を拒否し、C（宣言に検査の名前を結ぶ）は依頼の欄が増える。
- 採った判断: 宣言を持つ対象で、候補が 0 件と 2 件以上の理由を分ける。宣言なしの対象は理由の文も今のまま。採らなかった代替: 全部を「Missing or ambiguous checkout commit」にまとめる（FR2.11 の「区別できる理由」を満たさない）。
- 採った判断: 重複は commit だけで判定する。採らなかった代替: repo と commit の組で判定（job の記録は commit しか見えず、同じ commit を 2 つの repo に宣言すると、どちらの宣言が job の記録に対応するか決められない）。
- 採った判断: 宣言の要素のキーは repo と commit だけ（ほかのキーは不正）。この新しい欄にだけ厳しくする。採らなかった代替: 知らないキーを無視する今の依頼の流儀（宣言に意味の無い欄が紛れても気づけない）。
- 採った判断: 必須の検査が空の対象の宣言を拒否する（BR1.7）。採らなかった代替: 宣言を黙って無視して通す（観測されない宣言を成功に数える）。
