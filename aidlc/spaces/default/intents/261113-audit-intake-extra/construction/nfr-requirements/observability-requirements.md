**Collaborator:** aidlc-architect-agent

# 観測の要件（audit-intake-extra）

> 単位 = この取り組みの全体 1 つ、components = 今の checker の受付の file。受付は常駐しない命令行の処理で、監視・警報・追跡（trace）・画面を持たない。この取り組みで「観測できる」ことの中心は 2 つ: (1) 拒否の理由を区別して読めること、(2) **行の網羅率の結果を、機械が読める形で、実測から記録すること**（社内標準 S5・S8。申告された値を証拠にしない）。

## 上流

- requirements: `aidlc/spaces/default/intents/261113-audit-intake-extra/inception/requirements-analysis/requirements.md`（NFR3・NFR1、FR2.11）。
- functional-design: `aidlc/spaces/default/intents/261113-audit-intake-extra/construction/functional-design/rules.md`（BR3.6）、`functional-spec.md` §7。

## 拒否の理由（区別して読める）

| ID | 要件 | 測り方 |
|---|---|---|
| NFR1.7 | 拒否の理由は固定の文で、どの条件で止まったかを区別できる。宣言を持たない対象の理由は基準の版と同じ。宣言を持つ対象の新しい理由は次の 8 つだけ: `Invalid extra_checkouts declaration`／`Too many extra_checkouts declarations`／`Duplicate extra_checkouts commit`／`extra_checkouts repo equals the PR repo`／`extra_checkouts requires a required check`／`Undeclared extra checkout commit`／`Declared extra checkout not in CI log`／`Declared extra checkout not found in declared repo`（`rules.md` の一覧が正本） | 負例ごとに、期待する理由の文と一致すること。理由の文の集合が `rules.md` の一覧と一致すること |
| NFR8.4 | 受付の出力に宣言の値を載せない（D7・BR3.3）。ログ・警報・追跡は足さない（理由: 常駐しない読み取りの処理で、出力は 1 行の JSON だけ。足せば秘密・宣言の値を載せる経路が増える） | 受理した出力のキーの集合が、宣言なしの出力と同じであること |

## 行の網羅率の記録（NFR3。観測した値から作る）

網羅率の記録は、**起動のたびの実測**から作る。人が書いた値・設計に書いた値を、記録として写さない。

| ID | 要件 | 測り方 |
|---|---|---|
| NFR3.1 | 行の網羅率の床は 100%。対象の集合は `scripts/hygiene/audit-admission.mjs` の 1 file。分母は Node の網羅率の報告がその file について数える行の全部（基準の版で 180 行の file に対し、報告された行の数）。計測から除く行は、既にある通らない 2 つの範囲だけ（R1・R2。問い Q1 の答え A） | 実測の記録が、対象の file の行と、通らない行の番号を持つこと |
| NFR3.2 | 除く範囲 R1・R2 は、行番号ではなく**内容**で名指す。R1 = 実際に `gh api` を呼ぶ関数 `function github(path) {` から、その関数を閉じる `}` までの 4 行（内容の SHA-256 `93804d44400ca198f8bda0061dda2ee0e5f0f7d6682edcd63e46bfc7e71a4ae7`）。R2 = 命令行の入口の 3 行（`if (process.argv[1] === fileURLToPath(import.meta.url)) {` の次の行から閉じる `}` まで。内容の SHA-256 `c9424673d1663dae3b883f57e814e4342fc09ea3d2e0ba7a48a3594f947abf08`）。値は公開 main `1dd43e457361d9650153578baa71120788285e98` の同 file から計算した。行は `\n` で結んだ文字列を SHA-256 にかけた値 | 試験が、実際の file から R1・R2 を内容で探し、SHA-256 が上と一致することを確かめること。一致しない（範囲が変わった・見つからない）なら、除外を認めず失敗にする |
| NFR3.3 | 通らない行が、R1・R2 の外に 1 行でもあれば失敗。R1・R2 の中が通っている（試験が増えた）場合は成功のまま（除外が不要になっても失敗にしない） | 実測で、通らない行の集合 ⊆ R1 ∪ R2 であること。この取り組みで足す行に、通らない行が 1 行でもあれば試験が失敗すること |
| NFR3.4 | 機械が読める形で観測する。Node の組込みの網羅率の報告（lcov の reporter）を試験の中で子の process として流し、その出力を読んで、(a) 対象の file の行ごとの実行回数、(b) 通らない行の番号と内容、(c) 子の process の終了コード、(d) 子の process の試験の失敗数、を取り出して判定する。値は子の process の実測から取り、設計・文書に書いた値を使わない | 試験が子の process の lcov の出力を解析して判定すること。解析した値を試験の失敗の文に載せること |
| NFR3.5 | 未計測・実行されていない・計測不能・対象が 0 件・子の process の終了コードが 0 でない・試験の失敗・Node がその報告の形を持たない、はすべて失敗。成功に数えない（S5・S8）。「対象の file が見つからない」「lcov に対象の file の行が 0 行」も失敗 | それぞれの負例（対象の file を指さない・lcov が空・子の process が失敗）の入力で、判定の関数が失敗を返すこと。判定の関数の入力は子の process の出力の文字列なので、実際の子の process を使わず文字列の fixture で負例を作れる |
| NFR3.6 | 記録は、実行した命令、Node の版、対象の file の SHA-256、行の総数と実行された行の数、通らない行の番号、範囲 R1・R2 の SHA-256 の照合の結果を持つ。build-and-test の記録に、同じ項目を実測の値で書き写す（書き写しではなく、実行の出力から作る） | build-and-test の記録が、実行した出力の抜粋と同じ値を持つこと。申告だけの値を書かないこと |
| NFR3.7 | 実測の命令（記録に書く）: `node --test --experimental-test-coverage --test-coverage-include='scripts/hygiene/audit-admission.mjs' tests/audit-admission.test.mjs tests/audit-counterexamples.test.mjs <この取り組みの新しい試験>`。依存を入れた環境（`npm ci` 済み）で流し、既存の試験の失敗が 0 であること。依存の無い環境では、`audit-counterexamples.test.mjs` の 3 件が失敗する（実測: 基準の版・Node 24・依存なし）ので、その実行は計測の成功に数えない | 命令の出力で、試験の失敗が 0 かつ通らない行が R1・R2 の内だけであること |
| NFR3.8 | 既存の CI の網羅率の床（`scripts/**` 全体で 80%）は、この取り組みで変更しない（workflow は守る物。NFR9.1）。この取り組みの 100% の床は、上の試験が CI の `test` の中で機械的に検査する（既存の `tests/*.test.mjs` に入る） | 新しい試験が `tests/*.test.mjs` の形で CI の対象になること。CI の `test` が通ること |

## 対象外（理由つき）

- 監視・警報・追跡・画面・SLI/SLO（受付は常駐しない。理由は冒頭）。
- 網羅率の履歴の保存と傾向の表示（この取り組みは 1 回の判定を見る）。
- 受付の出力の形に「受け入れた追加の checkout」を載せること（要件の対象外）。
