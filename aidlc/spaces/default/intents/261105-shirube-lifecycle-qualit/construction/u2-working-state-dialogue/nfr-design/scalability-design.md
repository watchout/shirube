# U2 — Scalability Design

## Sources and Scope

U2 の規模の設計（機能設計の BR6.2・BR6.3 の判定の順の直しは、この文書に影響しない。影響は reliability-design RL2・logical-components LC5 のみ）。入力: [scalability-requirements](../nfr-requirements/scalability-requirements.md)（NFR6.1b・NFR4.3・NFR6.1c）、[rules](../functional-design/rules.md)（BR1.4・BR3.1・BR5.1・BR9.1）、[logical-components](logical-components.md)。要約確認は [questions](nfr-design-questions.md) の Looks correct（決定 116・120 と対象の結びを足した後、さらに見直し回 1 の直しの後に取り直し済み）。本書は設計であり、負荷の測定結果ではない。

U2 は 1 つの対話が 1 つの対象を読む、有限の 1 回ずつの処理で、常駐・並列の自動実行・保存を持たない。利用規模の根拠が無いので、負荷の予測・scaling の契機・容量の数値は置かない。

## SC-A 入力の大きさに有限の上限（NFR6.1b）

- 観測の入力: 1 応答の大きさは共通の予算の profile（performance-design の PF1）。超えたら、その出典を観測不能にする。
- 子 process の出力は読みながら大きさを数え、上限に達した時点で読取りを打ち切る。上限を超えた分は保持しない（読み終えてから数えない）。子は自分の process group で起動し、枠（時間・出力の大きさ）を超えたら group ごと止める。止められなかった・止めたか確かめられなかった時は成功にせず観測不能にする（security-design SC1a、SC-GAP-1）。LC1 は止めた事実と測った値を返し、超過の分類は LC2。
- 回答の入力: LC5 が長さ・項目数を検査する（BR5.1）。超えた回答は rejected で理由を返す。回答の長さの上限値は Code Generation の設計で確定し、決めるまで数値を書かない。
- 超えた入力を無言で切り捨てて成功にしない。1 件の超過で全体を止めない（他の出典・他の回答は残る）。

## SC-B 対話どうしで可変の状態を共有しない（NFR4.3）

- draft・回答・観測・選択は、対話ごとの値として引数で渡す。module の変数・cache・file に共有の可変状態を置かない。
- 2 つの対話を同じ process で回しても、target・draft・観測が混ざらない。別の対話の回答・draft を読む経路が無い。
- 並列数・大規模負荷の SLO は追加しない。

## SC-C 項目が増えても同じ規則（NFR6.1c）

- 項目状態は BR3.1 の 1 つの規則で 1 項目ずつ決まる。項目が増えても、既存の項目の状態は変わらない（項目どうしは独立）。
- 予算内で観測できない分は、成功範囲を縮めずに観測不能にする（performance-design の PF2）。
- 項目一覧の拡張は機能設計の改訂と同じ手順（entities の initialCatalog を先に直す）。項目の追加は、項目一覧に valueType（valueForm はそこから決まる）と、出典ごとの targetBinding・requiredForConfirmed を書く形で行う。書かれていない targetBinding は named（失敗側）、書かれていない requiredForConfirmed は必須として扱う。targetBinding の無い出典は confirmed にならない（NFR6.1c）。
- 開いた形（string・list）の項目が増えても、値は LC2 の関数の中だけで比べて捨てる。保持する量は項目数に比例して増えない（Owner の決定 120。保持するのは presence・lengthBucket・matchGroup の番号と、項目あたり 1 つの固定の分類（withheld。F02、arc の読み・Owner に確認中）だけ）。

## Not Set (No Evidence)

利用者数・対話数・対象数の上限、スループット、scaling の契機、データ増加の見込み。U2 は何も永続化しないので、データ増加も無い（Q2 = A）。

## Assumptions & Open Questions

None。規模の根拠が得られた時に追加する。
