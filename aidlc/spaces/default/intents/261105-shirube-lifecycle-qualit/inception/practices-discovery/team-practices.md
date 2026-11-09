# Shirube — チームの実践

確認済みの7項目の要約に基づき、Step 5 で最終統合した共通実践。Owner の Looks correct と正式な要約確認記録を受けて作成した。段の最終承認と `memory/team.md` への反映は未実施。公開根拠、既存の採択と実装観測の違い、古い記述の整理、今回固有の範囲は [evidence.md](evidence.md) に記録する。製品の試験合格や設定変更・配布の完了を表す文書ではない。

## Way of Working

- 私たちは、AI-DLC の段と単位に従って作業場の中で開発する。次に行う作業と Construction の進め方は、各取り組みの正式な設定・単位の一覧・Active Unit・Unit Stage に従い、席が独自の道筋や作業指示で決めない。Guard Policy は strict、Learnings は on を保ち、それ以外は各取り組みの正式な設定と適用される承認・検査に従う。適用される Build and Test・CI Pipeline・Operation まで通す（公開根拠 P1・P2）。特定の取り組みの設定や実行方式の観測値を、他の取り組みへコピーしない。
- 設計は AI-DLC の段で見直し、Owner が段を承認する。DB の構造・権限・契約・セキュリティに触れる単位は、機能の設計〜置き場の設計を終えた後、その単位の PR を設計記録だけで先に出し、devauditor の設計監査を1回通してから Code Generation に入る。実装は同じ PR に追加し、実装監査を受ける。これは廃止した独自の事前設計監査や判定5の復活ではない（P3）。
- 1単位を1つの PR で扱う。Code Generation の成果ができたら、その段の承認前に単位の変更だけの PR を用意して CI を流し、その結果を追跡表に記録する。複数単位の実装を同じ手元・branch・PR にためない。前の単位の PR が統合されてから次の単位の Code Generation に入る。TDD の失敗確認と実装も、この単位の PR 内で記録する。既存の別 PR による red/green は方法を示す歴史的証拠であり、現行の PR 分割規則にはしない（既存 team の採択）。
- 作る席・独立監査の席・統合する席を分ける。各 PR は devauditor の独立監査、作者の受領、必須の検査と門の判定1〜3を通し、作者以外の suite-lead が統合する。R2以上だけを監査するという旧文は、各 PR の監査を省く根拠にしない（既存 team、P1・P2）。
- 監査依頼は作者が行う。`kit/skills/sds-audit/SKILL.md` §2 を Codex でも読み、対象 head の CI が完了してから、`sds-audit-request/1` の JSON を1つ、watchout 名義で対象 PR のコメントへ投稿する。reviewer は `{"actor":"devauditor","github":"iyasaka-ai"}`。head/base は40桁、CI の検査、対象 head に含めた `docs/audit/*.json`、`scripts/hygiene/audit-admission.mjs` の SHA-256 を `verifier_sha256` として指定する（既存 team の手順）。
- 投稿本文全体の SHA-256 は GitHub API の本文 bytes から計算する。末尾改行が付く `--jq .body` の出力を代用しない。既存受付の checkout `~/Developer/audit-relay-shirube-c0c99481` で `node scripts/hygiene/audit-admission.mjs --request <依頼URL> --sha256 <本文SHA-256> --preflight` を実行し、`READY_FOR_REVIEW` の時だけ監査へ渡す。結果は対象 PR に返り、同じ検査を `--preflight` に代えて `--review <返却URL>` で実行し、`RECEIPT_ACCEPTED` を作者の受領として PR に記録する。
- 監査依頼後、結果を受けるまでは対象 PR に push しない。head を変えた場合は古い依頼や結果を流用しない。設計監査を終えた PR に実装を追加した後は、実装の head で改めて CI・独立監査・受領を揃える。
- 単位の PR には `aidlc/spaces/<space>/intents/<取り組み>/construction/<単位>/` の設計・計画・試験・追跡表と必要な承認記録を含める。最初の単位では `inception/` も含める。`audit/` と `.aidlc-engine/` は含めない。公開 Shirube には Shirube 自身の記録だけを置き、他 repo の非公開記録を写さない（P3、既存 team の採択）。
- AI-DLC が段ごとに呼ぶ見直し役は、承認された作業場の段の見直しだけに用いる。同時1体、呼ぶ席と同じモデルで、GitHub の書き込み・統合・孫への委任は行わせない（P3）。適用される見直しは各取り組みの正式な設定と段に従い、未実施を見直し済みとは記さない。
- traceability と upstream-coverage は blocking とし、段の承認前に検査する。外すのは人の操作だけとする。AI-DLC の更新後は `.claude/sensors/` と `.codex/sensors/` の両方で blocking が保持されているかを確かめる（P3）。個別の取り組みのセンサー配布や CI 再検査の製品要件を、この共通実践だけで他の取り組みの開発範囲へ加えない。
- 作業 branch は `<席>/<内容>-<年月日>`、統合先は `main`。GitHub の merge commit で統合し、squash はしない。AI-DLC の既定の trunk/squash を、私たちの採択済みの統合方法へ上書きしない（既存 team、Git 履歴の観測）。
- PR 本文には `json sds-pr` ブロックを1つ、`risk:R0`〜`risk:R4` のラベルを1つ付ける。R3・R4 と保護対象は、統合前に対象 head への必要な Owner の公開決定を確認する。workflow・必須検査・branch protection・DB構造・資格情報・本番・料金・契約 `.v2` などの変更を、段の承認から許可されたと推測しない。配布の限定例外は Deployment に記す。
- PR の行数・file数と own-code の独自予算を、新しい作業の計画上限として再採用しない。保護された hygiene 等の設定は、必要な許可を得た次の門の版上げで整理する。それまで大きさの上限を超える PR には「AI-DLC の単位の作る段の出力」と記す。これは検査が自動的に免除されるという意味ではない（P1・P2、既存 team）。
- 設計・実装の標準 S1〜S9、採択済みの DB・技術・セキュリティ基準を AI-DLC の実践として適用する。外れる場合は `deviation_ledger` に採った判断と採らなかった代替を書く。DB設計等に該当した時は、既存 team の指定する固定版の DB基準を執筆前に読み、本文 SHA-256 を照合する。
- 製品・PR の状態は Issue/PR に、AI-DLC の進行と承認は正式な state と記録に保持する。片方の写しだけで他方の実行や承認を済んだとしない。Owner 決定は公開本文の URL と SHA-256 を伴って参照し、人待ちは一度知らせて停止する。LLM の制御を文の指示だけで済ませず、機械・script・hook と組み合わせる（P5、適用中の指示）。

この5節で公開決定を参照する P番号の `control_source_ref` は以下。promotion 後もこの節とともに保持する。各決定はその記載範囲だけに用い、個別の保護対象の変更許可へ拡張しない。

| 参照 | control_source_ref.url | control_source_ref.sha256 |
|---|---|---|
| P1 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646126384 | `d4c48a46139e71880db9d92ae8409c95b21dc0713136d4d07642f87c5a9df502` |
| P2 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646012529 | `c0450932f04b3e9f2c2667fe8deef3de20dd2bcac8b7eb75d7f02a4ee03e17b4` |
| P3 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6672241656 | `6eb43f8479876f01692ff28dc7c2bfcbcf5b33863d7a42bdfceb563893534462` |
| P4 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6647418162 | `4d4a85a99e8778f58c0ee4fccdaa3d5cece3c6efe4305bd11816c0fd8692647d` |
| P5 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6380845765 | `5cd75b9904c7cb8a229ba8be55d417d2c56af2eb920ef7f94875c9689fa45501` |
| P6 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6308341298 | `d2d1a8e4da93411d6baa1cca8ef2338d6b9822db15eb43489b9d3dabeb43bf94` |
| P7 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6646144286 | `224a607fb07ae0c6c0cb09453882ae369032e0e20537bdafbc924521a8c508cc` |

## Walking Skeleton

- 私たちは、最初に端から端まで動く最小の版を作り、接続を実物で確かめてから機能を足す。該当する採択済みの規格、独立監査、保護対象の承認は、その小さな版にも適用する。
- 最小の版の対象・受入条件・確認コマンドは、各取り組みの承認済み範囲と AI-DLC の正式な段・単位で定める。動作を実証してから人の確認を受け、設計だけの見直しや部品の存在で代用しない。
- 最小の版の成功と、その取り組み全体の完了を分ける。過去の版の完了定義や別の取り組みの受入を、そのまま現在の取り組みに持ち込まない。既存成果と履歴は保持し、個別の実証先や実装順は各取り組みの記録で扱う。

## Testing Posture

- **Methodology**: tdd
- **Methodology evidence**: 既存 `memory/team.md` で Q3 の採択として記録された TDD を維持する。`pr34-u2-red.json` / `pr34-u2-green.json` は当時の方法を示す根拠であり、新しい変更の試験合格を示す証拠にはしない（P7 の規格維持、既存 team）。
- **Ordering**: 各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書き、必要な試験と CI で結果を確かめる。
- 試験の道具は Node 組込みの `node:test` と `assert`。判定には正例・負例を用意し、対象違い、古い記録、欠落、改変、実行不能、再実行、人待ちの停止などを、適用される要件に対応付ける。
- 行の網羅率の床は100%。統合前の CI と Build and Test で確認し、通すために弱めない。計測から除外する行が必要なら PR に理由を書き独立監査で確認する。対象集合・分母と実行コマンドは各取り組みで特定し、部分集合だけで製品全体を測れたとしない（P4）。
- 適用される SEC-T、依存導入前の脆弱性確認、秘密情報保護、最小権限を維持する（P1・P2・P7）。公開 repo の fixture・ログ・出力は架空データだけにする。
- 必須工程や適用条件を満たす検証について、skip、timeout、観測不能や単なる exit0 を合格に数えない。任意工程と正式に適用外となった工程はその理由と適用条件を明示し、必須工程の未実行と混同しない。設定値や試験ファイルの存在を実測結果の代わりにしない。

## Deployment

- 配布は Shirube の commit を固定した再利用 workflow とキットを PR で扱う。準備・適用・配布先での検証を区別する。個別の取り組みに必要な環境構成や公開範囲を、その承認済み範囲・設計で定める。一般既定の staging/production 自動展開を、証拠なしに既存運用として加えない。
- 版の識別と配布結果を追跡し、tag や配布宣言だけを適用成功・採択の証拠にしない。
- 既存の限定的な版上げ承認 P6 を保持する。`kit.mjs upgrade` が作る file だけの差分、`kit.mjs check` OK、上げる先が監査 PASS・作者以外によって統合された Shirube main、独立監査 PASS と作者の受領、利用先の作者以外の統合担当、という全条件に一致する場合だけ per-PR exact-head の例外となる。
- P6 の対象 file は `.shirube/sds-pin.json`、`.github/workflows/sds-gate.yml`、`.claude/skills/sds-audit/SKILL.md`、`.github/pull_request_template.md`、CLAUDE.md / AGENTS.md の SDS-V2 block。最初の導入、mode・必須検査・ruleset・profile・protected_paths の変更は例外に含まれない。対象外のセンサーや AI-DLC 接続の変更を、このキット例外へ自動的に含めない。該当を証明できない pin/workflow の変更は保護対象として扱う。
- 配布先・実証環境・対応を保証する環境は、各取り組みの承認済み範囲で定める。既存担当・保留・必要な公開決定を保持し、一つの取り組みの承認を他 repo の変更や再開に流用しない。
- 実際の配布前に、対象の版・差分・必要な判断・確認方法・戻し方を具体化し、適用後は受け手の実ファイル・設定・PR の結果を読む。配布元の宣言や registry の有無を、受け手の適用・検証の結果に写さない。

## Code Style

- JavaScript ESM（`.mjs`）、Node `>=22`、実行時 npm 依存なしという既存の製品規約を引き継ぐ。実行環境と開発道具の対応は具体的な版で確認し、manifest の指定だけで全環境の動作を保証しない。
- 既存のソースに対する新規 file 300行、ESLint の関数50行・複雑さ10という技術検査を保持する。P1・P2 の明示する「設計記録300行・PRの大きさ・own-code予算」の退役と、これらのソース構造の検査を同一扱いで消さない。この整理は新規の規格採択や設定変更ではない。公開決定の対象を超える削除は行わない。
- profile が検査対象・除外を定め、structural と guard の対象を揃える。例外コメントには説明を付け、無制限の disable、期限検査や guard 自体の無効化で隠さない。依存方向・循環・秘密の抑制・重複等の既存の技術検査は、予算廃止に巻き込んで外さない。
- `scripts/hygiene` の検査は共通 lib と Node 組込みへ依存するという既存境界を保持する。判定と I/O を分け、同じ判断規則を複数の adapter に再定義しない。時刻・乱数・識別子・外部観測は核への明示入力とする。S1〜S9 の既定・例外の扱いを、独自の全面禁止に変えない。
- 検査は既存の JSON と exit code の契約を守り、読めない時は失敗または観測不能を明示する。hygiene の1行 JSON と exit code 0/1/2 を、別契約を持つ gate/audit/kit に無理に統一しない。
- 根拠を説明する時は Issue の具体的なコメント URL と必要な本文 SHA-256 を参照する。formatter・命名規約は対象の既存設定と採択に従う。設定がなければ未設定として扱い、観測だけで新しい規約を採択しない。
