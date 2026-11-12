# U3 u3-node-gate-slice — 安全の設計（security-design）

NFR5.1〜NFR5.8 と脅威 T1〜T6 に対する設計。認証・認可・暗号化・CSRF・XSS・secret の保管は、この単位に該当しない（ネットワークも利用者の画面も持たない）ので持たない。守る面は「入力の読み方」「子プロセスの起こし方」「書く面」「出力の中身」の 4 つ。

## Sources

- [desc] Initial description: 共有の網羅率の門を新しい AI-DLC の取り組みとして始める（Owner の指示 https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6759071065、本文 SHA-256 `c5d9ccc3510ff46e5d6661bc8c528cafb7e08d4ce2c86f39f049782eaf7e524b`）。
- [scope] Workflow-selected scope: feature
- 入力: [security-requirements.md](../nfr-requirements/security-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)（NFR4.6）、[logical-components.md](./logical-components.md)、機能の設計 [rules.md](../functional-design/rules.md)（BR1.3、BR2.8、BR4.6、BR4.7、BR5.1〜BR5.3）。社内の標準 S5・S8・S9。

## 設計

### SC1 子の環境は許可した名前の一覧だけ（NFR5.1・T3・T4）

- `runner.mjs` が子の環境を、空から「`childEnvAllowlist`（`PATH`・`HOME`・`LANG`・`LC_ALL`・`TZ`）の 5 つの名前に、門が置いた値を入れた物」として作る。親の環境の値は 1 つも写さない。値は、`PATH` = 実行中の Node の directory と固定の `/usr/bin`・`/bin` だけ、`HOME` = 実行ごとの一時 directory、`LANG` と `LC_ALL` = `C.UTF-8`、`TZ` = `UTC`。`NODE_OPTIONS` と `NODE_PATH` は渡さない。名前を挙げて除く方式（denylist）にはしない: 知らない名前の秘密（`GH_TOKEN`・各社の API key・`*_SECRET` など）を通してしまい、資格の漏れ（致命）が起きやすさに関わらず差し戻しになるため（arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
- 一覧は `GateConstants.childEnvAllowlist` の 1 か所に置き、ほかの file は参照する。名前の大文字小文字を変えた別名（小文字の `github_token` など）も、一覧に無いので渡らない。
- 利用先の試験が親の環境変数（例: `CI`）を必要とする場合、その試験は失敗し「観測できず」になる（成功には倒れない）。要る名前の追加は入力の項目を足す別の単位で扱う。
- 検証は 2 段に分ける。Node 自身が起動後に子へ足す変数（`NODE_TEST_CONTEXT`、`NODE_V8_COVERAGE` など。Node 22.23.4 で観測。macOS ではさらに増える）は門が渡した物ではないので、実際の子の中の名前の完全一致は成り立たない（設計監査 round 1 の F02。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。
  - (1) 完全一致は spawn の境界で確かめる: `runner.mjs` が起動関数に渡す環境の object を、起動関数を差し替えた単体の試験で受け取り、名前の集合が `childEnvAllowlist` の 5 つと等しいこと、値が門の置いた値（`PATH` = 実行中の Node の directory と `/usr/bin`・`/bin` だけ、`HOME` = 一時 directory、`LANG`・`LC_ALL` = `C.UTF-8`、`TZ` = `UTC`）であること、親に置いた架空の秘密の名前も値も入っていないことを確かめる。
  - (2) 実際の子の中では否定だけを確かめる: 親の環境に、架空の秘密を 3 種類（既知の名前 `GITHUB_TOKEN`、未知の名前 `FIXTURE_UNKNOWN_SECRET`、小文字の名前 `fixture_lowercase_secret`）と `NODE_OPTIONS`・`NODE_PATH` を置く。子が自分の環境と出力を書き出す架空の試験で、(a) 3 つの偽の名前も値も、書き出した環境にも子の出力にも現れないこと、(b) `NODE_OPTIONS`・`NODE_PATH` が無いこと、(c) `HOME` が一時 directory で、終わりの後に消えることを確かめる。子の環境の名前の完全一致は求めない。
  - 親の環境を継承する形（`env` を渡さない・親の環境に足す形）に戻さない。(1) の試験は、継承する実装を落とす（親の秘密が渡った環境で失敗する）。

### SC2 入力の経路を 2 つに絞る（NFR5.2・T1）

- 入口が読む引数は `--input` と `--result` の 1 回ずつだけ。環境変数から入力の項目を足さない（環境変数を読むのは runId だけ。NFR2.3）。入力の JSON の未知のキーは、どの階層でも INPUT_FIELD_UNKNOWN。`__proto__`・`constructor` などの名前は通常の未知のキーとして扱い、入力は `Object.create(null)` 相当の安全な形で検査してから使う（prototype の汚染を避ける）。

### SC3 子プロセスの起こし方（NFR5.3・T1）

- `child_process.spawn`（shell なし）に、実行ファイル（`process.execPath`）と引数の配列を渡す。文字列を連結した命令を作らない。
- 渡す試験 file の path は、`resolve.mjs` が既存の `trackedFiles` に照らして解決した物だけ。リポジトリの外を指す path（`..` を含む、絶対 path）や追跡されていない file は解決の段で TARGET_UNRESOLVED になり、子に渡らない。先頭が `-` の path は、Node の引数として解釈されないよう、作業 directory を前置した絶対 path にして渡す（オプションの注入を避ける）。`./` の前置は Node が取り除くため守りにならないことを、実装の中で実際の子で確かめた（コード生成の記録、2026-11-12）。出来事の file が報告する試験の名前は、受け取り側が作業 directory からの相対に戻して照合する。
- 子の標準入力は閉じ、標準出力と標準エラーは捨てる（出力を溜めない。メモリと注入の面を減らす）。観測は出来事の file と lcov の file だけで行う。

### SC4 書く面を限る（NFR5.5・T5）

- 書くのは 5 つだけ: `--result` の path（結果の JSON）、その一時の file、実行ごとの一時 directory、job summary、出力値の file（`GITHUB_OUTPUT`）、標準出力（notice）、標準エラー。それ以外の path を作らない。
- `--result` の path は、`--input` の path と同じ、または追跡されている file の path であれば ENTRY_ARGUMENTS_INVALID（測定の前に判定する）。入口が始めに既存の結果を消す（NFR4.6）ので、これを許すと利用先の追跡された file（入力そのもの、ソースなど）を消せてしまう。結果の path の親 directory は存在し書ける物に限り、無ければ作らず失敗にする。
- 読むのは、`--input` の file、観測の file（子が作った一時 directory 内の 2 つ）、既存の `trackedFiles`・`resolveTargets` が読む物だけ。ネットワークの module を import しない（試験で、`scripts/coverage-gate/` の import に `node:net`・`node:http`・`node:https`・`node:dns`・`fetch` が無いことを確かめる）。

### SC5 出力の無害化（NFR5.4・T2）

- 利用先の自由な文字列（file 名）が通る面は 3 つ: notice、job summary、結果の JSON。`sanitize.mjs`（純粋）が面ごとに別の関数で処理する。
  - notice（GitHub の命令の行）: 制御文字（C0・DEL・C1）と改行を `?` に置き換え、`%`・CR・LF を GitHub が定める escape（`%25`・`%0D`・`%0A`）にし、`::` で始まる命令に読まれないよう先頭を固定の文型の後に置く。notice の本文は固定の文型と観測した数だけを主とし、file 名は 1 つも載せない（名前の一覧は summary と JSON）。
  - job summary（Markdown）: path をバッククォート 1 つで囲み、path にバッククォートがあれば `'` に置き換える（囲みを破れない形にする）。制御文字と改行を `?` にする。
  - 結果の JSON: JSON の文字列の escape に任せる（制御文字は `\uXXXX` になる）。
- 出力値（`GITHUB_OUTPUT`）には、区分の名前と数（整数）と固定の語だけを書く。自由な文字列を書かない。値の中に改行が入る形（複数行の値）を作らない。
- 検証: 悪意のある架空の file 名（改行、`::error::fake`、バッククォート、`%0A`、BMP 外の文字、制御文字、長さ 1,000 字）を 3 つの面に通し、命令として解釈される行が出ない・囲みを破れない・出力値の行数が固定であることを確かめる。

### SC6 一時 directory と結果の書き込み（NFR5.6・NFR4.6）

- 一時 directory は `fs.mkdtemp` で実行ごとに作り（名前は `coverage-gate-<runId>-` で始まり、あとは乱数。乱数は核の外 = runner の中）、作成時の権限を 0700 にする。成功・失敗・期限超過・例外のどれでも、子が終わった後に消す。
- 消せなかった場合は、成功と記録しない（設計監査 round 1 の F03。arc の答え。Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）。消す処理の失敗は `runner.mjs` が `cleanupFailed` を真にして返し、判定は観測できず（理由コード TEMP_CLEANUP_FAILED）、終了コードはほかの観測できずと同じ 1（落とす）。測定がほかの点で成功していても、成功とは記録しない。警告だけで流す道を持たない（S8、NFR4.4）。
- 残った directory は、絶対 path でなく runId で示す（結果の文書にも標準エラーにも絶対 path を載せない。NFR5.7）。流れの手順: (1) 結果の文書の runId を読む、(2) 担当が OS の一時領域から、名前が `coverage-gate-<runId>-` で始まる directory の権限を直して消す、(3) 同じ入力で門を流し直す。消さずに流し直しても、runId の違う新しい directory を作るので、前の実行の観測は混ざらない。
- 検証: 削除関数を差し替えて失敗を注入する負例を置く（実際の fs で消せない状況は、権限の無い fixture が環境に依るので、再現を成功の根拠にしない）。この負例で、(a) 成功する測定でも cleanupFailed が真になり、判定が観測できず・TEMP_CLEANUP_FAILED・終了コード 1 になること、(b) 結果の文書に絶対 path が無く runId があること、(c) 次の実行で前の directory の中身が混ざらないこと、(d) 削除が成功する通常の実行では偽のままであること、を確かめる。
- 結果の file は、`--result` と同じ directory に一時の名前で書き、`rename` で置き換える（同じ directory 内は原子的）。書きかけを残さない。書けなかった場合は一時の file を消して ENTRY_OUTPUT_FAILED。

### SC7 出力に載せない物（NFR5.7・T3）

- 載せるのは、repo からの相対 path、固定の文型、観測した数、runId、工具の版だけ。環境変数の値、資格情報の名前の値、絶対 path は載せない。
- 例外の説明（予期しない例外）には、例外の名前（`error.name`）と固定の分類だけを書き、`error.message` や stack をそのまま載せない（絶対 path や環境の値が混じりうる）。
- 検証: 環境に架空の目印（`FIXTURE_SECRET_MARK`）を置き、すべての出力面（結果の JSON、summary、notice、出力値、標準出力、標準エラー）にその値と一時 directory の絶対 path が現れないことを確かめる。

### SC8 信頼の境界の記録（NFR5.8・T4）

- 門は利用先の追跡された試験を走らせる。試験の中身の安全は保証しない。fork の PR の code を書ける資格情報のある文脈で走らせる使い方をしない（U7 の定義が受ける）。この単位は、README に当たる docs を新たに作らず、設計の記録（この文書）にこの制約を残す。

## 脅威との対応

| 脅威 | 設計 |
|---|---|
| T1 shell・path への評価 | SC2・SC3 |
| T2 注釈・出力値の命令への解釈 | SC5 |
| T3 資格情報・path の漏れ | SC1・SC7 |
| T4 書ける資格情報で利用先の試験が走る | SC1（許可の名簿。子に資格情報を渡さない）・SC8（U7 が本防御） |
| T5 古い結果の残り | SC4・SC6（始めに消す、原子的な置き換え。一時 directory を消せなければ TEMP_CLEANUP_FAILED） |
| T6 期限後に残る子 | reliability-design.md の RL2 |

## Assumptions & Open Questions

### Assumptions

- [assumption] `GITHUB_OUTPUT` の file への書き込みは、`名前=値` の 1 行ずつ追記で、値が改行を含まない限り注入の面がない。値は整数と固定の語だけなので、複数行の書式（区切り文字）を使わない。
- [assumption] Git が許す改行を含む file 名を、試験の fixture として一時の repo に作れる（Linux）。作れない環境では整形の部品へ直接渡す。
- 確かめ済み（コード生成、2026-11-12）: 先頭が `-` の path に `./` を前置しても、Node は `./` を取り除き、子が `-x.test.mjs` をオプションと読む。絶対 path で渡す方法に直した。試験は `-x.test.mjs` という架空の名前で、実際の子を起こして確かめている。

### Open Questions

1. 子に渡す名前の追加（利用先が増やしたい場合）は、入力の項目を足す形になる。この単位は固定の 5 つで、要望が出たら別の単位。許可の名簿方式は arc の答え（Owner の委任 iyasaka-arc#49 6762288830。Owner の言葉ではない）で決めた。名簿の外の名前を子に渡す道は、この単位に無い。
