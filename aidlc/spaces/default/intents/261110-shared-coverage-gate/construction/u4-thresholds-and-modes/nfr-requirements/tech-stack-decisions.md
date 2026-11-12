# U4 u4-thresholds-and-modes — 技術の選び方と、守る形の要件

この単位は、新しい依存を足さず、U3 と同じ Node 22 の組込みだけで、入力・判定・出力・入口に項目を足す。ここでは、使う技術とその理由、規則を 1 か所に置く要件、試験の方法、構造の予算を、NFR3・NFR6・NFR7・NFR9 の枝番で書く。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 要件: [requirements.md](../../../inception/requirements-analysis/requirements.md) の NFR3・NFR6・NFR7・NFR9。部品の判断: [decisions.md](../../../inception/domain-design/decisions.md)（ADR-001〜006）。機能の設計: [rules.md](../functional-design/rules.md)、[entities.md](../functional-design/entities.md)（GateConstants）。
- 土台: U3 の [tech-stack-decisions.md](../../u3-node-gate-slice/nfr-requirements/tech-stack-decisions.md)（NFR3.1〜NFR3.3、NFR6.1〜NFR6.3 と基準の観測）。この単位はその技術の選び方をそのまま使う。
- 現状の突き合わせ: U3 の実装（PR #104 の head `48024643e63c70fa5df62714a129972457181406`）の `scripts/coverage-gate/` の 13 file を読み、行数（`cli.mjs` 106、`input.mjs` 94、`judge.mjs` 138、`report.mjs` 168、ほかは 14〜116 行）と構造を確かめた。この単位のコード生成は U3 の統合後の `main` を土台にし、その時点で実物と突き合わせ直す。

## 技術の選び方

U3 と同じ。新しい選択は無い。

| 領域 | 選ぶ物 | 理由 | 採らなかった代替 |
|---|---|---|---|
| 言語・実行 | JavaScript ESM（`.mjs`）、Node 22 の組込みだけ | 既存の製品規約と U3 のまま（NFR6） | TypeScript（U6 の形） |
| 例外の入力の検査 | 純粋な関数（文字列の検査）。正規表現を使う場合は後戻りの無い単純な形。または部品ごとの確かめ | 検査の時間を長さに線形にする（NFR1.3）。時計・環境・file を読まない | URL の実在確認（資格情報とネットワークが要る。NFR5.1 に反する）、外部の URL 解析の部品（新しい依存） |
| 数の扱い | 割合は 100 倍した整数で持ち、比較は整数どうしで行う（U3 の BR3.6 と同じ） | 浮動小数の丸めを避ける（S5）。小数第 2 位までの値を厳密に比べる | 浮動小数の比較 |
| 試験 | `node:test` と `node:assert/strict` | 既存の方法（NFR7） | 外部の試験道具 |

## 要件

### NFR3 規則は 1 か所

- **NFR3.1** 動作の集合と既定（modes、defaultMode）と閾値の既定（行 100%）は、判定の核の定数の 1 か所だけが持つ。例外の根拠の上限と URL の上限と形（rationaleMaxLength、decisionUrlMaxLength、decisionUrlShape）は入力の検査が、動作・例外の表示の文型は整形が、それぞれ 1 か所だけ持つ。ほかの file はそこを参照し、値を literal で写さない。例外の値の上限（100 未満）は、既定の閾値の定数から導き、100 という数字を 2 か所に書かない。[NFR3、S3、GateConstants]
- **NFR3.2** U3 の NFR3.2 の試験（規則の値が持ち主以外の file に literal で現れたら失敗にする）を、この単位が足す値（`enforce`、`record-only`、`300`、URL の形）にも広げる。判定: 持ち主以外の `scripts/coverage-gate/` の file にこれらが現れない。[NFR3、S3]
- **NFR3.3** 動作に応じた分岐は判定の核だけが持つ（ADR-004）。入口・整形・workflow は shouldFail を写すだけで、mode による分岐を持たない。整形が mode を見るのは表示の文面を変えるためだけで、落とすかどうかを決めない。判定: shouldFail を書き換える code が判定の核以外に無いことを、file の中身を調べる試験で確かめる。[NFR3、ADR-004]

### NFR6 依存

- **NFR6.1** 実行時の npm の依存を足さない。この単位が足す code は、Node の組込みの module と、既存の `scripts/hygiene` の共通 lib だけに依存する。`package.json` の `dependencies` と `devDependencies` に新しい物を足さない。[NFR6]
- **NFR6.2** 新しい外部の action や service を足さない。この単位は workflow を変えない。[NFR6、NFR8.5]

### NFR7 試験の方法

- **NFR7.1** TDD。各規則（BR6.1〜BR8.6）に対して、まず失敗する試験を書いて失敗を確かめてから実装する。試験は `node:test` と `assert`。正例と負例を用意する（URL の形の各違反、値の境界、動作の値の各違反、record-only での各区分、例外の有無と区分の組み合わせ、後ろ向きの互換、決定性、無害化）。[NFR7]
- **NFR7.2** 行の網羅率の床は 100%。対象は、この単位が足す・触る `scripts/coverage-gate/` の file すべて。確認コマンドは U3 の `verification-command.txt` のまま（対象の file が 0 件でも通る欠点は U3 の設計で扱い済み）。観測した値を機械が読める形で記録し、未計測・流れていない・計測不能を成功に数えない。通すために弱めない。[NFR7、S5]
- **NFR7.3** U3 の試験のうち、threshold と mode を未知のキーとして失敗にする試験は、この単位が意図して置き換える（reliability-requirements.md の NFR8.4）。置き換えは弱めない。[NFR7]
- **NFR7.4** 公開 repo の fixture・ログ・出力は架空のデータだけ。決定の URL は実在しない架空の owner・repo・番号で作り、実在の決定を指さない。gitleaks に拾われる形（`token: "12 文字の英数字"`）を試験に書かない。[NFR7]

### NFR9 構造の予算

- **NFR9.1** 新しい file は 300 行以内。ESLint の関数は 50 行・複雑さ 10 を保つ。U3 の `input.mjs`（94 行）・`judge.mjs`（138 行）・`report.mjs`（168 行）に足して 300 行を超えそうなら、例外の検査や例外の表示の文型を別の file に分ける。分け方は実装の段で、持ち主の分担（BR6 = 入力、BR7 = 判定、BR8 = 出力）を崩さない。[NFR9]
- **NFR9.2** 構造の検査（依存方向、循環、重複、knip、jscpd）を弱めない。試験専用の export には U3 と同じ印を付ける。[NFR9]
- **NFR9.3** 例外の検査は条件分岐が多くなりやすいので、関数の複雑さ 10 に収まるよう、項目ごとの検査を小さな関数に分け、最初の失敗を返す形（早期に返す）にする。[NFR9]

## 気づいたこと

- U3 の統合後の `main` が土台になるので、この単位のコード生成の最初の仕事は、U3 の実物との突き合わせになる。

## Assumptions & Open Questions

### Assumptions

- [assumption] 行数は U3 の PR の head で数えた値。U3 が統合されるまでに変わる場合は、コード生成の段で数え直す。

### Open Questions

なし。
