# 要件書（audit-intake-extra）

監査の受付の checker に、依頼で宣言した追加の固定 checkout を受ける形を足す取り組みの要件。深さは Standard、scope は refactor。

## Intent analysis

目的は、1 つの CI の job が checkout を 2 つ持つ形（PR の統合の版と、別の repo の固定 commit）の PR を、受付の checker が不当に止めないようにすること。たとえば MoteNashi の PR は、1 つの job で「PR の統合の版」と「Common の固定 commit」を checkout する。今の `checkoutProof` は、job の記録から集めた commit が 1 つでないと「Missing or ambiguous checkout commit」で止める（code-structure、business-overview の走査）。

守りたいのは、広げても、受付が「照らされていない code が検査を通った」ことを成功と読まない性質。そのため、統合の版がちょうど 1 つで両親が依頼の base と head であること、は変えない。足すのは、作者が依頼に宣言した追加の checkout だけを、完全一致と実在の観測のうえで受ける道。step の名前で除く形は取らない。宣言が無い依頼は今と同じに扱う。

完了の形（出口）は、設計の記録だけの PR（設計監査 1 回）→ code と試験の PR（実装監査）→ Owner の exact-head（arc 経由）→ 作者以外の suite-lead による統合。統合後に relay の固定の checker を替えるのは CTO で、この取り組みの外。

## Functional requirements

### FR1 宣言（依頼の形）

- FR1.1 `sds-audit-request/1` の各対象（targets の要素）に、追加の固定 checkout を宣言する任意の欄を足す。宣言 1 件は repo と commit の組。欄の名前と形は functional-design で決める。schema の版は `/1` のままにし、契約 `.v2` にはしない。
- FR1.2 宣言は対象ごとに書く [Q1]。ある対象の宣言は、同じ依頼の他の対象の判定に効かない。
- FR1.3 宣言を持たない対象（宣言の欄が無い）は、今と同じ判定を受ける（checkout の commit がちょうど 1 つ）。宣言を持たない既存の依頼の判定結果は変わらない。
- FR1.4 宣言の形が不正なら依頼を拒否する。不正とは、組でない型、repo が `owner/name` の形でない、commit が 40 桁の小文字 16 進でない（短縮・前方一致・大文字を受けない）、同じ組の重複、のどれか。
- FR1.5 1 つの対象で宣言できるのは 4 件まで [Q3]。5 件以上の宣言を持つ対象は拒否する。
- FR1.6 宣言の repo は、その対象の PR 自身の repo と同じであってはならない [Q2]。同じかどうかの比較は、大文字小文字を区別しない。同じなら依頼を拒否する。

### FR2 checkout の証明の判定（`checkoutProof`）

- FR2.1 job の記録から集めた commit のうち、宣言のどの組とも一致しない commit を「統合の版の候補」とする。統合の版の候補は、ちょうど 1 つでなければならない。0 件または 2 件以上なら拒否する（今の「ちょうど 1 つ」を、宣言を差し引いた後の数に移す）。
- FR2.2 統合の版の候補の両親は、依頼の `[base, head]` と一致しなければならない（今の検査をそのまま保つ）。
- FR2.3 job の記録に出た commit のうち、宣言のどの組とも一致しないものが、統合の版の 1 つのほかにあれば拒否する（宣言に無い追加の checkout）。比較は 40 桁の全桁一致で、短縮や前方一致で一致とみなさない。
- FR2.4 宣言にあって、job の記録に出ていない組があれば拒否する。
- FR2.5 宣言した各組は、宣言の repo に実在しなければならない。`repos/<repo>/git/commits/<commit>` の応答が取得でき、返った commit が宣言の commit と全桁一致した時だけ「実在」と数える。応答が失敗・404・期限切れ・不一致・読めない形の時は拒否する（観測できないを成功にしない）。
- FR2.6 宣言した commit が、宣言の repo に無く別の repo にだけある場合は、宣言の repo の問い合わせで実在しないので拒否する。
- FR2.7 宣言の commit と同じ commit は、統合の版として数えない（宣言の commit が統合の版の commit と同じなら、統合の版の候補は 0 件になり拒否される）。
- FR2.8 job の記録に同じ commit が複数回出ても、1 件として数える（今の `Set` の扱いを保つ）。
- FR2.9 判定は step の名前・job の名前・順序を読まない。
- FR2.10 受け入れの根拠は、job の記録から観測した commit と、GitHub への問い合わせで観測した実在とする。依頼の宣言をそのまま写した値を、観測した証拠として扱わない。
- FR2.11 拒否は、どの条件で止まったかを区別できる理由で返す（宣言に無い commit、宣言の commit が記録に無い、宣言の commit が実在しない、統合の版の数、両親の不一致、宣言の形・件数・repo の違反）。

### FR3 文書の揃い

- FR3.1 `docs/sds/audit-method.md` に、宣言の欄と判定の規則の 1 段落を足す。
- FR3.2 `kit/skills/sds-audit/SKILL.md` §2 の依頼の形の文に、宣言の欄を足す。
- FR3.3 依頼の形の記述は、実装・`docs/sds/audit-method.md`・`kit/skills/sds-audit/SKILL.md` の 3 か所で食い違わない。欄の名前と件数の上限が 3 か所で一致することを、試験で確かめる。

### FR4 試験（負例を含む）

- FR4.1 負例（すべて拒否になること）: 宣言に無い追加の checkout、宣言と違う commit（1 桁だけ違う）、宣言の repo に無い commit、統合の版が 2 つ、統合の版が 0 件、宣言にあって記録に無い組、宣言の形の不正、5 件目の宣言、宣言の repo が PR 自身の repo と同じ（大文字小文字違いを含む）、実在の問い合わせの失敗・期限切れ。
- FR4.2 正例: 宣言が記録と一致し、宣言の repo に実在する 2 つの checkout は受理される。宣言を持たない 1 つの checkout は今と同じに受理される。宣言を持たない 2 つの checkout は今と同じく拒否される（回帰）。
- FR4.3 試験の差し込み `api` は、repo と commit ごとに別の応答を返せるようにする。今の試験の fixture は、どの commit の問い合わせにも 1 つの応答を返すので、このままでは負例（宣言の repo に無い commit）が意味を持たない。
- FR4.4 既存の試験は、変更せずに通り続ける。

## Non-functional requirements

- NFR1 fail closed。依頼の読み違い、記録の欠落、GitHub 応答の失敗・期限切れ・不一致は、すべて拒否にする。拒否を成功に読み替えず、観測できなかった実在を成功に数えない（S5・S8）。
- NFR2 後方互換。宣言を持たない依頼の判定結果と理由の文は変わらない。`verifyAudit` の入口の形を変えず、`scripts/sds/gate.mjs` と `design-gate.mjs` の呼び出しは変更なしで動く。
- NFR3 行の網羅率の床は 100%（チームの TDD の決まり）。対象は変更・追加する file の行。計測の対象集合・分母・コマンドは nfr-requirements で特定し、計測できない・対象が 0 件を成功に数えない。
- NFR4 構造の上限。新規 file は 300 行以下、関数は 50 行以下、複雑さは 10 以下。`scripts/hygiene` の core の import は Node 組込みと `./lib.mjs` だけ。新しい npm 依存を足さない。
- NFR5 問い合わせの有界。実在の問い合わせは宣言 1 件につき 1 回で、再試行しない。1 回の限り（20 秒・8 MB）は今のまま。1 つの対象の宣言は 4 件までなので、1 つの対象の追加の問い合わせは 4 回までで有界。
- NFR6 決定性。判定は、依頼・job の記録・GitHub の応答・呼び出し側が渡す `now` だけで決まる。判定の核が時刻・乱数を自分で取らない（S4）。
- NFR7 値の持ち主は 1 か所（S3）。欄の名前と件数の上限の「規則の値」を判定に使うのは実装の 1 か所だけ。文書の文はそれを書き写すが、判定には使わず、食い違いは FR3.3 の試験で検出する。
- NFR8 秘密を出さない。拒否の理由と記録に、資格情報や token を載せない。試験の fixture は架空の repo 名と架空の commit だけにする。
- NFR9 守る物。この取り組みは R3。workflow・必須検査・branch protection・契約 `.v2`・hygiene profile の上限を変えない（`scripts/hygiene` の検査の上限は、既存の限りに従う）。

## Constraints

- 作り方は AI-DLC の取り組み 1 つ・単位 1 つ。単位 = この取り組みの全体、components = 今の checker の受付の file（arc の指示）。
- 設計の記録だけの PR を先に出して独立の設計監査を 1 回受け、その後に code と試験を同じ PR に足して実装監査を受ける（チームの決まり）。Shirube の設計監査は devauditor（CI の記録 script が固定のため）。
- base が動いても進められる形（base_moved）で依頼する。統合の前に Owner の exact-head（arc 経由）。統合は作者以外の suite-lead。
- 受付の checker は `scripts/hygiene/audit-admission.mjs`。依頼の `verifier_sha256` はこの file の bytes に結ばれるので、統合後の main の bytes で測り直す必要がある（新しい依頼の分）。
- 中継（relay）が今固定している checker は、commit `e94a74e9…`（`checkers/e94a74e909ac92918beb1c33046a069e2a6f3558/scripts/hygiene/audit-admission.mjs`）、SHA-256 `0fdf596fb024b335c1cc6eb5b0d68ebbe1e16da410c94fc74f79a5985e83c38d`（arc が中継の設定で確かめた値。arc の知らせ、この会話では中継の設定を読んでいない）。公開 main の同 file と同じ bytes であることは、この取り組みの走査で確かめた。
- 作業場の木は古く、別の取り組みの手元の変更を含むので、基準にしない。事実の基準は公開 main の実物。

## Assumptions

- [assumption] 宣言の欄は任意で、無い対象は今と同じ（FR1.3）。空の宣言（0 件）は、宣言が無いのと同じに扱う。
- [assumption] GitHub の repo 名は大文字小文字を区別せずに同じ repo を指す。FR1.6 の同一判定はそのように行う。
- [assumption] 実在の確認は、今の `api` の差し込み（`gh api`）で `repos/<repo>/git/commits/<commit>` を読めば足り、新しい権限・資格情報を要さない。宣言の repo が非公開で、受付の GitHub 資格情報で読めない時は、実在を観測できないので拒否になる（NFR1）。
- [assumption] 依頼の本文は返却の digest に結ばれており、監査席は宣言された追加の checkout を見て受けるか差し戻すかを決められる。宣言は証拠ではなく、受付が観測した実在と完全一致が証拠である（FR2.10）。
- [assumption] 利用先の CI で checkout が 2 つになる形は、再利用の `hygiene.yml` が呼び出し側の repo と callee の固定 commit の 2 回 checkout することから起きる。コードからの導出で、実 CI の job の記録の実物では確かめていない。

## Out of scope

- 中継の固定の checker の SHA を替えること（CTO）と、その後の arc-sec の読み。
- 宣言した repo を許可の一覧と照らす形、宣言した commit の中身を照らす形。この取り組みが保証するのは、完全一致と実在だけ。
- 受付の出力の形に、受け入れた追加の checkout を載せ足すこと（NFR2 の後方互換と、出力の利用側の読み方を確かめてから別に決める）。
- `.github/workflows` の変更、`hygiene.yml` の checkout の形の変更、必須検査・branch protection・契約 `.v2` の変更。
- 実 CI の job の記録の実物の取得（取得できる場合は build-and-test の確かめに回す）。
- 監査の方法の §2.6（回数で Owner に返す文）の直し。arc の別の指示で、この取り組みの次に別の小さい単位として扱う（AI-DLC の bugfix か express）。この取り組みの単位・PR には入れない。
- U3（PR 104）と U4（PR 106）の直し。別の取り組み。

## 隅の掃引（corner-checklist）

| 部品 | 当たる条件 | 扱い |
|---|---|---|
| 依頼の宣言（読み取り） | 欄が無い・空・型が違う・重複・大文字・短縮の commit・件数超過 | FR1.3・FR1.4・FR1.5・A1 |
| 宣言の repo の綴り | 大文字小文字違いの同じ repo | FR1.6・A2 |
| `checkoutProof` | 同じ commit が複数回・統合の版が 0 件か 2 件・宣言と同じ commit が統合の版 | FR2.1・FR2.7・FR2.8 |
| GitHub への問い合わせ | 遅い・失敗・404・不正な本体・取得できない repo | FR2.5・NFR1・NFR5・A3 |
| 版の食い違い | 新しい欄を、古い checker が無視する（中継が新しい版に替わるまで） | 古い checker は欄を無視して今と同じ拒否のまま。拒否側に倒れる（安全）。Open questions に記録 |
| 文書の 3 か所 | 欄の名前・上限の食い違い | FR3.3・NFR7 |
| 試験の fixture | repo ごと・commit ごとの応答の区別が無い | FR4.3 |
| 非公開 repo | 受付の資格情報で読めない | A3。拒否になる |

## Open questions

- 宣言の欄の名前と形（functional-design で決める）。
- 受付の GitHub 資格情報が、利用先が宣言する repo（たとえば MoteNashi の Common の repo）を読めるかは、この会話では確かめていない。読めない場合、実在を観測できず拒否になる（安全側）。実機の確かめ（MoteNashi）の前に arc か CTO が確かめる事柄で、要件は変わらない。
- 実在の問い合わせが 1 通の依頼で何回まで許されるかの総予算（対象の数 × 4 件）を、nfr-requirements で明示するか。
- 行の網羅率の対象集合・分母・コマンド（NFR3）。
- 先回りの点検（設計の記録の PR の前に devsecops と architecture-reviewer、実装の PR の前にさらに quality）は、arc が伝えた Owner の指示（公開された決定の URL は未受領）。点検は arc の指示として行い、決定の URL が届いたら記録に写す。点検は段の見直し（review class none）ではなく、見直し済みとは書かない。

## Sources

- 依頼の説明: 「監査の受付の checker に、依頼で宣言した追加の固定 checkout を受ける形を足す（shirube#6 の arc の指示 6841925094）」 [desc]
- arc の指示: https://github.com/watchout/shirube/issues/6#issuecomment-6841925094 、本文 SHA-256 `8e6575f238aa8d6d275be82363cb8105799b2c6299c3685ee2b406d73538e4bd`（arc の指示。根拠の Owner の決定は https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6841920867 で、Owner の言葉そのものではない）
- 範囲: scope は refactor（intent-statement と scope-document は、この scope では作られていない。要件の根拠は上の指示と走査）[scope]
- 公開 main `1dd43e457361d9650153578baa71120788285e98` の走査（business-overview、architecture、code-structure、`inception/reverse-engineering/developer-scan.md`）
- team-practices: `team.md`（TDD、行の網羅率 100%、単位 1 つ = PR 1 つ、設計監査の道、S1〜S9）
- Q1・Q2・Q3: `requirements-analysis-questions.md`（arc の答え。Owner の委任 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6762288830 、本文 SHA-256 `59c1d8c1594f87f7c0623d09066e6463ff1fc3c2ce2df6826bee973db1461609` による。Owner の言葉ではない）
