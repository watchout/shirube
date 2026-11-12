# U2 u2-gate-trigger-narrowing 実装の要約

実装は clone の worktree（PR #103 の branch `adf-lead/u2-gate-trigger-narrowing-20261112`）で行った。作業場の木は古く、Owner の作業場では git を実行しないため、実装の実物と commit は PR の branch にある。追跡表の検査が作業場の木の中の file を探すため、試験 file だけを PR の branch の実物と同じ内容（SHA-256 `f034ae4b43bd22d9d0ec94d683f7ebe2cb403ffe485ef87f608a822e96f9f51b`）で作業場の木にも置いた（git は使っていない。未追跡の file。作業場の木が main に合わせて更新される時に、取り除くか、統合済みの同じ内容で置き換わる）。作業場の木の `kit/sds-gate-caller.yml` と `docs/sds/distribution.md` は古いまま（変更前の内容）で、単位の変更の証拠は PR の branch 側の実行にある。

## 作った・変えた file

- `kit/sds-gate-caller.yml`（変更、24 行 → 31 行。追加 8 行・削除 1 行）: 冒頭の注記 2 行（skip された job は commit status `sds-gate` を変えない／job が動く条件）と、job `sds-gate` の `if:` の置き換え。`if:` は `github.event_name == 'pull_request_target'` の節を残し、PR のコメントでは `github.event.action != 'created'`（編集・削除は本文を見ずに流す）、`!github.event.comment.body`（本文が空・欠落・null の作成は流す。SD11）、本文が `sds-audit-request/1`・`sds-audit-review/1`・`shirube-v3:control-handoff` のどれかを含む作成、のいずれかで真になる。`on:`・権限・`uses:`・`with:` は変えていない。変更後の SHA-256 `ed2eda45d63fe2db013943b3c4499e9abcc8752ee8bebfbece933eb0f49e2d33`。
- `tests/sds-gate-caller-trigger.test.mjs`（新規、135 行、8 件）: T1〜T8（正例 1、前提 1、負例 5、逆向き・同居 1）。caller を文字列として読み、`if:` を試験 file の中の小さな評価器（`contains`・`==`・`!=`・`!`・`&&`・`||`・括弧だけを解釈し、足りない構文は例外）で読む。印の集合は `audit-admission.mjs` と `plan-binding.mjs` の実物から取り出して比べ、試験に書き写していない（S3）。
- `docs/sds/distribution.md`（変更、107 行目の説明だけ。追加 1 行・削除 1 行の置き換え）: `issue_comment` の動きを caller の変更に合わせて直した（SD10。arc の答えで境界を 1 file 広げた。Owner の言葉ではない）。

## 主な実装の判断

- 絞りは job の `if:` の 1 か所だけ。規則の値（印の集合、空の扱い）を 2 か所に置かない。評価器の値の扱い（欠落と null は空文字、`!` は空文字・null・欠落を真）は評価器の中の 1 か所。
- 空白だけの本文は空でないので、印が無ければ流れない（T5）。空の本文を流す節を除いた式で偽になることを、同じ試験の中の反例として確かめている。
- 逆向き（T8）: 絞りの節を取り除いた式は元の条件（`pull_request_target` または PR のコメント）になり、印の無い会話の作成が真になる。

## 試験の観測（Red → Green）

- 基準: 作業木の `kit/sds-gate-caller.yml` の SHA-256 は `e6eaa2eb0745f63a64e11b7497bc772a0e842c93deaca34a06765a4bd7a6ff5f`（base `0f9ea89175ece32604e0dcfde9db28462f0d2f35` と一致）。再利用 workflow `ac38c62e…`、`gate.mjs` `b4f529ae…`、`audit-admission.mjs` `0fdf596f…`、`plan-binding.mjs` `4c81731a…` も設計・計画に書いた値と一致した（`origin/main` は進んでいなかった）。変更前の `node --test tests/sds-gate.test.mjs`（作業木で）は 68 件すべて合格（実行 68・合格 68・失敗 0）。
- Red（試験だけの commit `089e0c0`）: 変更前の caller に対して 8 件中 4 件が失敗（T1: 印が `if:` に無い、T4: 印の無い作成が真、T5: 空白だけの作成が真、T8: 絞りの節が無い）。T2・T3・T6・T7 は変更前から通る（前提と上限、編集・削除が真、失敗を隠す記述が無いこと、読めない式が例外になること）。計画は失敗を T1・T4・T7 の一部と見込んでいたが、実測は T1・T4・T5・T8 だった（T7 は読み手の入力の試験で、変更前の caller を読んでも通る）。見込みを実測に合わせて記録した。
- Green（caller と文書の変更）: 8 件すべて合格（実行 8・合格 8・失敗 0）。T5 の反例（空の本文を流す節を除いた式では偽）は、この実行の中で通った。あわせて `node --test` の全体（`npm test`、`node_modules` を clone から一時的に結んだ作業木で）761 件すべて合格（実行 761・合格 761・失敗 0）。結んでいない作業木では ESLint と jscpd を使う 7 件が失敗した（開発用の道具が入っていないため。道具が入った clone で同じ試験は 9 件すべて合格）。一時の結びは試験の後に取り除き、commit に入れていない。
- 戻し方の観測（1 回、恒久の試験にしない）: 足した注記 2 行を取り除き、`if:` を元の 1 行に戻した結果の SHA-256 は `e6eaa2eb…a6ff5f` で base と一致した。
- 構文の検査: `actionlint` 1.7.12 が変更後の caller に出した指摘は 0 件（構文と型の受理の確認で、評価ではない）。
- 行の網羅率: この単位は `scripts/` に code を足さない。確認コマンドの対象（`scripts/coverage-gate/**`）は 0 件で、空のまま 100% と出て通るため、U2 の合否の根拠にしない。保証するのは、既存の試験とこの単位の試験が通ることだけ。
- 変更の大きさ: code の変更した行は、caller 8 行足し・1 行削除、試験 135 行（新規）、文書 1 行の置き換え。軽い道（100 行以下）の対象ではなく、設計の監査を通した今の道で進めた。

## 実行していない・観測していないもの

- `if:` の GitHub 上の評価（空文字・null・欠落の `!` の扱い、`contains` の大文字小文字、どのコメントで流れるか）は観測できなかった。kit の caller は利用先に写されるひな形で、この PR の Actions では動かない（Shirube 自身の門は `.github/workflows/sds-gate-self.yml`）。評価器は式の写しで、GitHub の評価そのものではない。導入の決定（範囲外）に、導入後の最初の PR で観測する条件として渡す。
- skip された job が commit status `sds-gate` を書き換えないこと、skip が job の check run で成功に見えることの影響、流れる回数が減ることは、観測できなかった。減るという主張は、利用先の Actions の一覧で数えるまで書かない。
- この head の CI・実装の独立監査・作者の受領・Owner の対象 head への公開決定・作者以外の suite-lead による統合は、未実施（別条件で揃える）。
- 見直し役は、この作業場の区分が `none`（Owner 決定 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6811761125）のため呼んでいない。見直し済みとは書かない。サブエージェントも呼んでいない。

## 計画からの差異

- Red の失敗の見込み（T1・T4・T7 の一部）と実測（T1・T4・T5・T8）が違った。試験の手順の記録の節を直さず、ここに実測を書いた。
- Step 5（整理）では、評価器と取り出し関数が重複しておらず、印の集合・禁止する記述も各 1 か所なので、変更は無かった。試験 file は 135 行で 300 行以内。
- 一時の `node_modules` の結びは、ESLint と jscpd の試験を作業木で流すためだけの局所の手当てで、commit には入れていない。
- それ以外の差異は無い。
