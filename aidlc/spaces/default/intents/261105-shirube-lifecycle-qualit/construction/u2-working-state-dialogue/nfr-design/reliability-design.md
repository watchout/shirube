# U2 — Reliability Design

## Sources and Scope

U2 の信頼性の設計（Owner の決定 120 の開いた形の限りを含む）。入力: [reliability-requirements](../nfr-requirements/reliability-requirements.md)（NFR4.1・NFR4.2・NFR5.1・NFR6.1a・NFR6.2・NFR7・NFR8.2）、[tech-stack-decisions](../nfr-requirements/tech-stack-decisions.md)（NFR5.1a・NFR8.1a）、[rules](../functional-design/rules.md)（BR1.2・BR1.6・BR5.4・BR6.2・BR7.4・BR8.3・BR8.4・BR9.1）、[logical-components](logical-components.md)。要約確認は [questions](nfr-design-questions.md) の Looks correct（決定 116・120 と対象の結びを足した後に取り直し済み）。本書は設計であり、試験の結果ではない。

稼働率の目標は要件に根拠が無いので置かない。U2 は何も永続化しない（Q2 = A）ため、バックアップ・災害復旧・保存の整合は持たず、持ち越し先（U3・U5）に残す。

## RL1 変化した入力を完全な観測にしない（NFR4.1）

- LC1 は読取りの前後の内容（digest と大きさ）を生の事実として返す。LC2 が前後の digest を比べて changed_during_read の観測不能にし、完全な観測として使わない（BR1.6）。比較と判定の持ち主は LC2 だけ。書込み途中の入力も同じ。
- 子 process を止められなかった・止めたか確かめられなかった時は、成功にも一致にも倒さず観測不能にする。作りかけの子・孫を残さないよう、枠を超えたら group ごと止める（security-design SC1a）。
- 途中で失敗しても、半分だけ有効な draft・回答を残さない。draft は項目ごとの状態から組み立てる純粋な処理で、組み立て中に失敗したら draft を返さない。
- 回答の二重送信は (itemKey, valueDigest) で 1 件のまま。「この出典には無いまま」の回答（keep-absent）は (itemKey, selectedCandidateRef) で 1 件のまま。LC5 は同じ組を重ねて保持しない（BR5.4）。選択は GuidanceSelection と Answer の両方に保たれ、再質問の判定は Answer で行う。

## RL2 古い物を新しい物として使わない（NFR4.2）

- 回答は回答時点の項目の観測 digest と結ぶ（boundObservationDigest、1 件）。再観測で digest が変われば invalidated にし、BR3.1 で項目を再評価して不足・食い違いへ戻す（BR6.2）。他の回答は保持する。
- **検出できる範囲と U2 が保証しないこと（NFR4.2、Owner の決定 120）。** 観測の事実は {availability・targetMatch・presence・valueDigest（閉じた形だけ）・lengthBucket と matchGroup（開いた形だけ）・withheld・unobservableCause} で、単位 (targetRef, itemKey, sourceRef) の辞書順の正規の JSON の SHA-256 が項目と draft の観測 digest になる。閉じた形（version・commit-oid・boolean）は値の digest の変化まで検出する。開いた形（string・list）は値も digest も持たないので、presence・lengthBucket・matchGroup・出典・対象の結び・原因の変化までを検出し、**中身だけの変化（長さの区分も一致の番号も同じ）は検出しない**。開いた形の回答は「回答済み」のままで、実物との一致を確認済みと示さず「比べられず観測できず」と示す（BR6.3・BR6.4）。実物の読み直しは実適用側（U3・U5）の持ち物。この限りを成功に読み替えない（S5・S8）。
- 対象の結び: targetMatch = unspecified（named なのに出典が対象を名指さない）の単位は観測不能（malformed）で、回答の結び先にも確認済みにもしない。differs は wrong_target。
- 同じ観測の単位 (targetRef, itemKey, sourceRef) の観測が複数届いたら、observedAt が最も新しい結果だけを使う。同じ項目の別の出典は捨てない。遅れて届いた古い観測・古い回答は使わず、黙って上書きしない（BR9.1・BR5.4）。
- draft の observationDigest（上の観測の事実から再計算。参照名からは作らない）が変わったら、古い draft・selection を使った開始の入力は無効。回答を足しただけでは無効にしない（BR8.3）。同じ参照で閉じた形の中身が変わる・observed → unavailable・項目が現れる／消える、は digest が変わる。開いた形の中身だけの変化は上の限りで検出しない。
- 開始の入力の受け取りと拒否は U3 の持ち物。U2 は無効かどうかを判断できる値を渡すだけ。

## RL3 決定性（NFR5.1、NFR5.1a）

- 核は時刻・乱数・UUID を自分で取得しない。呼出側が `now`・識別子・観測を渡す（S4）。同じ明示入力は、同じ項目状態・質問・案内・digest になる（2 回実行でバイト一致）。
- 宣言値・cache・既定値を観測に写さない（BR1.2）。実物だけを変えた入力は不一致になる（S5）。「観測できず」を成功・一致に読み替えない。
- 時計を読むのは LC1（adapter）だけ。核が時計を読む実装は構造の試験で検出する。

## RL4 人待ちは 1 回で止まる（NFR6.2）

- 人の回答を待つ状態を作ったら、案内を 1 回だけ示して止まる（BR7.4）。待機中に成果物・hook record・再試行を生産しない。
- 状態の変化が無い再試行はしない（自動再試行 0）。連続非進捗の上限は実行系（U3 の loop）の持ち物。

## RL5 外部への効果が 0（NFR7、非適用）

- U2 は副作用の無い読取りと案内だけ（BR8.4）。読取りに冪等キーを要求しない。効果のある開始・適用は U3・U5 が同一キー・照会・競合拒否を担う。
- U2 の出力が外部へ効果を出す経路（書込み・push・投稿・network の呼び出し）を持たないことを、構造の試験で確かめる。

## RL6 契約を変えず、未知を拒否する（NFR8.2、NFR8.1a）

- 共通契約の形（Observation・C02・E05）を変えない。未知の major・必須形式は拒否し、推測で意味を足さない。保存形式を持たないので、新旧同居・逆向きの対象は無い。戻し方はコードの差し戻しだけ。
- 対応する環境（Node の版・別 CLI・別配置）は、manifest の宣言だけで全環境の動作を保証しない。確認した版を具体的に書く（NFR8.1a）。

## Not Set (No Evidence)

稼働率（SLA・SLO）、RTO・RPO、フェイルオーバー。U2 は常駐せず保存しないので該当しない。

## Assumptions & Open Questions

None。仮定: draft の組み立ては純粋で、途中の失敗は draft を返さない形にできる。
