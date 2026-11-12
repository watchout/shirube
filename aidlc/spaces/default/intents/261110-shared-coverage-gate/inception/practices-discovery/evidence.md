# Practices Discovery Evidence

## 参加者と調べたもの

- 実施: この会話の席（release engineer の役を自分で担当）。担当の専門役の呼び出しは、自動許可の判定が確認できなかったため行わなかった（arc の指示に従い、事実を記録した）。Collaborators は off のため、support の見直しは無い。
- 種類: 再実行（brownfield）。基準は確定済みの `memory/team.md` の5節と `project.md` の Mandated / Forbidden。
- 逆解析の成果（`aidlc/spaces/default/codekb/shirube/`）:
  - code-structure: 検査の対象集合が場所ごとに違うこと、網羅率の分母が公開 main の CI の引数にだけあること。
  - technology-stack: Node 22（engines `>=22`）、公開 main の網羅率だけ Node 26 を使う。root には測定の道具が無い。
  - dependencies: 公開 main の網羅率は Node 26.7 以降の組込み機能に依存する。結果を読む部品は無い。
  - code-quality-assessment: 「すでにあるもの」と「まだ無いもの」の一覧。100% の判定・分母の宣言・機械可読な出力・利用先への配布・門や監査への結び付けは無い。
  - architecture: 試験の行の網羅率の測定の位置。名前が紛らわしい hygiene の `coverage`（言語の被覆の検査）は別物。
  - business-overview: 共有の網羅率の門との関係。
- 履歴: `~/Developer/shirube` の `origin/main` の first-parent 履歴を読み取りで確認した。直近25件はすべて `Merge pull request #N from watchout/<席>/<内容>-<年月日>` の形（merge commit、branch は `<席>/<内容>-<年月日>`）。基準の Way of Working の branch・統合方法と一致した。
- CI・配布の設定: `.github/workflows/`、`package.json`、`.shirube/`、`kit/` を逆解析の時に読んだ（公開 main は GitHub の読み取りのみ）。試験・ビルド・CI は実行していない。

## 推測した点

- 作業 branch 名と統合方法（merge commit）は、履歴から基準どおりと推測した。branch protection の設定は読んでいないため、統合方法の強制の有無は未確認。
- 網羅率の測定は公開 main の CI にだけあり、root には無い。作業場の HEAD は公開 main より古い。これは実装の事実で、チームの実践ではない。

## 基準を変えなかった理由

- 5節とも、基準の文面を覆す新しい証拠は見つからなかった。下の「未確定」は、基準に新しい約束を足すかどうかの人の判断であり、証拠から推測して確定にしない。
- 公開 main の下限80%は、基準の「行の網羅率の床は100%」と食い違う。これは実装が基準に届いていない差であって、基準を80%へ下げる根拠にしない（基準は通すために弱めないと定めている）。

## 未確定（面談で人に聞く）

1. 行の網羅率: 確定済みの「床は100%。対象集合・分母は各取り組みで特定する」を、この取り組みでもそのまま保つか。公開 main の CI は今80%で、分母は `scripts/**` の文字列を CI の引数に直書きしている。
2. 網羅率の結果の扱い: 試験の網羅率の結果を、CI の成否だけでなく、機械が読める形で記録し、門・監査が読む実践にするか（Testing Posture の「設定値や試験ファイルの存在を実測結果の代わりにしない」との関係）。
3. 配布: 共有の網羅率の門を利用先に配る方法は、確定済みの「Shirube の commit を固定した再利用 workflow とキットを PR で扱う」をそのまま保つか。
4. そのほかの節（Way of Working、Walking Skeleton、Code Style）は、基準のまま保つか。

## 面談の結果

答えは arc の答え（Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830。Owner の言葉ではない）。

- Q1（行の網羅率の下限）: A。100% のまま保つ。分母はこの取り組みの要件で特定する。intent-capture の Owner の答え（行 100% を既定、低い閾値の例外は Owner の決定の URL つき）と同じ。→ 基準のまま。
- Q2（網羅率の結果の扱い）: A。結果を機械が読める形で記録し、門・監査が根拠にする実践を足す。社内標準 S5 と、この取り組みの目的に合う。→ team-practices.md の Testing Posture に1項目を足した。
- Q3（配り方）: A。基準のまま。
- Q4（最小の版を先に作る進め方）: A。基準のまま。
- Q5（作業の進め方とコードの書き方）: A。基準のまま。

新しい厳守・禁止の規則は述べられていないため、discovered-rules.md には規則の行を置かない（Testing Posture の1項目は実践として足し、規則としては足さない）。
