# U1 — Performance Design

## Sources and Scope

[確認済み計画](nfr-design-questions.md)、[performance-requirements](../nfr-requirements/performance-requirements.md)、[functional-spec](../functional-design/functional-spec.md)、[共通契約](../../../inception/contract-design/contract-summary.md)、[FD規則](../functional-design/rules.md)に基づく。一回のCLI/CI評価の外部読取を設計し、新しい遅延/throughput/SLAを追加しない。本書がSOL1の定義を所有する。

## SOL1 — 有限な取得

**対応:** NFR6.1。**責任:** EvidenceCollectionのI/O周辺。判定核は時計/I/Oを取得しない。

1. 呼出側から信頼する取得budget profileと時計を受け、評価開始時の経過基準・残取得数を持つ。PR記録をprofileの正本にしない。
2. PR metadataを実取得し、repo/番号/head/baseを固定する。全filesページ、必要tree/blob、必要公開commentの読取を同じ予算管理下へ入れる。
3. 各取得前に残総予算と回数を確認する。単一取得の期限は規定の1取得上限と残総予算の小さい方へ制限する。待ち上限/中断時には取得を打ち切り、後続取得を開始しない。
4. 応答は受信中のbytesを数え、応答上限超過を切捨て成功にしない。転送/parse失敗や欠ページを観測不能へ渡す。各成功応答の取得数/版/対象を観測へ対応付ける。
5. ページ終端・必要path・実tree/blobを照合して初めて完全取得とする。必要集合を観測できた部分へ縮めない。実blobのraw bytesからbyte数/hashを得る。
6. head/base再取得と出力前の対象検査も必要な読取として予算へ含める。予算切れで最後の照合ができなければPASSを返さない。

数値の正本は共通契約AdmissionContext/FD rulesのpolicy.budget。参照値は1取得20,000ms、総外部照会120,000ms、最大100取得、1応答8,000,000bytes、自動retry0である。別設定源を増やさない。

## Resource Use and Alternatives

取得したblob bytesは当該評価の入力として扱い、hashは可能な範囲で逐次計算する。path/byte数/hashのmanifestをUTF-8 byte順に並べる計算はBR4.1/4.2を参照し、globalとstage固定subsetを区別する。表示escapingやnative fingerprintとraw bytes hashを混同しない。

1応答上限は全プロセスのメモリ使用量保証ではない。全CLIのparse/hash/出力時間やCPU/memoryは後段で対象版と方法を添えて実測する。新cache/CDN/queue/pool/常駐serviceを作らず、無制限retry・上限超過の無視も採らない。規模増加時の対象分離は[scalability-design](scalability-design.md)を参照する。

## Failure and Verification

不完全取得は[reliability-design](reliability-design.md)のSOL5へ渡す。実head/digest未取得なら完全assessmentを合成しない。外側の失敗/予算結果を明示入力へ変換し、核が経過時間を環境から推測しない。

FD-T17で各期限/取得数/bytes上限、欠ページ、拒否、中断を架空の時計と応答で再現し、有限停止と後続取得0を確認する。実PRからCI停止までの統合も後段で必要。これらは設計であり、実測/製品試験は未実施である。

## Infrastructure Handoff

既存読取transportと既存entryに、期限/取消し/応答上限/完全性の観測を接続する。具体file/プロセス配置/CI結線は後段で決める。新しい取得API/CLIや並列数の採択を本書で行わない。

## Assumptions & Open Questions

None.

予算は停止制御であり、測定済み性能保証ではない。実対象で不足が判明すれば影響を示し、黙って増やさない。
