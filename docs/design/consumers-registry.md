<!-- Shirube consumers registry (docs/sds/consumers.json): the design record. Source of truth = distribution.md section 5 and work order CH-SHIRUBE-CONSUMERS-20261021; written after PR #60 (head 82483fda), for the design audit (audit-method section 3 D1-D6, Owner decision T154). -->
# 配布先一覧 `docs/sds/consumers.json` — 設計の記録

状態: 配布先一覧への 7 要素の追加（PR #60、R3）は、独立監査（実装、cycle 2 PASS）と Owner の exact-head（head `82483fda`）まで進んだが、R3 の事前監査（設計の監査）が抜けていた。Owner の決定 T154 に従い、この記録を後から書いて設計の監査を受ける（判定 5 の PR #58 と同じ形）。
正本は distribution.md §5 [D5]（`f8413fe1`）と作業指示 CH-SHIRUBE-CONSUMERS-20261021 [CH]（§10）。この記録は設計の判断を足さない。PR #60 の実態が [D5]・作業指示・監査項目の前提と違う所は §5 に「差」として書き、PR #60 は変えない。
範囲: `docs/sds/consumers.json`（#60 の head で 72 行）と、それを読む `scripts/sds/kit.mjs` の `status`。監査項目との対応: CSD-1 = §1〜§3、CSD-2 = §6、CSD-3 = §7、CSD-4 = §4・§8、CSD-5 = §9、CSD-6 = §10。

## 1. Owner の原文と決定 ID

| ID と場所 | Owner の原文（verbatim）と、決まったこと |
|---|---|
| T161 = A（OD-SHIRUBE-KIT-1A-TO-OMOTENASUAI-REPORT-ONLY-20261021-001、#49 6303458175） | 「今の段階で効果がある？一回arc-omoと連携して、正確にOmotenasuAIの整備状況を確認して、判断してほしい。今きいた限りではSDS-V2ベースの開発にはなっていない」→ 入力 A。配布キット 1a を OmotenasuAI の 6 repo に report-only で入れる。保護設定（required check）は変えない |
| T164 = A（OD-SHIRUBE-KIT-1A-ROOM-PANEL-SEVENTH-20261021-001、#49 6303932618） | 入力 A。配布先に `watchout/room-panel` を 7 つ目として足す。`consumers.json` に 1 行足すのは「PR #60 の統合の後の別 PR（R3）」 |
| T154（OD-R3-MISSED-PREAUDIT-RUN-AUDITS-20261020-001、#49 6301299856） | 「とりあえず監査を通しましょう。そもそも監査なしでマージできてしまう仕組みがおかしいよね？」→ R3 に抜けた事前監査を後から行う |
| exact-head（OD-SHIRUBE-PR60-EXACT-HEAD-20261021-001、#49 6305999700） | 「A： 統合して。」→ PR #60 を head `82483fda` のまま統合してよい。head が変わっていたら統合しない |

## 2. 目的と対象外

目的（[D5]）: Shirube 側の 1 file が「配布先」の正。`status` が読み取り専用で観測する対象の一覧で、追加・削除は Owner 承認の PR。各 repo の `.shirube/sds-pin.json` が「その repo が今動かしている版」の正で、2 つの正本は役割が違う。PR #60 の前は `[]`（kodama も載っていなかった）。
対象外: 各 repo の pin の中身、導入 PR そのもの（Owner の exact-head が repo ごとに要る、T164 で合計 7 回）、required 化（T161 の 6: 別に伺う）、kit の文（2 回目）、`kit.mjs` の変更、room-panel の 1 行（T164: 別 PR）。

## 3. 一覧の形

JSON の配列。要素は次の 5 つの key を持つ（#60 の head で 7 要素すべてが、この 5 つだけ。`JSON.stringify(…, null, 2)` と LF で書かれている）。

| key | 意味 | 値の出どころ |
|---|---|---|
| `repo` | `watchout/<name>`。`status` が読む唯一の key | [CH] §1 |
| `adopter` | 採択者。7 要素とも `Owner` | [D5]、[CH] §1 |
| `adoption` | `{ref, sha256}`: 採択の記録の URL と、その本文の SHA-256 | [D5]、[CH] §1 |
| `hygiene_profile` | profile の種類: `none`（kodama）、`docs`（control）、`product`（他 5 repo） | [CH] §1 |
| `state` | `adopted` / `planned`。kit が読まない観測用の欄 | [CH] §1、§2 |

| repo | profile | state | adoption の ref（本文の SHA-256 の先頭） |
|---|---|---|---|
| kodama | none | adopted | kodama#87 の ARC の統合後の読み戻し 6286232170（`c17718e4`）。統合 `184fcc22`、head `581d9bf8` |
| omotenasuai-control | docs | planned | T161（`82dd398e`） |
| common-api、totonoe、motenashi、yagokoro、matakuru | product | planned | T161（`82dd398e`） |

## 4. `status` が一覧をどう読むか（`kit.mjs`、main `f8413fe1`）

`status` は一覧の各要素から `repo` だけを取り（`consumers.map(({ repo }) => …)`）、`gh api repos/<repo>/contents/<path>` の GET だけで、pin・hygiene workflow・旧部品・指示 file を読む。404 は「無い」と読む（code のコメント）。404 以外の失敗は repo ごとの `errors` に入り、`verdict` は `UNKNOWN`。読めた時は `READ`。更新も書込みもしない。

## 5. 実態と、作業指示・監査項目の前提との差（PR #60 の head、main `f8413fe1`）

| 項目 | 前提（出どころ） | 実態（測定） | 扱い |
|---|---|---|---|
| 資格情報 | `status` は GET だけで token を要しない（CSD-4） | GET だけだが、`gh` の認証が要る。7 repo はすべて private（`gh api repos/<repo>` の `private: true`）。`gh` の資格情報の権限は調べていない | 差。読取りだけの資格情報で足りるかは [未確認] |
| 404 の扱い | private の repo は 404 になり「観測できず」（CSD-4） | 404 は「無い」。stub の api で全部 404 にすると `verdict: READ`、`errors: []`、`sds_commit: null` で、pin が無い repo と同じ行。403 などは `UNKNOWN` | 差。`status` は repo の存在・読取り可否を見ない。#60 では CS-2 の別の GET が 7/7 の実在を示した。直すなら `kit.mjs` の変更で、ARC の指示 |
| 一覧と pin の不一致 | `status` が出す（CSD-4） | `status` は一覧の `adoption`・`state` を pin と比べず、pin の `adoption` をそのまま出す。kodama は一覧 = kodama#87 の読み戻し、pin = iyasaka-arc#52 6180595522（`adopted_at` 2026-10-14）で、別の記録を指す | 差。不一致は人が読んで見つける |
| `state` | kit が読まない観測用の欄 | 何も読まない。stub で `state` が `nonsense`、`adoption` が数値でも行は同じ。今の一致（kodama = pin あり、他 6 = pin なし）は #60 の head での観測 | 値の誤りを見つける機械は無い |
| 形と値の定義 | 5 つの key と `hygiene_profile`・`state` の値 | 定義は [CH] §1 だけ。main に定義する file も、一覧の形を検査する試験も無い（`tests/`・`scripts/` で `consumers` を含むのは `kit.mjs` だけ）。[D5] は 4 項目（repo・採択者・採択の記録・profile の種類）で、`state` は #60 が足した | 形の検査は監査 CS-1・CS-2 の 1 回の観測 |
| `adoption` の意味 | 「採択の記録」（[D5]） | kodama = 導入の統合の後の読み戻し。6 repo = 導入する決定（T161）で、導入 PR の記録ではない | 導入後に置き換える更新が要るかは決まっていない [未確認] |
| 区分 | R3（[CH]） | [D5] は「Owner 承認の PR」と定め、区分を書かない。R3 は作業指示の指定 | 記録のみ |
| 公開範囲 | 一覧に秘密・host 名・token を書かない（CSD-4） | 書いていない（`token`・`secret`・`@`・host 風の文字列を grep、0 件）。shirube は public（`private: false`）で、private の 7 repo の名前が載る | 載せる可否を定める文は見つからない [未確認]。exact-head は head `82483fda` を名指す |

## 6. 検証計画と実測

| 受入 | 観測 |
|---|---|
| 配列・5 key・形 | #60 の head の file を作者が JSON で検査: 配列、7 要素、key は 5 つだけ、`repo` は一意で `watchout/<name>`、`adoption` は `{ref, sha256}`（ref は `https://github.com/watchout/<repo>/(issues\|pull)/<n>#issuecomment-<id>`、sha256 は 64 桁 hex）。監査 cycle 2 の CS-1 も同じ結論 |
| adoption の本文 SHA-256 | 取得した本文から計算: kodama の読み戻し = `c17718e47380fb2395f6ee65d5d96913409320940f5109ca9f8bc663e40a58e5`、T161 = `82dd398e5a39626bcb880d3bba718f2ba03c445f052c36c0a407572ed2256423`。一覧の値と一致（異なる ref は 2 つ、7 要素に使われる）。監査 CS-2 は 7/7 一致 |
| repo の実在 | `gh api repos/<repo>` が 7 つとも同じ `full_name`（作者）。監査 CS-2 も 7/7 |
| `status` の実行 | #60 の head で `node scripts/sds/kit.mjs status`（作者、Node v26.9.0、約 44 秒）: exit 0、7 行、すべて `READ`、`errors` は全て空、stderr 54 行はすべて 404。監査 CS-1 は 44.73 秒・同じ結論 |
| kodama = adopted / 6 repo = planned | `status`: kodama = `sds_commit` `e94a74e9`、`digest_match` true、`hygiene_pin_match` true。6 repo = `sds_commit` null、旧部品の数は common-api 5、totonoe・motenashi・yagokoro・matakuru 各 2、control 0 |
| 1 file の変更の範囲 | `git diff --check` 問題なし。PR #60 は 2 file（追加 94、削除 1）。`kit.mjs` は base と同一（監査 CS-1） |

**未測定**: 6 repo への導入の完了（pin は 0 件）。`status` が実際に読めない repo をどう出すか（stub で測っただけで、実 repo では測っていない）。`gh` の資格情報の権限。一覧の値を継続して検査する機械（無い、§5）。

## 7. 採った案と採らなかった案

- (a) Shirube 側に 1 file の一覧を持ち、各 repo の pin を「動かしている版」の正とする（ARC の推奨 A、確定 §5 が採択）。採らなかった案: B（中央の一覧が「あるべき版」を決める。自動追随の圧力になり repo ごとの owner 判断を飛ばす）、C（pull だけで一覧も `status` も持たない。今の版のずれと旧部品が見えない）。理由は ARC の推奨の文。作業指示の「各 repo の pin だけ」は C に近く（作者の読み）、同じ理由で採らない。
- (b) `state` を kit が読まない観測用の欄とする（[CH] §2: `state` のために `kit.mjs` を変えない）。採らなかった案: `kit.mjs` が `state` を解釈する。`scripts/**` は own-code の予算に数えられる。行数は測っていない。この選択の結果が §5 の「`state` の誤りを見つける機械は無い」。
- (c) `adoption` を Owner の決定の URL と本文の SHA-256 で結ぶ。採らなかった案: 決定の文を一覧に写す。知識が 2 か所になる（`docs/sds/engineering-standards.md` S3）。URL と digest なら、本文が変われば照合で分かる。
- (d) 一覧の追加・削除は Owner 承認の PR（[D5]）とする。#60 は作業指示で R3 + Owner の exact-head。採らなかった案: R1 の docs として扱う。[D5] が Owner 承認の PR と定めるので合わない。R3 の区分は作業指示の指定で、[D5] には無い。

## 8. 秘密・権限・観測・復旧・データ

- 一覧の中身は、repo 名、`Owner`、URL、SHA-256、種類の語。秘密・host 名・token は無い（§5）。private の repo の名前は public の shirube に載る。
- `status` の読取りは `gh api <path>`（GET）だけで、書込みは無い。資格情報は実行者の `gh` の認証で、一覧にも code にも書かれない。権限は未確認（§5）。
- 観測: 一覧と pin の不一致、一覧の値の誤り、読めない repo の区別は、`status` の出力から機械では出ない（§5）。出ているのは各 repo の pin の事実（固定版・digest・旧部品・workflow の `uses` の一致）。
- 復旧: 誤った行は、行を消す（または直す）PR で戻す。[D5] は追加・削除を Owner 承認の PR と定める（直すも同じ扱いかは書かれていない [未確認]）。履歴は git に残る。一覧以外に状態は無い。
- データ: 個人情報は無い。

## 9. 予算と範囲

PR #60 は docs だけで `scripts/**`・`configs/**`・`.github/workflows/**` に触れず、`own-code-budget` は base と同じ 1820 / 2300（profile、PR #60 の CI）。大きさは 2 file、追加 94・削除 1（GitHub の API）。profile の上限（新規 file 300 行、PR の追加 400 行、20 file）の中で、`consumers.json` は 72 行、新規の項目集合 file は 22 行。
room-panel を #60 に入れない理由: (1) T164 が「PR #60 の統合の後の別 PR」と決めている。(2) T164（コメント 2026-10-20T23:16:38Z）は、作業指示（22:49:41Z）と cycle 1 の依頼（22:55:27Z）の後で、cycle 2 の依頼（2026-10-21T00:30:38Z）の前。(3) #60 の内容を変えると head が変わり、監査の対象と exact-head（head `82483fda` を名指す）が変わる（作者の読み）。

## 10. 参照の一覧（comment の本文の SHA-256 は、取得した bytes から計算）

| 名 | URL | SHA-256 |
|---|---|---|
| 作業指示（この記録） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6306051117 | `fd3ae71c74559420245cb3d9795ccba1144af3838f8a07d94e2bc285cdd5d8c8` |
| [CH] 作業指示 CH-SHIRUBE-CONSUMERS-20261021 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6303531134 | `2ccbaa996aea7d8b4ce3895fe50a5464b6677579ba36b2cd07dbebb2dbc0f9c2` |
| T161 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6303458175 | `82dd398e5a39626bcb880d3bba718f2ba03c445f052c36c0a407572ed2256423` |
| T164 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6303932618 | `9091a7d6011b2b63e7cd94684d20b2d7bfa719b760aea810fd58adaabbd9fde4` |
| T154 | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6301299856 | `9eac9f4d6d9a52e9538ce63a20fabf3f9ac0b09ff9b6f2235a75283e05cec02c` |
| exact-head（#60） | https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6305999700 | `a9f78ec30a1c5e277e4151c460ea20aff61be3ee145969757bfbc2d66ca680c2` |
| 道筋 DP-SUITE-001 generation 7 | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6302366240 | `22c30200d18ea7fabfb62c887546d59d090fa8ae9a569dfa079c81eb18913776` |
| ARC の推奨（配布先の管理 A/B/C） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049838786 | `fd0149cae1a314acdaec166bf27af575687da9e02364f159718c3cc1025e329c` |
| ARC の確定（§5 で A を採択） | https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6049863576 | `a704506030cb933489aa38033025d8e2e37a62c0c15e34307ad70c5e3c5db565` |
| kodama#87 の統合後の読み戻し | https://github.com/watchout/kodama/pull/87#issuecomment-6286232170 | `c17718e47380fb2395f6ee65d5d96913409320940f5109ca9f8bc663e40a58e5` |
| #60 の監査 cycle 2 の依頼 | https://github.com/watchout/shirube/pull/60#issuecomment-6304954513 | `4ba1bc79c58efc2136664fac997de8aed191cbccfdb451168d536f4da7a79f25` |
| #60 の監査 cycle 2 の返却（PASS） | https://github.com/watchout/shirube/pull/60#issuecomment-6305078376 | `e08beef123694d5c3b12e34d3b5ed1ed33e4daffe323871b9f92331ea15a17c5` |
| #60 の監査 cycle 1 の返却（BLOCK、AUTH-01） | https://github.com/watchout/shirube/pull/60#issuecomment-6303754851 | `8a1351d4e21bb6b1b23c5c5c5caa12a80c0bb81a5bd6b6e9d552be16cc19326d` |
| suite-lead の止め（事前監査の受領が無い） | https://github.com/watchout/iyasaka-arc/issues/24#issuecomment-6306015246 | `8098153ac4376547af11483fcf9bc35147d4724aa7fa7e457fcfd2969024fd1a` |

[D5] = `docs/sds/distribution.md` §5 @ `f8413fe1`（file の SHA-256 `bba44c0f8a8c166a8a9288d19d993ff1b1743f4b30bc83dfdc2c430454fe0310`）。PR #60 = `watchout/shirube` の head `82483fdadd21466eb075c46ddfb1ab31b1f2d4f5`、base `b13192d0`。基準: main `f8413fe1`、`docs/sds/audit-method.md` §3。
