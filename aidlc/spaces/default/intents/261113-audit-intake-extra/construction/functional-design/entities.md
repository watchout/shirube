**Collaborator:** aidlc-architect-agent

# 実体の設計（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file。この取り組みは refactor の scope で、units-generation・domain-design の記録は作られない（仕様どおり）。現状の構造は、走査の記録と公開 main `1dd43e457361d9650153578baa71120788285e98` の実物の checker を正とする。実体は新しい表ではなく、依頼の JSON と受付の判定の途中の値で、どれも保存しない（DB は触らない）。

## 実体（source of truth）

```yaml
entities:
  - name: AuditRequest
    status: existing
    description: 監査の依頼 1 通。`schema` は `sds-audit-request/1` のまま（契約 .v2 にしない）。この取り組みは欄を足すだけで、ほかの欄の意味を変えない。
    attributes:
      - { name: schema, type: string, required: true, constraints: ["値は sds-audit-request/1 のまま"] }
      - { name: targets, type: array<Target>, required: true, constraints: ["各 id は一意、各 repo#pr は一意（既存の検査）"] }
    relationships:
      - { to: Target, cardinality: "1..*", direction: owns }

  - name: Target
    status: existing-extended
    description: 監査の対象 1 件（PR・head・base・必須の検査・workflow）。この取り組みは任意の欄 `extra_checkouts` を 1 つ足す。
    attributes:
      - { name: repo, type: string, required: true, constraints: ["既存の検査: watchout/ の repo"] }
      - { name: checks, type: array<string>, required: true, references: "必須の検査の名前" }
      - { name: extra_checkouts, type: array<ExtraCheckoutDeclaration>, required: false, default: "無し（空の配列と同じ）", min: 0, max: 4,
          constraints: ["欄の名前と max の値の持ち主は実装の 1 か所（定数）", "この欄は対象ごと。ほかの対象の判定に効かない", "checks が空の対象には置けない"] }
    relationships:
      - { to: ExtraCheckoutDeclaration, cardinality: "0..4", direction: owns }

  - name: ExtraCheckoutDeclaration
    status: new
    description: 作者が依頼で宣言する、追加の固定 checkout 1 件。repo と commit の組。宣言は証拠ではなく、受付が観測する対象の「申告」。
    attributes:
      - { name: repo, type: string, required: true, constraints: ["owner/name の形（owner は英数字とハイフン、name は英数字と . _ -、name は . だけの並びでない）", "対象の repo と同じでない（大文字小文字を区別しない）"] }
      - { name: commit, type: string, required: true, constraints: ["40 桁の小文字 16 進。短縮・前方一致・大文字は受けない"] }
    entity_constraints:
      - "キーは repo と commit の 2 つだけ。ほかのキーがあれば不正（この新しい欄にだけ厳しくする）"
      - "同じ対象の中で、commit が重複してはならない（repo が違っても重複。job の記録に出るのは commit だけで、repo を見分けられないため）"
    relationships:
      - { to: ExistenceObservation, cardinality: "1..1", direction: observed-by }

  - name: JobCommitSet
    status: new-derived
    description: 1 つの job の記録（ログ）から受付が観測した commit の集合（`git log -1 --format=%H` の出力。重複は 1 件に畳む）。判定の根拠になる観測値で、依頼から写した値ではない。
    attributes:
      - { name: commits, type: set<string>, required: true, constraints: ["各 40 桁の小文字 16 進"] }
    relationships:
      - { to: MergeVersion, cardinality: "1..1", direction: yields }

  - name: MergeVersion
    status: existing
    description: 統合の版の commit。JobCommitSet のうち、宣言のどの commit とも一致しないもの。ちょうど 1 つで、両親が依頼の base と head でなければならない。
    attributes:
      - { name: sha, type: string, required: true, unique: true }
      - { name: parents, type: array<string>, required: true, constraints: ["並びを問わず [base, head] と一致（既存の検査）"] }

  - name: DeclaredSeenSet
    status: new-derived
    description: 1 つの対象について、その対象の全部の job の記録を通して「宣言の commit が出た」ことを集めた集合（対象ごとに 1 つ）。
    attributes:
      - { name: commits, type: set<string>, required: true, constraints: ["宣言の commit の部分集合"] }

  - name: ExistenceObservation
    status: new-derived
    description: 宣言 1 件について、宣言の repo の `git/commits/<commit>` を GitHub に問い合わせて観測した結果。宣言の値をそのまま写さない。
    attributes:
      - { name: returned_sha, type: string, required: false, constraints: ["応答が取れた時だけ。宣言の commit と全桁一致した時だけ「実在」"] }
      - { name: parents, type: array<string>, required: false, constraints: ["応答が取れた時だけ。各 40 桁の小文字 16 進の配列として読めない時は unobservable"] }
      - { name: outcome, type: enum, allowed: [exists, derives_from_target, not_exists_or_mismatch, unobservable], required: true, constraints: ["exists 以外はすべて拒否。derives_from_target = 宣言の commit か両親のどれかが依頼の base・head と全桁一致（BR3.7）。unobservable（失敗・期限切れ・読めない形）を成功に数えない"] }

  - name: Rejection
    status: existing-extended
    description: 受付が依頼を拒否する時の理由。固定の文で、宣言の値（repo・commit・token）を載せない。
    attributes:
      - { name: reason, type: string, required: true, allowed: ["（rules.md の BR の一覧にある固定の文）"] }
```

## 上流

- requirements: `aidlc/spaces/default/intents/261113-audit-intake-extra/inception/requirements-analysis/requirements.md`（FR1.1〜FR4.4、NFR1〜NFR9）。実体の欄・制約は FR1・FR2 と NFR1・NFR5 から導いた。

## 要約

- 新しい実体は 3 つの観測値（JobCommitSet・DeclaredSeenSet・ExistenceObservation）と、依頼の新しい欄 1 つ（`extra_checkouts` と、その要素 ExtraCheckoutDeclaration）。どれも保存せず、判定の間だけ存在する。
- 既存の実体（AuditRequest・Target・MergeVersion・Rejection）は、欄を足すか、理由の文を足すだけで、形を変えない。
- DB・schema の版・契約 .v2・受付の出力（receipt）の形は変えない。DB の基準（`db-standard.md`）は、表・migration を持たないこの取り組みには当たらない。
