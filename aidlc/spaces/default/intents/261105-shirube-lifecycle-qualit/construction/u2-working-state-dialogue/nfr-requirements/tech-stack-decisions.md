# U2 — Tech Stack Decisions

## Sources and Scope

U2 の技術選択。入力: [functional-spec](../functional-design/functional-spec.md)、[rules](../functional-design/rules.md)、[requirements](../../../inception/requirements-analysis/requirements.md)（NFR1・NFR8・NFR10）、[contract-summary](../../../inception/contract-design/contract-summary.md)。[questions](nfr-requirements-questions.md) の要約確認 Looks correct。新しい選択は行わず、既存の採択を維持する。

## Decisions

| ID | 決定 | 理由 | 採らなかった代替 |
|---|---|---|---|
| NFR10.1 | JavaScript ESM（`.mjs`）、Node `>=22`、実行時 npm 依存なし、Node 組込みの `node:test` と `assert` を維持する。既存のソース構造・依存方向・秘密の検査と、JSON・exit code の契約を守る | 既存の製品規約と team.md の採択（TDD・node:test）。新しい依存は Owner の判断で、この段では追加しない | 新しい言語・test framework・DB・HTTP framework・外部 SaaS（根拠が無く、依存追加は Owner の判断） |
| NFR1.1 | **行の網羅率 100% の主の要件**。U2 の実行コードの実分母で行の網羅率 100% を、機械可読な記録で測る（記録の作り方は observability-requirements の NFR1.1b）。対象 file の集合と分母は置き場の設計（Infrastructure Design）で確定する。**今は未確定**で、確定するまで 100% を達成済みとも対象を全体とも示さない。合否: 確定した分母で 100% を実測し、記録に分母の file 一覧・行数・実測値が残る。負例で不合格: 分母 0（失敗として扱い、成功にも「未確認」にもしない）、未計測・実行されていない・計測不能、部分集合だけの計測、skip された試験、閾値の緩和。除外が要る行は、行番号でなく範囲の内容の SHA-256 で名指し、PR に理由を書き独立監査で確認する。範囲の内容が変われば除外を認めず失敗にする。実測は、依存を入れた環境で既存の試験が全部通ることを確かめてから値を読む（依存が無く一部が失敗した実測は成功に数えない） | 部分集合だけで全体を測れたとしない（P4）。置き場が未定の間に分母を決めると誤る | 今ここで file 名を仮置きして分母を固定すること |
| S1・S6・S9 | S1: U2 は何も永続化せず消す対象も作らない（Q2 = A）ので適用の対象が無い。S6: 保存形式を持たないので新旧同居・逆向きの対象が無い。S9: 観測は読み取りだけで、書ける資格情報を観測・試験・汎用 build に渡さない（NFR2.1）。S2〜S5・S7・S8 は各 NFR の根拠に記した | 適用・非適用を 1 か所で示す | 持ち越し先 U3・U5 が保存・再開・効果を担う時に適用する |
| NFR1.2 | TDD: 先に失敗する試験を書いて失敗を確かめ、次に実装を書く。FD の 43 規則に正例・負例を置く | team.md の採択 | 実装後に試験を足す形 |
| NFR2.6a | 開いた形（string・list）の観測値の秘密らしさは形式で判定しきれないので、判定で救って値を保持せず、保持・digest・表示を設計で持たない。共有の判定の関数は開いた形の生の値に 1 回だけ当て、返る固定の分類（invalid_format / secret_like。判定できない・疑わしい時は secret_like）だけを観測の事実に残して生の値は捨てる（F02。arc の読みで Owner に確認中）。閉じた形の値の許される形式と秘密らしさの判定は 1 か所の関数（回答と観測で同じ。S3）が持つ | Owner の決定 116・120。判定を増やすより持たない方が、見逃しによる漏れが構造的に 0 になる（S5・S8） | 開いた形の値を digest だけ保持する形・秘密らしさの推測で選別して保持する形（決定 120 の範囲外で、Owner の判断が要る） |
| NFR8.1a | 版の識別は観測した値を使い、manifest の宣言だけで全 Node 版・別 CLI・別配置への対応を保証しない | S5 | 宣言値の写し |
| NFR5.1a | 意味の核は純粋関数として時刻・ID・観測を引数で受け、I/O と時計は adapter に置く。adapter は輸送と形式だけを変換する | S2〜S4 | 核が時計・乱数を直接読む形 |

## Placement (Not Decided Here)

U2 をどの file・どの CLI 入口（既存の対話・CLI への組込み）に置くかは Infrastructure Design で決める。この段では file 名・module 名を決めない。

## Assumptions & Open Questions

None。
