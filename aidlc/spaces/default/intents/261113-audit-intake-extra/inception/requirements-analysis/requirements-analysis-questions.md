# 要件分析の問い（audit-intake-extra）

> 依頼の目的は「監査の受付の checker に、依頼で宣言した追加の固定 checkout を受ける形を足す」ことで、すでに決まっている形（統合の版がちょうど 1 つ、残りは宣言と完全に一致して宣言の repo に実在する、宣言が無ければ今と同じ）は聞き直しません。ここには、要件の文にするために決める必要があり、記録に答えが無い 3 つだけを置きます。[Answer] は空けてあります。

## Q1. [依頼の形] 追加の checkout の宣言を、依頼のどの単位で書くか

背景: 監査の依頼 1 通は、複数の対象（PR・head・base・必須の検査・workflow を持つ 1 件ずつ）を持てます。checker の checkout の確かめは対象ごとに行われます。たとえば、MoteNashi の PR のように、1 つの job が「PR の統合の版」と「Common の固定 commit」の 2 つを checkout する依頼では、後者の repo と commit を依頼に書いて受付に伝えます。1 通に対象が 2 つあって、片方の job だけが追加の checkout を持つ場合、宣言をどこに書くかで、他方の対象に宣言が効くかどうかが変わります。

- A. 対象ごとに書く（その対象の job の記録にだけ効く。宣言の無い対象は今と同じ）
- B. 依頼全体で 1 回だけ書く（全部の対象に同じ宣言が効く）
- C. 両方書けるようにする（依頼全体の宣言を既定にし、対象ごとの宣言があればそれで置き換える）
- X. Other (please specify)

[Answer]: A. 対象ごと

## Q2. [受付の判定] 宣言する repo が、PR 自身の repo と同じでもよいか

背景: 利用先の CI が、自分の repo の別の版（たとえば main の先頭）をもう 1 つ checkout する形もありえます。宣言と commit が完全に一致し、その repo に実在すれば、機械の判定としては通せます。一方で、PR 自身の repo の任意の commit を「追加の checkout」として持ち込めることになります（統合の版がちょうど 1 つで、両親が依頼の base と head であることの確かめは、どちらの場合も変わりません）。

- A. 許す（宣言と完全に一致し、その repo に実在すれば通す）
- B. 許さない（追加の checkout として宣言できるのは、PR 自身の repo 以外だけ）
- X. Other (please specify)

[Answer]: B. 許さない

## Q3. [受付の判定] 宣言できる追加の checkout の件数に上限を置くか

背景: 宣言 1 件ごとに、その repo にその commit が実在するかを GitHub に 1 回問い合わせます（今の checker は 1 回の問い合わせに 20 秒、応答 8 MB の限りを持ちます）。件数に上限が無いと、1 通の依頼で問い合わせがいくらでも増え、受付が長引きます。今回の実例の追加の checkout は 1 件です。

- A. 上限を置かない（宣言した件数だけ問い合わせる）
- B. 上限を 4 件にして、超える依頼は拒否する
- C. 上限を 1 件にして、超える依頼は拒否する（今回の実例の形だけ）
- X. Other (please specify)

[Answer]: B. 上限を 4 件にして、超える依頼は拒否する

## Consolidated Summary Confirmation

- Q1 宣言の単位: 対象ごとに書く（その対象の job の記録にだけ効く。宣言の無い対象は今と同じ）
- Q2 宣言する repo: PR 自身の repo と同じものは許さない（追加の checkout として宣言できるのは PR 自身の repo 以外だけ）
- Q3 件数の上限: 1 つの対象で宣言できるのは 4 件まで。超える依頼は拒否する

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
