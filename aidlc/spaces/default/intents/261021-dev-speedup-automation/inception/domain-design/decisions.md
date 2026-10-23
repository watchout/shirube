# 設計の決定の記録（Architecture Decision Records）

出典:
- この段の答え: `domain-design-questions.md`（Q1〜Q8。arc の設計を、2026-10-22 の要約の確認で Owner が確認）
- 要件: `inception/requirements-analysis/requirements.md`
- 物語: `inception/user-stories/stories.md`
- 部品の一覧: `components.md`

状態: すべて「採択」（この段の承認で確定）。

| ADR | 題 | 元の問い |
|-----|----|----------|
| ADR-001 | 門の新しい判定は既存の門に足し、記録の橋を分ける | Q1 |
| ADR-002 | 計測は計算の核と読取りに分ける | Q2 |
| ADR-003 | #53 への書込みは W2 の道具が行い、shirube の計測は書かない | Q3 |
| ADR-004 | 「誤って止めた」分類は新しい形にする | Q4 |
| ADR-005 | S1 の承認の記録は shirube の CLI が作る | Q5 |
| ADR-006 | Owner の手は、この intent か道筋を指す物だけを数える | Q6 |
| ADR-007 | 「Inception が先」は計画の受付に足す | Q7 |
| ADR-008 | fix の PR は、機械向けの block で直す元の PR を示す | Q8 |
| ADR-009 | 形の読取りは 1 か所に置き、計測も同じ読み方を使う | この段で導いた（S3） |

---

## ADR-001: 門の新しい判定は既存の門に足し、記録の橋を分ける

- **Context**: 要件 FR2（前の段の承認の記録を確かめる）と FR6（変更 path が設計の置き場の中か）を、どこかで判定する必要がある。今の門（sds-gate）は commit status 1 つで、必須の検査と止める形への切り替えは repo ごとに Owner の決定。AI-DLC の記録の形は AI-DLC の版で変わりうる。門が承認として読むのは、Shirube が公開する承認の記録の 1 種類だけと決まっている（iyasaka-arc#49 6315688299）。
- **Decision**:
  - 前の段の承認の判定は、既存の門 SdsGate に足す。commit status は 1 つのままにする。
  - AI-DLC の記録と承認の記録を読む部分は、新しい部品 RecordBridge に分ける。
  - 設計の置き場の検査は、既存の判定 5（DesignBinding）を広げる。
- **Consequences**:
  - よい点: 必須の検査と Owner の切り替えの決定が 1 つで済み、Owner の手（S1-SH-07）を増やさない。AI-DLC の版の変化は RecordBridge の中で受け止められる。
  - 悪い点: 門の判定が増え、1 つの status の中で、どの判定が FAIL かを理由に出す必要がある。
  - セキュリティ: 門は固定した commit から動き、PR が自分を判定する検査を書き換えられない（既存の形を保つ）。RecordBridge は形と在りかだけを見て、本人の承認かは見ない。S1 では承認の偽装を、独立監査と GitHub の履歴で見る。
- **Alternatives Rejected**:
  - 新しい門を別の commit status として作る: 必須の検査と Owner の決定が 2 つになり、Owner の手が増える。
  - 記録の橋を判定 5 の中に入れる: 前の段の承認の判定まで設計の判定に混ざり、変える理由の違う物が 1 つになる。

## ADR-002: 計測は計算の核と読取りに分ける

- **Context**: 要件 FR1 の計算（中央値・90 パーセンタイル・率・半分の判定・切り替えの目安）は、同じ入力から同じ値が出ることを示す必要がある（NFR2）。チームの決まりでは、時刻と外への問い合わせは引数で渡す（Shirube 開発規格 S4）。
- **Decision**: 計測を 2 つの部品に分ける。
  - MetricsCore: PR の一覧・時刻・分類・Owner の手の一覧を引数で受ける純粋な関数。
  - MetricsCollector: GitHub から読み、MetricsCore に渡す。
- **Consequences**:
  - よい点: 計算を、試験の入力（fixture）だけで、正例と負例で確かめられる。GitHub の時間の上限・予算・「観測できず」の扱いを MetricsCollector に閉じ込められる。
  - 悪い点: 部品が 2 つになり、間の受け渡しの形を決める必要がある（Contract Design で決める）。
  - セキュリティ: MetricsCore は外に触れない。MetricsCollector は読取りだけで、製品のデータは読まない（NFR9）。
- **Alternatives Rejected**:
  - 1 本の script にまとめる: 計算を試験で切り離せない。
  - 指標ごとに 4 本の script に分ける: GitHub の読取りが 4 か所に分かれ、同じ読み方が重なる。

## ADR-003: #53 への書込みは W2 の道具が行い、shirube の計測は書かない

- **Context**: 要件 FR1.10 は、結果を既存の W2 の報告（iyasaka-arc#53）に載せるとしている。NFR10 は書込みを最小にするとしている。W2 の道具は iyasaka-arc 側にあり、この Mac で 04:30 と 18:00 に動く。
- **Decision**:
  - shirube の計測は、結果（1 行の JSON と、#53 に載せる文）を出すだけにする。
  - #53 の置き換えは、既存の W2 の道具が行う。
  - 要件 NFR10 を、shirube の計測は何も書かない形に狭める。物語 US1.2 の「計測の script が書くのは #53 の置き換えだけ」（AC1.2.4）は、W2 の道具の書込みとして読む。
- **Consequences**:
  - よい点: shirube の計測が iyasaka-arc に書く資格情報を持たずに済む（Shirube 開発規格 S9、鍵は用途ごと）。#53 を書く物は 1 つに保たれる。
  - 悪い点: W2 の道具の側に、計測を呼んで載せる変更が要る。その変更は iyasaka-arc の担当の仕事になる。
  - セキュリティ: 書ける資格情報の配布先が増えない。
- **Alternatives Rejected**:
  - shirube の計測が #53 を直接置き換える: shirube の計測に iyasaka-arc へ書く資格情報が要り、#53 を書く物が 2 つになる。

## ADR-004: 「誤って止めた」分類は新しい形にする

- **Context**: 要件 FR5 で、監査の席（devauditor）が門の FAIL ごとに「門の不備」か「PR の不備」かを書く。FAIL は、監査の依頼の無い PR（R0・R1 など）でも起きる。今の監査の返却の形（sds-audit-review/1）は、固定した checker（audit-admission）が読んでいる。
- **Decision**: 新しい形（例: `sds-gate-fail-classification/1`）を作り、その PR の comment に書く。形の持ち主と読取りは MetricsCollector に置く。
- **Consequences**:
  - よい点: 監査の依頼の無い PR の FAIL にも使える。今の監査の返却の形と、それを読む checker を変えずに済む。
  - 悪い点: 監査の席が書く形が 1 つ増える。監査の skill に書き方を足す必要がある。
  - セキュリティ: 分類は作者と別の席が書く。全席が同じ GitHub アカウントのため、書いた席の確かめは、監査の席の記録で行う。
- **Alternatives Rejected**:
  - 監査の返却の形に分類の欄を足す: 監査の依頼の無い PR では書く場所が無い。固定した checker にも手が入る。

## ADR-005: S1 の承認の記録は shirube の CLI が作る

- **Context**: 門が承認として読むのは、Shirube が GitHub に公開する承認の記録の 1 種類だけ。S1 は「本人確認: なし」の印を付け、DB の段で「済み」の印に替える。作る側だけを替え、門は印の受け入れを切り替えるだけと決まっている（iyasaka-arc#49 6315688299）。承認そのものは、Owner の AI-DLC の会話の中で行われ、audit に残る。
- **Decision**:
  - 新しい CLI の部品 ApprovalRecordWriter が、AI-DLC の audit の承認の出来事から、決まった形の承認の記録を作る。
  - 作った記録は、記録を repo に入れる PR に含める。CLI は push しない。
- **Consequences**:
  - よい点: 人の手で写す間違いが入らない。DB の段では、作る側だけを確認画面と DB に替えられる。
  - 悪い点: AI-DLC の audit の形に依存するので、AI-DLC の版を上げる時に確かめが要る。
  - セキュリティ: S1 の記録は本人確認なしで、後から「済み」に書き換えない（決定 6315688299 の 4）。記録を repo に入れる PR の監査では、Owner の作業場の file と bytes が同じかを確かめる（#49 6329978835 の 3）。
- **Alternatives Rejected**:
  - arc が #49 に承認の記録の comment を書く: 人の手で写すことになり、写し間違いが入る。
  - AI-DLC の audit の file そのものを門が読む: 同じ決定（6315688299 の 2）で、橋の設計で置き換えると決めた形。

## ADR-006: Owner の手は、この intent か道筋を指す物だけを数える

- **Context**: 要件 FR1.6 で、1 周の Owner の手（#49 の決定・exact-head・保護面の設定・指示ボードのカード）を数える。#49 には、OmotenasuAI など別の取り組みの決定も並ぶ。
- **Decision**:
  - #49 の決定の印（`shirube-owner-decision/v1`）・exact-head・カードのうち、この intent か道筋 DP-SHIRUBE-001 を指す物だけを数える。
  - arc は、#49 の決定の記録に、この intent を指す行を書く。
- **Consequences**:
  - よい点: 別の取り組みの決定が混ざらない。
  - 悪い点: 指す行を書き忘れた決定は数えから漏れる。漏れを見つけるため、計測は「指す行の無い Owner の決定」の件数も並べる（Contract Design で形を決める）。
  - セキュリティ: 計測は読むだけで、#49 に書かない。
- **Alternatives Rejected**:
  - 1 周の期間の中の Owner の決定を全部数える: 別の取り組みの決定まで入り、6 回の上限の意味が崩れる。

## ADR-007: 「Inception が先」は計画の受付に足す

- **Context**: 要件 FR2.3 は、採択の参照の無い道筋を計画の受付が拒むとしている。既存の計画の受付（PlanAdmission）は、道筋の形と意味を検査している。判定 4 にはまだつながっていない。
- **Decision**: 既存の PlanAdmission に、今の段の済みの条件を Owner が採択した記録への参照の検査を足す。
- **Consequences**:
  - よい点: 道筋を受け付ける時に止まるので、Unit を置く前に Inception の抜けが分かる。置き場が一番近い。
  - 悪い点: 受付と判定 4 がつながっていない今は、受け付けられていない道筋を判定 4 がどう扱うかが、既存の形（受け付けられた記録を読む）に頼る。
  - セキュリティ: 受付は形と参照の在りかだけを見る。採択が本人のものかは見ない。
- **Alternatives Rejected**:
  - 記録の橋で、道筋が指す製品の AI-DLC の記録を見て判定する: PR の時にしか動かず、道筋を置く時点で止められない。

## ADR-008: fix の PR は、機械向けの block で直す元の PR を示す

- **Context**: 要件 FR1.4 で、統合の後に、その変更を直す PR を数える。revert の PR は、GitHub が元の PR を自動で書く。作者が書くのは PR の block の数行だけ（FR9.1）。
- **Decision**: PR の機械向けの block（sds-pr/1）に、直す元の PR の欄を足す（作者が書く 1 行）。読み方は SdsGate に置き、計測も同じ読み方を使う（ADR-009）。
- **Consequences**:
  - よい点: 決まった形で機械が数えられる。作者の手間は 1 行に収まる。
  - 悪い点: 書き忘れた fix の PR は数えから漏れる。監査の項目で「fix なのに欄が無い」を見る必要がある。
  - セキュリティ: 新しい欄は参照だけで、権限を持たない。
- **Alternatives Rejected**:
  - 本文の `Fixes #N` を読む: Issue を閉じる書き方で、PR を指す決まった形にならない。
  - 監査の席が印を付ける: 監査の席の仕事が増える。

## ADR-009: 形の読取りは 1 か所に置き、計測も同じ読み方を使う

- **Context**: 計測は、監査の返却（sds-audit-review/1）と PR の block（sds-pr/1）を読む。この 2 つは、すでに門の部品が読んでいる。チームの決まりでは、判断の決まりと形の読み方は 1 か所にだけ置く（Shirube 開発規格 S3）。この決定は問いには無く、この段で部品の呼び合う向きを決めるために導いた。
- **Decision**: MetricsCollector は、監査の返却を AuditAdmission の読み方で、PR の block を SdsGate の読み方で読む。自分では同じ読み方を書かない。
- **Consequences**:
  - よい点: 形が変わった時に直す所が 1 つで済み、門と計測で読み方が食い違わない。
  - 悪い点: 計測が門の部品に依存する。門の部品の読み方を、外から呼べる形にする必要がある。
  - セキュリティ: 計測が呼ぶのは読み方だけで、門の判定や書込みは呼ばない。
- **Alternatives Rejected**:
  - 計測の中に読み方を別に書く: 同じ知識が 2 か所になり、S3 に反する。
