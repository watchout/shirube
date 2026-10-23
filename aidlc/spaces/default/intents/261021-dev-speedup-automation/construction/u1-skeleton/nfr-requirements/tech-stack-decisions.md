# 技術の選び方（Tech Stack Decisions）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR5〜NFR8）、技術の構成（`aidlc/spaces/default/codekb/shirube/technology-stack.md`）、チームの進め方（`inception/practices-discovery/team-practices.md`）、Owner の決定（iyasaka-arc#49 6336689921）、この段の答え（`nfr-requirements-questions.md` の Q6〜Q9）、Units Generation の Q7、Delivery Planning の Q10・Q11。

新しい技術は足しません。今の shirube の作りのまま、U1 の部品を足します。

| ID | 決まり | 選んだ物 | 理由 |
|----|--------|----------|------|
| NFR5.1 | 実行時の npm 依存を足さない | Node ≥ 22 の組込みだけ（`node:crypto`・`node:child_process` など）。外の道具は今ある gh・git・ruby（YAML の読取り）だけ | NFR5、`scripts/hygiene` の検査に実行時の依存を足さない決まり |
| NFR6.1 | own-code は予算の中に収める。U1 の増分は下の「大きさの見積もり」のとおり約 570〜760 行で、今の残り約 362 行を超える | 予算は、S1 全体の own-code の見積もりを添えて、P1 の `.shirube/hygiene-profile.md` の中で 1 回だけ改める。値は Owner が P1 の exact-head で決める | NFR6、Delivery Planning の Q10、この段の Q6・Q8・Q9。P1 自身の増分（約 50 行）は今の予算に収まるので、閾値を同じ PR で緩める決まりに当たらない |
| NFR7.1 | PR は追加 400 行・20 file まで。関数は 50 行・複雑さ 10 まで | 今の ESLint の設定と hygiene の検査のまま。U1 は保護面の 1 本と実装の PR 3 本に分ける（下の表） | NFR7、Units Generation の Q7 |
| NFR8.1 | 試験が先。判定ごとに正例と負例を置く | Node 組込みの `node:test` | NFR8、`team-practices.md` の Testing Posture |
| NFR8.2 | 行の網羅率 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない | Node 組込みの網羅率の測定（`--experimental-test-coverage` と `--test-coverage-lines=80`）を `ci.yml` に入れる（U1 の保護面の PR、Owner の exact-head） | NFR8、iyasaka-arc#49 6336689921。新しい依存は足さない |

## 大きさの見積もり（監査の指摘 BF-04、この段の Q6・Q8・Q9）

幅つきの見込みで、実装の実測ではありません。測った値（この Mac の shirube の作業場、2026-10-23）から arc が出しました。
- own-code の予算の検査: 1,938 行 / 2,300 行、残り 362 行。数えるのは `scripts/**`・`configs/**`・`.github/workflows/**`（`tests/**` は入らない）。
- PR の大きさの検査: 追加 400 行・変更 20 file まで。lockfile・`exclude_generated`・消した file は数えない。
- 今の大きさ: `scripts/sds/gate.mjs` 143 行、`scripts/sds/kit.mjs` 176 行、`.github/workflows/ci.yml` 30 行、`kit/sds-gate-caller.yml` 24 行、`.claude/settings.json` 233 行（Owner の作業場）。

| PR | 中身 | 追加行（見込み） | 変更 file | own-code の増分 |
|----|------|------------------|-----------|-----------------|
| P1 保護面の 1 本（R4、Owner の exact-head 1 回） | AI-DLC の自己適用の 6 file（約 315 行、`.claude/settings.json` 233 行を含む）・`sds-gate-self.yml`（約 25）・`ci.yml` の網羅率と計測の job（+約 25）・`.shirube/sds-pin.json`（約 10）・`hygiene-profile.md` の `exclude_generated` と own-code の予算の値（+約 6）・`.gitignore`（+約 2）。手で組む | 約 380 | 約 11 | 約 50（workflow） |
| R 記録の PR（Unit を指さない） | AI-DLC の記録（audit は載せない） | 記録の形の file は `exclude_generated` で数えない | — | 0 |
| I1 実装 1 | `approval-record.mjs`（承認の記録と段の順の記録の作り手の最小の形）・`kit.mjs` の自己用の書く先・その試験 | 約 320〜400 | 4〜5 | 約 195〜255 |
| A 承認の記録の PR（Unit を指さない） | I1 の CLI で作った `approvals/**` | 小 | — | 0 |
| I2 実装 2 | `record-bridge.mjs`・`gate.mjs` の判定の足し・`budget.mjs`・その試験 | 約 410〜480 | 5〜6 | 約 190〜260 |
| K kit の版上げの PR（Unit を指さない） | kit が書く 3 つの file（sds-audit の skill 33 行・PR の雛形 60 行・`AGENTS.md` の block 11 行）・kit で書いた呼出しと pin | 約 110〜115 | 5 | 約 0〜5 |
| I3 実装 3 | `metrics/**`・`docs/sds/distribution.md`（数えない）・その試験 | 約 290〜350 | 4〜5 | 約 135〜185 |

部品ごとの見込み（Q9）: `budget.mjs` = 本体 約 20〜30 行 ＋ 試験 約 40〜50 行。kit の自己用の書く先 = `kit.mjs` の変更 約 15〜25 行 ＋ 試験 約 35 行（今の `kit.mjs` 176 行・`tests/sds-kit.test.mjs` 159 行から）。`docs/` の Markdown は大きさに数えない（iyasaka-arc#49 6354019047 の 1）。

- own-code の増分は、P1 の約 50 を足して合わせて約 570〜760 行で、残り 362 行を超える。予算の改めは、S1 全体の own-code の見積もりを添えて P1 の中で 1 回だけ行う（Delivery Planning の Q10）。
- P1 は、今の kit では作れない（呼出しを `.github/workflows/sds-gate.yml` に書き、shirube の再利用 workflow を上書きする = 監査の指摘 BF-03）。手で組み、kit が書く 3 つの file は入れない（Q8）。3 つは K で入る（Delivery Planning の Q11）。
- K は Unit を指さない kit の版上げの PR で、U1 の PR の数に数えない（Delivery Planning の Q11）。
- `budget.mjs` は、それを使う I2 に置くのを既定とする（作り手は GitHub に問い合わせず使わない）。I2 より前ならどちらでもよいので、Code Generation の計画で I1・I2 の見積もりを出し直し、小さい方に置く（Q9）。
- P1 が 400 行・20 file を超える時は、`tests/self-aidlc-settings.test.mjs`（約 25 行、保護面ではない）を I1 へ移す。
- 実装の PR の 1 本が 400 行を超える見込みになった時は、Code Generation の計画で試験と実装の分け方を見直す。U1 の PR の数（保護面の 1 本と実装の PR 3 本まで）は変えない。
- **注意（Q9）**: 上の既定のままでは I2 が 1 本 400 行の上限に当たる見込み。実装の 3 本の合計（約 1,020〜1,230 行）が上の端で 3 本の上限 1,200 行を超える時は、U1 の PR の数（Units Generation の Q7）を変えることになるので、その時に Owner に伺う。
- 順: P1 → R → I1 → A → I2 → K → I3（Delivery Planning の Q10・Q11）。

## 動かす場所

- 門: GitHub Actions（固定した shirube の commit の再利用 workflow）。
- 計測（U1 の確かめ）: shirube の Actions の `ci.yml` の job（読取りだけの token）。専用の読取りの資格情報ができた後は、この Mac の W2 の道具から呼ぶ。
- 承認の記録の作り手: 席の作業場で CLI として動かす。
