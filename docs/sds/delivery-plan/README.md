# delivery plan の schema と SKILL.md への参照

delivery plan の**形と書き方の正本**は、`watchout/ai-dev-framework` の commit `561baebe980f0ae0c275b730bb5dc09cfb66b781` にある次の 2 file です。この directory には写しを置きません（同じ知識を 2 か所に置かない、SDS S3）。commit と SHA-256 で固定した参照です。

| 出所（repo・commit・path） | bytes | SHA-256 |
|---|---|---|
| `watchout/ai-dev-framework` @ `561baebe980f0ae0c275b730bb5dc09cfb66b781` の `schemas/shirube/delivery-plan.v1.schema.json` | 35699 | `e7714b11e4f9c96ef437045dc8d0ed8de5dc780ba0d935ff6bb672eff43f5ccb` |
| `watchout/ai-dev-framework` @ `561baebe980f0ae0c275b730bb5dc09cfb66b781` の `templates/skills/applying-delivery-planning/SKILL.md` | 8714 | `eaf654b3c75de52280ac07ffea6cb08cd94067fa5bf12d285431fb393089167c` |

- ADF の同じ道具（`scripts/shirube/validate-delivery-plan.mjs` ほか）は凍結（E）です。参照先は動きません。
- Shirube が自前で持つのは、計画の受付（PLAN_ADMISSION）に要る判定だけです。`scripts/sds/plan-admission-shape.mjs`（形の検査）と `scripts/sds/plan-admission.mjs`（意味の検査と判定）に置いています。schema の規則や SKILL の手順は、ここに書き写しません。
- 道筋（Suite の delivery plan）の `self_application` の `schema_digest` と `skill_digest` は、上の SHA-256 と同じ値です（`sha256:` を付けた形。例: [Suite g6](https://github.com/watchout/iyasaka-arc/issues/57#issuecomment-6290585968)）。
- 取り方と照合: `git init && git remote add origin <ADF の repo> && git fetch --depth 1 origin 561baebe980f0ae0c275b730bb5dc09cfb66b781 && git checkout -q FETCH_HEAD` のあと、上の 2 path を `wc -c` と `shasum -a 256` で照らします。
