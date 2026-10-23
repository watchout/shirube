# NFR Requirements（U1 u1-skeleton）— 質問

U1 の速さ・安全・信頼性・規模・見え方の決まりを、数字まで決めます。決まっていることは聞き直しません。
- 要件（`inception/requirements-analysis/requirements.md`）の NFR1〜NFR13
- U1 の設計（`construction/u1-skeleton/functional-design/`）
- 受け渡しの形（`inception/contract-design/contract-summary.md`）

決まっていること:
- 失敗を隠さない（NFR1）。
- 同じ入力から同じ結果（NFR2）。
- 問い合わせごとの時間の上限と全体の予算を持つ（NFR3）。
- 実行時の npm 依存を足さない（NFR5）。
- 書込みは最小（NFR10）。
- 自動の再試行はしない（Contract Design の Q7）。

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [速さ] GitHub への問い合わせの時間の上限と全体の予算

今の門は、GitHub への問い合わせ 1 回に 20 秒の上限を持っています（`scripts/sds/gate.mjs`）。全体の予算はまだありません。

A. 問い合わせ 1 回 20 秒（今の門と同じ）。門の全体は 5 分、計測の全体は 10 分
B. 問い合わせ 1 回 30 秒。門の全体は 10 分、計測の全体は 20 分
X. Other (please specify)

[Answer]: A（arc の設計。問い合わせ 1 回の上限は今の門（`gate.mjs` の 20 秒）にそろえ、上限の値を 2 か所で別々に持たない = Shirube 開発規格 S3。門の全体 5 分は、PR ごとに動く門が作者を長く待たせない長さ。計測は 3 repo・約 100 件の読取りで、10 分あれば足りる見込み。使い切ったら「観測できず」= NFR3）

## Q2. [安全] 資格情報の分け方

チームの決まり（Shirube 開発規格 S9）では、読み取りしかしない経路には読み取りだけの資格情報を渡します。

A. 門は workflow の GITHUB_TOKEN で、commit status の書込みと、contents・actions・pull-requests の読取りだけを持つ。計測は読取りだけの資格情報（W2 の道具を動かす席の gh の認証）で動き、書ける資格情報を渡さない
B. 計測も、門と同じ書込みのできる資格情報を使う
X. Other (please specify)

（arc の勧め: X「門は A のとおり、その job の GITHUB_TOKEN を commit status の書込みと contents・actions・pull-requests の読取りだけに絞る。計測は、3 つの repo の contents・actions・pull-requests・commit status を読むだけの専用の資格情報で動かす。U1 の確かめは、その専用の資格情報ができるまで、shirube の Actions の中で GITHUB_TOKEN を読取りだけに絞って shirube 自身を測る」。A の文にある「W2 の道具を動かす席の gh の認証」は、この Mac で確かめたところ repo の書込みの scope を持っている（arc が gh auth status で scope の名前だけを確かめた。値は見ていない）。そのため A のままでは「書ける資格情報を渡さない」= Shirube 開発規格 S9 に反する。専用の資格情報を作るのは token の発行で保護面 = iyasaka-arc#36 なので、作る時に Owner の決定を取る。安全に関わる決定なので Owner が決める）

[Answer]: X: 門は、その job の GITHUB_TOKEN を commit status の書込みと contents・actions・pull-requests の読取りだけに絞る。計測は、3 つの repo の contents・actions・pull-requests・commit status を読むだけの専用の資格情報で動かす（作るのは token の発行で保護面なので、作る時に Owner の決定を取る）。U1 の確かめは、その専用の資格情報ができるまで、shirube の Actions の中で GITHUB_TOKEN を読取りだけに絞って shirube 自身を測る（arc の案）

## Q3. [信頼性] 門の log が無い PR の数え方

計測は、門の log の 1 行の JSON を読みます。Actions の log には保持期間があり、期間を過ぎた PR は log が読めません。

A. log が読めない PR は「観測できず」として数え、その件数を出す。log の保持期間は、repo の今の設定のまま
B. log が読めない PR は、commit status の state だけで PASS・FAIL を数える
X. Other (please specify)

[Answer]: A（arc の設計。読めない物を、宣言の値（status の state）だけで PASS・FAIL に数えると、観測していない物を観測したことにしてしまう = Shirube 開発規格 S5「観測できずを成功に読み替えない」。件数を出せば、どれだけ読めなかったかが分かる。log の保持期間を変えるのは repo の設定の変更なので、今のままにする）

## Q4. [見え方] 門と計測の失敗の見え方

A. 門の失敗（exit code 1・2）は、commit status の説明文と log に出す。計測の「観測できず」は、出力の repos の欄と partial に出す。ほかの通知は足さない（Owner は #53 で見る）
B. 失敗の時に、決まった Issue にも書く（書込みが増える）
X. Other (please specify)

[Answer]: A（arc の設計。書込みは最小にする = 要件 NFR10。Owner は計測の結果を #53 で見ると決めてある = ADR-003。Issue に書くと、書ける資格情報が計測にも要り、Q2 の分け方とも食い違う）

## Q5. [規模] 計測が 1 回に読む PR の数

今の値（9/21〜10/20）は、3 repo で 101 件です。

A. 上限の件数は決めず、期間の中の全部を読む。読み切れない時は全体の予算（Q1）で止め、その repo を「観測できず」にする
B. 1 repo あたり 200 件までに限る
X. Other (please specify)

[Answer]: A（arc の設計。今の値は 3 repo で 101 件と小さく、件数で切ると期間の中の PR が抜けて値が変わる。読み切れない時は全体の予算で止め、その repo を「観測できず」にすれば、失敗も隠れない = NFR1・NFR3）

## Q6. [規模] 監査の指摘 BF-04: U1 の大きさの見積もりと、PR の分け方

監査（shirube PR #65 の sds-audit-review、BF-04）の指摘です。
- U1 の行数・file 数・PR の分け方の見積もりが無く、`tech-stack-decisions.md` の NFR6.1 で Code Generation の計画へ先送りしている。
- そのため、各 PR が上限に収まるかを設計から判定できない。
- 求められていること: U1 の増分、PR ごとの追加行と変更 file の数、主な file の大きさを見積もる。収まらない時は、分け方と依存の順を示し、要る予算の変更を既存の Owner の手順に結ぶ。実装の完成や後の Unit の実測は求められていない。

見積もりに使う事実（この Mac の shirube の作業場で測った値）:
- own-code の予算の検査: 1,938 行 / 2,300 行、残り 362 行（25 file）。数えるのは `scripts/**`・`configs/**`・`.github/workflows/**` で、`tests/**` は入らない（`.shirube/hygiene-profile.md`）。
- PR の大きさの検査: 追加 400 行・変更 20 file まで（`scripts/hygiene/pr-size.mjs`）。lockfile・`exclude_generated`・消した file は数えない。`tests/**` と `.claude/settings.json` は数える。
- 新しい file は 300 行、関数は 50 行・複雑さ 10 まで。
- 今の大きさ
  - `scripts/sds/gate.mjs` 143 行
  - `scripts/sds/kit.mjs` 176 行
  - `.github/workflows/ci.yml` 30 行
  - `kit/sds-gate-caller.yml` 24 行
  - `.claude/settings.json` 233 行（Owner の作業場）
- 保護面の 1 本の PR のうち AI-DLC の自己適用の分は、設計の見込みで約 315 行・6 file（`docs/design/aidlc-include.md` §6 の 3）。これに U1 の保護面（`sds-gate-self.yml`・`ci.yml` の網羅率と計測の job・`.shirube/sds-pin.json`）が加わる。
- Units Generation の決まり: 1 つの Unit は PR 1〜2 本（1 本あたり追加 400 行・20 file の中）に収まる大きさにする（`unit-of-work.md`）。記録の PR は Unit を指さない（C7）。
- 予算の改めは、作る順番の計画では Owner の手の 2 回目（B2 の見積もりの後、超える時だけ）。
- 決まり: 検査の閾値を緩める変更を同じ PR で行わない（`project.md` の Forbidden）。

A. arc が見積もりの表を、この段の記録（`tech-stack-decisions.md` の「大きさの見積もり」の節）に置き、NFR6.1 の先送りの文を消す。
   - 表の行: PR ごと（保護面の 1 本・U1 の実装の PR）。
   - 表の欄: 追加行・変更 file の数・own-code の増分・主な file の行数。
   - own-code の増分が残り 362 行を超える時: 予算の改めを、その増分を含む PR より前の別の PR（R3、Owner の exact-head）にする。改めの幅は S1 の全体の見込みで決め、Owner の手の 2 回目を前に移す（回数は 5 回のまま）。
   - PR が 400 行・20 file を超える時: 分け方と依存の順を表に示す。
     - 保護面ではない物（試験など）は、実装の PR へ移す。
     - それでも保護面の PR が 2 本になる時は、Owner の手が 1 回増えることを書く。
B. 見積もりで収まらない物は U1 から外し、後の Unit へ回す（細い版の中身を減らす。Units Generation と Delivery Planning の記録を直す要があり、段を開き直す）
X. Other (please specify)

[Answer]: A（arc の設計。見積もりは、上の測った値と U1 の置き場（functional-spec.md の `sds-design-locations`）から arc が出した幅つきの見込みで、実装の実測ではない。次の表を `tech-stack-decisions.md` の「大きさの見積もり」の節に置く。
| PR | 中身 | 追加行（見込み） | 変更 file | own-code の増分 |
|---|---|---|---|---|
| P1 保護面の 1 本（R4、Owner の exact-head 1 回） | AI-DLC の自己適用の 6 file（約 315 行、`.claude/settings.json` 233 行を含む）・`sds-gate-self.yml`（約 25）・`ci.yml` の網羅率と計測の job（+約 25）・`.shirube/sds-pin.json`（約 10）・`hygiene-profile.md` の `exclude_generated` と own-code の予算の値（+約 6）・`.gitignore`（+2） | 約 380 | 約 11 | 約 50（workflow） |
| R 記録の PR（PR #65 の写し直し、Unit を指さない） | AI-DLC の記録 | 大きさの検査から外す（`exclude_generated`） | ― | 0 |
| I1 実装 1 | `approval-record.mjs`（承認の記録と段の順の記録の作り手の最小の形）・`budget.mjs`・その試験 | 約 350〜400 | 4〜5 | 約 200〜260 |
| A 承認の記録の PR（Unit を指さない） | I1 で作った `approvals/**` | 小 | ― | 0 |
| I2 実装 2 | `record-bridge.mjs`・`gate.mjs` の判定の足し・その試験 | 約 350〜400 | 4〜5 | 約 170〜230 |
| I3 実装 3 | `metrics/**`・`kit.mjs` の自己用の書く先・`docs/sds/distribution.md`・その試験 | 約 350〜400 | 5〜6 | 約 150〜210 |
- own-code の増分の見込みは合わせて約 550〜750 行で、残り 362 行を超える。超える分の予算の改めは、P1 の `hygiene-profile.md` の中で行う（P1 自身の増分は約 50 行で今の予算に収まるので、「検査の閾値を緩める変更を、それで通す PR と同じ PR で行わない」決まりに当たらない）。これで Owner の手は増えない（1 周 5 回のまま）。改めの値は U1 の分（約 2,500〜2,700 行）に余裕を足した物にし、U2 以降の分は作る順番の計画のとおり B2 の見積もりの後に見直す。
- P1 が 400 行・20 file を超える時は、`tests/self-aidlc-settings.test.mjs` を I1 へ移す（保護面ではない物は実装の PR へ）。
- 実装の PR は 3 本になり、Units Generation の目安「1 つの Unit は PR 1〜2 本」を 1 本超える。U1 は細い版で部品 5 つにまたがるため。目安に合わせるなら、計測（`metrics/**`）を U2 へ移すことになり、Units Generation と Delivery Planning の段を開き直す（B）。arc は、開き直しの手間と、細い版で計測までを通す確かめ（Delivery Planning の Q7）を残す利点から、3 本で進めることを勧める。
- 順: P1 → R → I1 → A → I2 → I3。門は記録だけの形なので、I2 の前に門が PR を止めて詰まることはない）

## Q7. [進め方] Q6 の下書きが、承認済みの前の段の記録と食い違う所の扱い（追加の確認）

Q6 の下書きは、次の 3 点で承認済みの記録や Owner の決定と食い違います。
1. **実装の PR の数**: 実装の PR が 3 本（I1〜I3）になる。Units Generation の決まりは「1 つの Unit は PR 1〜2 本」（`unit-of-work.md`、Q3）。
2. **記録の PR の順**: 承認の記録と段の順の記録の PR（A）が、I1 の後になる。作り手の CLI が I1 で初めてできるため。
   - 作る順番の計画（`bolt-plan.md` の B1 の「PR の順」）では、記録の PR に承認の記録と段の順の記録を含め、実装の PR より前に置いている。
   - Owner の決定（iyasaka-arc#49 6354019047 の 4）も「記録の PR → U1 の実装の PR」の順。
3. **予算の改めの時点**: own-code の予算の改めを P1 に入れる。
   - 作る順番の計画では、Owner の手の 1 回目（P1）の中身に予算の改めは無く、予算の改めは 2 回目（B2 の見積もりの後、超える時だけ）。
   - Units Generation の Q5 も「全体の見積もりを出し、超えるなら 1 回だけ伺う」。
   - 下書きどおりなら、予算の改めが P1 と B2 の後の 2 回になりうる。Owner の手の回数は 5 回のまま。

あわせて確かめる事が 1 つあります。P1 を kit で作ると、kit は次の file も書きます。どれも U1 の置き場（Functional Design の `sds-design-locations`）にありません。
- `.claude/skills/sds-audit/SKILL.md`
- `.github/pull_request_template.md`
- `AGENTS.md`（説明文の block）

A. Units Generation を開き直し、順に通し直す（Units Generation → Contract Design → Delivery Planning → U1 の Functional Design → この段）。
   - Units Generation: U1 の PR の数の決まりを直す。
   - Delivery Planning: PR の順（P1 → R → I1 → A → I2 → I3）と、予算の改めの時点を直す。
   - Functional Design: 置き場に、kit が書く file を足す。
   - 決定 6354019047 の 4 の順を改める記録は、arc が #49 に書く。
B. 開き直さない。食い違いをこの段の Deviations に残して進める。前の段の記録は直さず、Owner がこの食い違いを受け入れたことを arc が #49 に記録する
X. Other (please specify)

（arc の勧め: A。arc の訂正: Q6 の下書きは、承認済みの前の段の記録（Units Generation の PR の数、Delivery Planning の PR の順と予算の改めの時点、Functional Design の置き場）と Owner の決定 6354019047 の 4 の順に照らさずに書いた。arc の誤り。食い違いは言い回しではなく計画の中身（PR の数の決まり・順・予算を伺う時点・門が見る置き場）なので、AI-DLC の決まり（前の段に及ぶ変更は、影響を示してその段に戻り、順に通し直す）に従う。B にすると、承認済みの記録と違う計画で実装が進み、門が見る置き場（`sds-design-locations`）にも kit が書く 3 つの file が無いままになる。A で直す中身の案: (1) Units Generation = U1 の PR の数の決まりを「保護面の 1 本と実装の PR 3 本まで」にする。(2) Delivery Planning = PR の順を P1 → 記録の PR（AI-DLC の記録）→ I1 → 承認の記録の PR → I2 → I3 にし、予算を伺うのを 1 回にまとめて P1 の前に移す（その時に S1 全体の見積もりを出す = Units Generation の Q5 の「超えるなら 1 回だけ伺う」を守る）。(3) Functional Design = 置き場に `.claude/skills/sds-audit/SKILL.md`・`.github/pull_request_template.md`・`AGENTS.md` を足す。(4) 決定 6354019047 の 4 の順を改めることは、Owner が通し直しの要約で確かめた後に arc が #49 に記録する。Contract Design は中身を変えずに通す。Owner の確認は、通し直す段ごとに 1 回ずつ増える）

[Answer]: A（Owner がこの会話で選んだ。Units Generation を開き直し、Contract Design → Delivery Planning → U1 の Functional Design → この段の順に通し直す）

## Q8. [規模] Q6 の見積もりを、通し直しで決まった事に合わせて直す（追加の確認）

Q7 = A の通し直しで、次の 2 つが決まりました。Q6 の下書きは、その前に書かれた物です。
1. **予算の改め方**（Delivery Planning の Q10 = A）: S1 全体の own-code の見積もりを添え、P1 の `.shirube/hygiene-profile.md` の中で 1 回だけ改める。
   - Q6 の下書きでは「改めの値は U1 の分に余裕を足した物にし、U2 以降の分は B2 の見積もりの後に見直す」。予算の改めが 2 回になりうる書き方で、Q10 と食い違う。
2. **kit が書く 3 つの file**（U1 の Functional Design の Q11）: 置き場に足した次の 3 つ（この Mac で測った今の行数）。
   - `.claude/skills/sds-audit/SKILL.md`: 33 行
   - `.github/pull_request_template.md`: 60 行
   - `AGENTS.md`（説明文の block）: 11 行
   - 3 つとも PR の大きさの数えに入る（`exclude_generated` の外）。

確かめた事実: P1 は、今の kit では作れません。
- 今の kit の apply は、門の呼出しを `.github/workflows/sds-gate.yml` に書くので、shirube では再利用 workflow を上書きしてしまう（監査の指摘 BF-03）。
- kit の自己用の書く先が入るのは I3（Delivery Planning の Q10）。
- そのため P1 の呼出しと pin は手で組むことになり、kit が書く 3 つの file は P1 には入らない。
- 3 つは、I3 の後に初めて shirube に kit を使う時に入る。どの PR で入れるかは、BF-03 の手順（自己用の pin の上げ方）として Infrastructure Design で決める。
- P1 は Q6 の下書きのとおり、約 380 行・約 11 file のまま。

あわせて、この会話の誤りが 1 つあります。U1 の Functional Design の `functional-spec.md` の W4 で、P1 の中身に「kit が書く file（sds-audit の skill・PR の雛形・`AGENTS.md`）」と書きました。Q11 の答えは「置き場に足す」だけで、P1 に入れるとは決めていません。書き過ぎです。

A. 予算は Q10 のとおりにし、Q6 の表の予算の文を「S1 全体の見積もりで 1 回」に直す。
   - P1 は手で組み、kit が書く 3 つの file は入れない。
   - P1 が 400 行・20 file を超える時は、`tests/self-aidlc-settings.test.mjs` を I1 へ移す（Q6 の下書きのとおり）。
   - 3 つの file を入れる PR は、Infrastructure Design で決める。
   - U1 の Functional Design を開き直し、W4 の P1 の中身から「kit が書く file」の行を外す（置き場の block は変えない）。その後、この段に戻る。
B. 予算は A と同じ。kit の自己用の書く先を P1 より前の PR に移し、P1 を kit で作る。
   - Delivery Planning の PR の順（Q10）を改めるので、その段を開き直す。
X. Other (please specify)

（arc の勧め: B。承認済みの記録に照らした: Units Generation の Q7（2026-10-23 承認）は「U1 は保護面の 1 本と実装の PR 3 本まで」。A は kit が書く 3 つの file と試験を、I1 の前の保護面ではない PR に移すので、U1 の PR がもう 1 本増え、この決まりと食い違う（また Units Generation に戻ることになる）。外す物が保護面かは確かめた: 門の既定の保護面は `.github/workflows/**`・`.shirube/**`・CODEOWNERS で、`.github/pull_request_template.md`・`AGENTS.md`・`.claude/skills/sds-audit/SKILL.md` は入らない。`docs/design/aidlc-include.md` §8 でも R4 は `.claude/settings.json` と `.shirube/hygiene-profile.md` だけで、kit は R2。だから A の「外す」こと自体はできるが、PR の数の決まりに当たる。既存の I1〜I3 に入れる手もあるが、どれも約 350〜400 行の見込みで、約 130 行を足すと上限を超えるおそれが高い（見込みの幅の中では確かめられない）。B は承認済みの記録と食い違わず、Owner の手は 1 周 5 回の予定（計測の専用の資格情報の決定が加わると 6 回で上限ちょうど）。Owner の手の数に関わるので Owner が決める）

（この会話の注、2026-10-23T04:39:26Z: 上の arc の勧めは、Q8 の前の版（A = kit が書く 3 つと試験を別の PR に移す、B = P1 を保護面の 2 本に分ける）に対して書かれた。その後、「P1 は今の kit では作れず手で組むので、kit が書く 3 つは P1 に入らない」と分かり、A・B を今の形に書き直した。arc が確かめた門の既定の保護面（`.github/workflows/**`・`.shirube/**`・CODEOWNERS）は、今の版でも使う。arc は、今の A・B に照らして勧めを書き直してください）

[Answer]: A（arc の設計。今の A・B に照らして書き直した。上の arc の勧め（B）は前の版の A・B に対する物で、今の版では取り下げる。承認済みの記録に照らした: Units Generation の Q7「U1 は保護面の 1 本と実装の PR 3 本まで」、Delivery Planning の Q10 の PR の順（P1 → R → I1 → A → I2 → I3）。A は P1 を手で組み、約 380 行・約 11 file のままで上限の中に収まり、PR の数・順・Owner の手（1 周 4 回の予定）を変えない。直すのは U1 の Functional Design の W4 の 1 行（P1 の中身から「kit が書く file」を外す）だけで、置き場の block は変えない。B は Delivery Planning の PR の順を変えるので、Delivery Planning から U1 の設計の段までを通し直すことになり、手戻りが大きい。kit が書く 3 つの file を入れる PR を Infrastructure Design で決める時は、それが U1 の PR の数（実装 3 本まで）に入るかも書く。arc の案: I3 の後に shirube に kit を当てる PR は、配布キットの版上げと同じく kit の file だけの差分になるので、kit の版上げの決まり（iyasaka-arc#49 6308341298 の 1）の形で扱い、U1 の実装の PR には数えない（Infrastructure Design で Owner が確かめる）。P1 を手で組む間、shirube の kit check は DRIFT を出す（記録だけ。門を止めない））

## Q9. [規模] kit の自己用の書く先を I1 へ移した後の、大きさの見積もりの直し（2026-10-23 の 4 回目の開き直し）

Delivery Planning の Q11（U1 の Infrastructure Design の Q5 = A で Owner が選んだ）で、PR の順が変わりました。
- 順: P1 → R → I1（作り手と kit の自己用の書く先）→ A → I2（記録の橋と門の判定）→ K（kit の版上げの PR）→ I3（計測）。
- K は Unit を指さない kit の版上げの PR で、U1 の PR の数に数えない。K で、kit が書く 3 つの file（sds-audit の skill 33 行・PR の雛形 60 行・`AGENTS.md` の block 11 行）と、kit で書いた呼出しと pin が入る。
- Delivery Planning は、`budget.mjs` の置き場と I1 が 400 行を超えないかを、この段で見積もり直すとした。

確かめた事実:
- `budget.mjs`（時間の上限と予算）を使うのは、GitHub に問い合わせる門・記録の橋・計測（NFR Design の Q1）。
- 作り手（承認の記録と段の順の記録）は作業場の audit を読むだけで、GitHub に問い合わせない。
- kit の自己用の書く先は `kit.mjs` の変更（target が shirube かを見て書き先を替える）と、その試験。

A. `budget.mjs` を I2（それを使う記録の橋と門と同じ PR）へ移す。
   - I1 は、作り手と kit の自己用の書く先にする。
   - 見積もりの表（`tech-stack-decisions.md` の「大きさの見積もり」）に、K の行を足す（Unit を指さない、kit の file だけ）。
   - I1・I2・I3 の行を見積もり直す。
   - 1 本が 400 行・20 file を超える見込みになった時は、Code Generation の計画で試験と実装の分け方を見直す（U1 の PR の数は変えない）。
B. `budget.mjs` は I1 のままにする（I1 = 作り手・`budget.mjs`・kit の自己用の書く先）。表に K の行を足し、I1〜I3 を見積もり直す
X. Other (please specify)

（arc の見積もり直し。幅つきの見込みで、実装の実測ではない。元はこの段の「大きさの見積もり」の表。部品ごとの見込み: `budget.mjs` = 本体約 20〜30 行（NFR Design の performance-design.md の値 3 つと残りの計算）＋試験約 40〜50 行、kit の自己用の書く先 = `kit.mjs` の変更約 15〜25 行＋試験約 35 行（今の `kit.mjs` 176 行・`tests/sds-kit.test.mjs` 159 行から）。`budget.mjs` を除いた作り手は約 270〜340 行、kit の自己用を除いた I3 は約 290〜350 行。`docs/` の Markdown は大きさに数えない（#49 6354019047 の 1）

| PR | A の時の中身 | 追加行（見込み） | own-code の増分 |
|----|------|------|------|
| I1 | 作り手・kit の自己用の書く先・その試験 | 約 320〜400 | 約 195〜255 |
| I2 | 記録の橋・門の判定・`budget.mjs`・その試験 | 約 410〜480 | 約 190〜260 |
| K | kit が書く 3 つの file（104 行）・呼出しと pin の書き換え | 約 110〜115、5 file | 約 0〜5 |
| I3 | 計測・`docs/sds/distribution.md`（数えない）・その試験 | 約 290〜350 | 約 135〜185 |

B の時は I1 が約 400〜460、I2 が約 350〜400。own-code の増分の合計は P1 の約 50 を足して約 570〜760 行で、前の見込み（約 550〜750）とほぼ同じ）

[Answer]: A（arc の設計。`budget.mjs` を使うのは門・記録の橋・計測で、作り手は使わない（NFR Design の Q1）。使う物と同じ PR に置けば、I1 に使われない code を置かず、試験も使う形で書ける。ただし上の見込みでは、A なら I2、B なら I1 が 400 行の上限に当たる。`budget.mjs` は I2 より前にあればよいので、Code Generation の計画で 2 本の見積もりを出し直し、小さい方に置く（この段の「1 本が 400 行を超える見込みの時は Code Generation の計画で見直す」のまま）。実装の 3 本の合計（約 1,020〜1,230 行）が上の端で 3 本の上限 1,200 行を超える時は、U1 の PR の数（Units Generation の Q7）を変えることになるので、その時に Owner に伺う）

## Consolidated Summary Confirmation

- 時間の上限と予算: 問い合わせ 1 回 20 秒（今の門と同じ値を 1 か所で持つ）。門の全体は 5 分、計測の全体は 10 分。使い切ったら「観測できず」（arc の設計） [Q1]
- 資格情報: 門は job の GITHUB_TOKEN を、commit status の書込みと contents・actions・pull-requests の読取りだけに絞る。計測は 3 repo を読むだけの専用の資格情報で動かす。作るのは token の発行で保護面なので、作る時に Owner の決定を取る。それまで U1 の確かめは、shirube の Actions の中（既存の ci.yml の job）で、読取りだけに絞った GITHUB_TOKEN で shirube 自身を測る。専用の資格情報の決定で Owner の手の予定は 6 回（上限ちょうど）になる見込みで、B1 の exact-head にまとめられれば 5 回のまま。**通し直しで改めた**: Owner の手は 1 周 4 回の予定になった（Delivery Planning の Q10）ので、資格情報の決定が別の 1 回になっても 5 回 [Q2、Delivery Planning の Q10]
- log が無い PR: 「観測できず」として数え、件数を出す。log の保持期間は今の設定のまま（arc の設計） [Q3]
- 失敗の見え方: 門の失敗は commit status の説明文と log、計測の「観測できず」は出力の repos と partial に出す。ほかの通知は足さない（arc の設計） [Q4]
- 読む PR の数: 件数の上限は決めず期間の中の全部を読み、読み切れない時は予算で止めてその repo を「観測できず」にする（arc の設計） [Q5]
- U1 の大きさの見積もり（監査の指摘 BF-04）: arc が見積もりの表を `tech-stack-decisions.md` の「大きさの見積もり」の節に置き、NFR6.1 の先送りの文を消す。見込みは幅つきで、実装の実測ではない。
  - P1 保護面の 1 本: 約 380 行・約 11 file、own-code の増分 約 50 行。手で組み、kit が書く 3 つの file は入れない。400 行・20 file を超える時は `tests/self-aidlc-settings.test.mjs` を I1 へ移す。
  - R 記録の PR・A 承認の記録の PR: Unit を指さず、記録の形の file は大きさの数えから外れる。
  - I1（作り手と `budget.mjs`）・I2（記録の橋と門の判定）・I3（計測・kit の自己用の書く先・`docs/sds/distribution.md`）: 各 約 350〜400 行・4〜6 file。own-code の増分は合わせて約 550〜750 行で、残り 362 行を超える。
  - 予算: S1 全体の own-code の見積もりを添え、P1 の `.shirube/hygiene-profile.md` の中で 1 回だけ改める（Delivery Planning の Q10）。P1 自身の増分は今の予算に収まるので、閾値を同じ PR で緩める決まりに当たらない。
  - 順: P1 → R → I1 → A → I2 → I3。
  - （arc の設計。予算と P1 の中身は Q8 で直した） [Q6、Q8]
- 前の段との食い違い: Units Generation を開き直し、Contract Design・Delivery Planning・U1 の Functional Design を順に通し直した（U1 の PR の数・記録の PR の順・予算の時点・置き場）。Owner の選択 [Q7]
- Q6 の直し: 予算は S1 全体で 1 回。P1 は今の kit では作れず手で組み、kit が書く 3 つの file は P1 に入れない。入れる PR は Infrastructure Design で決める（U1 の実装の PR に数えるかも書く）。U1 の Functional Design を開き直して、W4 と BR7.5 から P1 に入れると読める所を外した。Owner の選択（arc の下書き A） [Q8]
- kit を I1 へ移した後の見積もり（4 回目の開き直し、Delivery Planning の Q11 を受けて。Q6 の表の I1〜I3 を置き換える）:
  - I1 = 作り手・kit の自己用の書く先・その試験: 約 320〜400 行、own-code +約 195〜255。
  - I2 = 記録の橋・門の判定・`budget.mjs`・その試験: 約 410〜480 行、own-code +約 190〜260。
  - K = kit が書く 3 つの file・呼出しと pin の書き換え: 約 110〜115 行・5 file、own-code +約 0〜5。Unit を指さず、U1 の PR の数に数えない。
  - I3 = 計測・`docs/sds/distribution.md`（数えない）・その試験: 約 290〜350 行、own-code +約 135〜185。
  - own-code の増分の合計は P1 の約 50 を足して約 570〜760 行。予算は P1 で S1 全体の見積もりを添えて 1 回だけ改める（Q8 のまま）。
  - `budget.mjs` はそれを使う I2 に置くのを既定とし、Code Generation の計画で I1・I2 の見積もりを出し直して小さい方に置く（I2 より前ならどちらでもよい）。
  - **注意**: A の既定のままでは I2 が 1 本 400 行の上限に当たる見込み。実装の 3 本の合計（約 1,020〜1,230 行）が上の端で 1,200 行を超える時は、U1 の PR の数（Units Generation の Q7）を変えることになるので、その時に Owner に伺う。
  - （arc の設計） [Q9]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
