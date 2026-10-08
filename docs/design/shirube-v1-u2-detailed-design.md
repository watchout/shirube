# Shirube U2 — 継続処理（進行の核）の詳細設計

状態: **独立設計監査に出す案。実装・実DB/CLI/LaunchAgent接続・製品試験の Green は未実施（NOT_RUN）。** 作者 codex-adf、2026-10-08。
目的: LLM が「進みます」と返して turn を終えても、条件を満たした次の作業が人の再号令なしに実開始まで進み、止まるべき時は 1 回だけ止まること（AC-03/06/08、WP-02/03/05、PC-01〜04/14）。

## 0. 固定入力

| 入力 | 固定参照 |
|---|---|
| 論理契約（状態・境界・継続処理・試験条件・残る選択） | `docs/design/shirube-v1-progression-contract.md` @ `5be3527682c28982ff3475abc793771dcb091859`（file SHA-256 `14b7c1079387517eb7e6e9628636d47c63955a3a2012e299214adf9a242b7a85`）§1〜§8 |
| 継続処理の配置（Owner 採択 A: ログイン中に自動進行） | https://github.com/watchout/shirube/issues/6#issuecomment-5993576577 、配置案は `docs/design/shirube-v1-standalone-execution.md` @ `cd9108352cc7b7c34b99293eefca102e91b0541d` §7.2・§7.4・§7.5 |
| Red 試験（PC-01〜04、MOCK） | https://github.com/watchout/shirube/pull/34 head `31138eaf6e422b5132595e096017e4d4f9df8023`。独立確認 T1〜T5 PASS（PR34 6049221090） |
| 規格 | SDS-V2 `docs/process/ai-dlc.md` §5・§6（main） |

上の契約と採択を変えない。契約の文言と食い違う箇所が見つかった場合は、本書ではなく契約側の課題として返す。

## 1. 本書で決めること・決めないこと

**決める**: 制御処理の中に置く「進行の核」の境界（ports）、4 つの操作 `record` / `tick` / `recover` / `status` の意味、状態遷移の実装規則、NextAction と質問の一意性の論理キー、reconcile と回復の手順、期限と非進捗の扱い、発行元の照合。

**決めない**（既存の未決のまま残す）: 物理 schema・SQL の排他・transaction 境界（契約 §8「保存/公開/開始の確定点」）、共通の型と `verify_current_tx`（Onza、onza#2 6034581781）、本人回答の検証入口（ARC、iyasaka-arc#57 6034806851）、CLI の権限隔離、launchd の設定値（PR28 §7.5）、開始期限と操作予算の具体値（契約 §8「期限/費用上限」）。これらに依存する実接続・受入は、MOCK の Green では満たさない。

## 2. 配置

```
LaunchAgent（採択 A。ログイン時に起動）
  └ Shirube 制御処理（LLM の turn から独立）
       ├ 受信口: CLI イベント・検証済みの本人回答・監査返却 → record(fact)
       ├ 起動時: recover()
       ├ 事実を受けた後と定期の照合時: tick()
       └ 進行の核 ── ports ──┬ store（耐久記録）
                              ├ executor（単独: ローカル実行接続 / AUN 接続: 実行管理）
                              └ clock
```

- 進行の核は ports 以外の入出力を持たない。LLM・CLI・GitHub を直接呼ばない。
- LLM の返答は `record` で文章として残すだけで、状態・次行動・条件の合否を変えない（契約 §1 末尾）。
- 定期の照合は、期限切れの検出（§6）と取りこぼしの再照合のためで、LLM を定期起動するものではない（PR28 §7.3）。

## 3. ports

| port | 操作 | 核が前提にする性質 |
|---|---|---|
| store | 計画（Work と依存・判断・期限）、Attempt、NextAction、質問、Observation の読取りと、複数件の更新を 1 単位で確定する操作 | 1 単位の更新は全部残るか全部残らない。§4 の論理キーで一意性を保つ。物理方式は未決（§1） |
| executor | `id`（実行元の識別）、`send(request)` → accepted / rejected / unknown、`query(requestId)` → not_started / running / stopped / finished / unknown、失敗時は例外 | 同じ `requestId` の再送は同じ要求として扱う（重複抑止は実行側の契約。契約 §4）。`query` の「not_started」を未開始の確定として使えるかは実行側の契約で固定する |
| clock | `now()` | 単調性は要求しない。時刻の欠損は欠損として保持する |

## 4. 論理キー（一意性）

| 記録 | キー | 再受領・再評価時 |
|---|---|---|
| NextAction | （原因の記録, 対象 Work, 対象 Attempt, 種別） | 既存を返し、新規を作らない（契約 §1「同じ原因・対象・動作に対する継続処理は一件」） |
| 開始要求 `requestId` | NextAction の識別から導く | 再送でも同じ値。新 ID で再起動しない（契約 §4） |
| 質問 | （対象 Work, 判断要求の提示版） | 1 件だけ作る。同じ人待ちで再質問・hold 記録を作らない（PC-04/14） |
| Observation | （発行元, 対象 requestId, 種別, 発行元の報告識別） | 重複は 1 回だけ適用（契約 §3） |

物理キー・排他方式は未決（契約 §1 末尾）。

### 4.1 送付の状態と保存の順序

開始要求（NextAction start）の送付は、次の状態で記録する。外部へ渡す前に必ず「送付中」を保存するので、「未送付」は**一度も渡そうとしていないことが確実な状態**だけを指す。

| 状態 | 入る時点 | 意味 |
|---|---|---|
| 未送付 | NextAction を保存した時 | executor へ渡していないことが確実 |
| 送付中 | `executor.send` を呼ぶ**前**に保存 | 渡した可能性がある。結果は未保存 |
| 送付済み / 拒否 / 送付不明 | `send` の結果を受けた**後**に保存 | accepted / rejected / unknown または例外 |

保存の順序: ①「送付中」を保存 → ② `executor.send` → ③ 結果の状態を保存。①の保存に失敗したら②を呼ばない。②の後に止まると記録は「送付中」のまま残り、§5.3 の 1 で照会に回る。

## 5. 操作

### 5.1 `record(fact)`

| fact | 処理 |
|---|---|
| `verified`（前工程の条件別照合） | 契約 §2.1 の条件集合が全件 PASS の場合だけ、その Attempt を VERIFIED として保存する。空集合・欠落・別版・自己申告は受理しない |
| `observation`（発行元, requestId, ack / started / finished / stopped） | 発行元が `executor.id` と一致し、requestId が保存済みの要求と一致する場合だけ適用する。ack は状態を変えない。started で RUNNING、finished で RESULT_RECEIVED。不一致は保留して記録し、状態を変えない（PC-02 負例） |
| `decision_answered` | 判断の適用照合（契約 §2）を経て、該当 Work の人待ちを解く。照合不能なら UNRESOLVED |
| `llm_reply` | 文章として保存する。状態・NextAction を変えない |

### 5.2 `tick()`

1 回の評価で次を順に行う。各手順の保存は §3 の 1 単位の更新で行う。

1. **開始の評価**: 現在計画の各 Work について、依存の VERIFIED と契約 §2 の①〜⑤を評価する。
   - ELIGIBLE かつ未解決の Attempt がない → Attempt（START_REQUESTED）と NextAction（start）を同じ単位で保存する。
   - HUMAN_REQUIRED → 質問を §4 のキーで 1 件だけ作り、その Work を人待ちで止める。独立した Work の評価は続ける（PC-04）。
   - REJECTED / UNRESOLVED → 原因と是正先・照会先を保存し、開始しない。
2. **送付**: 状態が「未送付」の NextAction（start）だけを、§4.1 の順序（「送付中」を保存してから `executor.send`、結果を保存）で渡す。accepted で「送付済み」、rejected で原因を保存、unknown または例外で「送付不明」とする。送付済みでも RUNNING にしない。「送付中」の NextAction を `tick()` が送り直すことはない。
3. **期限の照合**: 送付中・送付済み・送付不明で RUNNING になっていない Attempt が、Work の開始期限を過ぎていれば NextAction（reconcile）を §4 のキーで作り、同じ `requestId` を `executor.query` に渡す。
   - running → 実行元の照会結果として §5.1 と同じ発行元・requestId の照合を通した場合だけ RUNNING に進める。照合できなければ未確認のままにする。
   - not_started が契約上の確定なら、既存の認可と予算の範囲で同じ `requestId` を再送できる。確定でなければ再送しない。
   - unknown または例外 → 未確認のまま、次担当・照会先・解除条件を保存する（PC-02）。
4. **非進捗の計数**: 同じ NextAction が状態を変えずに 3 回続いたら、その Work を停止として保存する。人待ちは計数を待たずに止める（契約 §5、PC-14）。

### 5.3 `recover()`（制御処理の起動時）

`tick()` の前に次を行う。

1. 送付中・送付済み・送付不明の NextAction は、送り直す前に必ず同じ `requestId` で `query` する。照会の結果が出るまで、同じ Work に新しい開始を作らない。照会の扱いは §5.2 の 3 と同じで、再送は not_started が契約上の確定である時だけ、同じ `requestId` で行う（PC-03 送付後・実開始後、PC-11）。
2. 「未送付」の NextAction だけを、§5.2 の 2 の送付へ渡す（PC-03 送付前）。
3. VERIFIED の Work に対応する次の Work で、評価結果が ELIGIBLE なのに NextAction がないものは、§5.2 の 1 で作る（PC-03 前工程確認と次行動保存の間）。
4. 停止・人待ち・非進捗の計数は保存済みの値を使い、起動で初期化しない（PR28 §7.5）。

`recover()` を何度呼んでも、§4 のキーにより記録と送付は増えない。

### 5.4 `status(workId)`

同じ記録から、状態、最後に確認した時点、残る条件、NextAction（種別・次担当・照会先・解除条件）、未確認かどうかを返す。未開始を進行中と表示しない。閲覧権限の照合は U1 の範囲（契約 §6）で、核は渡された範囲だけを返す。

## 6. 状態遷移の実装規則（契約 §3 の具体化）

| 遷移 | 起こす入力 | 起こさない入力 |
|---|---|---|
| PLANNED → START_REQUESTED | §5.2 の 1 で Attempt と NextAction を保存 | LLM の文章、未保存の判定 |
| START_REQUESTED → RUNNING | 実行元の started（発行元一致） | 送付成功、ack、LLM の自己申告、他の発行元 |
| RUNNING → RESULT_RECEIVED | 実行元の finished | 終了コードだけの合格判定 |
| RESULT_RECEIVED → VERIFYING → VERIFIED | 契約 §2.1 の条件別照合が全件 PASS | CI 成功だけ、作者の「済み」 |
| 任意 → 後退 | なし（順序逆転の報告は保留し、状態を戻さない） | 後着の報告 |

## 7. 期限と予算

- 開始期限は、Work の接続契約で固定した値を使う。値がない Work は開始しない（契約不足として `status` に出す）。作者は秒数を決めない（契約 §5・§8）。
- 試験の 60,000 ms は fixture の値で、製品の値ではない（PR34 T4）。
- 回復の予算・非進捗 3 回の上限は保存し、制御処理の再起動で初期化しない。

## 8. 障害時の扱い

| 位置 | 扱い |
|---|---|
| 前工程の VERIFIED 保存後、NextAction 保存前に停止 | `recover()` の 3 で 1 件作る |
| NextAction 保存後、「送付中」の保存前に停止 | 記録は「未送付」。`recover()` の 2 で 1 回送る |
| 「送付中」の保存後、`send` を呼ぶ前に停止 | 記録は「送付中」。`recover()` の 1 で照会する。not_started が確定なら同じ `requestId` で 1 回送る |
| `send` が受理された後、結果の保存前に停止 | 記録は「送付中」。`recover()` の 1 で照会し、受付済み・実行中なら送り直さない |
| 結果の保存後（送付済み・送付不明）、応答なしで停止 | `recover()` の 1 で照会してから決める。照会不能なら未確認を保持 |
| 実開始後に停止 | 照会で running を確認し、新しい開始は作らない |
| store の更新失敗 | 新しい効果を起こさない。どの単位が未確定かを保持し、次の起動で照合する |

## 9. 試験との対応

| PC | Red 試験（PR34） | Green で確かめること |
|---|---|---|
| PC-01 | 正例・負例 | §5.2 の 1・2 と §6。W2 への追加質問 0、W3 の質問は PC-04 |
| PC-02 | 3 件（今は送付の前提で停止） | §5.2 の 3。reconcile 1 件、同じ requestId の照会、未確認の表示、他の発行元の拒否まで assertion が届くこと |
| PC-03 | 3 件 | §5.3 と §8 の停止位置ごとに、記録・外部への受理が 1 回。Red の 3 件（前工程確認の後、未送付、実開始後）に、Green と同じ PR で次の 3 件を加える: 「送付中」の保存後で `send` の前、`send` の受理後で結果の保存前、結果の保存後。後の 2 件では、照会の前に `send` が呼ばれないこと（executor の送付回数が増えないこと）を確かめる |
| PC-04 | 1 件 | §5.2 の 1。質問 1 件、hold 0、独立 Work の送付、依存未達の Work は待機 |

継続処理を止めた時（`tick` / `recover` を呼ばない、または一意性の照合を外した時）に該当の正例が失敗することを、Green の時点で確かめる。MOCK での Green は、実 DB・CLI・LaunchAgent・共通契約の受入に数えない（契約 §7）。

## 10. 監査の範囲

risk_class R3（実行制御の設計）。独立設計監査は main の `docs/design/shirube-v1-progression-audit-items.json`（D1〜D6）で、`sds-audit-request/1` の固定依頼として出す。監査 PASS の後に、PR34 へ MOCK の Green を積む。実接続は §1 の「決めない」が解けてから、別の監査を受ける。
