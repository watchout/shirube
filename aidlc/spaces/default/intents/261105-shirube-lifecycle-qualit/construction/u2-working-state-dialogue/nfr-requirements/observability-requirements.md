# U2 — Observability Requirements

## Sources and Scope

U2 の可観測性（利用者・監査が状態を判断できること）の要件（機能設計の BR6.2・BR6.3 の判定の順の直しは、この文書の要件に影響しない。影響は NFR4.2 のみ。「一致を確認」は閉じた形で全出典が回答と同じ値の時だけ示す）。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)（BR6.3・BR7.1〜BR7.7・BR9.4）、[requirements](../../../inception/requirements-analysis/requirements.md)（NFR1・NFR9）、[contract-summary](../../../inception/contract-design/contract-summary.md)。[questions](nfr-requirements-questions.md) の要約確認 Looks correct。

常駐の監視・alert・dashboard・分散 tracing は持たない（U2 は一回ずつの対話の処理）。ここでの「可観測」は、案内の文・観測の参照・機械可読な記録で、利用者と独立の監査が判断できることを指す。

## Requirements

| ID | 要件 | 合否 | 後続分担 |
|---|---|---|---|
| NFR9.1 | 案内は平文で、対象・確認済み・不足・食い違い・観測不能・次の操作・保証範囲を区別できる。色・配置だけに頼らない。同じ観測は LLM・対話先が変わっても同じ意味（BR7.1〜BR7.3）。未確認を確認済みと示す案内は不合格（BR7.5） | 3 入力（設定済み・不足 1 件・観測不能）で説明が異なる。生のエラーだけの案内は不可 | 次の操作の候補の選択は U6 |
| NFR9.2 | 「A が不足、B が観測不能」を区別し、原因・安全な次の操作・開始できない理由を示す（BR7.7）。「回答済み・未適用」を設定完了と示さない（BR6.3）。完了範囲は実コード差分・実行結果・監査が揃う範囲だけ（BR9.4） | A と B を取り違えない。文書だけで完了と示さない | 利用者が答えられない項目の次の操作は機能設計で定まった（FD-GAP-1 は直し済み、下記）。開いた形の回答は「比べられず観測できず」と示し、確認済みとは示さない（[security-requirements](security-requirements.md) の NFR2.6、BR6.4） |
| NFR5.2 | 案内は ConformanceGate（U1）の理由コードを読むだけで新設しない（BR7.6）。観測の参照（observationRefs）と観測時刻を添え、古い観測を新しいものとして示さない | 新しい理由コードの混入 0 | 理由コードの集合は U1 が唯一持つ |
| NFR1.1b | 行の網羅率は、実測値を機械可読な記録（試験の中で子 process に Node の lcov を流して解析して作る。手で書き写さない）で残し、門・監査はその記録を根拠にする。主の要件と合否は [tech-stack-decisions](tech-stack-decisions.md) の NFR1.1。未計測・実行されていない・計測不能は成功に数えない。申告された値は証拠にしない（S5・S8） | 記録の形が取れない版は失敗。分母 0 は失敗（NFR1.1 と同じ） | 記録の形・置き場は置き場の設計と Code Generation |
| NFR10.2 | 必須の失敗・skip・未実行・不明を成功にしない。診断は成功と失敗を区別して残し、設計だけの文書を実行済みと示さない（S8） | 無条件 PASS・失敗隠し・表明の無い試験 0 | Build and Test の記録 |
| NFR8.1 | 観測した道具・AI-DLC・Shirube の版を識別して案内に示し、必要な版と比べる（BR2.3）。版の観測の出典を添える | 版が読めない時は「確認できず」 | 版の固定と再現は配布（U5） |

## 機能設計の直し（済み）

- **FD-GAP-1**（Major、直し済み）: 利用者が答えられない項目の conflict・missing は質問にせず fix-source などの次の操作を示す（BR3.2・BR4.1・BR4.2）→ NFR9.1・NFR9.2 の案内の「次の操作」。
- **F02**（設計監査 2 回目）: 開いた形の項目の invalid_format / secret_like も、項目・出典・固定の分類だけを案内・記録に示す（値・digest・その一部は出さない）。分類の変化で古い回答・draft が無効になったことは、無効になった理由（観測が変わった）として示す。arc の読みで Owner に確認中。
- **FD-GAP-2**（Minor、直し済み）: initialCatalog が valueType を持つ → 秘密らしさの判定の根拠。[security-requirements](security-requirements.md) の NFR2.2・NFR2.6 を参照。
- **FD-GAP-3**（Minor、直し済み）: choose-source の選択は Answer（keep-absent を含む）で保持し、「この出典には無い」は値・digest を持たない → NFR2.2・NFR4.1。

機能設計の直しは見直しで READY になり、確認の段（Unit の checkpoint）の前の戻しは済んだ（Owner の決定 95 による arc の条件）。

## Not Set (No Evidence)

SLI・SLO の数値、alert の閾値、dashboard、tracing。根拠が得られた時に追加する。

## Assumptions & Open Questions

None。
