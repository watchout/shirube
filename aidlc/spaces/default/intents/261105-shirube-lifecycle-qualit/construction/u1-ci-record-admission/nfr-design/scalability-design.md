# U1 — Scalability Design

## Sources and Scope

[確認済み計画](nfr-design-questions.md)、[scalability-requirements](../nfr-requirements/scalability-requirements.md)、[functional-spec](../functional-design/functional-spec.md)、[共通契約](../../../inception/contract-design/contract-summary.md)に従う。本書がSOL4を定義する。新しい台数/並列数/RPS/SLO、DB/queue/cacheは追加しない。

## SOL4 — 評価の分離

**対応:** NFR4.2。**責任:** EvidenceCollectionの評価ごとの観測とConformanceGateへの明示入力。

1. 一回の呼出しごとに、対象tuple、実PR番号/head/base、必要slot/attempt、観測集合、取得完全性を分ける。核/adapterに共有mutableなlatest結果を持たせない。
2. 固定headのtree/blobを読む。応答を受ける際は要求した対象/版との対応を確かめ、他評価の応答や旧attemptを採用しない。
3. 必要集合と観測集合を別に保つ。成果物やpageが増えれば同じ規則で取得し、完全性が確認できない規模では予算に従って閉門する。
4. 出力前に実PR head/baseを再取得する。変更されていれば古いPASSを出さず、当該評価を停止する。途中で新headへ自動追随して複数snapshotを一つへ混ぜない。
5. 正当な再評価は新しい実取得から始める。前の値は過去参照であって現在の観測として流用しない。正式engine state/別評価/既存履歴を書き換えない。

## Capacity and Alternatives

取得予算は[performance-design](performance-design.md)のSOL1を参照する。上限へ達したとき必要集合を縮めず、取得回数をartifact数/PR数の処理能力と読み替えない。1応答bytes上限は全体メモリ保証ではない。

水平/垂直scale、load balancer、sharding、共有cache、queue、自動並列化は今回必要ない。statelessな一回の評価と既存GitHub読取の有限停止を採る。共有latest/cacheによる速さより、実対象の固定と評価の独立性を優先する。過去hash一致だけで新headの完全性を確認済みにしない。

## Failure Domain and Verification

途中変更/欠ページ/別scope/競合は当該評価を閉門し、他評価のPASSを消費しない。早期失敗時に完全resultを作れない境界は[reliability-design](reliability-design.md)のSOL5、出力scopeの保持は[observability-design](observability-design.md)のSOL7を参照する。

FD-T07/08/11/15/17で、複数target/旧応答/途中head変更を交差させ、結果が元scopeへだけ対応し、不完全状態を完全結果へ合成しないことを後段で確認する。規模増加の実測・負荷試験は未実施。予算不足の影響は対象と版を記録し、黙って上限を増やさない。

## Infrastructure Handoff

実配置では評価入力/作業データを呼出しごとに分離し、共有可変状態や常駐処理を前提にしない。独立process/runnerの新設や具体file配置は本書で採択しない。U1はU2/U3を待たず、後続U4の実センサーやU5/U7の実配布/受入を移管しない。

## Assumptions & Open Questions

None.

採択済みの大規模負荷目標はない。後段の実環境/実入力で成立した範囲だけを実証済みとする。
