# Shirube U1/U2 — 共通契約の利用側対応

状態: **提供/利用側の照合に出す設計案。実装方式の採択・独立監査・実DB試験前**。作者codex-adf、2026-10-05。
目的原文: 「開発の高効率化自動化による高速開発化」。第一段階: 「完成できることでいい」。
[新SDS手順](../process/ai-dlc.md)§5/6に従い、[論理契約](shirube-v1-progression-contract.md)§8の共通接続を具体化する。完了の観測は、固定版の提供操作→Shirubeの利用箇所→拒否/復旧→要求由来の試験→残る担当を双方が照合できること。本書だけでU1/U2の詳細設計全体を完成にしない。
合格したPR26 head `59970fa143f9ed8b8e57907800d4ab21e501f6b0` を親とし、既存要求23 ID、PC-01〜14、D1〜D6と監査済み本文を変更しない。今回追加の接続案へ親の監査PASSを流用しない。

## 1. 固定入力と判定の範囲

| 入力 | control_source_ref / 公開本文SHA-256 |
|---|---|
| U1/U2先行と共通部/最小adapter | [Shirube #6 / 5985512523](https://github.com/watchout/shirube/issues/6#issuecomment-5985512523) / `052df99fc9b501b14a38d6ab4ce26103c9ac0f97fc259a08b7f45ef719d3fd54` |
| 共通正本と責任分担 | [Onza #2 / 5990434510](https://github.com/watchout/onza/issues/2#issuecomment-5990434510) / `525d92d9d5e1be30dba0cf42cfe7900954d6b57295f7ada72e506a38d15cf6a2` |
| CF-AUTH-01 A採択 | [ARC #57 / 5990876569](https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-5990876569) / `9461d4a314f5da34765022f44a0602a30030a4ea4cd0a7058019a58f5d6a4a15` |
| 共通候補の返却 | [ARC #57 / 5991059854](https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-5991059854) / `f0246f9f0935f7ed3c139824cd0beb6d94b5b546b524421bbc837681f0a2ac3f` |
| Shirube論理設計の独立PASS・F01解消 | [Shirube #6 / 5992984615](https://github.com/watchout/shirube/issues/6#issuecomment-5992984615) / `e9ae3164323c38f28a7d2da0d7d6ade5bd35af0d3c758f9c39aa685438f5502a` |
| 共通候補の独立BLOCK | [ARC #57 / 5991664550](https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-5991664550) / `d92b815ca8865c8b25d26675c846948ec6d7af9a23e43f255cb659aacdb43bf2` |

提供側入力はOnza PR14 `c41c9c5712b6f8a7bb87dac2a2f2422742a6aaa9` / `onza-common/0.2.0-draft.1`。型・エラー・DB定義・共通SQLの正本はOnzaに置き、本書で複製しない。

| 固定入力 | bytes SHA-256 |
|---|---|
| [architecture.md][architecture] | `c9932c648f3c2db7e07ed084b6f8049b3d9a1b2c2f3f7ca93b77617070eb104a` |
| [contract.md][contract] | `ba9c90ef64213829ef29e8106a7a6e56c4dc78580ba78623e97d5dbdb859dde5` |
| [adoption.md][adoption] | `450cd689d4ad2411422468ce9dfb0360812159b9d033f3649af4efc98214528f` |

共通監査はD1〜D5 PASS、D6 FAIL。F01は指定Python検査がUUID/digest/issuecomment URLの末尾LFを受理する言語間不一致で、修正と独立再確認が必要。暗黙trim・Shirube独自schema・文字列の正規化で回避しない。利用方法の検討はできるが、当該候補を採択済み配布物・実装可能な確定契約・実DB適合PASSとして扱わない。
[AUNの利用側対応 @3847262][aun-input]も入力とする。AUNの業務grant/配送/gatewayをShirubeに複製せず、共通提供側への関数・配布版・保守席の依頼は既存ARC #57に集約する。

## 2. 正本の操作をどこで使うか

同じPostgreSQL DBの共通領域とShirube領域を使う。共通の照合・世代判定は版固定した提供物を再利用し、Shirube側adapterはdriver/形式の変換と製品の利用箇所への接続に絞る。未公開のpackage名・関数署名を補作しない。

| Onza契約の入口 | Shirube側の利用・所有 | 拒否/不明/回復と必要な観測 |
|---|---|---|
| `inspect_installation` | 起動時にcontract/schema/manifestとinstallation/epochの実値を照合。U1の保存とU2の照会が同じDBを参照する | 未初期化・別DB/epoch・非対応版・取得不能で新規効果を許可しない。runtimeからmigrationや別DBを作らない。CF-01/06/07、PC-11 |
| `resolve_actor` | 信頼された接続から構築した文脈でservice/workloadのCommonRefを取得。Work/Attempt/Observation/NextActionへ当時の参照を結ぶ | MCP本文のprincipal/seat自己申告を認証に使わない。過去参照を現在の許可証にしない。CF-04/05、PC-05/07 |
| `read_principal` | 本人確認専用の検証側が登録credentialと回答humanの現在参照を照合。保存serviceの参照と分ける | 任意の人を指定する一般LLM toolにしない。humanというkind・snapshot・GitHub投稿名義だけでは本人回答にならない。CF-04/05、AH-01/02、PC-05/06 |
| `resolve_seat` | 現在の席binding/世代を対象試行と照合。単独/AUNの実行参照は別に保持する | retired/unbound/draining/期限切れ/旧世代/不明を新規開始へ使わない。AUN endpointはAUNから取得し、cwdで共通IDを作らない。CF-03/04/05、PC-07/13 |
| 同transactionの共通検証（具体呼出形は返却待ち） | Shirubeの制限した保存/照会関数の入口で現在主体・所属・世代と製品操作/対象版を照合し、記録を確定 | 共通helperの呼出し後に無検査のDMLを許さない。service/humanの両主体が関与する回答保存も対象。CF-05、PC-07/08/11/12 |
| `read_common_change` | 認可された導入/管理側が、応答を失った共通管理commandを元actor/scope/commandで照会 | 現在の閲覧権限を検査。新actor/new commandで再発行しない。共通commandとShirubeの判断/工程/開始要求を同一IDにしない。CF-05/07、PC-11 |
| 共通`change`/migration | 通常Shirube runtimeの外。承認済みinstaller/operatorが共通導入・管理を担当 | Shirubeの通常開始/停止から共通表を書換えない。担当の受諾と実DB操作認可を別に確認。CF-01/02/03/05 |

Shirubeの案件と共通scopeの対応は明示登録したものを使い、repo名/パス/tenant文字列から推測しない。同じscopeに所属していても、案件の閲覧/変更、回答、開始/停止の業務権限は別に検査する。対象外の本文・件数・ID存在を返さない。
共通Failureのコードをそのまま製品の工程合否にしない。adapterは正本のコードを保持し、進行側が理由を対応付ける。`unauthenticated/forbidden/stale`等は該当効果を拒否、`unavailable/outcome_unknown`等は不明として照会へ結ぶ。未初期化/非対応版は導入・互換の解消先へ返し、単純な再試行や人の一般承認で成功にしない。列挙の網羅性は固定schemaに照合する。

## 3. 本人回答から開始までの確定点

CF-AUTH-01 Aは採択済みで再質問しない。判断が必要な時だけ保護画面を開き、通常の許可済み作業へ追加の開始操作を求めない。Onza UI/AUN/Kusabiを必須の本人確認経路にしない。

1. Shirubeが判断要求の対象版・提示全文・選択/条件/範囲を固定。保護された検証側が、これらとinstallation/epoch/scope・登録本人・期限に結ぶchallengeを作る。LLMの要約から承認本文を再構成しない。
2. 固定版の既存認証ライブラリで本人応答を検証する。具体ライブラリ/RP/origin/配備/登録・回復方式は未選定。共通read_principalは所属の検査であり、この検証の代替ではない。
3. 回答保存のShirube transactionで、共通contract §5のロック順に従いserviceとhuman双方の現在性、対象版と回答権限を再検査。challenge消費と回答記録を同時確定する。二重回答/応答喪失は元判断要求へ照会し、再利用済みchallengeで別回答を作らない。
4. GitHub公開は別の外部効果。送付前に対象・本文digest・既存判断要求へ結ぶ公開intentを確定し、公開先を読戻してから公開確認とする。資格情報/認証応答等の秘密を本文へ載せない。応答不明では元要求に結ぶ公開結果を照会する。検索で見つからないだけで未投稿と断定し、新規投稿を重ねない。重複抑止/照会の具体APIと回復条件はGitHub接続設計で確定する。
5. 公開済みでも即開始せず、進行側が現在の対象/計画・本人判断・共通参照・必須監査/CIを再照合し、同じ試行の開始intent/NextActionを確定する。外部開始前の再検査、受付/実開始/結果、次作業への接続は監査済み論理契約に従う。

DB transactionはGitHub公開やCLI実行まで原子的にしない。DB内は共通検証と製品更新、外部は耐久intent＋同一要求の照会/重複抑止という二つの境界を、対象/版/原因でつなぐ。実際の保存関数・競合確定点・起動側の同一性が固定されるまで、方式を実装済みとはしない。
認証登録/回復は既存の本人確認済み管理者と対応する保護経路へ限定し、AIのリンク所持だけで登録しない。回復後も旧credential/challenge/許可を復活させない。期限・保存期間・費用/回復予算は選択待ちで、任意値を埋めない。

## 4. 停止要求と共通失効の接続

Shirubeの承認撤回からの`stop`と、共通管理の`begin_revoke/finish_revoke`は別操作。前者だけで共有席を失効させず、後者のDB確定だけで外部実行が止まったとしない。
承認撤回では論理契約§4.1の元試行・実行・世代へ停止を要求する。開始権限を失った主体に停止権限を推定付与せず、必要なら現在の停止管理権限を持つ実行管理担当へ渡す。失効した通常runtimeでも停止管理操作ができると仮定しない。

| 接続 | Shirubeが保持/返す証拠の案 | 完了にしない場合 |
|---|---|---|
| 共通側から旧bindingの停止要求 | installation/epoch/scope、元binding/generation、begin_revokeで固定されたconsumer集合、当該版のShirube gateway/adapterと元の停止要求を対応させる | 未認証・対象/集合/版不一致を拒否。単独AUN未導入時にAUNの返却を要求しない |
| Shirube所有の外部効果 | 公開/開始等の対象intent全件と状態、未送付分の抑止、既送付/不明分の実行元照会、新規書出し抑止の観測元/時刻を結ぶ | 抜けたintent、照会不能、生存不明の旧gatewayがあれば停止成功の証拠を出さない。URI/hashやPID終了だけで代用しない |
| AUN接続時 | 実行の実効停止はAUN管理側の元実行/世代に結ぶ証拠を参照。Shirubeの公開/開始要求管理とAUNの実実行を区別する | 配送ACKを停止証拠にせず、AUN不明からローカル実行へ切替えない。両製品がconsumerなら各所有範囲の証拠が必要 |
| 共通finish_revokeへの返却 | 上記範囲の成功/未確認/不能と観測証拠を提供側のconsumer別検証へ渡す。具体型/検証入口はARCと合意する | common operatorが全consumer証拠を確認するまでShirubeからclosed/新bindingを主張しない |

Shirubeの承認撤回はU1必須。共通席の実交代を提供する時は上記結合を実証する。共通交代の未実装を理由にU1の開始後撤回/失効の負例を省略しない。成功した停止も、既存効果のrollback・作業中止・工程合格とは別に記録する。

## 5. 導入・復旧と試験の割当

Onzaの同じcommitからschema・DB定義/移行・SQL呼出adapter・fixture・manifestを固定して製品へ取り込む案に対応する。現在存在する設計候補を、配布済み実装と呼ばない。利用側lockに固定版/path/manifest digestを結び、自動latest追従や正本の手修正コピーをしない。
承認済みinstallerと通常runtimeの資格情報を分離する。runtimeは共通表/製品基礎表の直接DML/SELECT、DDL/role付与を持たず、共通検証を強制する製品操作/照会関数だけを使う。関数・制約・GRANTの実体も検査する。資格情報はLLM/実行CLIに渡さない。具体的なOS/実行環境の隔離は未選定で、隠した環境変数やhookだけを保証にしない。
restoreは共通と導入済み製品を整合したsnapshotから隔離環境へ復元する。外部の公開判断・失効・実行済み効果を照合し、新epoch/世代と旧実行の隔離を確認する。製品単独の部分restore、旧CommonRef/credential/承認の自動復活を許す案にしない。

| 実装時に必要な確認 / 担当 | 要求・既存ケース | 期待する証拠（全件NOT_RUN） |
|---|---|---|
| 提供側schemaとShirube adapter / Onza＋codex-adf | CF-04/05、PC-05/07/08/13 | 同じ正負fixture、ID/digest/URL末尾LF・未知値・余剰fieldを両言語/接続で同じく拒否。正常な型でも他scope/未登録/失効を拒否 |
| 単独の実DB＋本人確認＋公開＋実CLI / codex-adf＋共通提供側 | CF-01/04/05/08、AC-02/03/06、AH-01/02/06、ST-01〜04/08 | AUN/Kusabi/Onza UIなしで実開始と履歴照会。許可された正例が動き、未回答/偽本人/対象違いの効果0 |
| 回答・失効・開始/停止の競合 / 同上 | CF-03/05/07、AH-03〜05、PC-07/08/11 | 合意した確定順序で旧主体の新効果0、同一要求の二重効果0。停止ACK/応答不明でCANCELLEDにしない |
| 保存/公開/開始後の故障と復元 / 同上 | CF-06/07、AH-05/07、WP-05、PC-03/11 | 元要求から外部実態を照合。旧epoch/許可の復活0。未確認のまま新要求を作らず、復旧不能は明示 |
| 継続・現在地・閲覧 / codex-adf | AC-03/08、AH-06/07、WP-02/03/06、PC-01〜04/09/12/14 | 追加号令なしで次作業の実開始へ進み、人待ちは一度停止。他scopeの本文/件数漏えい0。工程確認と実開始を別の証拠にする |

表は親の23 ID/CF-01〜08の受入を削減しない。U3の実AUN比較と親全体の結合/実環境受入も残す。schema検査・mock・文書読解を実DB/実CLI受入へ流用しない。実装handoffで固定環境/コマンドと障害注入方法を具体化し、結果にprovider/consumer版、manifest、DB/epoch、元要求ID、操作者/時刻、実効果の前後を結ぶ。

## 6. 次に固定する入力と担当

| 対象 | 次の担当・成果物 | それまで止める範囲 |
|---|---|---|
| 共通F01と本対応の意味照合 | ARCがOnza正本を修正し、独立再監査/機械受領の固定参照、相違と是正先をARC #57へ返す。新旧差分をShirubeで確認する | 共通候補の採用・依存する実装。独立なShirube詳細設計は続けられる |
| 共通提供実装 | Onza担当の具体席/受諾、検証関数の呼出形（service/human同時検証を含む）、対応PG major、配布manifest/検証CLI/fixtureを既存担当経路で固定 | その関数を推測した実装・実DB接続。実装担当割当とDB操作認可は別 |
| 失効証拠の合意 | ARC＋codex-adf、AUN実行分はaunが§4の対象範囲・型・検証器/停止管理権限を固定 | 共通交代と実効停止の受入。論理stopの意味は再発明しない |
| 本人確認とCLI/継続処理 | codex-adfが固定ライブラリ、画面の配備/RP/origin、初回登録/回復、AI実行からの隔離、起動/停止/照会、host終了後の継続方式を比較し、結果を変える未決だけOwnerへ提示 | 方式依存の実装/起動。A方針や通常作業の開始号令は再質問しない |
| 保存と外部効果・運用条件 | codex-adfと各提供側が確定点/重複・不明時照会を固定。期限/費用/保持/復旧値は根拠・影響を示して必要な判断へ | 未合意条件に依存する実装/受入。無期限や任意の既定値を採用しない |

共通完成済みDBの提出を文書照合の一律前提にしない。一方で提供側・利用側の契約と必要監査が揃うまでは、その依存実装を開始しない。今回の返却先は既存ARC #57、Shirubeの進行記録は既存Issue #6。追加の別規格・常駐サービス・全製品移行を作業へ加えない。

[architecture]: https://github.com/watchout/onza/blob/c41c9c5712b6f8a7bb87dac2a2f2422742a6aaa9/docs/common/0.2/architecture.md
[contract]: https://github.com/watchout/onza/blob/c41c9c5712b6f8a7bb87dac2a2f2422742a6aaa9/docs/common/0.2/contract.md
[adoption]: https://github.com/watchout/onza/blob/c41c9c5712b6f8a7bb87dac2a2f2422742a6aaa9/docs/common/0.2/adoption.md
[aun-input]: https://github.com/watchout/aun/blob/38472628f67a753a72c8e1c0ee919d4193b5513d/docs/design/common-contract-request.md
