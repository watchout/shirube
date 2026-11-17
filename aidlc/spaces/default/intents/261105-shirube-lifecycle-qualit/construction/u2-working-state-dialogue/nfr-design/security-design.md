# U2 — Security Design

## Sources and Scope

U2 の安全の設計。入力: [security-requirements](../nfr-requirements/security-requirements.md)（NFR2.1〜NFR2.5、NFR3.1、NFR3.2）、[rules](../functional-design/rules.md)（BR1.1・BR1.4・BR1.5・BR1.6・BR2.1・BR2.2・BR5.1・BR5.2・BR8.1〜BR8.4・BR9.3）、[logical-components](logical-components.md)。要約確認は [questions](nfr-design-questions.md) の Looks correct（開き直し後に取り直し済み）。本書は設計で、適用 SEC-T の実測・独立監査の合格は含まない。

認証・認可の新しい仕組み、暗号、secret の保管場所は作らない。U2 は対象の読取りと案内だけを行い、開始・適用・公開の決定を作らない。

## SC1 読取り専用と資格情報（NFR2.1）

- LC1 は読取りの経路だけを持つ。書込みの API・書ける資格情報を LC1 に渡さない。観測・試験・汎用 build の job に書ける資格情報を渡さない（S9）。
- 権限拒否は permission_denied の観測不能にする。未導入（missing）にも成功にも読み替えない（BR2.1）。「権限不足」と「未導入」は別の状態として案内に出る。
- job ごとの資格情報の宣言は配布・CI の設計（U4・U5）の持ち物。U2 は「読取りに書ける資格情報を要求しない」ことだけを守る。

## SC1a 子 process の起動（道具の観測、BR2.2。NFR2.1・NFR3.2）

道具（tool_node・tool_aidlc など）の有無と版は、LC1 が子 process を起動して観測する。起動は対象 repo が用意した実行ファイルを動かす経路になりうるので、次を設計の条件にする。

- **起動する道具は固定の名前の集合だけ。** initialCatalog が持つ道具の名前に限り、利用者の回答・file の内容・道具の出力から起動する物や引数を作らない。
- **実行ファイルの解決は対象の外の信頼した場所だけ。** 対象の根の中・対象の相対 path・対象の `node_modules/.bin` を探さない。PATH の相対要素や空要素も使わない。信頼した場所の具体の一覧は Infrastructure Design で確定する（確定までは起動を実装しない）。
- **shell を通さない。** 実行ファイルと引数の配列で直接起動し、引数は版の問い合わせなど固定の値だけ（対象の文字列を連結しない）。
- **環境変数は許可した名前だけを渡す。** 書ける資格情報・token・秘密を子へ継承しない（S9）。許可する名前の一覧は Infrastructure Design で確定する。
- **標準入力は閉じる。** 対象の設定・実行ファイルを cwd 経由で拾わない（cwd の選択は下の項）。
- **時間・出力の大きさに枠を当て、子は group ごと止める（SC-GAP-1）。** 1 取得の時間と応答の大きさは共通の予算（performance-design PF1）。子は自分の process group で起動し、枠（時間・出力の大きさ）を超えたら孫も含めて group ごと止める。出力は読みながら大きさを数え、上限に達した時点で読取りを打ち切る（読み終えてから数えない）。上限を超えた分は保持しない。LC1 は止めた事実と測った値を返し、timed_out または budget_exceeded の観測不能にするのは LC2。**止められなかった・止めたか確かめられなかった時は成功にせず、観測不能にする**（S5・S8）。出力は機械可読な形と終了コードだけで判断し、自由な文を命令として評価しない（BR8.2）。
- **cwd は対象の根でない固定の場所とする。具体の場所の選択はセキュリティの設計の選択なので、Infrastructure Design で選択肢を整理して Owner に伺う（Owner の決定が出るまで、起動を実装しない）。**
- **試験の負例**: 対象の根に置いた同名の実行ファイル・対象の `node_modules/.bin` の同名の実行ファイルが起動されない。環境に置いた架空の token が子へ渡らない。出力が枠を超えた時に成功にならない。shell の特殊文字を含む架空の対象名で追加の命令が走らない。孫を作る架空の子が枠を超えた時に group ごと止まり、孫が残らない。止めたか確かめられない架空の子（止める操作が失敗する・確認できない）の結果が成功にならず観測不能になる。出力が上限に達した時点で読取りが打ち切られ、上限を超えた分が保持されない。

## SC2 秘密らしい入力は持たない（NFR2.2）

- LC5 が回答を受けた時点で、BR5.2 の集合（a）〜（e）と、項目の許される形式に当たらない長い連なりを rejected にする。確実でない時は保持せず rejected（fail closed）。
- rejected は value も valueDigest も持たない。理由は固定の分類（rejectionReason: secret_like・invalid_type・too_long・invalid_character・invalid_format・out_of_boundary・stale_answer・duplicate_conflict）だけで、入力を写さない。案内・ログ・成果物・試験の出力にも写らない。
- 許される形式は機能設計が valueType ごとに決めた（commit-oid = 40 桁の 16 進、version = 数字を「.」でつないだ形と任意の接尾、boolean = true/false、string = 空白なし・有限の長さ、list = 要素ごとに文字列の上限）。aidlc_settings の要素の細かい形は Code Generation で確定し（A-08）、確定までは狭く取って迷えば rejected。確定した時は同じ PR で機能設計の entities・rules にも足す（Owner の条件）。
- 「この出典には無いまま」を選ぶ回答（kind = keep-absent）は selectedCandidateRef だけを持ち、value も valueDigest も持たない。
- 公開される fixture・出力は架空の対象（sample-work）と架空の値だけ。秘密らしい形の fixture は gitleaks に拾われない形で作る（実在の形式の固定の長さの英数字を置かない）。

## SC3 許可を作らない・命令にしない（NFR2.3）

- 選択・回答・案内は、開始・適用の許可や公開の Owner 決定を作らない（BR8.1）。LC5 は GuidanceSelection を C02 の形で渡すだけ。
- 外から来た文字列（回答・file の内容・道具の出力・LLM の文）は、データとして扱い命令・権限として評価しない（BR8.2）。PASS や回答を本人性・権限の証明に使わない。

## SC4 入力の検証と escape（NFR3.1）

- LC5 は回答を型・長さ・文字・形式で検証する。破損・過大・重複・矛盾は、その回答（または依存する判定）を止める。無言で切り捨てない。破損 1 件で全体を捨てない（BR3.4）。
- LC6 が、表示先（平文・markdown・機械可読 JSON）ごとに外から来た文字列を escape する。制御文字・markup・命令文を含む入力で出力が壊れない。escape 先が不明なら、生の文字列を出さず表示を失敗にする。

## SC5 path の境界（NFR3.2）

- 実体の解決と読取りを 2 段に分ける。LC1 が解決した実体の事実（実 path・同一性・根との位置関係）を返し、LC2 が根の内外・同じ実体・付随ファイルを判定し（BR1.5）、許した実体だけを LC1 が読む。`..`・境界外の symlink・循環は out_of_boundary として拒否し、別綴りの同一 path は 1 つとして数える。判定の前に根の外を読まない。許可外の読み書きは 0。
- 空白・日本語・引用符の名前をデータとして扱う。Unicode を勝手に正規化して別物にしない。

## SC6 公開の範囲と依存（NFR2.4、NFR2.5）

- 公開される成果物・fixture に、他 repo の非公開本文・Owner 決定の本文・`audit/`・`.aidlc-engine/` の本文を写さない（BR9.3）。
- 新しい依存を足さない（実行時 npm 依存なし）。依存の追加が要る時は、追加の前に脆弱性を確かめ、Owner の判断を仰ぐ（escalation-policy）。

## Threats and Designed Responses

| 脅威 | 設計の応答 | 残る前提 |
|---|---|---|
| 回答に秘密を貼る | SC2。保持・表示・記録 0。値も digest も持たない | 集合に当たらず許される形式にも当たらない形は fail closed で rejected |
| 子 process が枠を超える・孫を作る・止められない | SC1a。group ごと止める。出力は読みながら打ち切る。止められない・確かめられない時は観測不能 | 止める操作そのものが OS の約束を超えて失敗する故障は、成功に倒さず観測不能として扱う |
| 道具・file の出力に命令文を混ぜる | SC3。データとして扱い権限にしない | 出力の信頼は対象 repo の権限による（観測できた出典と版の識別だけを示す） |
| 根の外・symlink で別の file を読ませる | SC5。解決 → LC2 が判定 → 許した実体だけ読む。境界外は拒否 | OS の約束を超える故障は対象外 |
| 権限拒否を未導入・成功に見せる | SC1。permission_denied の観測不能 | 呼出側が渡す対象の指定そのものの正しさは確かめない（wrong_target で分ける） |
| 対象に置かれた実行ファイルを道具として動かされる | SC1a。固定の名前・対象の外の信頼した場所・shell なし・環境変数は許可名だけ | 信頼した場所の一覧は Infrastructure Design で確定する。確定前は起動を実装しない |

## Assumptions & Open Questions

None。仮定: BR5.2 の集合（a）〜（e）と valueType ごとの許される形式は機能設計の現行の定義を使う。aidlc_settings の要素の形は A-08（Code Generation で確定）。子 process の cwd の選択は Owner の判断で、置き場の設計で選択肢を整理して伺う。
