# U2 — Security Requirements

## Sources and Scope

U2 のセキュリティ要件。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)（BR1.5・BR2.1・BR5.1〜BR5.2・BR8.1〜BR8.4・BR9.3）、[requirements](../../../inception/requirements-analysis/requirements.md)（NFR2・NFR3）、[contract-summary](../../../inception/contract-design/contract-summary.md)。[questions](nfr-requirements-questions.md) の要約確認 Looks correct。本書は要求であり、適用 SEC-T の実測・独立監査の合格は含まない。

認証・認可の新しい仕組みは作らない。U2 は対象の読み取りと案内だけを行い、開始・適用・公開の決定を作らない。

## Requirements

| ID | 要件 | 合否（負例を含む） | 後続分担 |
|---|---|---|---|
| NFR2.1 | 観測は読み取りだけ。書ける資格情報を観測・試験・汎用 build に渡さない。権限拒否を未導入・成功に変えない（BR2.1）。読取り経路に書ける資格情報を要求しない（BR1.4） | 権限拒否の入力で外部への効果 0・許可外の読み書き 0・「権限不足」と「未導入」が別の状態になる | job ごとの資格情報の宣言は配布・CI の設計（U4・U5） |
| NFR2.2 | 秘密らしい入力（回答と、観測した値（file の内容・道具の出力）の両方。観測値はOwner の決定 116（iyasaka-arc#49 の 6962989955、本文 SHA-256 `3986367d…`）により、値・digest・候補・案内文を作らず項目・出典・固定の分類だけを示す。BR5.2 の集合 (a)〜(e) と、項目の許される形式に当たらない長い連なり）は保持・表示・記録 0。rejected は value も valueDigest も持たず、理由・案内・ログに入力が写らない（理由は固定の分類で、現行の規則では secret_like のみ。FD-GAP-2 の直しで分類が増えても、入力が写らない・value も digest も持たない条件は変わらない）。確実でない時は保持せず rejected（fail closed） | 集合の各形と、集合に無い長い連なりの負例で、出力・ログ・成果物・試験の出力への転記 0。rejected に digest が無い | 項目の許される形式（valueType）は機能設計の initialCatalog が持つ（FD-GAP-2 は直し済み）。valueType から導く valueForm（closed / open）で観測値の扱いを分ける（NFR2.6） |
| NFR2.3 | 選択・回答・案内は開始・適用の許可や公開の Owner 決定を作らない（BR8.1）。外から来た文字列（回答・file の内容・出力・LLM の文）を命令・権限として評価しない（BR8.2） | 回答に指示を含む入力で動作・権限が変わらない。PASS や回答が本人性・権限の証明として使われない | 開始・適用の許可は U3・U5 と Owner の公開決定 |
| NFR2.4 | 公開される成果物・fixture・出力は架空の対象（sample-work）と架空の値だけ。他 repo の非公開本文・Owner 決定の本文・audit/.aidlc-engine の本文を写さない（BR9.3） | 秘密らしい形の架空 fixture でも gitleaks に拾われない形。非公開本文の混入 0 | Code Generation の fixture 設計 |
| NFR2.5 | 依存を追加する前に脆弱性を確認する。この段で新しい依存を許可しない（実行時 npm 依存なし） | 依存追加の変更に確認結果が無ければ不合格 | 依存追加は Owner の判断（escalation-policy） |
| NFR2.6 | 開いた形（valueForm = open。string・list）の観測値は、秘密らしさを形式で判定できないので、保持・digest・表示をしない（Owner の決定 120）。示すのは出典・presence・長さの区分・一致の番号まで。ただし形式に合わない・秘密らしいと判定された時は、決定 116 の固定の分類（invalid_format / secret_like）だけを観測の事実に入れる（F02。生の値は LC2 が共有の判定の関数へ 1 回だけ通して捨て、分類があるとき長さの区分・一致の番号は持たない。判定できない時は secret_like）。分類の変化は観測 digest を変えて古い回答・draft を無効にする。閉じた形（version・commit-oid・boolean）の値は、形式に合い秘密らしくない時だけ保持・表示する（決定 116）。出典が対象を名指す必要があるのに名指さない時（unspecified）は観測不能（原因 malformed）で、確認済みの根拠にしない。**U2 が保証しないこと**: 開いた形の項目の中身だけの変化の検出と、その回答と実物の一致の確認（回答は「比べられず観測できず」と示す）。C02 の answers に残る開いた形の回答の値の受け手側での扱い（U2 は選別を通った回答だけを渡し、wire 以外へ写さないところまで）。実物の確かめは実適用側 U3・U5 が行う前提で、これらを成功に数えない（S5） | 開いた形の観測値が値・digest・案内・ログ・試験の出力のどこにも写らない。開いた形の分類だけが変わる入力（有効 ↔ invalid_format・有効 ↔ secret_like・invalid_format ↔ secret_like）で観測 digest が変わり古い回答・draft が無効になる（T8.3p）。withheld の不変条件（長さの区分・一致の番号なし、一致の採番に入らない、判定できない時は secret_like）の直接の試験（T3.4p）。開いた形の項目の中身だけを変えた入力が「一致・確認済み」にならず「比べられず観測できず」になる（負例）。unspecified の出典が confirmed にならない | 実物の読み直しによる確かめは U3・U5 |
| NFR3.1 | 回答・設定・出力を型・長さ・文字・形式で検証し、破損・過大・重複・矛盾は依存する判定を止める。外から来た文字列は表示先に合わせて escape し、データとして扱う（BR5.1・BR3.4） | 破損 1 件で全体を捨てない。無言の切捨て 0。制御文字・markup・命令文を含む入力で出力が壊れない | 実装の escape 先は置き場の設計 |
| NFR3.2 | path は対象の根の中だけ。`..`・境界外 symlink・循環・別綴りの同一 path は拒否または 1 つとして数え、許可外の読み書き 0（BR1.5）。空白・日本語・引用符の名前をデータとして扱い、Unicode を勝手に正規化して別物にしない | 各負例で許可外の読書き 0、同一 file が二重に数えられない | 同上 |

## 機能設計の直し（済み）

次の 3 件は機能設計の見直し（2 回目、READY）で残った指摘だった。**機能設計へ戻して直し済み**で、設計監査の 1 回目（PR #112）の差し戻しの直しも含めて機能設計の見直しが READY になった。NFR はその結果に合わせて書き直した。

- **FD-GAP-1**（Major、直し済み）: 利用者が答えられない項目（`sds_commit`・`required_checks` など）の conflict・missing は、質問にせず fix-source などの次の操作を示す（BR3.2・BR4.1・BR4.2）。
- **FD-GAP-2**（Minor、直し済み）: initialCatalog が項目ごとの valueType を持ち、固定の拒否分類は secret_like と invalid_format（BR3.4・BR5.2）。
- **FD-GAP-3**（Minor、直し済み）: choose-source の選択は Answer（kind = value / keep-absent）として保持し、「この出典には無い」は値・digest を持たない keep-absent で表す（BR3.2）。

## 開いた形の観測値と U2 が保証しないこと

NFR2.6 は Owner の決定 120（iyasaka-arc#49 の 6963254137、本文 SHA-256 `c7b7d6dd…`。arc が決定 95 により中継）から必ず出る範囲で、機能設計の BR6.2・BR6.4・BR8.3 と同じ。

F02 の直し（開いた形でも固定の分類を観測の事実に入れる）: 「決定 120 に反しない」は **arc の読みであって、Owner の言葉ではない**。決定 120 の本文は開いた形で示す物を項目・出典・有無・一致不一致・長さの区分と書いており、固定の分類（決定 116）を観測の事実と digest に入れるのはその一覧に無い追加である。この読みは arc が Owner に確認中（arc の項目 122）で、答えが来るまで「arc の読み・Owner に確認中」として扱い、Owner が別の読みなら withheld を開いた形から外す（その時は開いた形の分類の変化による無効化は保証しないこと、に戻る）。設計監査の依頼にも同じ書き方をする。

## Assumptions & Open Questions

None。適用する SEC-T の一覧と結果は Code Generation と Build and Test で項目・入力・合否つきで示す（未実施を実施済みと記さない）。
