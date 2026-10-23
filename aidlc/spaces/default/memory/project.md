# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER 作る人が自分の作業を監査・承認・統合する（`kit/instructions-block.md`） (affirmed 2026-10-22)

- NEVER 検査の閾値を緩める変更を、同じ PR で行う（README「never a threshold loosened in the same PR」） (affirmed 2026-10-22)

- NEVER `scripts/hygiene` の検査に、実行時の npm 依存を足す（`.shirube/hygiene-profile.md`、`.dependency-cruiser.cjs`） (affirmed 2026-10-22)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS PR の本文に `json sds-pr` のブロックを 1 個置き、`risk:R0`〜`risk:R4` の label を 1 つ付ける（`kit/instructions-block.md`） (affirmed 2026-10-22)

- ALWAYS 検査は、読めない・壊れている時に失敗にする（fail closed）（README「Every check fails closed」、Shirube 開発規格 S8） (affirmed 2026-10-22)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- 依頼文で対象範囲・原因・指標が未指定のときは、Intent Capture で範囲と遅れの原因を最初に問い、範囲→原因→利用者→指標→きっかけ→除外→体制の順に質問する。 (learned 2026-10-21) <!-- cid:261021-dev-speedup-automation:intent-capture:78aa134512f5d646404cdbcda4e35eb80c88268344fa8306b0982747f29eb6db -->
- 質問への答えが記録済みの Owner の運用・決定と食い違うときは、黙ってどちらかを採らず、追加質問で Owner に確認してから成果物に書く。 (learned 2026-10-21) <!-- cid:261021-dev-speedup-automation:intent-capture:5ec17d26f376a68f692f059add96e5b8bd818e7f9496d7b254d67fc910477b5c -->
- 社内の開発工程の改善では、Feasibility の AWS の利用状況の質問を「仕組みを動かす場所」の質問に置き換える。 (learned 2026-10-21) <!-- cid:261021-dev-speedup-automation:feasibility:54cef34fec1ec2ca72fe767b863d72727f99d589d7d344dfffb97eb771dbd312 -->
- 目標が今の値を基準にしていて今の値が未計測のときは、Feasibility の結論を「条件付きで実現できる」とし、計測を先に置く条件を明示する。 (learned 2026-10-21) <!-- cid:261021-dev-speedup-automation:feasibility:be663d6f38046693f37726d53d7fbd6016423b525b511b3d49c4a6fd17a56e33 -->
- 完了の条件を記録済みの Owner 決定に揃えるときは、範囲の Must が完了の条件より狭くならないよう、条件の各項目が Must に入っているかを確認する。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:scope-definition:ea77300604a7ab00aeb78a2d1a83367c979930418f7d6d24867ada8c44310efe -->
- 順番を価値の大きいものからにしても、承認済みの実現性の条件（改善の前に今の値を測る）がある場合は、計測をバックログの先頭に置く。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:scope-definition:2a75e875595ce273ad13031aee6677cbd8631207ded412ec82c10e07137c4b5d -->
- 質問ファイルに別の席の下書きの答えが入っているときは、Owner の答えとはみなさず、要約の確認で Owner が確定するまで下書きとして扱い、空いている問いは Owner に直接聞く。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:team-formation:2fe54dd7ca9958aebbb60626ddd09f823b09679fcb12fed74534e020599017ec -->
- Team Formation では、席がこの Mac と GitHub 上にあるときは時差・拠点・外部の協力会社の質問を外し、すでに進んでいる取り組みとの関係（二重の作業がないか）を最初に聞く。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:team-formation:be7b0b57f2fe80999c21ed3a51ba3bcf11260f36008f455d66e1f41fe791782b -->
- 承認済みの段の答えを後の段で変える依頼があったときは、後の段の中で書き換える案と段を開き直す案を示して Owner に選んでもらい、承認済みの記録を黙って書き換えない。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:team-formation:07d229fbaa7c38b227f4c4c0a1f1c2c1ac97f32e9949d6cf3b223d7b09973ada -->
- Approval & Handoff では、決定を Owner が対話で下す体制のとき「関係者全員の合意」の質問を外し、記録が席の読める GitHub に載っているか（載せ方）を聞く。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:approval-handoff:bda97589b4bacc2427096291e83167121d0726fcfe25fa4c2375c5d4b9152502 -->
- 段の境目の確認で、後の段で足した項目に前の段の裏づけがないときは、外すべき項目でなければ止めずに「注意」として残し、次の段で確かめる。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:approval-handoff:0cb8bad0a9f172adf346121497784c6eb600dc2b743508bd5f58e291d451c87c -->
- Reverse Engineering では、取り組みの範囲に関係する部品がすでに実装済みかを重点に読み、要件定義で作り直しを避けるために「すでにあるもの」と「まだ無いもの」を分けて書く。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:reverse-engineering:ba795be437dc17c2e0f41dfbf20efb08499136707774a4c5a7952079d46c1764 -->
- 別の作業者を立てる段で、その道具が無いかサブエージェントの承認が無いときは、Owner に「この会話で行う」か「飛ばして後で戻る」かを選んでもらい、選ばれた形で進めたことを記録に残す。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:reverse-engineering:0a93effbfafcf5421d1fa436599afbe52cf407f165a386110c80a3b678338cbb -->
- 選択肢の説明が、iyasaka-arc#49 に記録された Owner の決定より古い時は、最新の決定の URL を引いて直してから答える。 (learned 2026-10-22) <!-- cid:261021-dev-speedup-automation:practices-discovery:4bb8a410b7c3693466acf8be65e72cc91506534aa017ac08c6030d3ae5f8cae4 -->
