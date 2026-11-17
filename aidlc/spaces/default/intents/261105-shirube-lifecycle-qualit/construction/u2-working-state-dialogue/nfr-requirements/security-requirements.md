# U2 — Security Requirements

## Sources and Scope

U2 のセキュリティ要件。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)（BR1.5・BR2.1・BR5.1〜BR5.2・BR8.1〜BR8.4・BR9.3）、[requirements](../../../inception/requirements-analysis/requirements.md)（NFR2・NFR3）、[contract-summary](../../../inception/contract-design/contract-summary.md)。[questions](nfr-requirements-questions.md) の要約確認 Looks correct。本書は要求であり、適用 SEC-T の実測・独立監査の合格は含まない。

認証・認可の新しい仕組みは作らない。U2 は対象の読み取りと案内だけを行い、開始・適用・公開の決定を作らない。

## Requirements

| ID | 要件 | 合否（負例を含む） | 後続分担 |
|---|---|---|---|
| NFR2.1 | 観測は読み取りだけ。書ける資格情報を観測・試験・汎用 build に渡さない。権限拒否を未導入・成功に変えない（BR2.1）。読取り経路に書ける資格情報を要求しない（BR1.4） | 権限拒否の入力で外部への効果 0・許可外の読み書き 0・「権限不足」と「未導入」が別の状態になる | job ごとの資格情報の宣言は配布・CI の設計（U4・U5） |
| NFR2.2 | 秘密らしい入力（BR5.2 の集合 (a)〜(e) と、項目の許される形式に当たらない長い連なり）は保持・表示・記録 0。rejected は value も valueDigest も持たず、理由・案内・ログに入力が写らない（理由は固定の分類で、現行の規則では secret_like のみ。FD-GAP-2 の直しで分類が増えても、入力が写らない・value も digest も持たない条件は変わらない）。確実でない時は保持せず rejected（fail closed） | 集合の各形と、集合に無い長い連なりの負例で、出力・ログ・成果物・試験の出力への転記 0。rejected に digest が無い | 項目の許される形式（valueType）の確定は **機能設計の直し待ち FD-GAP-2**（下記） |
| NFR2.3 | 選択・回答・案内は開始・適用の許可や公開の Owner 決定を作らない（BR8.1）。外から来た文字列（回答・file の内容・出力・LLM の文）を命令・権限として評価しない（BR8.2） | 回答に指示を含む入力で動作・権限が変わらない。PASS や回答が本人性・権限の証明として使われない | 開始・適用の許可は U3・U5 と Owner の公開決定 |
| NFR2.4 | 公開される成果物・fixture・出力は架空の対象（sample-work）と架空の値だけ。他 repo の非公開本文・Owner 決定の本文・audit/.aidlc-engine の本文を写さない（BR9.3） | 秘密らしい形の架空 fixture でも gitleaks に拾われない形。非公開本文の混入 0 | Code Generation の fixture 設計 |
| NFR2.5 | 依存を追加する前に脆弱性を確認する。この段で新しい依存を許可しない（実行時 npm 依存なし） | 依存追加の変更に確認結果が無ければ不合格 | 依存追加は Owner の判断（escalation-policy） |
| NFR3.1 | 回答・設定・出力を型・長さ・文字・形式で検証し、破損・過大・重複・矛盾は依存する判定を止める。外から来た文字列は表示先に合わせて escape し、データとして扱う（BR5.1・BR3.4） | 破損 1 件で全体を捨てない。無言の切捨て 0。制御文字・markup・命令文を含む入力で出力が壊れない | 実装の escape 先は置き場の設計 |
| NFR3.2 | path は対象の根の中だけ。`..`・境界外 symlink・循環・別綴りの同一 path は拒否または 1 つとして数え、許可外の読み書き 0（BR1.5）。空白・日本語・引用符の名前をデータとして扱い、Unicode を勝手に正規化して別物にしない | 各負例で許可外の読書き 0、同一 file が二重に数えられない | 同上 |

## 機能設計の直し待ち（名指し）

次の 3 件は機能設計の見直し（2 回目、READY）で残った指摘で、NFR の目標ではなく機能設計の直しである。**確認の段（Unit の checkpoint）の前に必ず機能設計へ戻して直し、再確認する**（Owner の決定 95 による arc の条件）。本書はその直しに左右されない形で書く。

- **FD-GAP-1**（Major）: 利用者が答えられない項目（`sds_commit`・`required_checks` など）の conflict と、答えられない missing 項目に、質問も次の操作も定まっていない。
- **FD-GAP-2**（Minor）: BR5.2 の「項目の許される形式」に使う valueType が initialCatalog に無く、固定の拒否分類が `secret_like` だけ。→ NFR2.2 の確定に関わる。
- **FD-GAP-3**（Minor）: choose-source の選択が Answer（BR3.2）と GuidanceSelection.candidateRef の両方に現れ、「この出典には無い」を回答の値・digest でどう表すかが未定義。

## Assumptions & Open Questions

None。適用する SEC-T の一覧と結果は Code Generation と Build and Test で項目・入力・合否つきで示す（未実施を実施済みと記さない）。
