# U5 u5-exclusions — 技術の選び方と、守る形の要件

この単位は、新しい依存を足さず、U3・U4 と同じ Node 22 の組込みだけで、入力・分母の解決・出力に項目を足す。ここでは、使う技術とその理由、規則を 1 か所に置く要件、試験の方法、構造の予算を、NFR3・NFR6・NFR7・NFR9 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR3・NFR6・NFR7・NFR9。部品の判断: [decisions.md](../../../inception/domain-design/decisions.md)（ADR-001 = 意味の核は 1 か所）。機能の設計: [rules.md](../functional-design/rules.md)、[entities.md](../functional-design/entities.md)。
- 土台: U3 の [tech-stack-decisions.md](../../u3-node-gate-slice/nfr-requirements/tech-stack-decisions.md)、U4 の [tech-stack-decisions.md](../../u4-thresholds-and-modes/nfr-requirements/tech-stack-decisions.md)。この単位はその技術の選び方をそのまま使う。
- 現状の突き合わせ: 統合済みの `origin/main`（`7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e`、U3・U4 の実装を含む）の `scripts/coverage-gate/` を読み、行数を数えた（`input.mjs` 117、`resolve.mjs` 42、`judge.mjs` 158、`report.mjs` 177、`report-exception.mjs` 64、`cli.mjs` 114、`threshold.mjs` 84、`order.mjs` 14、`sanitize.mjs` 17）。作業場の木ではなく clone の実物。コード生成の段で、その時点の main と SHA-256 で突き合わせ直す。

## 技術の選び方

U3・U4 と同じ。新しい選択は無い。

| 領域 | 選ぶ物 | 理由 | 採らなかった代替 |
|---|---|---|---|
| 言語・実行 | JavaScript ESM（`.mjs`）、Node 22 の組込みだけ | 既存の製品規約と U3・U4 のまま（NFR6） | TypeScript（U6 の形） |
| 除外の入力の検査 | 純粋な関数（文字列と配列の検査）。理由の検査は U4 の根拠の検査と同じ 1 つの関数を呼ぶ | 規則を 1 か所に置く（NFR3.1）。時計・環境・file を読まない | 理由の規則の写し（S3 違反）、外部の検査部品（新しい依存） |
| 除外を引く処理 | 解決した分母の集合（符号点順の配列）に対する文字列の完全一致の照合と、集合の差。照合は `Set` | 完全一致だけで足り、正規化・展開・glob を持たない（NFR5.4）。時間は n log n を超えない（NFR1.2） | glob・正規表現での一致（意図しない file が外れる、後戻りの危険）、directory 名の展開（分母を門が決めることになる） |
| 分母を決める場所 | 分母の解決の 1 か所（判定の核は引いた後の集合しか見ない） | ADR-001、S3。除外を判定の核・出力の側で別々に引かない（NFR3.3） | 判定の核に除外の分岐を足す（unit-of-work の「CoverageJudge（除外の扱い）」の文面。設計の記録に採らなかった代替として書いた） |
| 数の扱い | U3・U4 のまま（割合は 100 倍した整数で比べる） | 浮動小数の丸めを避ける（S5） | 浮動小数の比較 |
| 試験 | `node:test` と `node:assert/strict` | 既存の方法（NFR7） | 外部の試験道具 |

## 要件

### NFR3 規則は 1 か所

- **NFR3.1** 除外の理由の規則（1 行、空白だけでない、制御文字なし、命令や表の区切りの並びなし、上限。rationaleMaxLength、rationaleForbidden）は、U4 の根拠の規則と同じ 1 つの関数と定数だけが持ち、除外の側に写さない。除外の理由の field の名前（`exclusions[<i>].reason`）は呼ぶ側が渡す。除外の項目の持てるキー（path、reason）、summary の一覧の上限（SUMMARY_LIST_LIMIT。U3 の定数を使う）、notice の固定の文の型は、それぞれ 1 か所だけが持つ。ほかの file はそこを参照し、literal で写さない。[NFR3、S3、BR9.3]
- **NFR3.2** U3・U4 の NFR3.2 の試験（規則の値が持ち主以外の file に literal で現れたら失敗にする）を、この単位が足す値（`Excluded files`、`Exclusions:`、除外の項目のキー名）にも広げる。判定: 持ち主以外の `scripts/coverage-gate/` の file にこれらが現れない。[NFR3、S3]
- **NFR3.3** 除外を引く処理は分母の解決の 1 か所だけが持つ。判定の核（judge）・出力の整形・入口は、引いた後の集合と文書の exclusions を受け取って使い、除外の path を自分で突き合わせず、分母の集合を別に作らない。判定の核は除外という語を持たない。判定: 判定の核の file に除外の語・除外の分岐が現れないこと、分母から file を引く code が解決の file にしか無いことを、file の中身を調べる試験で確かめる。[NFR3、ADR-001、BR10.6]

### NFR6 依存

- **NFR6.1** 実行時の npm の依存を足さない。この単位が足す code は、Node の組込みの module と、既存の `scripts/hygiene` の共通 lib だけに依存する。`package.json` の `dependencies` と `devDependencies` に新しい物を足さない。[NFR6]
- **NFR6.2** 新しい外部の action や service を足さない。この単位は workflow を変えない。[NFR6、NFR8.6（reliability-requirements.md）]

### NFR7 試験の方法

- **NFR7.1** TDD。各規則（BR9.1〜BR11.5）に対して、まず失敗する試験を書いて失敗を確かめてから実装する。試験は `node:test` と `assert`。正例と負例を用意する（キーの不足・未知・型違い、理由の各違反、同じ path の重複、分母に無い path・directory 名・wildcard・綴りの違い、全部除外、必須の試験が流れない、分母に残る file の未計測、除外 0 件の byte 一致、並びの入れ替え、環境変数を置いても変わらない、無害化、境界の件数 0・1・20・21）。[NFR7]
- **NFR7.2** 行の網羅率の床は 100%。対象は、この単位が足す・触る `scripts/coverage-gate/` の file すべて。確認コマンドは U3 の `verification-command.txt` のまま。観測した値を機械が読める形で記録し、未計測・流れていない・計測不能を成功に数えない。通すために弱めない。[NFR7、S5]
- **NFR7.3** 構造の試験を置く: 除外を決める code（入力の検査、除外を引く処理、出力の組み立て）に環境変数の読みが 0 件（NFR5.2）、ネットワークの module と file の読み書きが無い（NFR2.1、NFR5.1）、判定の核に除外の語が無い（NFR3.3）。[NFR7]
- **NFR7.4** 既存の試験のうち `exclusions` を未知のキー・不正な型として扱う物は、この単位が意図して置き換える（reliability-requirements.md の NFR8.4）。置き換えは弱めない。[NFR7]
- **NFR7.5** 公開 repo の fixture・ログ・出力は架空のデータだけ。除外の path と理由は実在しない架空の名前で作り、実在の決定や file を指さない。gitleaks に拾われる形（`token: "12 文字の英数字"`）を試験に書かない。[NFR7]

### NFR9 構造の予算

- **NFR9.1** 新しい file は 300 行以内。ESLint の関数は 50 行・複雑さ 10 を保つ。足す先の現状は `input.mjs` 117 行、`resolve.mjs` 42 行、`report.mjs` 177 行、`cli.mjs` 114 行で、いずれも足して 300 行以内に収まる見込み（コード生成の段で数え直す）。除外の検査と除外を引く処理が 1 つの file で 100 行を超えそうなら、新しい file `exclusions.mjs`（設計の記録が提案した置き場）に分ける。分け方は持ち主の分担（BR9 = 入力、BR10 = 分母への適用、BR11 = 出力）を崩さない。[NFR9]
- **NFR9.2** 構造の検査（依存方向、循環、重複、knip、jscpd）を弱めない。試験専用の export には U3・U4 と同じ印を付ける。[NFR9]
- **NFR9.3** 除外の検査は条件分岐が多くなりやすいので、関数の複雑さ 10 に収まるよう、項目ごとの検査（形・必須・理由・重複・分母との一致）を小さな関数に分け、最初の失敗を返す形（早期に返す）にする。[NFR9]

## 気づいたこと

- U4 の統合後の `main` が土台。コード生成の最初の仕事は、その時点の main の実物との突き合わせになる。

## Assumptions & Open Questions

### Assumptions

- [assumption] 行数は `7fa98d1c713e5757387d0ecbaa9e4c1ebca9896e` の値。その後に変わる場合は、コード生成の段で数え直す。
- [assumption] 除外を引く処理を `resolve.mjs` に足すか新しい file にするかは実装の段で、NFR9.1 の 300 行・複雑さ 10 を満たす方を選ぶ。

### Open Questions

なし。
