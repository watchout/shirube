# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- 作業は席ごとの branch（`<席>/<内容>-<年月日>`、例: `adf-lead/gate4a-binding-20261021`）から PR を出し、`main` に統合する。統合は GitHub の merge commit（"Merge pull request #N"）で行い、squash はしない。
- 統合は作者と別の席が、監査 PASS の後に行う（iyasaka-arc#49 6288848200・6301299856）。
- PR の本文に `json sds-pr` のブロックを 1 個置き、`risk:R0`〜`risk:R4` の label を 1 つ付ける。R2 以上は独立監査、R3・R4 と保護面は Owner の exact-head の承認が要る。
- 作る人・監査する人・統合する人は別の席。作業の状態は repo のファイルではなく Issue と PR に書く。

## Walking Skeleton

- 作る。最初の作業単位で、端から端まで通る細い版を作り、部品がつながって最後まで動くことを確かめてから機能を足す。
- 制御系は全部作ってからではなく、薄片ごとに実証する（iyasaka-arc#49 6284653618）。最初の版の完了は「1 周を門と計測つきで通す」（6329622282）。

## Testing Posture

- **Methodology**: tdd
- **Methodology evidence**: 記録に、失敗する試験だけの PR を先に出し、その後に試験を通す実装の PR を出した例がある（監査項目の集合 `pr34-u2-red.json` と `pr34-u2-green.json`）。面談でこの形を決まりとして続けると決めた（Q3）。
- **Ordering**: 各作業単位で、まず失敗する試験を書いて失敗を確かめ、次にそれを通す実装を書く。
- 試験の道具は Node 組込みの `node:test`。判定ごとに正例・負例の試験を置く。
- 行の網羅率 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない（Owner の決定 A = iyasaka-arc#49 6336689921、AI-DLC の全体の決まり org.md のとおり）。測定には Node 組込みの機能を使い、新しい依存は足さない。CI の設定を変える時は保護面として Owner の exact-head を通す（iyasaka-arc#36）。
- CI（`ci.yml`）が PR と main への push で `npm test`、own-code の予算、自分自身への hygiene を動かす。

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- 本番環境への展開は無い。配布先の repo は shirube の commit を固定して再利用 workflow を呼ぶ。版を上げる時は kit の PR を出す。
- キットの版上げの PR（`kit.mjs upgrade` で、差分がキットの file だけ・kit check OK・上げる先は監査 PASS で別の席が統合した shirube main）は、独立監査 PASS と受領の後に、その repo の統合担当が作者と別の席として統合する。PR ごとの exact-head は要らない（iyasaka-arc#49 6308341298）。
- mode・必須検査・ruleset・profile・protected_paths・最初の導入、および workflow や pin（`.shirube/**`）の変更は、保護面として Owner の exact-head の承認が要る。
- 版の印として tag を付けることがある（`v0.1.0`、`v0.1.2`）。

## Code Style

- JavaScript の ESM（`.mjs`）、Node ≥ 22。実行時の npm 依存は持たない。
- 上限: 関数 50 行・複雑さ 10（ESLint）、新しい file 300 行、PR は追加 400 行・20 file まで、own-code 2,300 行（profile）。
- どの検査も 1 行の JSON を出し、exit code 0 / 1 / 2 で結果を返す。読めない時は失敗にする（fail closed）。
- 時刻・乱数・外部への問い合わせは引数で渡す（核の関数は自分で読まない）。
- コードの先頭や判定の箇所に、根拠の決定（Issue の comment の URL）を書く。
- formatter の設定は無い。
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->
- 評価・成功の指標（測れるもの）は、基本的に自社が管理できる範囲の指標にする。自社が管理できない結果（例: 宿泊客の口コミの点数、市場や他社の動き）を成功の判定に使わない。外れる時は Owner の明示の決定を記録する。 (Owner の指示 2026-10-22: 「すべての評価＝測れるに共通することだが、基本的にはうちの管理できる範囲の指標であることを共通概念としてください」 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6329643565 )
- 問いの答えは、この会話も arc も下書きで決めない。Owner の判断が要る問いも、事実を写すだけの問いも、[Answer] は空けておき、arc の名前で勧めを書かない。arc が Owner と arc の端末の会話で噛み砕いて聞き、Owner の言葉のまま [Answer] に写す。問いの背景と選択肢は、作る側の言葉を減らし、Owner が見る場面の例で書く。 (Owner の決定 2026-10-23 OD-AIDLC-QUESTIONS-ASKED-IN-PLAIN-DIALOGUE-NOT-DRAFTED-20261023-001 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6360243431 )
- Functional Design の段では、Unit ごとの `functional-spec.md` に機械で読む block（```` ```json sds-design-locations ````、形 `sds-design-locations/1` = `schema`・`unit`・`paths`）を 1 つ置き、その Unit が変えてよい folder・file の型（glob）を並べる。設計の段で arc が下書きし、Owner が段の承認で確かめる。門の判定 5 がこの block を読み、PR の変更 path がその中かを見る（contract-design の Q9 = B と contract-summary.md の C7、2026-10-22 承認。Functional Design の出力が無い Unit の扱いは C7 の未決の問い）。

## Corrections

<!-- Self-learning loop appends here. -->
