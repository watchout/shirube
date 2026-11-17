## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17T07:39:25Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > Deployment（入口 / コードの置き場） と monitoring-design.md > Metrics（構造・重複・guard の検査 knip） | 置き場 Q1=A の根拠を「最初から検査に入る・変更が要らない」としているが、origin/main の `knip.jsonc` は production の entry を `scripts/hygiene/*.mjs!`・`scripts/sds/*.mjs!`・`scripts/unit-done/*.mjs!`・`scripts/coverage-gate/cli.mjs!` などの明示列挙にしており、`scripts/working-state/` は含まれない。hygiene の knip の step は `knip --production` で、production の entry は `!` 付きだけである。Q2=A で入口を作らない設計では、`scripts/working-state/` の全 file が「未使用 file」と判定されて hygiene が落ちるはずである（knip を実行して確かめたものではなく、設定と knip の production 規則からの読み）。設計は knip.jsonc の変更が要ることに触れず、「knip 違反 0」を合格条件にしている | knip.jsonc に `scripts/working-state/` の production entry（module の export の集約 file など）を足す必要があるかを明記する。足す場合は、工程の閾値を緩める変更ではなく entry の追加であることと、同じ PR に含めることを書く。足さずに通る根拠があるなら、その実物の根拠を書く。cicd-pipeline の関門 5 の前提にも反映する | New |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > 子 process の起動の条件 5 と Assumptions A-INF-2 | 子の cwd が未確定で、案が「起動する実行ファイルが在る dir」になっている。`aidlc` は PATH 上の dir（`~/.local/bin` など利用者が書ける場所も絶対 path なら許される）なので、その dir に置かれた隣の file・設定を子が拾いうる。条件に書いた「複数の利用者が書ける共有の場所でない」も、PATH から選ばれる dir では保証されない。security-design SC1a が Infrastructure Design で確定するとした事項のうち cwd だけが未決のまま、Open Questions は None になっている | cwd を、実行ファイルの dir に依存しない固定の中立な場所（例: 新規の空の一時 dir を U2 が作らずに済む形、またはファイルシステムの根など書込みの無い場所）にするか、PATH 上の dir を cwd にしない理由と安全の根拠を条件として書く。決められないなら Open Questions に載せて Owner の判断を仰ぐ（セキュリティの設計） | New |
| R-03 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/monitoring-design.md > Metrics（秘密の検査）・Alerts（秘密の検出）・Assumptions、cicd-pipeline.md > stage と関門の対応 | 「CI の `secrets` job」という job は無い。origin/main の `ci.yml` の job は `test`・`hygiene`（`hygiene.yml` を呼ぶ）・`measure` で、gitleaks は `hygiene` の中の `id: secrets` の step である。「job 名は origin/main のとおり」という仮定が事実と合わない | `secrets` を `hygiene` job の step として書き直す。alert の条件も「`hygiene` job の secrets の step が success でない」にする | New |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > 子 process の起動の条件 2・3 | 条件 3 が「絞り込み後に 1 つも残らない」を「未導入（missing）」に含めている。対象の根が `$HOME` や `/usr/local` のように PATH の dir を包む場合、道具が入っていても全部捨てられて「未導入」と案内され、事実でない結論になる。また条件 2 は dir の symlink 解決だけを書き、見つけた実行ファイル自体の実体の確認と、解決した絶対 path で起動する（名前で再探索しない）ことを書いていない（試験の負例には symlink があるが条件に無い） | 「根の下にだけ見つかった／絞り込みで除外した」を missing と別の状態（観測不能に近い扱い）にするか、少なくとも除外件数を案内に出す。条件 2 に、実行ファイルの実体も根の外であることの確認と、解決した絶対 path での起動を足す | New |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > Deployment（行の網羅率の分母）・Infrastructure Services（LC7） | 分母を「`scripts/working-state/**/*.mjs` の全部」としているが、その一覧をディスクから列挙し、lcov に現れない file を 0% として数えるとは書いていない。Node の網羅率の report は、既定では試験が読み込んだ file だけを載せるので、誰にも import されない file が分母から黙って抜けうる（CI の既存 test job は `--test-coverage-include-all` を使うが Node 26 が必要で、hygiene は Node 22）。「分母 0 は失敗」だけでは部分集合を防げない | LC7 の条件に、分母はディスクの列挙で決め、lcov に無い file は未計測として失敗にすることと、その版に依存する挙動（include-all の有無）の扱いを書く | New |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/cicd-pipeline.md > stage と関門の対応・Assumptions | 既存の CI が U2 の file に当てる条件の一部が書かれていない。(1) `test` job の `scripts/**` への行の網羅率 80% の床（Node 26）と OWN-01 の own-code 予算の step（現状は約 5,000 行で上限 20,000 行に余裕）、(2) `tests/**` も `lines` の対象で新規 file 300 行の検査を受けるので、規則 42 件の正例・負例の試験は複数 file に分ける必要がある | 上の 2 点を関門の表に足す。試験を 300 行以内の複数の `tests/working-state-*.test.mjs` に分ける前提を書く | New |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/traceability.json > NFR6.1b | NFR6.1b を OK としているが、根拠にした「出力を読みながら打ち切る」は infrastructure-specification で SC-GAP-1 の直し待ちとされ、本書の条件として書かれているのは process group での停止だけである。OK が未設計の機構を覆っているように読める | 出力の枠の機構（上限で読み取りを止め、超えたら子を止めて budget_exceeded にする）を本書の条件として 1 行書くか、status を GAP にして SC-GAP-1 の直しに結ぶ | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability の upstream_ids の突き合わせ（infrastructure-design 30 件と nfr-design の traceability.json 30 件） | 一致（NFR1.1〜NFR10.2、順序も同じ）。OK の target は実在する節を指す。N/A は NFR3.1・4.1・4.2・6.1c・7・9.1・9.2 で、いずれも code の設計に属するという理由で妥当 | 構造の欠落なし。NFR6.1b だけ上の Minor |
| origin/main の実物（`git show` / `ls-tree`、読むだけ） | `package.json` の `npm test` は `tests/*.test.mjs tests/u2/*.test.mjs`、`lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage` は `scripts configs`、`.shirube/sds-pin.json` の protected_paths に `.shirube/**`・workflow、`tests/u2/` の存在はいずれも記述と一致。job 名・knip の entry は上の指摘のとおり不一致 | 保護対象（workflow・.shirube・package.json・契約 .v2）に触れない主張は設計全体で守られている。ただし knip.jsonc は保護対象ではないが変更が要りうる |
| knip・hygiene・npm test の実行 | 未実行（読むだけの範囲のため。fetch・checkout・書込みをしない） | 最初の Major は設定からの読みで、実行で確かめたものではない。Code Generation で最初に確認する |

### Summary

U2 は配備する物が無く、置き場・子 process の起動の条件・追跡表は上流の NFR 設計と整合し、DB の基準と S6・S7 の非該当の主張も妥当である。一方、Q2=A（入口なし）のままでは `knip --production` が新しい file を未使用と判定するはずなのに設計がそれに触れていないこと、子の cwd が未確定で案も弱いことが Major である。Major は 2 件で READY の範囲内だが、どちらも段の承認前か Code Generation の最初に決める必要がある。
