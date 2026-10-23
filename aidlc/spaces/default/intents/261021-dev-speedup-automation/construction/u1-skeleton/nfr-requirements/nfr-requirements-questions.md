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

## Consolidated Summary Confirmation

- 時間の上限と予算: 問い合わせ 1 回 20 秒（今の門と同じ値を 1 か所で持つ）。門の全体は 5 分、計測の全体は 10 分。使い切ったら「観測できず」（arc の設計） [Q1]
- 資格情報: 門は job の GITHUB_TOKEN を、commit status の書込みと contents・actions・pull-requests の読取りだけに絞る。計測は 3 repo を読むだけの専用の資格情報で動かす。作るのは token の発行で保護面なので、作る時に Owner の決定を取る。それまで U1 の確かめは、shirube の Actions の中（既存の ci.yml の job）で、読取りだけに絞った GITHUB_TOKEN で shirube 自身を測る。専用の資格情報の決定で Owner の手の予定は 6 回（上限ちょうど）になる見込みで、B1 の exact-head にまとめられれば 5 回のまま [Q2]
- log が無い PR: 「観測できず」として数え、件数を出す。log の保持期間は今の設定のまま（arc の設計） [Q3]
- 失敗の見え方: 門の失敗は commit status の説明文と log、計測の「観測できず」は出力の repos と partial に出す。ほかの通知は足さない（arc の設計） [Q4]
- 読む PR の数: 件数の上限は決めず期間の中の全部を読み、読み切れない時は予算で止めてその repo を「観測できず」にする（arc の設計） [Q5]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
