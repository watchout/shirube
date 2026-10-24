# チームの進め方（Team Practices）

状態: 確定（2026-10-22 の面談と要約の確認で Owner が確認）。記録（git の履歴・CI の設定・profile・文書）と `aidlc/spaces/default/codekb/shirube/` の code-structure.md・technology-stack.md・dependencies.md・code-quality-assessment.md・architecture.md・business-overview.md から読み取り、面談で決めた。

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
- 行の網羅率 80% を床にし、統合の前に CI で確かめる。Build and Test の段でも弱めない（Owner の決定 A = iyasaka-arc#49 6336689921、AI-DLC の全体の決まり org.md のとおり。Q4 の「記録だけ」はこの決定で置き換えた）。測定には Node 組込みの機能を使い、新しい依存は足さない。CI の設定を変える時は保護面として Owner の exact-head を通す（iyasaka-arc#36）。
- CI（`ci.yml`）が PR と main への push で `npm test`、own-code の予算、自分自身への hygiene を動かす。

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
