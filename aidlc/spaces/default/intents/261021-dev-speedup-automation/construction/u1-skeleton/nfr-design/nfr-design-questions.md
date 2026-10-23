# NFR Design（U1 u1-skeleton）— 質問

U1 の NFR の決まり（`construction/u1-skeleton/nfr-requirements/`）を、どういう作りで満たすかを決めます。コードの書き方は Code Generation で決めます。前提は次の 3 つです。
- U1 の設計（`construction/u1-skeleton/functional-design/`）
- 受け渡しの形（`inception/contract-design/contract-summary.md`）
- 部品の一覧（`inception/domain-design/components.md`）

この段の設計は、決まり（iyasaka-arc#49 6329978835）のとおり arc が問いに下書きし、この会話で Owner が確認・承認します。

答え方: 各問いの `[Answer]:` の後ろに、選んだ記号を書いてください（例: `A`）。自分の言葉で答える時は `X:` に続けて書いてください。終わったら chat で「done」と送ってください。

---

## Q1. [設計] 時間の上限と予算の置き場

問い合わせ 1 回 20 秒・門の全体 5 分・計測の全体 10 分（NFR3.1〜NFR3.3）を、どこで持つかを決めます。

A. 時間の上限と予算の数え方を 1 つの部品に置き、門・記録の橋・計測がそれを使う。値は 1 か所に書き、時計を読むのは外側（CLI の入口）だけにする。核の関数は、開始の時刻と今の時刻を引数で受ける
B. 部品ごとに、自分の上限と予算を持つ
X. Other (please specify)

[Answer]: A（arc の設計。上限の値を 2 か所で別々に持たない = Shirube 開発規格 S3、NFR の段の Q1 の答え。核の関数は自分で時計を読まず、時刻は外側から渡す = S4・要件 NFR2。同じ入力から同じ結果が出るので、予算切れの場合も試験で確かめられる）

## Q2. [設計] 門の log から 1 行の JSON を見つける方法

計測は、門の workflow の log から `sds-gate-result/1` の 1 行の JSON を読みます（受け渡しの形 C3）。log には、ほかの行も混じります。

A. log の中で、`sds-gate-result/1` の schema を持つ 1 行の JSON を探す。0 行か 2 行以上なら、その PR は「観測できず」
B. log の最後の行を読む
X. Other (please specify)

[Answer]: A（arc の設計。最後の行は、workflow の後片付けの行などで変わりうる。形の名前（schema）で探し、1 行に決まらない時は「観測できず」にすれば、読み違いを PASS・FAIL に数えない = Shirube 開発規格 S5・要件 NFR1）

## Q3. [設計] repo の間の失敗の広がり

A. 計測は repo ごとに読取りと予算の残りを分けて扱い、1 つの repo の失敗が、ほかの repo の数えに広がらないようにする。全体の予算を使い切った時は、読み終えていない repo を全部「観測できず」にする
B. 1 つの repo が失敗したら、計測全体を「観測できず」で止める
X. Other (please specify)

[Answer]: A（arc の設計。一部の repo が読めない時は、読めた repo の値と「観測できず」を並べ、合計は「一部」と示すと要件で決めてある = 要件 NFR11・FR1 の受入の条件。B は 1 つの失敗で読めた値まで捨てる）

## Q4. [安全] Actions の job ごとの権限

NFR10.1・NFR10.3 で、門は commit status の書込みと読取りだけ、U1 の確かめの計測は読取りだけと決めました。workflow での持ち方を決めます。

A. workflow の一番上の permissions は全部なしにする。job ごとに要る物だけを足す。
   - 門の呼出しの job: statuses の書込みと、contents・actions・pull-requests の読取り
   - `ci.yml` の計測の job: contents・actions・pull-requests・statuses の読取りだけ
B. workflow の一番上に、全部の job に共通の権限を置く
X. Other (please specify)

[Answer]: A（arc の設計。読むだけの経路には読むだけの資格情報、書ける資格情報は配る先を絞る = Shirube 開発規格 S9。資格情報の分け方は Owner が arc の案で決めた = NFR の段の Q2。一番上に共通の権限を置くと、計測の job にも status の書込みが付いてしまう。workflow の変更は保護面で、U1 の保護面の exact-head にまとめる = 作る順番の段の Q8）

## Consolidated Summary Confirmation

- 時間の上限と予算: 1 つの共通の部品に置き、門・記録の橋・計測が使う。値は 1 か所、時計を読むのは CLI の入口だけで、核の関数は開始の時刻と今の時刻を引数で受ける（arc の設計） [Q1]
- 共通の部品の置き場: `scripts/sds/budget.mjs` を新しく置く。U1 の変えてよい置き場（`functional-design/functional-spec.md` の `sds-design-locations` の block）にこの path を足す（同じ Unit の設計の記録を、この段の中で直す） [Q1 から]
- log の 1 行の JSON: `sds-gate-result/1` の schema を持つ行を探し、0 行か 2 行以上なら「観測できず」（arc の設計） [Q2]
- repo の間の失敗: repo ごとに読取りと予算の残りを分け、1 つの失敗をほかに広げない。全体の予算を使い切ったら、読み終えていない repo を全部「観測できず」（arc の設計） [Q3]
- Actions の権限: workflow の一番上は権限なし。job ごとに、門の呼出しは statuses の書込みと読取り、`ci.yml` の計測の job は読取りだけ（arc の設計） [Q4]

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
