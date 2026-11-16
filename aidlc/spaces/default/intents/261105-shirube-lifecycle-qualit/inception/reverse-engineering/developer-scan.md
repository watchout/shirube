## Developer Code Scan Results

### Scan Coverage

- **Analyzed deeply**: 作業場 root の製品実装全体。`scripts/sds/` の8モジュール、`scripts/hygiene/` の9モジュール、`src/progression/continuation.mjs`、`configs/`、`.github/workflows/`、`kit/`、`.shirube/hygiene-profile.md`、`.dependency-cruiser.cjs`、`knip.jsonc`、`package.json`。入口・判定・I/O・保存・戻り値・内部 import・既存の試験構成を読んだ。
- **Analyzed deeply**: `tests/` 全試験群の正常・異常・再実行のassertionと依存、`tests/fixtures/plan-admission/` の3入力の構造・変更操作・比較位置・歴史入力、`templates/` 全体のPR/規格/設計/承認の契約。
- **Analyzed deeply**: `docs/` の要求AC/AH/WP、責任/データ・単位/継続処理・単独実行・旧4/5・配布/consumers・AI-DLC内包の設計、規格/手順/runtime/原典lock/監査方法、対象別の監査項目26fileとADR/spec/境界/脅威。実装と記録の責任・契約・差分と歴史的な置換を照合した。原典/歴史的な決定の再監査はしていない。
- **Analyzed deeply**: rootのREADME/CHANGELOG、package-lock.jsonの全体構造・解決先/整合性欄/開発依存/任意依存/engine/license、`.hygiene/lines-baseline.json` の位置づけ、`.gitignore`の製品固有部分。JSONの長い入力は読取り専用の構造抽出で確認し、第三者依存のソースは開かない。
- **Skimmed only**: 調査対象の製品pathに残る構造上の浅読領域はなし。Standard深度の全体理解であり、全原典の取得・歴史的な監査の再発行・依存の実bytes/脆弱性検査を意味しない。
- **Left out**: AI-DLC 自体の install と記録、生成された runners、`.git/` の内部、`.worktrees/`、依存・build・cache、ignore 対象のレポートと機械固有設定。各候補文書はこれらを製品の実装として数えない。
- **版と観測**: snapshot の root HEAD は `62ff73db52ce8f29f3b982507b5d2e36578ae60f`。製品ソースの fingerprint は `git:1aa0e7be72c1c5b6e01c841cd339628c790c4359`。2026-11-06 に GitHub API で公開 main `7e775afd5b755e51e55e269d8dc35b09d180c33e` を観測し、追加部品を `git show` と製品パス限定の差分で別に読んだ。後者を root の実装と混同せず、source snapshot の保証対象へ追加しない。
- **実行の限界**: 製品 test/build/CLI、キット適用、GitHub投稿、AUNへのアクセス・適用は実行していない。構造の観測であり製品の動作や合格の証明ではない。
- **機械に登録する範囲**: 初回partial候補の残りを同じ承認範囲内で補読し、Standard depthの全体の構造・責任・契約・依存・品質を分析した。最終timestampは `kind: full`、`analyzed.paths: [./]`、21component、shallowなし。元snapshotの対象内だけである。

### Packages Found

- `@watchout/shirube`、version `0.1.4`、private manifest、JavaScript ESM。Node向けの検査CLI、再利用workflow、テンプレート、配布キットと独立した継続処理の核。HTTPサーバー・Web UI・DBドライバーは今回の実装群にない（package.json、scripts/、src/）。
- manifest の private はnpm公開の指定であり、GitHub repository visibilityの証拠ではない。

### Build System

- npm、`package-lock.json`。`npm test` は `node --test tests/*.test.mjs tests/u2/*.test.mjs`。コンパイルを要するbuild手順はmanifestにない。
- lint/重複/依存検査はESLint、jscpd、knip、dependency-cruiserを開発依存として固定。製品の判定核はNode組込みと相対importを使う。旧計画のYAML読取りはRubyの子プロセスに依存。
- root CIはNode22でnpm ci/testを呼ぶ。公開mainのCIはNode26でscripts/**の行網羅率80%を設定し、現行100%基準には未適合（後述）。実際のCI結果は未取得。

### APIs Discovered

| 表面 | 所在 | 入出力と責任 |
|---|---|---|
| CLI | scripts/hygiene/*.mjs | profile・対象・base/head等 → JSON、PASS/FAIL/UNOBSERVABLE。独立の監査受領CLIは別契約 |
| CLI | scripts/sds/kit.mjs:164 | apply/upgrade/check/status。固定commit配布、digest比較、古い参照、GETによる利用先観測 |
| 門 | scripts/sds/gate.mjs:119 | repo/pr/head → risk・実差分・監査受領の照合。旧判定4/5もコードに残るが今回へ採用しない |
| 監査 | scripts/hygiene/audit-admission.mjs:140 | request/digest/review → READY_FOR_REVIEWまたはRECEIPT_ACCEPTED。権限付与はNONE |
| 関数 | src/progression/continuation.mjs:20 | store/executor/clock → record/tick/recover/status。耐久ストアや実行接続そのものは実装していない |
| 再利用workflow | .github/workflows/hygiene.yml、sds-gate.yml | consumerの入力・固定callee版から検査。門はPRコードを実行せずGitHub APIを読む |

rootにLLM設定対話、AI-DLCの導入、明示開始を受ける製品入口はない。導入済みAI-DLCを製品ソースに数えて補わない。

### Frameworks & Libraries

- Node engine `>=22`。manifest の開発依存: ESLint10.11.0、eslint-comments4.8.1、unicorn76.0.0、dependency-cruiser18.4.0、jscpd5.3.2、knip6.38.0。
- 再利用hygieneの追加道具: gitleaks8.30.1（checksum固定）、任意のruff0.16.9/vulture2.16。GitHub Actions、gh CLI、Git、旧YAML読取りのRuby。
- 公開mainに追加されたengine-judgeはAI-DLC2.11.1・`.claude/tools`・Bunを前提にする。Codexでの動作は未実証。
- 脆弱性データベースへの照会は今回していない。版の存在を安全性の証拠としない。

### Test Coverage

- テストはNode組込みnode:test/assert。監査の偽造・変更・CI対応・証拠引用、キットの再適用・symlink逸脱・digest、hygieneの空対象・除外・rename、旧判定4/5、継続処理の開始観測・再実行・停止の試験がある。
- `tests/helpers.mjs` は一時Git repositoryとCLI実行を作る。`tests/u2/doubles.mjs` はMap/配列ストアと実行元・時計の試験用代替。実DB・実AUNへの接続証拠ではない。
- rootのCIに行網羅率の測定・閾値はない。公開mainではCIが80%、unit-done核もMIN_LINES=80。社内100%の要求との差が残る。src/progressionは公開mainのscripts/**の測定集合に自動で含まれない。
- 試験数・成功数・実測網羅率は未計測。試験ファイルの存在と試験名を合格へ読み替えない。

### Code Quality Indicators

- 判定とI/Oの分離、明示入力、固定digest、fail-closed出力に再利用可能な核がある。一方、lib.readProfileとprofile-eslintでprofileの読取りが別に定義され、規格の適用集合を後続で照合する必要がある。
- Gate workflowはcalleeのcommitをcheckoutして同一性を確認し、PR headへstatusを返す。Owner本人の承認は `NOT_CHECKED_BY_MACHINE`、`authorization:NONE`。緑のstatusを実行権限にしない。
- root READMEはown-code1500、profileは2300、公開main profileは4000。現行teamでは独自予算の廃止方針が採択されているため、過去の値を新しい要件へコピーしない。変更自体は保護対象の正規手順で行う。
- 書けるstatus用tokenはsds-gateのAPI/status処理に渡され、PRコードを走らせない。hygieneはconsumerの依存導入と検査を同じjobで行う。将来のCI再検査でjob別の資格情報と検査の信頼元を明示する必要がある。

### Technical Debt Signals

| ID | 観測した差・不足 | 範囲への影響 |
|---|---|---|
| RE-01 | rootと公開mainで部品・CI・profileが異なる | 次の実装の基準commitを正式な計画で明示。rootに無いだけで新規実装しない |
| RE-02 | kit.renderの配布集合はcaller workflow、Claude監査skill、PR template、指示blockとpin | M-01〜03のAI-DLC導入・LLM設定・明示開始、M-12のセンサー配布は接続不足 |
| RE-03 | rootのapplyは自己適用を識別しない。公開mainはworkflow_callを検出してShirube自身を拒否する | M-01の自己導入は汎用applyで代用不可。拒否を単純解除しない |
| RE-04 | main engine-judgeは特定harness/版/solo-unit-majorに限定 | M-04/09/11の現在のCodex記録への適合を要件・契約で確認 |
| RE-05 | main approval-recordのidentityCheckはnone。記録比較も再生成との比較である | M-09/11の現在の成果物・見直し・承認の真正な結び付けは追加で具体化 |
| RE-06 | main unit-doneは入力factsを判定する核のみ。収集・抽出・統合入口はtreeにない | M-05/08の実際の証拠からの完了確認は未完成 |
| RE-07 | CIとセンサーを結ぶ配線、センサー配布集合がない | M-12のPR記録再検査・弱体化防止・ずれ検出は未実装 |
| RE-08 | 80%と100%の差、rootには閾値自体がない | M-06の適合には対象・分母・検査条件の設計と実証が必要 |
| RE-09 | continuation.recordはverified/decision_answeredを拒否。保存・実行接続はportsのみ | M-07の観測と安全性の参考核。新AI-DLCとは別の工程制御として復活させない |
| RE-10 | rootと観測mainのconsumersにAUNの行はない | M-13の受け手の実状態・登録・PR検証は別途必要。登録を実適用成功にしない |
| RE-11 | kit.statusはcontentsの404を不在としてREADにする。repo自体の読取り可否は別に確認しない | private/権限不足と不在を区別できない。READ/nullを未導入・未配布の証拠にしない |
| RE-12 | manifest>=22より依存のNode engine指定が細かい。旧受付の等価比較はADFなしでSKIPPED/exit0 | 実行環境の対応と、必須検証を実行したかをexit0だけに頼らず確認 |

### M-01〜M-13との対応

| 要求 | 再利用候補 | 残る確認・実装 |
|---|---|---|
| M-01 | kit固定commit・digest・外部symlink拒否、main自己適用拒否 | 自己導入・設定・履歴保全の安全な接続と実証 |
| M-02 | profile/templateと既存設定の保持 | 観測して不足だけ聞くLLM対話、秘密を要求しない入口 |
| M-03 | AI-DLC内包の既存設計文書 | 明示開始の製品接続。古い設計のreview noneやdenyを現在へ持ち込まない |
| M-04 | gate判定1〜3、監査受領、main engine-judge | 現在の対象・段・単位への接続。旧4/5を使わない |
| M-05 | main unit-done/record-compareの核 | 実際のPR・CI・設計・受入から証拠を集めて照合する入口 |
| M-06 | hygiene・lint・依存方向・secret guard | 100%・適用SEC-T・規格の版/適用範囲と証拠の確認 |
| M-07 | fail-closed出力、kit反復、継続処理の照会/停止参考 | 現在のAI-DLCの中断・再実行・人待ちとの整合を実証 |
| M-08 | 記録と部品の候補 | 実物で初回のゴールと実際の追加変更のゴールを通す |
| M-09 | main engine-judgeによるengine側の承認観測 | READYと現成果物・試行・段の正式な対応と例外条件の確定 |
| M-10 | audit-admissionの対象head照合 | 同じPRの設計だけのheadの独立監査を実装開始へ結ぶ。旧design-gateで代用しない |
| M-11 | main approval-record/record-compare | 単位の成果物と承認の掲載・完全性・現対象との対応。audit/internalは除外 |
| M-12 | kitの配布/照合、callee固定workflow | センサー配布・版/強度のずれ検出・CI再検査・門との接続 |
| M-13 | 配布版/pin/consumers観測の仕組み | AUN担当の対象・保留・権限を確認し、実際のPRの正例/負例で実証 |

### BL-01〜BL-10との対応

BLは正式な単位や新しい工程の番号ではない。採択済みbacklogの機能のまとまりへ、上記の実装観測を対応付ける。

| Backlog | 再利用候補 | 不足と確認対象 |
|---|---|---|
| BL-01 | kit/pin/実bytesの照合 | AI-DLCの安全な導入、LLM設定対話、明示開始と履歴保全の実接続 |
| BL-02 | gate判定1〜3、audit-admission、mainのengine判定/記録/完了核 | 現在のAI-DLCとの契約、実際の証拠の収集と対象・段への対応 |
| BL-03 | hygiene、明示入力、失敗の可視化、再実行と停止の参考核 | 100%規格、SEC-T、最小権限、中断・回復と実adapterの安全性 |
| BL-04 | BL-01〜03の部品候補 | 導入から最初のゴールまでの実物の受入。一部の核の完成で代用しない |
| BL-05 | 記録/版/配布の照合 | 初回の後の実際の追加変更で再び受入。初回の証拠の流用不可 |
| BL-06 | main engine-judge | 現対象のREADY・試行・現成果物の照合。欠落・別対象・古い結果の負例 |
| BL-07 | audit-admissionの対象head/証拠照合 | 同じPRの設計だけのheadの独立監査から実装開始への接続 |
| BL-08 | main approval-record/record-compare | 単位の記録と承認の掲載・完全性・対象一致。audit/internalを除外 |
| BL-09 | kitの配布/digest照合と固定calleeのworkflow | センサー配布/強度のずれ、CIでのtraceability/upstream-coverage再実行と門への接続 |
| BL-10 | kit/statusの配布・読取り機構 | AUN担当と対象・保留・権限を確認し、実PRの正例/負例で検証。registry行の不在はAUN未導入・未配布の証拠ではない |

### Coverage Validation と補読の結果

候補9文書は存在する。正規checkの結果は次のとおり。

```text
VALID: kind full, 1 analyzed path(s), 21 component(s), 0 shallow path(s). The fingerprint matches the source now.
```

timestampと同内容のscope-draftをfile toolで作成し、正規compareへ渡した結果は次のとおり。比較用draftは同toolが削除した。

```text
COVERS: the incoming scan covers everything the store analyzed.
The scope draft has been removed.
```

既存storeから失われるanalyzed path/componentはない。最終の対象pathは `./`。既存18componentを保持し、非runtimeの責任を `design-and-standard-records`・`test-assets`・`dependency-lock-and-baseline` の3headingで追加した。比較tool自体は対象別の差分一覧を出していない。21headingの正確な一覧はtimestampのcomponentsにある。

最終のroot全体mintは `1aa0e7be72c1c5b6e01c841cd339628c790c4359` で、元snapshotのsourceから変化していない。timestampも同じ値を正規mintから記録した。初回partial候補の20pathのmint値は最終候補へ持ち越していない。元snapshotは差し替えていない。

**Full rescanの読取り分析を完了。** 初回候補の不足を次のとおり補った。省略されたtool出力を読んだことにはせず、分割読取りと短い構造抽出で全体の責任・契約・入力集合を確かめた。

- `docs/`: 全体を規格・手順・要求・責任/契約・旧判定・配布・原典/監査項目・ADRの責任に分類した。旧U1〜U4を置換する注記、SDS固有のengine不導入・Goal Stages・旧4/5、runtime/規格の候補表示を現在の採択へ復活させないことを確認した。原典lock24資料と監査項目26fileはschema・固定版・項目と対象責任の対応を構造抽出し、当時のPASSの再発行はしない。
- `tests/`: 監査の偽造/別head/base/CIの実checkout両親/再観測、base移動のopt-in/祖先/rename/保護path/件数上限、kitのblock/再適用/symlink、hygieneの実対象・空対象・除外・抑制、workflowの抽出shellと47合成ケース、旧4/5の型/版/依存/段の比較、継続処理の送付境界/再起動/照会/非進捗停止のassertionを読んだ。等価比較は独立CLIで、ADFなしのSKIPPED/exit0と比較成功を区別する。
- `tests/fixtures/plan-admission/`: casesはbase/pin/非object入力・改変操作と複合理由・同じfieldを上書きする実現不能組合せ、sitesは固定ADFのbytes/hashとliteral/helperの位置、dogfoodは当時の入力である。申告のCOMPLETEや受入値と、PENDINGの運用証拠を区別し、現在の案件の事実へ転記しない。
- `package-lock.json`: v3、221packages（rootを除く開発依存220）、manifestと6直接解決版が一致、解決先hostはregistry.npmjs.orgのみ、全依存entryにsha512 integrity、hasInstallScript=trueなし、optional52、Node engine指定141を構造抽出で確認。宣言されたmetadataであり、tarball実bytesや安全性の検証ではない。22.12/22.13等と対応majorの制約を追記した。
- `.hygiene/lines-baseline.json`: 空objectを確認。lines-baselineの既存長/縮小規則の入力で、profileのbaseline_max_entries・新規長/対象globsと別の責任。空であることを検査合格に換算しない。ignoreの製品部分は依存と生成レポートを除き、AI-DLC管理blockは製品調査から除く。

残る未検証は動作上のもの。製品test/build/CLIの実行・CI/required settingsの実態・AUNや実DBへの適用・初回と追加変更の実受入は実証していない。Fullはこのrootの製品全域の読取り分析で、これらの成功を意味しない。候補のpublishとlinkは親の正規操作へ返す。

## Handoff Summary

- **Intent-relevant finding**: 判定・配布・監査の既存部品はあるが、導入から初回・追加変更までの一貫した製品動作と、追加された4項目の機械的な接続は未実証。公開mainの追加部品を確認してから再利用を決め、rootの不足と区別する。
- **Risks / follow-up**: 次の設計はRE-01〜12とM/BL対応表を引き継ぐ。旧SDSの道筋・判定4/5・独自予算・review禁止の設計を新しい規則として復活させない。公開記録は架空データだけ。AUN非公開記録、実資格情報、実DBの操作は今回行っていない。
- **Produced**: `.aidlc-engine/codekb-stage-shirube/` の9文書候補。共通CodeKBの直接書換え、publish、link記録は親が担当する。
- **Completion qualification**: Full rescanの読取り分析、候補9文書、正規VALID/COVERSまで完了。実装許可・製品動作合格・段の承認・共有storeのpublishは行っていない。
