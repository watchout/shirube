# U2 — Observability Design

## Sources and Scope

U2 の可観測性の設計。入力: [observability-requirements](../nfr-requirements/observability-requirements.md)（NFR9.1・NFR9.2・NFR5.2・NFR1.1b・NFR10.2・NFR8.1）、[tech-stack-decisions](../nfr-requirements/tech-stack-decisions.md)（NFR1.1・NFR1.2・NFR10.1）、[rules](../functional-design/rules.md)（BR2.3・BR6.3・BR7.1〜BR7.7・BR9.4）、[logical-components](logical-components.md)。要約確認は [questions](nfr-design-questions.md) の Looks correct（開き直し後に取り直し済み）。本書は設計であり、実行結果ではない。

常駐の監視・alert・dashboard・分散 tracing は持たない。ここでの「可観測」は、案内の文・観測の参照・機械可読な記録で、利用者と独立の監査が状態を判断できることを指す。

## OB1 案内の形（NFR9.1）

- 案内（GuidanceMessage）は「結論と対象 → 次の操作 → 原因・未確認 → 証拠の参照」の順で、平文で書く（BR7.1・BR7.2）。確認済み・不足・食い違い・観測不能・保証範囲を文の言葉で区別し、色・配置・記号だけに頼らない。
- 同じ観測は LLM・対話先が変わっても同じ意味になるよう、案内の内容は LC4（核）が決め、LLM は言い換えるだけで判定・理由を足さない（BR7.3）。
- 確認できていない物を確認済みと示さない（BR7.5）。生のエラーだけを案内にしない。
- LC6 が表示先ごとに外から来た文字列を escape する（security-design の SC4）。

## OB2 A 不足・B 観測不能の区別と完了範囲（NFR9.2）

- 「A が不足、B が観測不能」は別の項目として、原因・安全な次の操作・開始できない理由を添えて示す（BR7.7）。
- 「回答済み・未適用」は設定完了と示さない（BR6.3）。完了範囲は実コード差分・実行結果・監査が揃う範囲だけと示し、設計の文書だけで完了としない（BR9.4）。
- 利用者が答えられない項目（userAnswerable が偽）の不足・食い違いは、質問にせず次の操作を示す（機能設計 BR3.2・BR4.1）: 項目の値の不足・食い違いは fix-source、道具の不足・版の不足は install-or-upgrade-tool。行き止まりにしない。答えられる項目の食い違いは choose-source（全出典を順位なしで示す）。初期の項目一覧では choose-source は起きず、試験は架空の項目一覧で確かめる（T3.2k）。
- 必須の出典（requiredForConfirmed。書かれていなければ必須）が absent の項目は confirmed と示さない（BR3.1、T3.1x）。required_checks は U2 で扱わない（notHandledByU2）ので、確認済みとも示さない。

## OB3 理由コードを読むだけ・観測の参照（NFR5.2）

- 理由コードは U1 の集合を読むだけで新設しない（BR7.6）。構造の試験で、U2 が理由コードの定義を持たないことを確かめる。
- 案内に observationRefs と観測時刻を添え、古い観測を新しいものとして示さない。

## OB4 版の識別（NFR8.1）

- 観測した道具・AI-DLC・Shirube の版と、その観測の出典を案内に示し、必要な版（対象の pin・契約から読む）と比べる（BR2.3）。版が読めない時は「確認できず」と示す。

## OB5 機械可読な記録（NFR1.1、NFR1.1b、NFR1.2、NFR10.2）

- 行の網羅率は、試験の中で子 process に Node の lcov を流して解析し、実測値を機械可読な記録として作る（LC7）。手で書き写さない。記録の形が取れない版・分母 0・未計測・skip・計測不能は失敗とし、成功に数えない。申告された値は証拠にしない（S5・S8）。
- 対象 file の集合と分母は Infrastructure Design で確定する。確定までは「未確定」と書き、100% 達成とも全体とも示さない。
- 規則（BR1〜BR9 の 42 規則）ごとに正例 `T<x.y>+` と負例 `T<x.y>-` を置き、AC 由来の入力（設定済み・不足・観測不能の 3 入力の差、A 不足と B 観測不能の区別、宣言だけ同じで実物だけ違う入力）を assert する。表明の無い試験・無条件 PASS・失敗隠しを置かない。
- 診断は成功と失敗を区別して返す。必須の失敗・skip・未実行・不明を成功にしない。
- 診断の出先: U2 自身は file・log を書かず保存もしない（Q2 = A）。診断（観測の参照・理由・件数）は、呼出側へ返す値（Observation・GuidanceMessage・ConfigurationDraft）と試験の出力だけに載せる。呼出側が記録する先は呼出側の持ち物で、入力の写し・秘密らしい値はどの出先にも載せない（security-design SC2）。

## OB6 技術の維持（NFR10.1）

- JavaScript ESM（.mjs）・Node `>=22`・実行時 npm 依存なし・Node 組込みの `node:test` を維持する。既存の構造の検査（依存方向・循環・秘密・file 300 行・関数 50 行・複雑さ 10）を通す。JSON と exit code の契約を守る。

## 機能設計の直し（反映済み）

- FD-GAP-1（答えられない項目の次の操作）→ OB2 に反映。FD-GAP-2（valueType と許される形式）→ security-design の SC2。FD-GAP-3（選択の二重表現と keep-absent）→ security-design の SC2・reliability-design の RL1。機能設計は見直し済み（READY）で、残る細部は A-08（aidlc_settings の要素の形、Code Generation で確定し同じ PR で機能設計にも足す）。

## Not Set (No Evidence)

SLI・SLO の数値、alert の閾値、dashboard、tracing。根拠が得られた時に追加する。

## Assumptions & Open Questions

None。仮定: 案内の文言の細部は Code Generation の試験で固定する。
