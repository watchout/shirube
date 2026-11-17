# U2 — 非機能設計の生成前確認

## Sources and Scope

対象は `261105-shirube-lifecycle-qualit / u2-working-state-dialogue / nfr-design`。製品コード・fixture・試験・CI・外部投稿・他単位には着手しない。以下は設計であり、実装・測定・試験済みの結果ではない。

正式入力: [performance](../nfr-requirements/performance-requirements.md)・[security](../nfr-requirements/security-requirements.md)・[scalability](../nfr-requirements/scalability-requirements.md)・[reliability](../nfr-requirements/reliability-requirements.md)・[observability](../nfr-requirements/observability-requirements.md) の各要件、[tech-stack-decisions](../nfr-requirements/tech-stack-decisions.md)、[functional-spec](../functional-design/functional-spec.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)。

## 既決と今回の未決

通常の新規質問は **0 件**。理由: (1) 性能・規模・稼働率は要件に根拠のある数値が無く、設計も数値を作らない（予算は共通の profile を参照するだけ）。(2) 技術選択（ESM・Node `>=22`・実行時 npm 依存なし・`node:test`）は NFR 要件で確定済みで、新しい依存・DB・常駐 process は採らない。(3) 置き場（file・CLI 入口）と行の網羅率の分母は Infrastructure Design で決める。この段は論理の部品と、各 NFR を満たす設計の解を書く。

- Q1 = A・Q2 = A（FD の答え）を引き継ぐ: 食い違いは順位なしで全出典を示す、回答は対話の間だけ保持する。
- FD-GAP-1〜3（機能設計の直し待ち）に左右されない形で書き、名指しで残す。この単位の確認の段（Unit の checkpoint）の前に、機能設計へ戻して直す（Owner の決定 95 による arc の条件）。

## 設計の骨子（確認してほしい点）

- 論理の部品は 7 つ。判定の核を 4 つ（観測の解釈・項目状態・質問と案内・回答の受付と保持）、I/O を 2 つの adapter（観測の読取り、表示の escape）、記録の生成を 1 つ（網羅率の記録）。核は時刻・乱数・UUID を取らず、明示入力だけで決まる。adapter は輸送と形式だけを変換し、判定・理由コードを再定義しない（S2〜S4）。
- 失敗は止まる方へ倒す: 予算超過・破損・秘密らしい入力・変化した入力は成功にも「一致」にも倒れない（S5・S8）。予算の数値は共通の profile を参照し、U2 は複製しない。
- 何も永続化しない。保持は対話の間の値だけ、観測 digest と結ぶ。保存・再開・バックアップ・冪等キーは U2 に持たず、持ち越し先（U3・U5）に残す。
- 常駐の監視・alert・tracing は持たない。可観測性は、案内の文・観測の参照・機械可読な記録で示す。

## 答えの分析（曖昧さ・矛盾）

新規の問いが無いので、答えの曖昧さ・矛盾は無い。要約で確かめる点は、(a) 数値を新たに作らず共通の予算を参照すること、(b) 行の網羅率の分母と置き場は Infrastructure Design まで未確定と明記すること、(c) FD-GAP-1〜3 を後で機能設計へ戻して直すこと、の 3 つ。

## Assumptions & Open Questions

None。仮定: 予算の数値は共通の profile の現在値を使う（U2 は複製しない）。部品の物理的な置き場は Infrastructure Design で決める。

## Consolidated Summary Confirmation

- U2 の非機能設計は、NFR 要件の全項目（NFR1〜NFR10 の詳細 ID。NFR7 は非適用）を、論理の部品 7 つと設計の解に対応づける。数値（p95・RPS・稼働率）は要件に根拠が無いので作らず、予算は共通の profile を参照する。
- 判定の核は時刻・乱数・UUID を取らない純粋な処理で、I/O と時計は adapter に置く。adapter は輸送と形式だけを変換し、判定・理由コードを再定義しない。
- 予算超過・破損・秘密らしい入力・変化した入力は、成功にも一致にも倒さず、観測不能または rejected にして理由を返す。秘密らしい入力は値も digest も保持せず、出力・記録に写さない。
- 何も永続化しない。保存・再開・バックアップ・冪等キーは U2 に持たず、持ち越し先（U3・U5）に残す。常駐の監視・alert・tracing は持たない。
- 行の網羅率 100% の分母と部品の置き場は Infrastructure Design で確定するまで未確定と明記し、成功とは数えない。機能設計の直し待ち（FD-GAP-1〜3）は名指しで残し、確認の段の前に機能設計へ戻す。
- 開き直しの変更（判定の持ち主、LC-GAP-1・LC-GAP-2）: 読取りの規則の判定を LC2 に置く。BR1.1（対象の指定の有無・出典が名指す対象との比較）、BR1.4（予算の超過の分類。LC1 は枠で止めて測った値だけを返し、予算の値は呼出側が明示入力で渡す）、BR1.5（根の内外・同じ実体・付随ファイルの判定。LC1 は解決後の実体の事実だけを返す）、BR1.6（読取りの前後の digest の比較）。BR3.4 は、file の破損（malformed）を LC2、値の型・形式・範囲の不正（invalid）を LC3 が持つ。LC1 は分類・比較・判定を持たず、生の事実だけを返す。
- 開き直しの変更（子 process の止め方、SC-GAP-1）: 子は自分の process group で起動し、枠（時間・出力の大きさ）を超えたら group ごと止める。出力は読みながら上限で打ち切り、上限を超えた分を保持しない。止められなかった・止めたか確かめられなかった場合は成功にせず、観測不能にする。この設計の条件を security-design と scalability-design に置く。
- 生成するのは NFR 設計の 6 文書（performance・security・scalability・reliability・observability・logical-components）と traceability だけ。コード・試験・fixture・CI・外部投稿・他単位には着手しない。

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

（開き直し前の確認 Looks correct は、Owner の決定 95 により arc が入力した記録。上の「開き直しの変更」を足したので、確認を取り直し、同じく Owner の決定 95 により arc が Looks correct を入力した（Owner の言葉ではない）。子 process の cwd はセキュリティの設計なので、置き場の設計で選択肢を整理して Owner に伺う。）
