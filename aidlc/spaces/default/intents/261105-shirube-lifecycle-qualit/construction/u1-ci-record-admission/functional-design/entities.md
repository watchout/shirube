# U1 — Entities

## Sources and Scope

[確認済み計画](functional-design-questions.md)に基づくU1の論理モデル。YAMLがデータ形状・所有・参照の正本であり、保存DBや表の設計ではない。動作順は[functional-spec.md](functional-spec.md)、判定は[rules.md](rules.md)を正本とする。

正式入力: [単位](../../../inception/units-generation/unit-of-work.md)、[story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[stories](../../../inception/user-stories/stories.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/domain-design/components.md)、[contract-summary](../../../inception/contract-design/contract-summary.md)。旧真正性条件・旧3条件は契約の変更対応表を適用する。

## Entity Model — Source of Truth

```yaml
model: shirube-u1-entities/1
wire_contracts: [shirube-contracts/1, shirube-admission-context/1, shirube-pr-records/1]
scope: u1-ci-record-admission
types:
  Ref:
    logical_type: string
    constraints: [nonempty, public-logical-reference, no-private-path-or-body]
  Sha256:
    logical_type: string
    constraints: [lowercase-hex-64]
  GitOid:
    logical_type: string
    constraints: [complete-object-id-for-repository-format]
  Target:
    logical_type: object
    required: [repo, workspace, space, intent, unit, stage, attempt]
    fields:
      repo: string
      workspace: public-logical-string
      space: string
      intent: string
      unit: string-or-null-for-intent-stage
      stage: string
      attempt: opaque-string
    constraints: [nonempty-identifiers, exact-required-slot-match, no-local-absolute-path]
  ArtifactEntry:
    logical_type: object
    required: [path, bytes, sha256]
    fields: {path: repository-relative-string, bytes: nonnegative-integer, sha256: Sha256}
    constraints: [raw-blob-bytes, path-unique-within-set, no-path-normalization]
  Approval:
    logical_type: object
    required: [kind, choice, recordRef]
    fields:
      kind: [plan, summary, stage-completion]
      choice: canonical-string-by-kind
      recordRef: Ref
      approvedAt: date-or-offset-timestamp
      approvedAtFormat: [date, timestamp]
      approvalRecordRef: Ref
    conditional_required:
      stage-completion: [approvedAt, approvedAtFormat, approvalRecordRef]
    constraints:
      - unique-per-stage-slot-and-kind
      - positive-kind-choice-mapping-is-defined-only-in-rules
      - date-describes-stage-completion-not-plan-summary-or-projection-creation
      - no-human-reply-body-or-private-receipt
  Review:
    logical_type: object
    required: [reviewer, verdict, requestRef, recordRef, artifactPaths, artifactSetDigest]
    fields:
      reviewer: formal-stage-reviewer-string
      verdict: string
      requestRef: Ref
      recordRef: Ref
      artifactPaths: nonempty-unique-path-array
      artifactSetDigest: Sha256
    constraints: [target-inherited-from-stage-slot, fixed-stage-artifact-subset]
  StageRecord:
    logical_type: object
    required: [stage, unit, attempt, artifactPaths, approvals, review]
    fields:
      stage: string
      unit: string-or-null
      attempt: opaque-string
      artifactPaths: nonempty-unique-path-array
      approvals: Approval-array
      review: Review-or-null
      reopenedFromApprovalRef: Ref
    constraints:
      - unique-by-intent-unit-stage-attempt
      - multiple-checkpoint-kinds-may-coexist
      - review-null-only-as-per-required-set-and-ready-policy
      - original-and-reapproval-attempts-remain-distinct
  KnownRemaining:
    logical_type: object
    required: [code, stage, unit, attempt, approvalRecordRef, approvedAt, revisitOnReopen]
    fields:
      code: LEGACY_READY_MISSING
      stage: string
      unit: string-or-null
      attempt: opaque-string
      approvalRecordRef: Ref
      approvedAt: date-or-offset-timestamp
      revisitOnReopen: true
    constraints: [only-confirmed-pre-cutoff-ready-debt, not-a-failure-container]
  Condition:
    logical_type: object
    required: [outcome, reasonCodes]
    fields:
      outcome: [PASS, FAIL, UNKNOWN, NOT_APPLICABLE]
      reasonCodes: string-array
    constraints: [not-applicable-only-for-evidenced-design-audit-exclusion]
  EvaluationScope:
    logical_type: object
    required: [repo, pr, head, base, target, checkpoint, rulesetVersion, artifactSetDigest]
    fields:
      repo: string
      pr: positive-integer
      head: GitOid
      base: GitOid
      target: Target
      checkpoint: trusted-profile-string
      rulesetVersion: Ref
      artifactSetDigest: Sha256
    constraints: [compare-with-independent-pr-observation, not-self-declared-currentness]
  AdmissionEnvelope:
    logical_type: object
    required: [head, outcome, reasons, authorization, assessment, evaluationScope, observations]
    fields:
      head: GitOid
      outcome: assessment-outcome
      reasons: assessment-reasons
      authorization: NONE
      assessment: complete-ConformanceAssessment
      evaluationScope: EvaluationScope
      observations: ObservedSnapshot-array
    constraints:
      - inline-assessment-only-no-reference-only-alternative
      - envelope-and-assessment-and-actual-scope-agree
      - every-observationRef-resolves-exactly-once-in-this-envelope
      - source-evaluation-and-distribution-destination-remain-distinct
entities:
  - name: ObservedSnapshot
    owner: EvidenceCollection
    identifier: observationId
    description: 許可された実PR・blob・公開監査等の一回の読取結果。発行元認証ではない。
    attributes:
      - {name: observationId, type: Ref, required: true, unique: true}
      - {name: sourceRef, type: Ref, required: true}
      - {name: issuerObservation, type: object, required: true, constraints: [observed-facts-and-unknowns-only, no-authenticated-flag]}
      - {name: targetRef, type: Target, required: true}
      - {name: versionRef, type: Ref, required: true}
      - {name: observedContentRef, type: Ref-or-null, required: true}
      - {name: observedDigest, type: Sha256-or-null, required: true}
      - {name: availability, type: enum, required: true, allowed_values: [observed, unavailable]}
      - {name: observedAt, type: explicit-offset-timestamp, required: true}
      - {name: prObservation, type: object, required: true, constraints: [repo-pr-head-base-bound]}
      - {name: completeness, type: object, required: true, constraints: [adapter-derived-pagination-tree-completeness]}
    constraints:
      - observedContentRef-and-observedDigest-are-derived-from-read-content-when-available
      - unavailable-or-incomplete-is-not-an-empty-success
      - prObservation-includes-actual-repo-pr-head-base-and-complete-changed-paths
      - private-read-bodies-do-not-cross-the-public-allowlist
    relationships: []
  - name: PublishedRecordProjection
    owner: EvidenceCollection
    identifier: projectionId
    description: 既存権限内で掲載用に取り出す記録と、PRで取得した公開view。両者の観測scopeを区別する。
    attributes:
      - {name: projectionId, type: Ref, required: true, unique: true}
      - {name: sourceObservationRefs, type: Ref-array, required: true, min: 1, references: ObservedSnapshot.observationId}
      - {name: targetRef, type: Target, required: true}
      - {name: includedArtifactRefs, type: public-artifact-reference-array, required: true, min: 1}
      - {name: excludedArtifactRefs, type: exclusion-kind-reference-array, required: true, constraints: [no-private-path-or-body]}
      - {name: projectedContentRef, type: Ref, required: true}
      - {name: schema, type: enum, required: true, allowed_values: [shirube-pr-records/1]}
      - {name: rulesetVersion, type: Ref, required: true}
      - {name: artifacts, type: ArtifactEntry-array, required: true, min: 1}
      - {name: artifactSetDigest, type: Sha256, required: true}
      - {name: stages, type: StageRecord-array, required: true, min: 1}
      - {name: control_source_ref, type: public-url-and-body-sha256, required: false, constraints: [required-when-separate-public-owner-decision-applies]}
    constraints:
      - required-set-comes-from-trusted-context-not-this-projection
      - public-target-maps-to-targetRef-without-rewriting-intent-stage-unit-null
      - no-audit-or-engine-runtime-or-human-reply-or-secret-content
      - source-fields-in-native-mapping-are-not-all-public-required-fields
      - matching-content-does-not-authenticate-engine-owner-or-review-execution
    relationships:
      - {to: ObservedSnapshot, direction: references, from_cardinality: many, to_cardinality: one-or-more, via: sourceObservationRefs}
  - name: ConformanceAssessment
    owner: ConformanceGate
    identifier: assessmentId
    description: 明示入力から一つの核が返す四条件の照合結果。許可も正式stage stateも所有しない。
    attributes:
      - {name: assessmentId, type: Ref, required: true, unique: true}
      - {name: targetRef, type: Target, required: true}
      - {name: rulesetVersion, type: Ref, required: true}
      - {name: observationRefs, type: Ref-array, required: true, min: 1, references: ObservedSnapshot.observationId}
      - {name: sensorResultRefs, type: external-SensorResult-reference-array, required: true, default: [], constraints: [no-U1-generated-sensor-success]}
      - {name: applicableConditions, type: object, required: true, constraints: [trusted-applicability-evidence]}
      - {name: conditions, type: four-Condition-object, required: true, constraints: [exact-keys-records-ready-digests-designAudit]}
      - {name: outcome, type: enum, required: true, allowed_values: [PASS, FAIL, UNKNOWN]}
      - {name: reasons, type: string-array, required: true}
      - {name: artifactSetDigest, type: Sha256, required: true}
      - {name: knownRemaining, type: KnownRemaining-array, required: true}
      - {name: assurance, type: enum, required: true, allowed_values: [record-and-current-content-consistency-only]}
      - {name: engineAuthenticity, type: enum, required: true, allowed_values: [not-verified-by-gate]}
      - {name: ownerIdentity, type: enum, required: true, allowed_values: [not-verified-by-gate]}
      - {name: reviewerExecution, type: enum, required: true, allowed_values: [not-verified-by-gate]}
      - {name: authorization, type: enum, required: true, allowed_values: [NONE]}
    constraints:
      - wire-target-is-the-shared-Target-view-of-targetRef
      - outcomes-in-domain-catalogue-is-the-same-condition-and-outcome-view-not-a-second-decision
      - knownRemaining-array-is-always-present-even-when-empty
      - invalid-or-partial-input-cannot-create-a-passing-assessment
      - full-envelope-required-at-E03-C03-C05-C07
      - sensorResultRefs-may-be-empty-in-U1-but-do-not-mean-U4-has-run
    relationships:
      - {to: ObservedSnapshot, direction: references, from_cardinality: many, to_cardinality: one-or-more, via: observationRefs}
external_ownership:
  DialogueExperience: [ConfigurationDraft, GuidanceSelection]
  NativeAIDLCConnection: [NativeOperation]
  SensorVerification: [SensorResult]
  KitDistribution: [DistributionRevision, DistributionAssessment]
  SafeOperationControl: [OperationAttempt]
```

## Entity Summary

| Entity | 所有 | U1の役割 |
|---|---|---|
| ObservedSnapshot | EvidenceCollection | 実取得と不能・対象・版・完全性を区別する |
| PublishedRecordProjection | EvidenceCollection | 必要成果物と複数checkpointの承認/READYを公開viewへ載せ、実PRのviewと照合する |
| ConformanceAssessment | ConformanceGate | 4条件、対象、非保証、残件を欠かさず返す |

7部品/10entityの所有を維持する。value typeや公開envelopeは新entity/権限制度ではない。StageRecordの承認は外部の正式承認の掲載viewであり、Shirubeが承認自体を所有・発行するモデルではない。既存native形式と公開wire形式を同一視しない。未知・欠落をdefaultで埋めてPASSを作らず、参照の部分書込みは有効な出力として扱わない。

## Assumptions & Open Questions

None.

現在の所有/公開境界について新たなOwner判断はない。後続U5/U7の実受渡しとU4実センサーは未実施であり、このモデルだけで実適用を証明しない。
