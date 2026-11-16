# Shirube — 外部との受渡しと着手条件

## Sources and Boundary

Bolt は、対象単位を設計から実装・確認へ通して動く成果を得るひとまとまりである。[bolt-plan.md](bolt-plan.md)はOwner指定順 U1→U4→U2→U3→U5→U7→U6を記録するが、現在のruntimeへの順序反映は未成立である。本書は外部API・既存担当・必要な判断との受渡し条件を記し、連絡・適用・権限付与を実行した報告ではない。

入力は [requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)、[mockups.md](../refined-mockups/mockups.md)、[components.md](../domain-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[contract-summary.md](../contract-design/contract-summary.md)、[team-practices.md](../practices-discovery/team-practices.md)、[確認済み回答](delivery-planning-questions.md)。全13Must・47FR・10NFR・17US/88ACの受入範囲を維持する。

## Dependency Map

外部の稼働や受領・適用の所要は実測しておらず、数値を作らない。下表の「必要になる場面」で具体的な実物と権限を確認する。未確認のまま依存する操作へ進む代案は採らない。

| 依存・所有者 | 使うBolt / 契約 | 必要になる場面と受け取る証拠 | 不成立時の扱い |
|---|---|---|---|
| GitHubの対象PR/tree/blob/commit/公開監査原文 | B1、B2、B6 / E01 | 許可された読取りでPR/head/base、完全な変更集合、固定headの実bytes、必要な監査原文と投稿者/本文hashを取得する。読取り専用資格情報は必要なmetadata経路へ限定 | 部分取得、権限拒否、head変更、予算超過はUNKNOWN。未導入/成功へ変換せず、無制限再試行や書けるtokenの汎用buildへの配布をしない |
| 正式AI-DLCの既存形式・現在対象・正規操作 | B1、B4 / E02、E04 | 掲載可能な段/承認/見直し、現在対象・版・正式操作と結果を既存の権限内で扱う。公開投影と私的原本の所有を分ける | 未知形式や対象不一致は停止。新host/producer/発行元証明を追加しない。Claude/Bun前提をCodex実証済みとしない |
| 信頼固定版のセンサーとGitHub Actions | B2、B5、B6 / C03、C05、E03 | 信頼するchecker/必須集合/版と対象PR実入力、2センサーの実結果/実行元を確認。workflow/必須検査の具体差分には必要判断を保持 | 未実行・片方欠落・旧head・失敗・自己弱体化は停止。手元設定やPR自身を信頼元にしない |
| devauditorによる既存独立PR監査 | 全Bolt、特にB1 / 同PR設計監査 | 該当4分類は同PRの設計だけのheadの独立監査PASSを実装前に確認。実装後は現headのCI/正式依頼に対する独立実装監査を受ける。機械が証明しない発行/本人/実見直しの記録を現行運用で読む | 監査未成立・古いhead・設計変更による失効は、対応する実装/統合条件を満たさない。配下の見直しや門PASSで代替しない |
| 作者の受領・作者以外のsuite-lead統合 | 全Bolt | 正式な監査返却と作者受領、必須CI、必要公開判断を揃え、現headの別席統合を観測して次単位のCode Generationへ渡す | 受領/統合待ちは一度通知して停止。複数単位の実装をためず、自席で統合しない |
| 保護対象の公開Owner決定 | 該当する全Bolt | workflow・必須検査・branch protection・DB構造・資格情報・本番・料金・契約等の具体差分と対象が決まった時、必要な公開原文URL/本文SHAとexact-head条件を確認 | 計画生成・段承認・口頭写しを許可へ拡張しない。限定kit例外は全条件と列挙対象に一致する範囲だけ。未確認なら該当効果を行わない |
| 固定配布版と対象作業場の許可ファイル | B5、B6 / C04〜C07、E06 | 配布元の実内容/版、許可差分、戻し方、受け手の実ファイル/設定を再読し、既存資産と両配置の適用範囲を確認する | pin/registry/配布宣言だけで適用済みにしない。部分失敗やdriftは未完了として必要判断付き復旧へ。無許可の自動修正をしない |
| AUNの既存担当・対象・保留・公開境界 | B6 / C07、E06、FR13 | 対象版/差分/必要判断/確認方法/戻し方を具体化し、現担当の受領と対象PR/head、実適用/実PR正負/実設定のずれを確認。非公開原本は元の権限内に残す | 古いmapや担当名を受領/実行可能の根拠にせず、既存保留を解除しない。ShirubeのfixtureをAUN成功へ写さず、私的記録/秘密を公開しない |
| 初回実ゴール後の追加要求 | B7 / C06、FR8.2 | U5の初回完了を観測した後、新しい要求の明示受付と現在の対象/前提を確認する。同じ入力による初回版/追加版の実動作比較を受け取る | 今回の計画を将来の開始承認へ流用しない。実差が成立しない題材を完成にせず、必要な判断へ戻す。U6後にAUNへ影響する差は対象版で再検証する |

## Known Readiness Gaps

| 残件 | 所有と必要な場面 | 現在の扱い |
|---|---|---|
| Owner指定順の正式な反映方法 | 親が正式な単位経路との適合を管理。U1後U4へ進む境目までに必要 | DAG上は7辺すべて充足。現行2.11.1が従来順を解決する差は未解決。新道具/engine変更/偽辺/改名/state/cache編集/jump迂回/別取り組み/外部提案へ広げない |
| R-01: CI/AUNで非保証と既知残件を保持 | U1 Functional Design担当が必須形式/参照解決/不能時停止と境界試験を定める。U5/U7へ継承 | 未解消。旧不足付きPASSの保持と欠落・改変・別対象・参照不能の拒否を確認する。受渡し資料から落とさない |
| R-02: 種類別の肯定承認値と否定値拒否 | U1 Functional Design担当がplan/summary/stage-completionごとの既存形式変換と試験を定める | 未解消。否定・無回答・未知・種類違いを承認として数えない。計画を解消や恒久免除の記録にしない |
| 既存段のREADY不足 | U1の該当実PR受入で必要集合と実記録を確認 | 固定Asia/Tokyo/2026-11-06以後の段完了承認/再承認へREADY必須。feasibility原承認とscope原承認はnonblocking残件、scope再承認を含む5段の閾値後の不足はFAIL。同じ規則をAUNへ渡す |
| Construction Verification Command | 親が実行可能な対象と必須試験層/網羅率を示し、正式な問いでOwnerが選ぶ | 未設定。既存 `node --test tests/*.test.mjs tests/u2/*.test.mjs` を未実装U1実PR/CIや全層/100%の証拠としない。placeholderを作らず、未回答を承認にしない |

## Public Handoff Content

AUNへの受渡しには固定版・差分・対象・実ファイル照合方法・戻し方・必要判断/未確認を含める。結果には現在契約の非保証を保持し、assurance/engineAuthenticity/ownerIdentity/reviewerExecution/authorization/knownRemainingと対象・観測の対応を欠かさない。参照で渡す場合の具体的な供給と解決契約はU1 Functional Designで固定し、解決不能を成功にしない。

READY日付条件と旧不足の残件、再開時の通常見直しはShirube/AUNで同じ。配布先のtimezoneやPR設定で閾値を弱めない。U1のPASSは発行認証やmerge権限ではなく、独立監査と保護対象の公開判断を残す。AUNの原本や人の私的返信を公開の記録へコピーしない。

全担当へS1〜S9、TDD、Node組込み/実分母100%、適用SEC-T、依存導入前確認、用途別最小権限を渡す。外部待ちでは一度通知して停止し、後継依頼やwatcherを生産しない。DB別intent、他製品への展開除外、既存担当/承認/保留をこの依存表から変更しない。
