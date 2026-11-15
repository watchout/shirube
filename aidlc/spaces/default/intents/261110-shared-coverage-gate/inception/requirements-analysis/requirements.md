# 共有の網羅率の門 — 要件

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。要件の元は https://github.com/watchout/shirube/issues/6#issuecomment-6759206975（本文 SHA-256 `c1952c809e8a2d0e09d68e2e1cf4e2040607408d4b8598cccc68eb1c3af991c0`）。非公開の土台は読み取り専用の参考で、写さない。今の U1 の作業は止めない。
- [scope] Workflow-selected scope: feature
- 承認済みの目的: [intent-statement.md](../../ideation/intent-capture/intent-statement.md)（指定9項目、初版の対象外、成功の見方）。
- 承認済みの範囲: [scope-document.md](../../ideation/scope-definition/scope-document.md)（Must S1〜S10、順序、外から決まった完了の条件）。S10 の根拠は Owner の決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6787499810 と https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6791240627。
- 承認済みの実現性と制約: [feasibility-assessment.md](../../ideation/feasibility/feasibility-assessment.md)（条件付きで実現できる）、[constraint-register.md](../../ideation/feasibility/constraint-register.md)（T1〜T10、O1〜O7、L1、P1〜P5）。
- 現状の観測（逆解析）: [business-overview.md](../../../../codekb/shirube/business-overview.md)、[architecture.md](../../../../codekb/shirube/architecture.md)、[code-structure.md](../../../../codekb/shirube/code-structure.md)。
- 確定済みの実践: [team-practices.md](../practices-discovery/team-practices.md)（行の網羅率の床は100%、結果を機械が読める形で記録、未計測・実行されていない・計測不能を成功に数えない、TDD、1単位1PR）。
- この段の回答: [requirements-analysis-questions.md](./requirements-analysis-questions.md)の [Q1]〜[Q7]。回答は arc が Owner の委任（iyasaka-arc#49 6762288830）の下で答えた。**Owner の言葉ではない。**

## 取り組みの分析

共有の網羅率の門は、試験で実行された行の割合を、リポジトリごとの作り込みなしに同じ基準で判定する仕組みである。[desc] Shirube に置き、各リポジトリが commit を固定して呼ぶ。[scope]

- 今あるもの: 公開 main の CI が `scripts` 配下を80%で測り、結果は CI の成否にだけ出る。この作業場の版には測定そのものが無い。試験の網羅率の値を機械が読める形で残す部品、分母の宣言、利用先への配布、門や監査への結び付けは無い。（code-structure、architecture、business-overview）
- 作るもの: 2つの試験の形に対応する測定、行の網羅率100%を既定とする判定、除外と例外の宣言、失敗する条件、記録だけから落とすへの段階導入、再利用 workflow としての呼び出し口、結果の出力（notice、job summary、JSON、出力値）。加えて別の単位として CI の実行を減らす直し（S10）。[scope]
- 名前の区別: hygiene の `coverage`（言語の被覆の検査）は別物。本書の「行の網羅率」は試験が実行した行の割合を指す。（architecture）
- 深さ: Standard。九つの指定項目と追加の一つがすべて Must で、完成は項目ごとの正例・負例で見るため、要件は項目ごとに分けて書く。

## 機能要件

各要件の末尾の [ ] は出どころ。S は範囲の項目、Q はこの段の回答。

### FR1 試験の形と測定

- **FR1.1** 門は「Node 組込みの試験（`node --test` と組込みの網羅率）」の形を測れる。[scope: S1] 
- **FR1.2** 門は「TypeScript の ESM と vitest（`vitest run`、tsc でビルド）」の形を測れる。[scope: S1]
- **FR1.3** 2つの形の測定は、既存の道具だけで行う。自前の計測の仕組み（instrument）を作らない。[scope: S2、制約 T3]
- **FR1.4** 試験が起動した子プロセスの行も数える。数えられない道具の組み合わせは、その形の測定に使わない。[scope: S2] 実際に数えられるかは実測で確かめる（実現性は条件付き）。
- **FR1.5** TypeScript の形で何を測るか（ビルド後の JS か、source map 越しの TS か）は設計の段で決め、決めた定義を出力に書く。定義を切り替えると値の意味が変わることを、手引きと出力に明記する。[scope: S3]
- **FR1.6** 測定の道具が新しい依存になる場合は、arc-sec の確認と Owner の決定を得るまで採用しない。得られなければ該当の形（特に TypeScript と vitest）は検証できず、Must が欠ける。その時は Owner に伺う。[scope: S2、制約 O1]

### FR2 分母と未計測の検出

- **FR2.1** 測る対象のソースの集合（分母）は、呼ぶ側が入力で宣言する。門の中に対象の文字列を直書きしない。[scope: S6、制約 T6] 
- **FR2.2** 分母にあるソースのうち、測定の記録が無いものがあれば、その名前を出して失敗とする（未計測）。[scope: S6]
- **FR2.3** 判定は、観測した行ごとの記録から再計算する。申告された値や道具が最後に出した割合の数字をそのまま信じない。分母の件数と記録の件数を突き合わせる。[scope: S6、practices、S5]

### FR3 閾値と例外

- **FR3.1** 既定の閾値は行100%である。[scope: S5、Q（practices Q1 の A）]
- **FR3.2** 呼ぶ側が閾値を下げるには、Owner の決定の URL を入力で名指しする。URL が無ければ、下げた値は受け付けない。[scope: S5]
- **FR3.3** 門が確かめるのは URL の形、下げる値、根拠がそろっていること（形の確かめ）までとする。決定の実在と本文の一致は、独立の監査が確かめる。門に GitHub を読む資格情報を持たせない。[Q5]
- **FR3.4** 出力には、名指された URL、主張された値、根拠、実際の閾値を必ず残す。監査が照らせる形にする。[Q5、scope: S5]
- **FR3.5** 閾値を100%より低く使った事実は、成功の表示に隠さず、出力の目立つ位置に書く。[scope: S5]

### FR4 失敗する条件

- **FR4.1** 次のどれかがあれば、判定は成功にならない: 未計測のソースがある（FR2.2）、必須の試験が流れていない（NOT_RUN）、計測できなかった（道具の失敗・時間切れ・測定記録が出ない）、行の割合が閾値に満たない。[scope: S6]
- **FR4.2** 計測できなかった場合を成功と数えない。結果は「一致・不一致・観測できず」の3値を持つ。[scope: S6、制約 T4、S5]
- **FR4.3** 「必須の試験」は、追跡されている試験 file のすべてとする。流さない試験 file は、理由つきの除外（FR5）で名指すしかない。新しい試験 file が黙って必須から外れる状態を作らない。[Q3]
- **FR4.4** 外部への問い合わせや測定の実行には、期限と総予算を宣言し、使い切ったら「観測できず」を返す。[制約 T4、S5]

### FR5 除外と DB の試験

- **FR5.1** DB を要する試験と、その対象のソースは、「DB の job で測る」か「理由つきで除外」のどちらかを選べる。[scope: S4]
- **FR5.2** 除外は、入力で file を1本ずつ名指しする形だけを許す。ディレクトリ名やワイルドカードは受け付けない。[Q4]
- **FR5.3** 除外した file と、その理由を出力に残す。除外の件数も出す。[scope: S4]
- **FR5.4** 呼ぶ側の上書きで除外を広げられない。除外の増減は、呼び出し側の入力の差分として見える。[scope: S4、Q4]
- **FR5.5** DB の job は、版または指紋を固定した PostgreSQL を使う。門は、DB の job からも呼べる。[scope: S4、S8]

### FR6 段階導入

- **FR6.1** 動作は「落とす」と「記録だけ」の2つ。入力1つで切り替えられる。[scope: S7]
- **FR6.2** 入力を何も指定しなければ「落とす」。「記録だけ」は明示した時だけ有効になる。書き忘れで門が効かないまま残る状態を避ける。[Q1、S8]
- **FR6.3** 「記録だけ」では、CI を落とさない。計測できなかった場合は、notice と job summary に「計測不能」と明記し、成功とは書かない。出力にも動作が「記録だけ」であることを残す。[Q2]
- **FR6.4** 「記録だけ」の間も、数値と各失敗の条件は記録する。数値が閾値に満たない、未計測、NOT_RUN も同じく書くが CI は落とさない。[assumption] （Assumptions に記す）

### FR7 呼び出し口と配布

- **FR7.1** 門は再利用 workflow（`workflow_call`）として Shirube に置く。各リポジトリは、自分の `ci.yml` から Shirube の commit（40桁）を固定して呼ぶ。[scope: S8、制約 T7]
- **FR7.2** DB の job からも同じ門を呼べる。[scope: S8]
- **FR7.3** 値（測った行の割合、閾値、動作、除外の件数）は、notice と job summary に出す。[scope: S8]
- **FR7.4** 先例は `.github/workflows/hygiene.yml`（commit を固定した再利用 workflow、入力で切り替える形）。同じ形に合わせる。（architecture）
- **FR7.5** 再利用 workflow の追加・変更は保護対象である。段の承認は実行の許可ではなく、対象の head への Owner の承認が別に要る。[scope、制約 O2]

### FR8 結果の出力

- **FR8.1** 決まった形の JSON の file を出し、CI の成果物として残す。[Q6]
- **FR8.2** 呼び出した workflow が受け取れる出力値（結果の区分、値、閾値、動作）も返す。[Q6]
- **FR8.3** JSON の内容は、観測した記録だけから作る。申告値を写さない。JSON の項目、版の識別、読む側（門・監査）との結び付けは設計の段で定める。[practices、S5、Q6]
- **FR8.4** 出力には、使った測定の定義（FR1.5）、除外（FR5.3）、閾値の例外（FR3.4）、動作（FR6.3）を含める。[scope: S3〜S7]
- **FR8.5** 利用先の門や監査が、この JSON を読んで根拠にできる形にする。実際に sds-gate や監査の入力に組み込むかは、本書の範囲では決めない（Open Questions）。[practices]

### FR9 非公開の土台の扱い

- **FR9.1** 非公開の土台は読み取り専用の参考とする。その識別子、コード、製品固有の名前を、この公開リポジトリに写さない。構造を一般化して、書き直す。[scope: S9、制約 P1]
- **FR9.2** 公開の試験データ・出力は架空の例だけにする。[制約 P2]

### FR10 CI の実行を減らす直し（別の単位。順序は最初）

- **FR10.1** kit の門の呼び出し（`kit/sds-gate-caller.yml`）の起動を、監査に関わるコメント（`sds-audit-request/1`、`sds-audit-review/1`、作者の受領）に絞る。[scope: S10(a)]
- **FR10.2** `pull_request_target` の `labeled` と `unlabeled` を外すかは、範囲では決めない。設計の段で `scripts/sds/gate.mjs` を読み、risk:R0〜R4 のラベルが判定に効くかを確かめ、負例の試験で確かめる。効くなら残す。その場合、Owner の決定の括弧書きは事実の誤りとして arc に伝え、arc が Owner に伝える。[scope: S10(a)]
- **FR10.3** Shirube 自身の `ci.yml` に、同じ PR の古い実行を取り消す concurrency を置く。既定のブランチへの push は取り消さない。[scope: S10(b)]
- **FR10.4** 必須の検査の名前・数・branch protection は変えない。試験の中身を減らさない。[scope、制約]
- **FR10.5** 変更は workflow であり保護対象である。PR は Owner の対象 head の承認を得てから統合する。[scope、制約 O2]

### FR11 検証と手引き

- **FR11.1** 九つの項目は、架空の利用例で、正例と負例をともに検証する。負例は、中身を変えた入力が不一致または観測できずになること、予算超過が観測できずになることを含む。[intent、S5]
- **FR11.2** 利用の手引きを書く。commit を固定した呼び出しの例、記録だけから落とすへの切り替え、除外と閾値の例外の書き方、TypeScript の測定の定義の切り替えの意味、を含める。[intent]
- **FR11.3** 実在のプロダクトへの導入件数は成功の数に入れない。[intent]

## 非機能要件

- **NFR1 動作環境**: GitHub Actions の Linux で動く。Node 22 で動くことを最低条件とする。それより新しい版を保証するかは、設計の段で道具を実測してから決める。[Q7、制約 T1・T2]
- **NFR2 決定性**: 判定の核は、現在時刻・乱数・識別子を自分で取得せず、呼ぶ側から入力として受ける。同じ入力で同じ出力になる（再実行でバイト一致）。[制約 T5、S4]
- **NFR3 規則は1か所**: 閾値の既定、理由コード、結果の区分の集合は1か所だけに置く。ほかはそこを参照する。[制約 T6、S3]
- **NFR4 失敗を隠さない**: 読めない・壊れている入力は失敗にする（fail closed）。`|| true`、必須 step の `--if-present`、`continue-on-error` を使わない。timeout・skip・cancel・不明を成功と数えない。「記録だけ」の表示は、成功と書かないことで区別する。[制約 T10、S8]
- **NFR5 最小の権限**: 門と測定の job は、必要最小の権限だけを受け取る。書ける資格情報を試験の実行に渡さない。[制約 T9、S9、Q5]
- **NFR6 依存**: `scripts/hygiene` に実行時の npm 依存を足さない。新しい依存（測定の道具など）は arc-sec の確認と Owner の決定を経る。[制約 O1・P3]
- **NFR7 試験の方法**: TDD、`node:test` と `assert`、行の網羅率100%。結果は観測した値で機械が読める形に記録する。[practices、制約 P3]
- **NFR8 新旧の同居**: 既存の呼び出し側を壊さない。追加は追加の順に行う。逆向きの手順を試験する。[S6]
- **NFR9 構造の予算**: 新しい file は300行以内、ESLint の関数は50行・複雑さ10を保つ。[practices、code-structure]
- **NFR10 評価の指標**: 成功の指標は自社で観測できるものだけにする。口コミの点数や他社の動きは使わない。[制約 P4]
- **NFR11 費用**: 新しい有料サービスや常設のクラウド資源を足さない。[制約 O6]

## 制約と前提

- 1単位1PR。作る席・独立監査（devauditor）・統合する席を分ける。R3・R4と保護対象は Owner の対象 head の承認を得る。（制約 O2・O3）
- 今の U1 の作業を止めない。この取り組みを U1 に混ぜない。（制約 O5）
- 公開の試験データと出力は架空だけ。（制約 P2）
- この取り組みは DB の構造を変えない前提で進める。変える必要が出たら DB の基準（第一版 0.10）に従い、設計記録だけの PR と設計監査を先に出す。（制約 O4）
- 配布先のリポジトリへの一括展開、会社の網羅率の標準の変更（既存の80%を含む）、自前の計測、U1 への統合、必須の検査の名前・数・保護の変更、リポジトリの公開・非公開の変更、予算の変更は範囲の外。（scope-document）

## 完了の条件（観測できるもの）

範囲の「完了の条件」をそのまま引く。九つの項目それぞれで正例と負例が通ること、負例が不一致または観測できずになること、呼び出しが40桁の commit 固定であること、公開に載る物が架空だけであること、S10 の起動の絞りと concurrency が負例も含めて確かめられること、必須の検査が弱まっていないこと。外から決まった条件は3つ（新しい依存の arc-sec と Owner、共有 workflow の追加・変更への Owner の承認、kit の版上げと利用先への導入は別の決定）。（scope-document）

## Assumptions & Open Questions

### Assumptions

- [assumption] 「記録だけ」では、行の割合が閾値に満たない場合、未計測、NOT_RUN も、計測不能と同じく CI を落とさず、出力に明記する。[Q2] は計測不能だけを答えたため、他の条件への拡張は私の推定である。設計の段と監査で確かめる。
- [assumption] この取り組みで作るのは、結果の記録（JSON と出力値）までである。sds-gate や監査の入力に組み込むのは、この取り組みの範囲に入っているか決まっていない（Open Questions の4）。
- [assumption] この取り組みは DB の構造を変えない。DB の job は、試験のために版を固定した PostgreSQL を起動するだけである。

### Open Questions

1. 子プロセスの行を、Node 組込みの網羅率が数えられるか、c8 などが要るか。実測して決める。設計の段。
2. 新しい依存の候補（c8、vitest、vitest の網羅率の補助、TypeScript の道具）は、arc-sec の確認と Owner の決定を得る。得られなければ TypeScript と vitest の形を検証できない。その時は Owner に伺う。
3. 再利用 workflow の追加・変更と S10 の変更は保護対象で、別に Owner の対象 head の承認が要る。
4. 記録の JSON を sds-gate や監査が読むところまでをこの取り組みに入れるか。本書は「読める形で出す」までを要件にした。範囲を広げる場合は Owner の判断が要る。arc に伝える。
5. TypeScript の測定の定義（ビルド後の JS か、source map 越しの TS か）。設計の段で決める。
6. Node 22 より新しい版を保証するか。設計の段で実測してから決める。
7. `labeled` と `unlabeled` のラベルが門の判定に効くか。設計の段で `scripts/sds/gate.mjs` を読んで確かめる。効けば Owner の決定の括弧書きを事実の誤りとして伝える。
8. DB の job の PostgreSQL の版または指紋の選び方。設計の段で決める。
9. JSON の項目、版の識別、出力値の名前。設計の段で決める。
10. 呼び出しが40桁の commit で固定されているかを、門の側から確かめられるか。確かめられない場合は、手引きと監査で扱う。設計の段で決める。
