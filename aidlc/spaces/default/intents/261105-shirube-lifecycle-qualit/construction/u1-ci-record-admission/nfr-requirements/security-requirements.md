# U1 — Security Requirements

## Sources and Scope

[確認済み要約](nfr-requirements-questions.md)、[functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)を使用する。本書はNFR2.1〜2.3/NFR3.1〜3.2の主担当文書。4条件の意味/理由code/承認値はFD規則が正本であり、ここでは脅威と確認方法を対応付ける。

## Authentication and Assurance Limits

CI入力は公開PublishedRecordProjectionと実PR観測である。掲載前の変換元native形式と、CIで照合する公開viewを分け、private audit/.aidlc-engine receipt/authorization原本の取得をCIの前提にしない。公開kind/choice/target/unit/attempt/論理recordRef/現在内容digestの整合は調べるが、元receiptの存在/実発行元、Owner本人、実review実施、完全な私的履歴は証明しない。

完全に整合した作者生成記録を機械だけで見破る機能、provider署名、管理者への絶対耐性、新host/producer/原本供給者は追加しない。既存devauditorがPR独立監査で記録を読む補完と、実装前の設計監査・実装head監査・作者受領・別担当統合を維持する。独立監査が暗号的本人性を保証するとも言わない。

## Authorization and Least Privilege

| ID | 要件と合格条件 | 負例/検証 |
|---|---|---|
| NFR2.1 | metadata読取の資格情報はread-only。各job/操作/受渡し先を宣言し、test・汎用buildへのwrite資格情報配布0、拒否された入力で外部変更0、許可外読書き0 | FD-T17の権限拒否/境界外入力とjob別受渡し確認。書込tokenを必要な読取権限の代わりに要求しない |
| NFR2.3 | 四条件PASSでも完全assessmentの非保証とauthorization NONEを保持する。保護対象の公開原本URL/本文SHA/対象等は別条件のまま | FD-T01/07/20で固定field改変/欠落を拒否。PASSだけでmerge/正式進行/保護対象変更が許可されたと出力しない |

必要な公開Owner決定の機械整合はE01等の既存公開原文読取とBR6.1/BR9.1へ対応させる。URLの存在や名前だけで権限を拡張しない。資格情報・本番・workflow/必須検査・branch protection・契約等の変更許可を、本段の承認から推定しない。

## Data Protection and Compliance

| ID | 要件と合格条件 | 負例/検証 |
|---|---|---|
| NFR2.2 | 公開出力/診断/fixtureへ秘密・実データ・他repo非公開記録・人返信・audit/.aidlc-engine本文が混入する件数0。適用SEC-Tを項目ID/対象/入力/結果で示す | FD-T17と架空の機密らしき入力を用い、公開view/診断/失敗出力への転記0をassert。依存が必要なら追加前に脆弱性確認し、本段では導入しない |

public recordRefは公開可能な論理参照だけで、私的path/bodyを含めない。内部原本は元の権限下で保持する。新しい法令適合認証・保存期間・外部保存先・鍵・ログイン制度は要求しない。S1〜S9の既定/例外/report-onlyと、明示された四条件のblockingを混同しない。

## Input and File Boundary Requirements

| ID | 要件と合格条件 | 負例/検証 |
|---|---|---|
| NFR3.1 | 必須型/版/enum/重複key/部分記録/unknown critical/過大入力を検出し、必須1件の不正でも停止する。命令/markupをデータとして扱う | FD-T09〜11/17。切捨て成功/skip/外部文字列のshell実行0。掲載変換は架空の単体入力、CIは架空public viewで別に試す |
| NFR3.2 | Git treeと同じpath bytesを保持し、traversal/別表記重複/境界外symlink/submodule経由参照を拒否し、対象外読書き0 | FD-T17/18で特殊文字と境界違反を確認。hash前にUnicode/改行/空白を正規化せず、表示escapingとは分ける |

## Threat Considerations and Verification

| 脅威/不備 | 必要な拒否・保持 | 検証参照 |
|---|---|---|
| PR側が必須集合/checkpoint/除外を弱める | 信頼版stage/計画/current checkpointから別入力で求める。空stagesで免除しない。U4の信頼版検査接続は後続責務 | BR1.2/1.3、FD-T02/15 |
| 別kindの肯定/否定/空/未知、skipped/自動完了 | 固定kind別canonical値以外を必要な人承認へ数えない。自由文推測0 | BR2.1〜2.3、FD-T09〜11 |
| 古いREADY/旧attempt/日付だけ旧日変更 | 固定日付policyと現在subsetを照合し、不明日をlegacyへ移さない。再承認対象は別 | BR3.1〜3.4、FD-T03/12〜15 |
| 申告digest据置きで実bytes変更 | 実blobから再計算、globalとstage subsetを分離 | BR4.1/4.2、FD-T04/18 |
| 別PR/実装入りhead/設計変更後の監査流用 | 同PR設計だけsnapshot/監査binding/現在設計を照合し失効。実開始時刻まで証明しない | BR5.1〜5.3、FD-T05/16/19 |
| 完全resultから非保証/残件/scopeを削る | 同梱参照と元評価を比較し、欠落/改変/別対象は拒否。AUNへsource対象を書き換えない | BR7.2/7.3、FD-T06〜08/20 |

本書のテスト方法は未実行。Node組込みTDD/実分母100%の検証方針は[tech-stack-decisions](tech-stack-decisions.md)を参照する。過去のFDレビューMinor R-01（W06のE05誤記）は未解消の上流provenanceとして保持する。正しい共有契約E05はU2/U6→LLMテキスト対話であり、独立監査/公開判断をE05へ割り当てない。凍結FDは変更しない。

## Assumptions & Open Questions

None.

実装・SEC-T・秘密検査・権限配布の実測は後段で行う。新しい認証機構や外部の返答待ちを前提にしない。
