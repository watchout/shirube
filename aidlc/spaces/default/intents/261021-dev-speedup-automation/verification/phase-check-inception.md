# 段の境目の確かめ（Inception → Construction）

**判定: PASS**（未解決の GAP・ORPHAN・不正な対応先・抜けた上流の ID は 0）

確かめた日: 2026-10-22。2026-10-23 に、U1 の設計の独立監査（BF-02）を受けて Contract Design を開き直して C9 を足し、Delivery Planning を通し直した後に、もう一度確かめた（3 つの対応表は変わっていない）。同じ日に、U1 の大きさの見積もり（監査の指摘 BF-04）を受けて Units Generation を開き直し（Q7: U1 の PR の数と中身）、Contract Design（変更なし）と Delivery Planning（Q10: PR の順と予算の改めの時点）を通し直した後に、もう一度確かめた（3 つの対応表は変わっていない）。さらに、U1 の Infrastructure Design の Q5（監査の指摘 BF-03、pin を上げる順）を受けて Delivery Planning を開き直し（Q11）、もう一度確かめた（3 つの対応表は変わっていない）。読んだ対応表は 3 つ（Contract Design は要件の対応表を持たないので入らない）。

## 対応表ごとの結果

| 対応表 | 上流の ID | OK | Deferred | GAP | ORPHAN | 抜け | 余り |
|--------|-----------|----|----------|-----|--------|------|------|
| `inception/user-stories/traceability.json`（要件 → 物語） | 43（FR の小項目 30・NFR 13） | 39 | 4 | 0 | 0 | 0 | 0 |
| `inception/domain-design/traceability.json`（物語 → 部品） | 17（US1.1〜US3.2） | 17 | 0 | 0 | 0 | 0 | 0 |
| `inception/units-generation/traceability.json`（物語 → Unit） | 17（US1.1〜US3.2） | 17 | 0 | 0 | 0 | 0 | 0 |

## 被覆の割合

- 要件で物語を持つ物: FR の小項目 30 / 30（100%）、NFR 9 / 13（69%）。残りの NFR5〜NFR8 は、コードの書き方の上限と試験の進め方で、Construction の nfr-requirements の段へ回した（Deferred、対応先の段の名前つき）。
- 物語で部品を持つ物: 17 / 17（100%）。
- 物語で Unit を持つ物: 17 / 17（100%）。Unit 7 つすべてに物語がある（`unit-of-work-story-map.md`）。

## 食い違いの確かめ

- 要件 NFR8 の網羅率は、Owner の決定（iyasaka-arc#49 6336689921）に合わせて、この Inception の中で直した（行の網羅率 80% を床にし、統合の前に CI で確かめる）。物語・進め方・根拠の記録も同じ文に揃っている。
- Unit の記録（`unit-of-work.md`）の U1・U4 の保護面の行は、Delivery Planning の Q8 に合わせて、この Inception の中で直した。Unit の境目・依存・対応表は変わらない。
- 受け渡しの形の承認の記録の置き場（Q8）と、設計の置き場の宣言（Q9）は、承認済みの要件と部品の設計に合っている。

## 残る注意（Construction で確かめる）

| 注意 | どこで確かめるか |
|------|------------------|
| 受け渡しの形の未決 C7（packaging の Unit と、Unit を指さない PR の置き場の宣言） | U4 の Functional Design |
| 受け渡しの形の未決 C6（計画の受付と ai-dev-framework の等価の試験） | U5 の Functional Design |
| 受け渡しの形の未決 C2・C3・C4 | U3・U1・U2 の Functional Design |
| 受け渡しの形 C9（段の順の記録）の `source_digest` の範囲 | U3 の Functional Design（U1 は最小の形） |
| U1 の設計の独立監査の指摘 BF-01〜BF-05 | U1 の 4 つの設計の段の通し直し |
| own-code の予算（残り約 362 行。U1 だけで約 550〜750 行の見込み） | P1 を出す時に S1 全体の見積もりを添え、P1 の中で 1 回だけ改める（Delivery Planning の Q10） |
| 決定 iyasaka-arc#49 6354019047 の 4 の PR の順の改め（承認の記録の PR を I1 の後へ、kit の版上げの PR を I2 と I3 の間へ = Delivery Planning の Q10・Q11） | この段の承認の後に arc が #49 に記録する |
| `budget.mjs` の置き場と I1 の大きさ（kit の自己用の書く先を I1 へ移した後） | U1 の NFR Requirements と NFR Design の通し直し |

## 承認

- [ ] Owner が Delivery Planning の段の承認で確かめる
