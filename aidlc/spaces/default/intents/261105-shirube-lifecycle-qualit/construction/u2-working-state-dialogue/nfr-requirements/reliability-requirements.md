# U2 — Reliability Requirements

## Sources and Scope

U2 の信頼性の要件。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)（NFR4〜NFR8）、[contract-summary](../../../inception/contract-design/contract-summary.md)。[questions](nfr-requirements-questions.md) の要約確認 Looks correct。

稼働率（SLA・SLO）の目標は要件に根拠が無いため置かない。U2 は何も永続化しない（Q2 = A）ので、バックアップ・災害復旧・保存の整合は持たず、持ち越し先（U3・U5）に残す。

## Requirements

| ID | 要件 | 合否 | 後続分担 |
|---|---|---|---|
| NFR4.1 | 読取り中に内容が変わった・書込み途中の入力を完全な観測として使わない（BR1.6）。回答の二重送信は 1 件のまま（BR5.4）。途中の失敗で半分だけ有効な draft・回答を残さない | changed_during_read の負例、二重送信の負例で重複 0・効果の二重 0 | 保存・再開・バックアップは U3・U5（AC3.1.3 と AC3.2.5 の履歴の部分の持ち越し先） |
| NFR4.2 | 観測が変われば回答を無効にし、古い draft・selection を使った開始の入力は無効（BR6.2・BR8.3）。遅れて届いた古い観測・古い回答は使わない（BR9.1・BR5.4）。回答の追加だけでは draft を無効にしない。この無効化と「実物だけを変えた入力で不一致」（NFR5.1）は、値の digest を持つ閉じた形の項目に限る。開いた形（string・list）でも固定の分類（有効・invalid_format・secret_like）の変化は観測の事実に入り digest が変わって回答・draft が無効になる（F02、T8.3p。この読みは arc の読みで Owner に確認中）。同じ分類の中での中身だけの変化は U2 が検出せず、保証しないこと（Owner の決定 120。[security-requirements](security-requirements.md) の NFR2.6）で、成功に数えない | 古い応答が後から届く負例で最後の観測だけを使う。黙った上書き 0。開いた形の中身だけを変えた入力が「一致・確認済み」にならない（負例） | 開始の入力の受け取りは U3 |
| NFR5.1 | 同じ明示入力（時刻・ID・観測）で同じ項目状態・質問・案内になる。核は時計・乱数・UUID を取らない（BR9.1）。宣言値・cache を観測に写さない（BR1.2） | 同じ入力 2 回で結果が一致。実物だけを変えた入力で不一致（閉じた形の項目は値の変化、開いた形は固定の分類の変化まで。同じ分類の中の中身だけの変化は NFR4.2 の限定のとおり検出せず、確認済みとも示さない） | 時計を読むのは adapter |
| NFR6.2 | 人待ちは 1 回示して止まり、待機中に成果物・再試行を作らない（BR7.4）。状態の変化が無い再試行はしない（自動再試行 0） | 待ち状態の入力で 2 回目の提示・記録生産 0 | 連続非進捗の上限は実行系（U3 の loop） |
| NFR7 | 非適用。U2 は副作用の無い読取りと案内だけで外部への効果を出さない（BR8.4）。読取りに冪等キーを要求しない | 外部への効果が 0 | 効果のある開始・適用は U3・U5 が冪等キー・照会・競合拒否を担う |
| NFR8.2 | U2 は保存形式を持たず、共通契約の形（Observation・C02・E05）を変えない。未知の major・必須形式は拒否し、推測で意味を足さない | 未知の major の入力を拒否 | 新旧同居・逆向きの対象は無い（保存形式を作らない） |

## Not Set (No Evidence)

可用性の数値（SLA・SLO）、RTO・RPO、フェイルオーバー。U2 は常駐せず保存しないため該当せず、根拠のある目標が得られた時に追加する。

## Assumptions & Open Questions

None。
