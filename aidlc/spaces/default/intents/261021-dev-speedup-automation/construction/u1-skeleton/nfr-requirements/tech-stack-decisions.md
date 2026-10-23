# 技術の選び方（Tech Stack Decisions）— U1 u1-skeleton

出典: 要件（`inception/requirements-analysis/requirements.md` の NFR5〜NFR8）、技術の構成（`aidlc/spaces/default/codekb/shirube/technology-stack.md`）、チームの進め方（`inception/practices-discovery/team-practices.md`）、Owner の決定（iyasaka-arc#49 6336689921）。

新しい技術は足しません。今の shirube の作りのまま、U1 の部品を足します。

| ID | 決まり | 選んだ物 | 理由 |
|----|--------|----------|------|
| NFR5.1 | 実行時の npm 依存を足さない | Node ≥ 22 の組込みだけ（`node:crypto`・`node:child_process` など）。外の道具は今ある gh・git・ruby（YAML の読取り）だけ | NFR5、`scripts/hygiene` の検査に実行時の依存を足さない決まり |
| NFR6.1 | own-code を 2,300 行以内に収める。U1 で足す行数は Code Generation の計画で見積もり、全体の見積もりは B2 の後に出す | — | NFR6。残りは約 362 行。超えるなら Owner に予算の改めを 1 回伺う |
| NFR7.1 | PR は追加 400 行・20 file まで。関数は 50 行・複雑さ 10 まで | 今の ESLint の設定と hygiene の検査のまま | NFR7 |
| NFR8.1 | 試験が先。判定ごとに正例と負例を置く | Node 組込みの `node:test` | NFR8、`team-practices.md` の Testing Posture |
| NFR8.2 | 行の網羅率 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない | Node 組込みの網羅率の測定（`--experimental-test-coverage` と `--test-coverage-lines=80`）を `ci.yml` に入れる（U1 の保護面の PR、Owner の exact-head） | NFR8、iyasaka-arc#49 6336689921。新しい依存は足さない |

## 動かす場所

- 門: GitHub Actions（固定した shirube の commit の再利用 workflow）。
- 計測（U1 の確かめ）: shirube の Actions の `ci.yml` の job（読取りだけの token）。専用の読取りの資格情報ができた後は、この Mac の W2 の道具から呼ぶ。
- 承認の記録の作り手: 席の作業場で CLI として動かす。
