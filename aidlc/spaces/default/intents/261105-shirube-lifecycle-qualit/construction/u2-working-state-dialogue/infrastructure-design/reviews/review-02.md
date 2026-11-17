**Reviewer:** aidlc-architecture-reviewer-agent

### Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-17
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > Deployment（入口 / コードの置き場） と monitoring-design.md > Metrics（構造・重複・guard の検査 knip） | 置き場 Q1=A の根拠を「最初から検査に入る・変更が要らない」としているが、origin/main の `knip.jsonc` は production の entry を `scripts/hygiene/*.mjs!`・`scripts/sds/*.mjs!`・`scripts/unit-done/*.mjs!`・`scripts/coverage-gate/cli.mjs!` などの明示列挙にしており、`scripts/working-state/` は含まれない。hygiene の knip の step は `knip --production` で、production の entry は `!` 付きだけである。Q2=A で入口を作らない設計では、`scripts/working-state/` の全 file が「未使用 file」と判定されて hygiene が落ちるはずである（knip を実行して確かめたものではなく、設定と knip の production 規則からの読み）。設計は knip.jsonc の変更が要ることに触れず、「knip 違反 0」を合格条件にしている | knip.jsonc に `scripts/working-state/` の production entry（module の export の集約 file など）を足す必要があるかを明記する。足す場合は、工程の閾値を緩める変更ではなく entry の追加であることと、同じ PR に含めることを書く。足さずに通る根拠があるなら、その実物の根拠を書く。cicd-pipeline の関門 5 の前提にも反映する | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > 子 process の起動の条件 5 と Assumptions A-INF-2 | 子の cwd が未確定で、案が「起動する実行ファイルが在る dir」になっている。`aidlc` は PATH 上の dir（`~/.local/bin` など利用者が書ける場所も絶対 path なら許される）なので、その dir に置かれた隣の file・設定を子が拾いうる。条件に書いた「複数の利用者が書ける共有の場所でない」も、PATH から選ばれる dir では保証されない。security-design SC1a が Infrastructure Design で確定するとした事項のうち cwd だけが未決のまま、Open Questions は None になっている | cwd を、実行ファイルの dir に依存しない固定の中立な場所（例: 新規の空の一時 dir を U2 が作らずに済む形、またはファイルシステムの根など書込みの無い場所）にするか、PATH 上の dir を cwd にしない理由と安全の根拠を条件として書く。決められないなら Open Questions に載せて Owner の判断を仰ぐ（セキュリティの設計） | Resolved (reviewer) |
| R-03 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/monitoring-design.md > Metrics（秘密の検査）・Alerts（秘密の検出）・Assumptions、cicd-pipeline.md > stage と関門の対応 | 「CI の `secrets` job」という job は無い。origin/main の `ci.yml` の job は `test`・`hygiene`（`hygiene.yml` を呼ぶ）・`measure` で、gitleaks は `hygiene` の中の `id: secrets` の step である。「job 名は origin/main のとおり」という仮定が事実と合わない | `secrets` を `hygiene` job の step として書き直す。alert の条件も「`hygiene` job の secrets の step が success でない」にする | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > 子 process の起動の条件 2・3 | 条件 3 が「絞り込み後に 1 つも残らない」を「未導入（missing）」に含めている。対象の根が `$HOME` や `/usr/local` のように PATH の dir を包む場合、道具が入っていても全部捨てられて「未導入」と案内され、事実でない結論になる。また条件 2 は dir の symlink 解決だけを書き、見つけた実行ファイル自体の実体の確認と、解決した絶対 path で起動する（名前で再探索しない）ことを書いていない（試験の負例には symlink があるが条件に無い） | 「根の下にだけ見つかった／絞り込みで除外した」を missing と別の状態（観測不能に近い扱い）にするか、少なくとも除外件数を案内に出す。条件 2 に、実行ファイルの実体も根の外であることの確認と、解決した絶対 path での起動を足す | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > Deployment（行の網羅率の分母）・Infrastructure Services（LC7） | 分母を「`scripts/working-state/**/*.mjs` の全部」としているが、その一覧をディスクから列挙し、lcov に現れない file を 0% として数えるとは書いていない。Node の網羅率の report は、既定では試験が読み込んだ file だけを載せるので、誰にも import されない file が分母から黙って抜けうる（CI の既存 test job は `--test-coverage-include-all` を使うが Node 26 が必要で、hygiene は Node 22）。「分母 0 は失敗」だけでは部分集合を防げない | LC7 の条件に、分母はディスクの列挙で決め、lcov に無い file は未計測として失敗にすることと、その版に依存する挙動（include-all の有無）の扱いを書く | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/cicd-pipeline.md > stage と関門の対応・Assumptions | 既存の CI が U2 の file に当てる条件の一部が書かれていない。(1) `test` job の `scripts/**` への行の網羅率 80% の床（Node 26）と OWN-01 の own-code 予算の step（現状は約 5,000 行で上限 20,000 行に余裕）、(2) `tests/**` も `lines` の対象で新規 file 300 行の検査を受けるので、規則 42 件の正例・負例の試験は複数 file に分ける必要がある | 上の 2 点を関門の表に足す。試験を 300 行以内の複数の `tests/working-state-*.test.mjs` に分ける前提を書く | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/traceability.json > NFR6.1b | NFR6.1b を OK としているが、根拠にした「出力を読みながら打ち切る」は infrastructure-specification で SC-GAP-1 の直し待ちとされ、本書の条件として書かれているのは process group での停止だけである。OK が未設計の機構を覆っているように読める | 出力の枠の機構（上限で読み取りを止め、超えたら子を止めて budget_exceeded にする）を本書の条件として 1 行書くか、status を GAP にして SC-GAP-1 の直しに結ぶ | Resolved (reviewer) |
| R-08 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/cicd-pipeline.md > stage と関門の対応「新しい file 300 行」の行 | 検査の名前を「`lint:lines` 系」としているが、実物の `package.json` に `lint:lines` は無い。あるのは `hygiene:lines` で、CI では `hygiene` job の `id: lines` の step（File length vs baseline）が走る。関門の対応の事実が実物と食い違う。起きやすさ: 高（読めば必ず当たる）／困る大きさ: 軽（実装者が正しい名前を探し直すだけで、検査自体は走る）／攻める側に要る最小の権限: 無し（記述の誤り） | `hygiene:lines`（`hygiene` job の `lines` の step）に直す | New |
| R-09 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > knip の production の entry | 集約 file の条件が「module の export を集約する 1 file」としか書かれていない。knip の production では試験は entry に数えられず、試験のためだけに export した記号は集約 file が再 export しないと「未使用の export」と出て `hygiene` が落ちる（設定からの読みで未実行）。一方で全部を再 export すると export 単位の未使用の検出は弱まる。どちらを採るかが決まっていない。起きやすさ: 中（試験が内部の記号を直接 import すれば当たる）／困る大きさ: 軽（`hygiene` が見える形で落ち、PR 内で直せる。検査は弱めない側のまま）／攻める側に要る最小の権限: 無し（設計の書き漏れ） | 集約 file が再 export する範囲（試験が使う記号を全部含めるか、試験は集約 file 経由だけで import するか）と、export 単位の検出が弱まる点を許容するかを 1〜2 行で書く。足す前後の knip の実測（既に Code Generation の最初の手順にある）でこの点も確かめる | New |
| R-10 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/monitoring-design.md > Alerts「保護対象への変更」 | 「差分に workflow・`.shirube/**`・`package.json`・契約 `.v2` が入る → 止める」を、他の行と同じく「CI の検査が失敗する」仕組みとして並べている。実物の `.shirube/sds-pin.json` の `protected_paths` に入るのは workflow・`.shirube/**`・CODEOWNERS・`.claude/settings.json`・`.aidlc-version`・`aidlc.settings.json` で、`package.json` は入らない。cicd-pipeline の関門も `package.json` と lockfile の差分 0 を「差分の確認」としか書いていない。機械が止めるように読めるが、`package.json` の変更を自動で止める検査は実物に見当たらない（人と監査の確認）。起きやすさ: 低（実装が `package.json` を変えない前提）／困る大きさ: 中（変えても CI が通り、監査頼みになる）／攻める側に要る最小の権限: PR を出せる権限（作者本人の見落とし） | 行の「Condition」を、機械が止める物（`protected_paths` の path）と、独立監査と作者の確認が見る物（`package.json`・lockfile・契約 `.v2`）に分けて書く。機械の検査が無い物を CI が止めると読める書き方を避ける | New |
| R-11 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > 子 process の起動の条件 3(b)・5 と Open Questions | 「捨てた件数と種別を案内に出す」「cwd が使えない時は観測不能」の観測不能の原因の値が決まっていない。機能設計の `UnobservableCause` には `tool_cannot_start` などがあるが、件数を載せる欄が `ObservedItem` に無い。3(b) は「合う物が無ければ Code Generation の前に arc へ上げる」と条件付きで先送りしているのに、Open Questions は「未決の問いは無い」としている。fail closed なので成功には読み替わらない。起きやすさ: 高（Code Generation で必ず当たる）／困る大きさ: 軽（作業が止まり arc に上げる手順が書いてある。誤って未導入と案内する経路は無い）／攻める側に要る最小の権限: 無し | cwd が使えない時と 3(b) の原因に既存の `tool_cannot_start` を使うか、機能設計に足すかを今の段で 1 行決める。件数の運び先（`ObservedItem` に欄を足すか、案内の生成に渡す別の値か）も書く。決められなければ Open Questions に載せて、条件付きの先送りと食い違わないようにする | New |
| R-12 | Minor | aidlc/spaces/default/intents/261105-shirube-lifecycle-qualit/construction/u2-working-state-dialogue/infrastructure-design/infrastructure-specification.md > Sources、cicd-pipeline.md > Sources、monitoring-design.md > Sources | 出所の行が「Q1〜Q5」「Q3 = A、Q4 = A」のままで、Q6（arc が決定 95 により入力、Owner の言葉ではない）と Q7（Owner の原文、決定 111）が含まれていない。本文中には正しい区別が書かれているので、誤りではなく出所の一覧の更新漏れである。起きやすさ: 高／困る大きさ: 軽（承認の場で読み手が出所の一覧だけ見ると Q6・Q7 の由来を見落とす）／攻める側に要る最小の権限: 無し | 3 文書の Sources を Q1〜Q7 にし、Q6 は arc の入力・Q7 は Owner の原文と 1 回だけ書く | New |

> R-01 Reviewer note: 「knip の production の entry」の節を足し、Q6 = A（arc が決定 95 により入力、Owner の言葉ではないと明記）にした。実物の `knip.jsonc`（head 7fa98d1）は production の entry を `!` 付きの明示列挙にしており、`scripts/working-state/` は入っていない。`hygiene.yml` の knip の step は `knip --production --config knip.jsonc` で、書かれた事実と一致する。`knip.jsonc` は `protected_paths` に入らない。実行で確かめていない旨と、Code Generation の最初に前後を実測して PR 本文に書く手順も書いてある。集約 file の中身の条件だけ下の新規 2 に残す

> R-02 Reviewer note: Q7 = A は Owner の原文。決定 111 の本文 SHA-256 `3ecb0ea0…91e1` は GitHub の本文から再計算して一致した（決定 106 の `a66c97dc…42ad` も一致）。条件 5・A-INF-2・questions の Q7 は同じ文で、B・C を採らない理由も書いてある。cwd が使えない時は起動せず観測不能で、別の場所へ代えない。NFR 設計の security-design SC1a が置き場の設計に預けた項目を埋めている

> R-03 Reviewer note: `secrets` は `hygiene` job の中の `id: secrets` の step と書かれ、実物の `hygiene.yml` と一致する

> R-04 Reviewer note: 未導入と観測不能を分け、実行ファイルの実体も根の外を確かめ、解決した絶対 path で起動する条件になった。Owner の決定 106 の文を変えず読みを狭める側（A-INF-1、arc の確認で Owner の言葉ではない）と区別して書かれている。残る細部は新規 4

> R-05 Reviewer note: 分母はディスクの列挙で決め、lcov に無い file は未計測として失敗、0 件も失敗。`ci.yml` の `--test-coverage-include-all` が Node 26.7 以上を要するコメントとも整合する

> R-06 Reviewer note: `test` job の 80% の床（フラグまで実物と一致）・OWN-01（上限 20,000）・300 行（`lines` が `tests/**` を含む）が表に入った。名前の誤りだけ新規 1

> R-07 Reviewer note: 出力の打ち切りの機構が子の止め方の条件 (1)〜(3) に書かれ、NFR6.1b の OK と security-design SC1a の記述が一致する

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability.json の突き合わせ（infrastructure-design の upstream_ids 30 件と nfr-design の traceability.json の upstream_ids） | 完全一致。coverage の id も upstream_ids と過不足なし | 構造の欠落なし。N/A の NFR3.1・4.1・4.2・6.1c・7・9.1・9.2 は code の設計に属するという理由で妥当。NFR3.2・NFR10.1 の target には Q7・Q6 が反映済み |
| 実物の突き合わせ（`~/Developer/shirube` の `origin/main`、head 7fa98d1、`git show` の読み取りだけ） | `ci.yml` の job 名（`test`・`hygiene`・`measure`）、`test` の 80% の床のフラグ、OWN-01 の step、`hygiene.yml` の `knip` と `secrets` の step、`knip.jsonc` の entry・project、`package.json` の `test` の glob と `engines.node >=22`、`protected_paths` は記述と一致。`lint:lines` の名前と `package.json` を `protected_paths` として並べた点だけ不一致 | 新規 1・3 |
| Owner の決定の本文 SHA-256 の再計算（読み取りだけ。末尾の改行を外した本文） | 決定 111 = `3ecb0ea0934655ad1e904914a6ee379d18edcfef5785f6200567f7518a6891e1`、決定 106 = `a66c97dcee48505de936dbce9c7fc511f2354cd53ff553ad6e98fe0af32542ad`。どちらも記録と一致 | Q7・Q4 の原文の由来は確かめられた。Q1・Q2・Q3・Q5・Q6・要約確認の Looks correct が arc の入力で Owner の言葉でないことは、questions の各 [Answer] と本文で一貫して書かれている |
| knip・hygiene・npm test の実行 | 未実行（読むだけの範囲。fetch・checkout・書込みをしない） | knip の読みは設定からの推論で、設計もそう明記し Code Generation の最初に実測する手順を置いている |

### Summary

前回の R-01〜R-07 は文書に十分に反映されており、Owner の原文（決定 106・111）と arc の入力の区別も正しく書かれ、実物の CI の関門との対応も 1 件の名前の誤りを除き事実と一致する。残るのは Minor 5 件（検査名の誤り、knip の集約 file の範囲、`package.json` を機械が止めるように読める Alerts の行、観測不能の原因と件数の運び先、出所の一覧の更新漏れ）で、いずれも実装に入る前か Code Generation の最初に書き足せば足り、Critical・Major は無いので READY。

**判定: READY**
