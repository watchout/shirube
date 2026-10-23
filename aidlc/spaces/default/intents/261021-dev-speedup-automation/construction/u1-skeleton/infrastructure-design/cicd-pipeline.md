# 統合までの流れ（CI/CD Pipeline）— U1 u1-skeleton

出典:
- チームの進め方: `inception/practices-discovery/team-practices.md`
- 作る順番の計画: `inception/delivery-planning/bolt-plan.md` の B1（Delivery Planning の Q10・Q11）
- U1 の基盤の仕様: `infrastructure-specification.md`
- U1 の大きさの見積もり: `construction/u1-skeleton/nfr-requirements/tech-stack-decisions.md`
- この段の答え: `infrastructure-design-questions.md`（Q1〜Q8）

本番への展開はありません。「出す」とは、main に統合することです。

## U1 の PR の順（Q4・Q5・Q8、監査の指摘 BF-01・BF-03・BF-04）

| 順 | PR | 中身 | 作る | 監査 | 統合 |
|----|----|------|------|------|------|
| 1 | P1 保護面の 1 本（R4） | AI-DLC の自己適用の file（`.aidlc-version`・`aidlc.settings.json`・`.claude/settings.json`・`.gitignore`・`.shirube/hygiene-profile.md`・`tests/self-aidlc-settings.test.mjs`）、大きさの数えの除外（`exclude_generated`）と own-code の予算の改め（S1 全体の見積もりを添える）、`.gitignore` の audit の除外、`sds-gate-self.yml`、`.shirube/sds-pin.json`（記録だけ、U1 の前の main に固定）、`ci.yml`（網羅率の床・計測の job。網羅率を測る試験の job は Node 26）。監査の席の分類の役の決定（FR5.4）もこの 1 回にまとめる | shirube の実装の席。今の kit では作れない（shirube の再利用 workflow を上書きする）ので手で組む | devauditor | Owner の exact-head 1 回の後に suite-lead |
| 2 | R 記録の PR | AI-DLC の記録（audit は載せない）。Owner の作業場の file と bytes が同じか | shirube の実装の席 | devauditor（bytes の一致） | suite-lead |
| 3 | I1 実装 1 | 承認の記録と段の順の記録の作り手（CLI）、その試験 | shirube の実装の席 | devauditor（R2） | suite-lead |
| 4 | A 承認の記録の PR | I1 の CLI で作った承認の記録（試行ごとの file）と段の順の記録。U1 の Code Generation を始めた後に、この作業場で作る（Q7） | shirube の実装の席 | devauditor（bytes の一致） | suite-lead |
| 5 | I2 実装 2 | kit の自己用の書く先、`budget.mjs`、その試験 | shirube の実装の席 | devauditor（R2） | suite-lead |
| 6 | I3 実装 3 | 記録の橋、門の記録の判定、その試験 | shirube の実装の席 | devauditor（R2） | suite-lead |
| 7 | K kit の版上げの PR | kit の upgrade で、shirube の pin を I3 の後の main に上げ、kit で呼出しを書き、kit が書く 3 つの file（sds-audit の skill・PR の雛形・`AGENTS.md`）を入れる。「版上げ」として扱う | shirube の実装の席 | devauditor（差分が kit の file だけ・kit check OK・上げる先が監査 PASS の main） | suite-lead（Owner の手なし = iyasaka-arc#49 6308341298 の 1） |
| 8 | I4 実装 4 | 計測、その試験。新しい門で判定される確かめの PR | shirube の実装の席 | devauditor（R2） | suite-lead |

- U1 の PR の数は、保護面の 1 本と実装の PR 4 本（Units Generation の Q8）。R・A・K は Unit を指さないので数えない。
- 門は base の `sds-gate-self.yml` が固定した commit から動く。I1〜I3 は U1 の前の門で判定され、記録の判定はまだ無い。新しい門で判定される最初の U1 の PR は、K の後の I4（Delivery Planning の Q11・Q12）。
- どの PR も、見積もりの上の端で 400 行・20 file の中に収まる（U1 の NFR Requirements の Q10）。実測で超えそうになった時は、Code Generation の計画で試験と実装の分け方を見直す。U1 の PR の数は変えない。

## 実装の席の作業場（Q7）

- U1 の Code Generation は、shirube の実装の席を、この Owner の作業場（`~/Developer/aidlc-owner/shirube`）で起動して行う。その席が同じ作業場で `/aidlc --resume` し、U1 の Code Generation から続ける（iyasaka-arc#49 6353826462）。
- audit は 1 つの作業場に残るので、作り手はこの作業場の audit から、Code Generation の行を含む段の順の記録を作れる（U1 の Functional Design の BR2.3・BR5.5）。作り手と門の設計は変えない。
- aidlc-shirube の会話は Code Generation を行わない（決定 6353826462 の 2）。2 つの会話が同じ作業場で同時に動かないようにする。
- 席の起動の場所を変える手順は、決定 6353826462 のとおり別に Owner に示す（席の設定の変更）。

## 段と門

| 段 | 何が動くか | 止める物 |
|----|------------|----------|
| PR を開く・更新する | `ci.yml` の試験（網羅率の床つき）、hygiene、own-code の予算、`sds-gate-self.yml`（門） | CI の失敗は統合を止める。門は記録だけで止めない |
| 監査 | devauditor の監査の返却（`sds-audit-review/1`） | R2 以上は監査 PASS が要る（統合の担当が確かめる） |
| 統合 | suite-lead（作者と別の席） | R3・R4 は Owner の exact-head が要る（K は kit の版上げの決まりで要らない） |
| main への push | `ci.yml` の試験と計測の job | 計測の job の失敗は統合済みの物を戻さない（次の回で測り直す） |

## 確かめの command（Q6）

細い版の確かめには、記録した command を使う（Owner が承認、2026-10-23）。

`npm ci && node --test --experimental-test-coverage --test-coverage-include='scripts/**' --test-coverage-include-all --test-coverage-lines=80 tests/*.test.mjs tests/u2/*.test.mjs`

- CI の網羅率の床と同じ数え方（`scripts/**` の全部、試験が読まない file も 0%）。
- `npm ci` で devDependencies（ESLint・jscpd など）を入れてから試験を動かす。動かす所で npm の registry につながる必要がある。
- Node 26（26.7.0 以上）で動かす（`--test-coverage-include-all` は Node 26.7.0 から。Node 22・24 では試験の前に `bad option` で止まる = 監査の指摘 BF-07、U1 の NFR Design の Q8、この段の Q8）。この Mac の Node は 26.9。CI の網羅率を測る試験の job も Node 26。

## 戻し方

- 門の呼出しや pin が正しい PR を邪魔した時も、記録だけの段なので統合は止まらない。外す時は、保護面の PR（revert）を出し、Owner の exact-head を通す。
- K を戻す時は、前の pin に戻す kit の版上げの PR を出す（版上げの決まりの中）。
- 網羅率の床で CI が失敗した時は、試験を足して床を満たす。床の値と数える物を弱めない（Build and Test の段でも弱めない）。

## 資格情報

- 門と CI と計測は、job の GITHUB_TOKEN だけを使う。権限は `infrastructure-specification.md` の表のとおり。
- 計測の専用の読取りの資格情報は、作る時に Owner の決定を取る（NFR10.2）。U1 では使わない。
- secret を workflow に足さない。
