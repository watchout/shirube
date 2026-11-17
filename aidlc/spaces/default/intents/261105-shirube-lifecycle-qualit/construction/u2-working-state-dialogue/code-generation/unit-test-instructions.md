# U2 u2-working-state-dialogue — 単位の試験の手順

この単位の試験だけを流す手順。全体の `npm test` を単位の command として使わない。実行した Node の版・OS は、実行のたびに記録に書く（観測した版だけ。`engines.node >=22` の宣言だけで全環境の動作を保証したとしない）。

## 前提

- 作業木は `~/Developer/.worktrees/` の下の worktree（最新の `origin/main` から作る。作業場の木ではない）。`node_modules` は clone からの symlink（commit しない）。
- 新しい依存を足さない。`package.json`・lockfile・`.github/workflows`・`.shirube/**` は変えない。
- 設計監査の PASS と作者の受領の前は、code と試験を書かない。

## 単位の command

| 目的 | command | 合格の条件 |
|---|---|---|
| この単位の試験の全部 | `node --test tests/working-state-*.test.mjs` | 失敗 0、skip 0、todo 0。実行した件数を記録する |
| 部品 1 つ | `node --test tests/working-state-<部品>.test.mjs` | 同上。Red の確認はこの形で 1 file ずつ流し、失敗の出力を記録する |
| 行の網羅率の記録（LC7） | `node --test tests/working-state-coverage.test.mjs` | 100%、分母 1 file 以上、未計測 0、報告の形が取れる。試験の中で子 process に Node の lcov を流して解析する。子が流すのは LC7 自身を除く U2 の試験 file で、再び起動しないことは子へ渡す引数で決める（環境変数にしない）。子の `node --test` の skip・todo・cancelled・timeout の件数を数えて 0 を確かめる（数える範囲はこの子の実行だけ）。lcov の報告の形が取れない版（Node 22 の手元など）は失敗にして「観測できなかった」と記録する。CI の `test` job（Node 26）で動かす前提 |
| 構造の試験 | `node --test tests/working-state-structure.test.mjs` | 失敗 0。import が `node:` の組込みと相対 path だけ（bare specifier なし）、判定の関数の file が何も import せず LC2・LC5 が同じ 1 つを呼ぶ、LC1 の返り値が診断・記録・案内へ渡る経路が無い。`package.json`・lockfile・契約 `.v2` の差分 0 は機械の関門ではなく、作者の PR 本文と独立監査の確認 |
| 開いた形の生の値の動的な走査 | `node --test tests/working-state-open-form-*.test.mjs`（名前は案） | 架空の開いた形の値を入れ、返り値・draft・案内・試験の出力の全体に、その値がそのままの形で現れない。部分文字列・符号化などの派生形の不在は証明しない（記述に書く）。静的な試験は補助 |
| 既存の試験が変更前後で通る | `npm test` | 変更前に全部通ることを Step 2 で記録し、変更後も失敗 0。通らない状態で網羅率の値を読まない |
| 既存の構造・重複・未使用の検査 | `hygiene` job が実行する command を Step 2 で確かめて記録する（`lint:structural`・`lint:guard`・`hygiene:jscpd`・`hygiene:coverage`・`hygiene:lines`・dependency-cruiser・`knip --production --config knip.jsonc`） | 違反 0。設定を変えない |

`bare な npm test` を単位の確かめとして使わない（他の単位の試験を混ぜない）。網羅率の分母は、ディスクの列挙（`scripts/working-state/**/*.mjs`）で決める。lcov に現れない file は未計測として失敗、0 件は失敗。

## TDD の記録

- 部品ごとに、Red（実装が無い、または規則を満たさないので失敗する）の出力を記録し、Green（通す最小の実装）の出力を記録する。Red と Green は別々の commit。
- 記録は実測だけ。失敗しなかった Red は Red とは言えないので、試験を直してから実装に進む。

## 規則と試験の対応

| 規則 | 試験の場所（案） | 正例・負例の観点 |
|---|---|---|
| BR1.1〜BR1.6 | `tests/working-state-observation-*.test.mjs` | 対象の指定の有無・対象違い（T1.1u: 対象を名指さない出典は観測不能 malformed、確認済みにならない）、開いた形の値が保持・digest・表示に現れず presence・lengthBucket・matchGroup・source だけ、宣言・cache を写さない、3 値、予算超過、根の外・symlink・循環、読取り中の変化 |
| BR2.1〜BR2.3、BR3.4 | 同上 | 親が読めて無い時だけ未導入、404・権限拒否・取得失敗は観測不能、道具の分類、版の 3 値の比較、破損 |
| BR3.1〜BR3.5 | `tests/working-state-item-state.test.mjs` | 出典の組み合わせの全部がちょうど 1 状態、requiredForConfirmed、順位なし、対象違いの参考、不正・秘密らしい観測値は値・digest・候補・案内文に写らず項目・出典・分類だけ（T3.4。観測値と回答が同じ判定の関数を使う）。開いた形の食い違いは matchGroup の違いだけを根拠にし中身を示さない（T3.2o）。T3.4o: 開いた形の値は形式に合っても保持・digest・表示しない |
| BR4.1〜BR4.4、BR7.1〜BR7.7、BR9.2、BR9.4 | `tests/working-state-guidance-*.test.mjs` | 質問の対象、行き止まりを作らない、再質問しない、並び、平文の区別、同じ入力は同じ内容、1 回で止まる、A 不足・B 観測不能、理由コードを新設しない |
| BR5.1〜BR5.4、BR6.1〜BR6.5、BR8.1〜BR8.5 | `tests/working-state-answers-*.test.mjs` | 型・長さ・文字・path、秘密らしい入力（値も digest も理由への写しも無い）、二重送信、最新、観測 digest との結び・無効化、許可を作らない、draft の古さ（同じ参照名で中身だけが変わる・observed → unavailable・項目の有無の変化で変わり、回答の追加だけでは変わらない）、効果 0、C02 の契約の期待表に合う変換（answers は object、guidance は string。意味が落ちない）、開いた形の回答は「比べられず観測できず」で確認済み・不一致にならない（T5.2o）、開いた形の回答を適用済みの確認に使わない（T6.4o）、開いた形の中身だけの変化で draft の古さが変わらない（T8.3o。U2 が保証しないこととして記録） |
| BR9.1、BR9.3 | 構造の試験・各部品の試験 | 核が時計・乱数を取らない、fixture は架空、観測の単位ごとの最新（時刻の違う 2 出典・片方だけの更新・古い応答の遅着で全出典が残り、LC2 → LC3 を通して conflict が全出典を示す。同じ時刻で内容が違う 2 件は観測不能） |
| 子の起動（条件 1〜6） | `tests/working-state-probe-*.test.mjs` | 対象の根・`node_modules/.bin`・相対と空の PATH 要素・symlink 経由の同名の実行ファイルが起動されない、環境変数の token が渡らない、出力と時間の枠、孫ごと止まる、止めたか確かめられない時は観測不能、cwd が OS の根、根が PATH の dir を包む時に「未導入」と案内されない |
| 構造（NFR5.1・NFR5.2・NFR7） | `tests/working-state-structure.test.mjs` | 核の純粋性、理由コードの定義が無い、循環なし、持ち主 1 部品、効果の経路なし、300 行以内 |

## 観測できなかった時の扱い

Node 22 での手元実行、Linux の runner、gitleaks（`secrets`）の手元実行、配線した workflow での実行、利用先での観測は、できなかった場合「観測できなかった」と記録に書く。成功とは書かない。skip・timeout・未実行を合格に数えない。

## 片付け（版 13）

作業が終わったら、この席が作った一時の物（worktree・一時の index の file・試験用の一時 dir・pin の checker の一時の worktree）を、GitHub に無い変更が無いこと、監査中の PR の証拠でないことを確かめてから片付け、消した物の一覧を 1 行で残す。他の席の物は消さない。
