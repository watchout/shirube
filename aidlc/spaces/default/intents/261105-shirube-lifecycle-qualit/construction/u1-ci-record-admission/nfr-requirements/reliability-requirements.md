# U1 — Reliability Requirements

## Sources and Scope

[確認済み要約](nfr-requirements-questions.md)、[functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)に従う。本書はNFR4.1/NFR6.2/NFR10.2の主担当文書。常駐サービスの稼働率や新しい保存機構を要求しない。

## Availability and Fault Tolerance

| ID | 要件と合格条件 | 負例/後段の確認 |
|---|---|---|
| NFR4.1 | 取得/出力中断・構造不正で部分結果を有効なassessmentとして渡さず、既存正常値/過去記録を変更しない | FD-T17でhead/base/実blob未取得を再現。完全assessmentなしの既存診断/exit1とし、宣言digest/架空hash/空集合hashを代用しない。必須Sha256型を黙ってnullableに変えない |
| NFR6.2 | 自動再試行0、人待ちは一回通知して停止。停止後の効果/成果物/後継記録0。正当な入力/状態変化のある再評価時だけ現在値を再取得する | FD-T17とW07に結ぶ中断/再評価の検証。独自loop/watcherを設けず、既存の有限非進捗上限を弱めない |
| NFR10.2 | 必須FAIL/UNKNOWNを既存entryの失敗へ伝播し、無条件PASS/continue-on-error/skip成功換算0。前処理失敗と完全assessmentを区別する | FD-T01〜05/17/19でJSON/exitをassert。設計監査受付の既存mandatoryを削らず、受付を未取得U1 PASSへ循環させない |

有効な入力が揃う場合の四条件集約はFD rules BR7.1が正本。FAIL/UNKNOWNはいずれも閉門するが、早期取得不能では必須head/digest等が無いため**有効な完全assessmentを作らない**。診断を下流でdefault補完してPASS用envelopeに変えない。必須fieldが実観測に基づき揃い、一部条件だけ観測不能の場合は、規約に従う完全assessmentでUNKNOWNを返せる。

前処理診断でも非保証を明示し、既に確認できた残件を落とさない。まだ判定していない残件は未評価と示し、空配列を合成して「残件なし確認済」としない。完全assessmentの出力条件と観測の表示は[observability-requirements](observability-requirements.md)を参照する。

## Graceful Degradation and Recovery

必須観測の失敗を、検査対象を縮めた縮退PASSへ変換しない。原因/不足/次の正当な操作を返す有限な停止を採る。正当な再評価ではPR/head/base/有効計画/対象/公開証拠を再読し、前のsnapshotや記憶を現値にしない。競合と対象分離の主要件は[scalability-requirementsのNFR4.2](scalability-requirements.md)。外部照会の有限予算は[performance-requirementsのNFR6.1](performance-requirements.md)を参照する。

U1は正式engineのstage/stateを変更せず、正式履歴/外部原本を所有しない。新しいDB/backup/復旧daemon/保存期間は設けない。記録形式を変える必要が出た場合は[tech-stack-decisionsのNFR8.2](tech-stack-decisions.md)の新旧同居と試験した逆向きを守る。

## Side Effects and Idempotency — NFR7 Applicability

**NFR7はU1に非適用。** U1は副作用のない読取と判定出力を行い、native操作/配布/外部投稿の再送を行わない。純粋読取へ無意味な冪等キーを要求しない。効果ある開始/停止/照会はU3、配布/復旧はU5が、同一キー/同一内容/別内容衝突/応答喪失時照会を担う。U1はこれらの操作や権限を代行しない。

## Design Audit and Completion Boundaries

未監査design-only headのU1は閉門したままとする。一方、先行設計監査を受けるための既存必須CIは未取得のU1 PASSに依存させない。checks空/必須削除/条件を減らす設計モードPASSを作らず、具体workflow結線は後続の正規設計で確定する。実装headの新CI/独立監査/作者受領/公開Owner判断/別担当統合も保持する。

Owner指定順U1→U4→U2→U3→U5→U7→U6と7依存辺を維持する。現runtimeへ指定順を反映する正式経路は未成立のまま。U1が済む頃に席が確認し、無理ならU4前にOwnerへ相談する。新tool/偽辺/改名/state/cache/jump/engine変更で回避しない。

## Verification and Status

試験方法はFD-T17/19および四条件の正負例を引き継ぐ。中断/拒否/上限/対象変更/入力破損の各ケースで停止と無効出力の非消費をassertし、実entryの失敗伝播も確認する。手元の製品試験・実CI・復旧試験は未実施。99.9%等の稼働率や未計測の回復時間保証は追加しない。

## Assumptions & Open Questions

None.

既知READY不足のactual PR受入や後段実装を、本書だけで解消済みとはしない。
