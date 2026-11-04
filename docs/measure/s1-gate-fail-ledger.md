# Shirube S1-SH-04 の台帳: 門が出した FAIL の一覧（devauditor の分類の入力）

版 1（2026-11-04、作者 = arc）。置き場 = shirube `docs/measure/s1-gate-fail-ledger.md`。

- 適用 ID: OD-SHIRUBE-REQUIREMENTS-MEASURES-AND-FAIL-CLASSIFICATION-20261022-001（[iyasaka-arc#49 6336035707](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6336035707)。門が FAIL を出した PR ごとに devauditor が「門の不備／PR の不備」を判定して記録し、未分類は 0 と数えない）、OD-SHIRUBE-P1-PR66-EXACT-HEAD-AND-P1-SETTINGS-20261024-001（[同 6379461383](https://github.com/watchout/iyasaka-arc/issues/49#issuecomment-6379461383)。P1 の統合の後に門が FAIL を出した PR ごとに devauditor が分類を書く）、OD-SHIRUBE-S1-SCOPE-NARROWED-BASELINE-ONCE-HANDS-NOT-MET-20261027-001（S1 の済みは S1-SH-01〜06）。
- 何に使うか: S1-SH-04「正しい PR は止まらない」の判定。門が統合を止める FAIL（status `sds-gate` の failure・error）のうち、門の側の誤りで止めた物（以下「門の不備」）が何件あるかを、独立の監査（devauditor）が 1 行ずつ分類して数える。arc はこの台帳に事実だけを並べ、分類はしない。
- この台帳に入れない物: 判定 4・5 の report-only の結果（status は success のまま、JSON の中だけの FAIL。統合を止めないので S1-SH-04 の対象外。判定 4 を止める形にするかの S1-SH-02 で別に扱う）。

## 1. 測り方

- 窓: shirube の P1（[shirube#66](https://github.com/watchout/shirube/pull/66)、門の土台を入れた保護面の PR）の統合 `2026-10-24T03:48:03Z` から `2026-11-04T11:00:00Z` まで。
- 対象: watchout/shirube・aun・onza の PR のうち、窓の中に更新があった物の全 commit。各 commit の status のうち context が `sds-gate` で、作られた時刻が窓の中の物。同じ commit の同じ状態と説明の重なりは 1 つに数える。
- まとめ方: (repo, PR, 種類) ごとに 1 行。種類は status の説明の頭の文で決める（§2）。
- 読めなかった commit: 0（GitHub の 502・500 で読めなかった 8 commit は読み直して埋めた）。
- 測った script（下の全文。SHA-256 `8fab256433c1e6de6dd55f6dcd64a81173670515cb868dce05fd8b41f0a54ede`）。使うのは GitHub の GET だけ。同じ窓で流すと同じ数が出る。

```python
# S1-SH-04 の台帳の測り: shirube の P1（shirube#66）の統合から UNTIL までに、shirube・aun・onza の PR の各 commit に
# 門（status の context = sds-gate）が出した failure・error を集め、(repo, PR, 種類) ごとにまとめる。使うのは GitHub の GET だけ。
# 読めなかった commit は unread に出し、0 件のまま成功にしない（S5）。python3 s1-gate-fails.py > out.json
import json, subprocess, sys
SINCE, UNTIL = '2026-10-24T03:48:03Z', '2026-11-04T11:00:00Z'
KINDS = [('K1', '3 audit: R2+ needs'), ('K2', 'PR head/base/state changed'), ('K3', '2 changed paths'), ('K4', '1 risk_class'),
         ('K6', 'protected paths: the base pin could not be read'), ('K8', 'CI PR/head/base differs'),
         ('K9', 'Required check not successful'), ('K9', 'Workflow not successful'), ('K10', 'Review edited during verification')]
def kind(desc):
    desc = desc.replace('\n', ' ')
    if desc.startswith('Command failed: gh api') and '/logs' in desc: return 'K5'
    if 'base_moved is not requested' in desc: return 'K7'
    for k, head in KINDS:
        if desc.startswith(head): return k
    return 'K?'
def gh(path):
    r = subprocess.run(['gh', 'api', '--paginate', '--slurp', path], capture_output=True, text=True)
    if r.returncode != 0: return None
    return [x for page in json.loads(r.stdout) for x in (page if isinstance(page, list) else [page])]
out = {'since': SINCE, 'until': UNTIL, 'prs_with_gate_status': 0, 'merged': 0, 'fail_statuses': 0, 'rows': [], 'unread': []}
groups = {}
for repo in ['watchout/shirube', 'watchout/aun', 'watchout/onza']:
    prs = [p for p in (gh('repos/%s/pulls?state=all&sort=updated&direction=desc&per_page=100' % repo) or []) if p['updated_at'] >= SINCE]
    for p in prs:
        seen_status = False
        for c in gh('repos/%s/pulls/%d/commits?per_page=100' % (repo, p['number'])) or []:
            st = gh('repos/%s/commits/%s/statuses?per_page=100' % (repo, c['sha']))
            if st is None:
                out['unread'].append('%s@%s' % (repo, c['sha'])); continue
            seen = set()
            for s in st:
                if s['context'] != 'sds-gate' or not (SINCE <= s['created_at'] <= UNTIL): continue
                seen_status = True
                if s['state'] not in ('failure', 'error') or (s['state'], s['description']) in seen: continue
                seen.add((s['state'], s['description']))
                out['fail_statuses'] += 1
                key = (repo.split('/')[1], p['number'], kind(s['description']))
                groups.setdefault(key, []).append((s['created_at'], c['sha'], s['target_url']))
        if seen_status:
            out['prs_with_gate_status'] += 1
            out['merged'] += 1 if p.get('merged_at') else 0
for (repo, pr, k), rs in sorted(groups.items()):
    rs.sort()
    out['rows'].append({'pr': '%s#%d' % (repo, pr), 'kind': k, 'fails': len(rs), 'first': rs[0][0], 'last': rs[-1][0], 'first_sha': rs[0][1], 'first_run': rs[0][2]})
out['prs_with_fail'] = len({r['pr'] for r in out['rows']})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
```

## 2. 数

- 窓の中に門の status がある PR: 107（うち統合済み 71）
- FAIL の status: 215（PR 80 本）
- 行（PR × 種類）: 121

| 種類 | 門の出した理由（status の説明の頭） | 意味 | 行（PR × 種類） | FAIL の status の数 |
|---|---|---|---|---|
| K1 | `3 audit: R2+ needs audit.request, audit.request_sha256 and audit.review` | 判定 3。R2 以上の PR の版に、監査の依頼・依頼の指紋・返却の 3 つが無い | 76 | 167 |
| K2 | `PR head/base/state changed` | 門の実行の途中で PR の版・base・状態が変わった（統合の後の実行を含む） | 19 | 19 |
| K3 | `2 changed paths: the block differs from the PR diff` | 判定 2。PR 本文の changed_paths と実際の差分が違う | 12 | 14 |
| K4 | `1 risk_class: exactly one risk:R0..risk:R4 label is required` | 判定 1。risk の label がちょうど 1 つ無い | 4 | 4 |
| K5 | `Command failed: gh api …/actions/jobs/<id>/logs …` | 門が CI の job の log を読めなかった（gh の失敗） | 3 | 3 |
| K6 | `protected paths: the base pin could not be read (Command failed: gh api …)` | 門が base の pin を読めなかった（gh の失敗） | 2 | 2 |
| K7 | `PR base changed and base_moved is not requested for this base branch` | base が動いたのに、監査の依頼に base_moved が無い | 1 | 1 |
| K8 | `CI PR/head/base differs` | CI が見た PR・版・base が門の見る物と違う | 2 | 2 |
| K9 | `Required check not successful / Workflow not successful` | 必須の検査・workflow が成功していない | 1 | 2 |
| K10 | `Review edited during verification` | 確かめの途中で返却の comment が編集された | 1 | 1 |

## 3. 行の一覧

| 行 | PR | 種類 | FAIL の数 | 最初 | 最後 | 統合 | 最初の FAIL の版 | 最初の FAIL の門の実行 |
|---|---|---|---|---|---|---|---|---|
| G001 | aun#52 | K3 | 2 | 2026-10-28T00:53:46Z | 2026-10-28T01:29:02Z | 済み | `246178df7500` | https://github.com/watchout/aun/actions/runs/40611654077 |
| G002 | aun#53 | K1 | 1 | 2026-10-28T00:42:12Z | 2026-10-28T00:42:12Z | 済み | `aec149cc2b6f` | https://github.com/watchout/aun/actions/runs/40610419119 |
| G003 | aun#54 | K1 | 2 | 2026-10-28T01:03:23Z | 2026-10-28T01:51:57Z | 済み | `74a0725df907` | https://github.com/watchout/aun/actions/runs/40612668532 |
| G004 | aun#54 | K3 | 1 | 2026-10-28T01:41:22Z | 2026-10-28T01:41:22Z | 済み | `8d2924c6119f` | https://github.com/watchout/aun/actions/runs/40616515582 |
| G005 | aun#55 | K4 | 1 | 2026-10-28T00:52:33Z | 2026-10-28T00:52:33Z | 済み | `72c525eb0b31` | https://github.com/watchout/aun/actions/runs/40611528259 |
| G006 | aun#55 | K1 | 1 | 2026-10-28T01:10:57Z | 2026-10-28T01:10:57Z | 済み | `72c525eb0b31` | https://github.com/watchout/aun/actions/runs/40613446603 |
| G007 | aun#56 | K1 | 3 | 2026-10-28T06:34:08Z | 2026-10-28T07:05:24Z | 済み | `4b73e5787353` | https://github.com/watchout/aun/actions/runs/40644628825 |
| G008 | aun#57 | K4 | 1 | 2026-10-28T07:36:15Z | 2026-10-28T07:36:15Z | 済み | `850f85312db4` | https://github.com/watchout/aun/actions/runs/40651128904 |
| G009 | aun#57 | K1 | 2 | 2026-10-28T07:55:36Z | 2026-10-28T08:17:49Z | 済み | `850f85312db4` | https://github.com/watchout/aun/actions/runs/40653204229 |
| G010 | aun#57 | K2 | 1 | 2026-10-28T08:02:51Z | 2026-10-28T08:02:51Z | 済み | `0f65c1576205` | https://github.com/watchout/aun/actions/runs/40654003837 |
| G011 | aun#58 | K1 | 5 | 2026-10-28T08:35:33Z | 2026-10-28T23:38:14Z | 済み | `138641b909cb` | https://github.com/watchout/aun/actions/runs/40657875648 |
| G012 | aun#59 | K1 | 1 | 2026-10-28T09:11:50Z | 2026-10-28T09:11:50Z | 済み | `b2a9ee99e5ed` | https://github.com/watchout/aun/actions/runs/40662334602 |
| G013 | aun#59 | K2 | 1 | 2026-10-28T09:13:51Z | 2026-10-28T09:13:51Z | 済み | `b2a9ee99e5ed` | https://github.com/watchout/aun/actions/runs/40662592586 |
| G014 | aun#60 | K4 | 1 | 2026-10-28T08:57:33Z | 2026-10-28T08:57:33Z | 済み | `85fff91cd7b1` | https://github.com/watchout/aun/actions/runs/40660523438 |
| G015 | aun#60 | K3 | 2 | 2026-10-28T10:46:26Z | 2026-10-28T11:28:54Z | 済み | `5f6f86174351` | https://github.com/watchout/aun/actions/runs/40674733795 |
| G016 | aun#61 | K1 | 1 | 2026-10-28T10:33:42Z | 2026-10-28T10:33:42Z | 済み | `e19eda84bcb0` | https://github.com/watchout/aun/actions/runs/40673071330 |
| G017 | aun#62 | K1 | 4 | 2026-10-28T11:06:43Z | 2026-10-28T12:31:29Z | 済み | `23c0e25af5eb` | https://github.com/watchout/aun/actions/runs/40677370882 |
| G018 | aun#62 | K8 | 1 | 2026-10-28T12:08:47Z | 2026-10-28T12:08:47Z | 済み | `cb756eacd23d` | https://github.com/watchout/aun/actions/runs/40685403098 |
| G019 | aun#62 | K7 | 1 | 2026-10-28T12:18:25Z | 2026-10-28T12:18:25Z | 済み | `cb756eacd23d` | https://github.com/watchout/aun/actions/runs/40686697580 |
| G020 | aun#63 | K1 | 2 | 2026-10-28T13:11:28Z | 2026-10-28T14:31:14Z | 済み | `0b619e8a59e5` | https://github.com/watchout/aun/actions/runs/40694135168 |
| G021 | aun#64 | K4 | 1 | 2026-10-28T13:01:15Z | 2026-10-28T13:01:15Z | 済み | `ab4136d5790a` | https://github.com/watchout/aun/actions/runs/40692651985 |
| G022 | aun#64 | K1 | 3 | 2026-10-28T13:01:37Z | 2026-10-28T15:09:36Z | 済み | `ab4136d5790a` | https://github.com/watchout/aun/actions/runs/40692710045 |
| G023 | aun#64 | K9 | 2 | 2026-10-28T14:56:11Z | 2026-10-28T14:56:29Z | 済み | `9a135f367026` | https://github.com/watchout/aun/actions/runs/40710825881 |
| G024 | aun#64 | K8 | 1 | 2026-10-28T14:59:07Z | 2026-10-28T14:59:07Z | 済み | `9a135f367026` | https://github.com/watchout/aun/actions/runs/40711299098 |
| G025 | aun#65 | K1 | 2 | 2026-10-29T00:18:07Z | 2026-10-29T00:42:47Z | 済み | `8f908f3cfe20` | https://github.com/watchout/aun/actions/runs/40793135767 |
| G026 | aun#66 | K1 | 3 | 2026-10-29T06:03:39Z | 2026-10-29T17:02:30Z | 済み | `5b335c6a614d` | https://github.com/watchout/aun/actions/runs/40826930435 |
| G027 | aun#68 | K1 | 1 | 2026-10-30T04:49:48Z | 2026-10-30T04:49:48Z | 済み | `3bb8384d9462` | https://github.com/watchout/aun/actions/runs/41005031607 |
| G028 | aun#68 | K2 | 1 | 2026-10-30T04:58:23Z | 2026-10-30T04:58:23Z | 済み | `3bb8384d9462` | https://github.com/watchout/aun/actions/runs/41005791763 |
| G029 | aun#69 | K1 | 4 | 2026-11-01T11:35:02Z | 2026-11-01T13:38:39Z | 済み | `473128047a44` | https://github.com/watchout/aun/actions/runs/41302512465 |
| G030 | aun#69 | K2 | 1 | 2026-11-01T13:25:26Z | 2026-11-01T13:25:26Z | 済み | `ae81b60f3203` | https://github.com/watchout/aun/actions/runs/41311164562 |
| G031 | aun#70 | K1 | 1 | 2026-11-02T00:47:28Z | 2026-11-02T00:47:28Z | 済み | `575392ab60c4` | https://github.com/watchout/aun/actions/runs/41369027203 |
| G032 | aun#70 | K2 | 1 | 2026-11-02T02:17:37Z | 2026-11-02T02:17:37Z | 済み | `575392ab60c4` | https://github.com/watchout/aun/actions/runs/41376920445 |
| G033 | aun#73 | K1 | 6 | 2026-11-02T04:54:15Z | 2026-11-02T07:53:03Z | 済み | `9f226dd04b49` | https://github.com/watchout/aun/actions/runs/41390968338 |
| G034 | aun#75 | K1 | 1 | 2026-11-02T09:17:43Z | 2026-11-02T09:17:43Z | 閉じた | `c22308c928ae` | https://github.com/watchout/aun/actions/runs/41419428855 |
| G035 | aun#76 | K1 | 2 | 2026-11-02T09:55:36Z | 2026-11-02T10:15:30Z | 済み | `0f93d8e3e5e9` | https://github.com/watchout/aun/actions/runs/41424576885 |
| G036 | aun#77 | K1 | 1 | 2026-11-02T11:08:23Z | 2026-11-02T11:08:23Z | 済み | `614d717e3af1` | https://github.com/watchout/aun/actions/runs/41434347916 |
| G037 | aun#78 | K1 | 2 | 2026-11-02T12:40:17Z | 2026-11-02T13:16:20Z | 済み | `5f0d494e8e4f` | https://github.com/watchout/aun/actions/runs/41446573337 |
| G038 | aun#79 | K1 | 1 | 2026-11-02T22:01:01Z | 2026-11-02T22:01:01Z | 済み | `ca00ab89c2aa` | https://github.com/watchout/aun/actions/runs/41533501104 |
| G039 | aun#84 | K1 | 2 | 2026-11-03T02:51:43Z | 2026-11-03T03:20:59Z | 済み | `48a532bc5830` | https://github.com/watchout/aun/actions/runs/41568676375 |
| G040 | aun#84 | K2 | 1 | 2026-11-03T03:25:53Z | 2026-11-03T03:25:53Z | 済み | `06bfefff3042` | https://github.com/watchout/aun/actions/runs/41572136121 |
| G041 | aun#85 | K1 | 1 | 2026-11-03T04:14:52Z | 2026-11-03T04:14:52Z | 済み | `a38176c13d8b` | https://github.com/watchout/aun/actions/runs/41576971154 |
| G042 | aun#87 | K1 | 2 | 2026-11-03T06:02:21Z | 2026-11-03T06:13:48Z | 済み | `30d60c110ad4` | https://github.com/watchout/aun/actions/runs/41587365806 |
| G043 | aun#88 | K1 | 3 | 2026-11-03T06:43:03Z | 2026-11-03T11:30:29Z | 済み | `777036ebef5d` | https://github.com/watchout/aun/actions/runs/41591627624 |
| G044 | aun#89 | K6 | 1 | 2026-11-03T13:01:47Z | 2026-11-03T13:01:47Z | 済み | `544d07ed2bbc` | https://github.com/watchout/aun/actions/runs/41640647921 |
| G045 | aun#90 | K6 | 1 | 2026-11-03T13:17:28Z | 2026-11-03T13:17:28Z | 済み | `521c85192ae9` | https://github.com/watchout/aun/actions/runs/41642981005 |
| G046 | aun#90 | K1 | 2 | 2026-11-03T14:02:36Z | 2026-11-03T17:56:09Z | 済み | `521c85192ae9` | https://github.com/watchout/aun/actions/runs/41649791162 |
| G047 | aun#90 | K3 | 1 | 2026-11-03T17:22:31Z | 2026-11-03T17:22:31Z | 済み | `7ce5796bf782` | https://github.com/watchout/aun/actions/runs/41683566621 |
| G048 | aun#92 | K1 | 1 | 2026-11-03T16:54:55Z | 2026-11-03T16:54:55Z | 済み | `0f2ee1991918` | https://github.com/watchout/aun/actions/runs/41678962463 |
| G049 | aun#93 | K1 | 1 | 2026-11-04T05:27:08Z | 2026-11-04T05:27:08Z | 開いている | `16744b5a2264` | https://github.com/watchout/aun/actions/runs/41779311069 |
| G050 | aun#95 | K1 | 1 | 2026-11-04T08:20:15Z | 2026-11-04T08:20:15Z | 閉じた | `e8fae699e0ec` | https://github.com/watchout/aun/actions/runs/41798696388 |
| G051 | aun#96 | K1 | 4 | 2026-11-04T10:21:25Z | 2026-11-04T10:56:48Z | 開いている | `7ac83b256434` | https://github.com/watchout/aun/actions/runs/41813603102 |
| G052 | onza#38 | K1 | 2 | 2026-11-03T02:17:02Z | 2026-11-03T15:38:07Z | 開いている | `3ccf63d4c59f` | https://github.com/watchout/onza/actions/runs/41565116879 |
| G053 | onza#39 | K1 | 2 | 2026-11-03T04:00:52Z | 2026-11-03T16:17:55Z | 開いている | `fccbec9e3438` | https://github.com/watchout/onza/actions/runs/41575548174 |
| G054 | onza#39 | K3 | 1 | 2026-11-03T09:54:08Z | 2026-11-03T09:54:08Z | 開いている | `ad229a0496e6` | https://github.com/watchout/onza/actions/runs/41614735597 |
| G055 | onza#40 | K1 | 1 | 2026-11-03T20:26:06Z | 2026-11-03T20:26:06Z | 開いている | `d716ce10e113` | https://github.com/watchout/onza/actions/runs/41712475444 |
| G056 | onza#41 | K1 | 2 | 2026-11-03T04:51:23Z | 2026-11-03T16:28:56Z | 開いている | `a6201b5efb5c` | https://github.com/watchout/onza/actions/runs/41580498708 |
| G057 | onza#42 | K1 | 2 | 2026-11-03T05:18:38Z | 2026-11-03T17:04:33Z | 開いている | `7a5210222ed1` | https://github.com/watchout/onza/actions/runs/41583145578 |
| G058 | onza#42 | K3 | 1 | 2026-11-03T09:59:04Z | 2026-11-03T09:59:04Z | 開いている | `6ca8d94eab51` | https://github.com/watchout/onza/actions/runs/41615405058 |
| G059 | onza#43 | K1 | 5 | 2026-11-03T05:45:59Z | 2026-11-04T09:13:22Z | 開いている | `db460796ce0f` | https://github.com/watchout/onza/actions/runs/41585794789 |
| G060 | onza#44 | K1 | 2 | 2026-11-03T06:27:46Z | 2026-11-03T10:12:29Z | 開いている | `f23987c24ace` | https://github.com/watchout/onza/actions/runs/41590005023 |
| G061 | onza#44 | K3 | 1 | 2026-11-03T10:06:25Z | 2026-11-03T10:06:25Z | 開いている | `7ecaaa53d76c` | https://github.com/watchout/onza/actions/runs/41616437860 |
| G062 | onza#45 | K1 | 3 | 2026-11-03T07:01:04Z | 2026-11-03T22:30:05Z | 開いている | `993e1df56eb8` | https://github.com/watchout/onza/actions/runs/41593503352 |
| G063 | onza#46 | K1 | 2 | 2026-11-03T08:03:21Z | 2026-11-03T10:12:06Z | 開いている | `ae67198c97c4` | https://github.com/watchout/onza/actions/runs/41600432315 |
| G064 | onza#47 | K1 | 2 | 2026-11-03T08:18:22Z | 2026-11-03T18:26:23Z | 開いている | `de5c44fc75de` | https://github.com/watchout/onza/actions/runs/41602267716 |
| G065 | onza#47 | K10 | 1 | 2026-11-03T18:31:50Z | 2026-11-03T18:31:50Z | 開いている | `c65f15ac0031` | https://github.com/watchout/onza/actions/runs/41694603312 |
| G066 | onza#48 | K1 | 2 | 2026-11-03T08:37:13Z | 2026-11-03T18:56:24Z | 開いている | `4910adfaaa5c` | https://github.com/watchout/onza/actions/runs/41604608240 |
| G067 | onza#49 | K1 | 2 | 2026-11-03T09:55:06Z | 2026-11-03T19:11:44Z | 開いている | `f70718f9c7fa` | https://github.com/watchout/onza/actions/runs/41614876267 |
| G068 | onza#49 | K3 | 1 | 2026-11-03T10:16:57Z | 2026-11-03T10:16:57Z | 開いている | `106c6b80fac6` | https://github.com/watchout/onza/actions/runs/41617928418 |
| G069 | onza#50 | K1 | 1 | 2026-11-03T13:21:19Z | 2026-11-03T13:21:19Z | 開いている | `beba6475ffc3` | https://github.com/watchout/onza/actions/runs/41643563990 |
| G070 | onza#51 | K1 | 4 | 2026-11-03T14:14:31Z | 2026-11-04T06:07:47Z | 開いている | `ad100386720c` | https://github.com/watchout/onza/actions/runs/41651712418 |
| G071 | onza#51 | K3 | 1 | 2026-11-03T14:28:11Z | 2026-11-03T14:28:11Z | 開いている | `a27f65d96c90` | https://github.com/watchout/onza/actions/runs/41653951402 |
| G072 | onza#52 | K1 | 2 | 2026-11-03T14:36:18Z | 2026-11-03T21:08:59Z | 開いている | `3673c3ccff42` | https://github.com/watchout/onza/actions/runs/41655275272 |
| G073 | onza#53 | K1 | 2 | 2026-11-03T02:04:44Z | 2026-11-03T20:13:03Z | 開いている | `f9a926ef8274` | https://github.com/watchout/onza/actions/runs/41563818997 |
| G074 | onza#54 | K1 | 2 | 2026-11-03T14:50:49Z | 2026-11-03T21:24:30Z | 開いている | `50a325ffdf00` | https://github.com/watchout/onza/actions/runs/41657670657 |
| G075 | onza#55 | K1 | 3 | 2026-11-03T15:06:11Z | 2026-11-04T05:44:12Z | 開いている | `fcaed50e4639` | https://github.com/watchout/onza/actions/runs/41660315065 |
| G076 | onza#56 | K1 | 6 | 2026-11-03T03:51:05Z | 2026-11-04T08:42:56Z | 開いている | `a0127ddd530b` | https://github.com/watchout/onza/actions/runs/41574613059 |
| G077 | onza#56 | K3 | 1 | 2026-11-03T16:13:19Z | 2026-11-03T16:13:19Z | 開いている | `caf79f4bf92c` | https://github.com/watchout/onza/actions/runs/41671898501 |
| G078 | onza#57 | K1 | 2 | 2026-11-03T19:44:37Z | 2026-11-04T06:40:38Z | 済み | `1b272be30e67` | https://github.com/watchout/onza/actions/runs/41706039303 |
| G079 | onza#57 | K3 | 1 | 2026-11-04T01:39:50Z | 2026-11-04T01:39:50Z | 済み | `0c0e7c7a69ef` | https://github.com/watchout/onza/actions/runs/41755567857 |
| G080 | onza#58 | K3 | 1 | 2026-11-03T11:56:30Z | 2026-11-03T11:56:30Z | 開いている | `d668bad09db6` | https://github.com/watchout/onza/actions/runs/41631535636 |
| G081 | onza#60 | K1 | 2 | 2026-11-03T14:34:15Z | 2026-11-03T20:40:35Z | 開いている | `f88233f6b626` | https://github.com/watchout/onza/actions/runs/41654955654 |
| G082 | onza#62 | K1 | 2 | 2026-11-04T09:18:19Z | 2026-11-04T09:22:51Z | 開いている | `defac3726e40` | https://github.com/watchout/onza/actions/runs/41806343890 |
| G083 | onza#63 | K1 | 1 | 2026-11-04T09:10:47Z | 2026-11-04T09:10:47Z | 開いている | `03e071eb56d0` | https://github.com/watchout/onza/actions/runs/41805289980 |
| G084 | shirube#67 | K1 | 6 | 2026-10-24T04:50:51Z | 2026-10-28T00:45:27Z | 閉じた | `3692101969c7` | https://github.com/watchout/shirube/actions/runs/40063939852 |
| G085 | shirube#68 | K1 | 7 | 2026-10-24T21:17:56Z | 2026-10-25T05:37:31Z | 済み | `d98669353cb2` | https://github.com/watchout/shirube/actions/runs/40133582943 |
| G086 | shirube#68 | K5 | 1 | 2026-10-25T05:38:09Z | 2026-10-25T05:38:09Z | 済み | `dbfc51e3f9e4` | https://github.com/watchout/shirube/actions/runs/40166235946 |
| G087 | shirube#68 | K2 | 1 | 2026-10-27T06:00:58Z | 2026-10-27T06:00:58Z | 済み | `54f419d49d10` | https://github.com/watchout/shirube/actions/runs/40458579392 |
| G088 | shirube#69 | K1 | 1 | 2026-10-26T00:40:36Z | 2026-10-26T00:40:36Z | 済み | `de5d1833dd9e` | https://github.com/watchout/shirube/actions/runs/40250495977 |
| G089 | shirube#69 | K5 | 1 | 2026-10-26T08:27:15Z | 2026-10-26T08:27:15Z | 済み | `de5d1833dd9e` | https://github.com/watchout/shirube/actions/runs/40292333838 |
| G090 | shirube#71 | K1 | 1 | 2026-10-26T10:15:08Z | 2026-10-26T10:15:08Z | 済み | `5a14aee77d39` | https://github.com/watchout/shirube/actions/runs/40305912195 |
| G091 | shirube#71 | K5 | 1 | 2026-10-26T10:15:35Z | 2026-10-26T10:15:35Z | 済み | `5a14aee77d39` | https://github.com/watchout/shirube/actions/runs/40305964558 |
| G092 | shirube#71 | K2 | 1 | 2026-10-27T05:29:53Z | 2026-10-27T05:29:53Z | 済み | `5a14aee77d39` | https://github.com/watchout/shirube/actions/runs/40455624775 |
| G093 | shirube#73 | K1 | 2 | 2026-10-27T21:52:55Z | 2026-10-27T22:13:56Z | 済み | `907f6257e5cc` | https://github.com/watchout/shirube/actions/runs/40590381211 |
| G094 | shirube#73 | K2 | 1 | 2026-10-27T22:18:22Z | 2026-10-27T22:18:22Z | 済み | `61712f5f8334` | https://github.com/watchout/shirube/actions/runs/40593761438 |
| G095 | shirube#74 | K1 | 1 | 2026-10-28T01:16:22Z | 2026-10-28T01:16:22Z | 閉じた | `94a161963836` | https://github.com/watchout/shirube/actions/runs/40614012429 |
| G096 | shirube#76 | K1 | 1 | 2026-10-28T22:41:32Z | 2026-10-28T22:41:32Z | 済み | `892299de7ad8` | https://github.com/watchout/shirube/actions/runs/40781879614 |
| G097 | shirube#76 | K2 | 1 | 2026-10-29T05:40:42Z | 2026-10-29T05:40:42Z | 済み | `892299de7ad8` | https://github.com/watchout/shirube/actions/runs/40824756161 |
| G098 | shirube#77 | K1 | 3 | 2026-10-29T23:41:47Z | 2026-10-30T00:12:54Z | 済み | `55a488b512c0` | https://github.com/watchout/shirube/actions/runs/40974852805 |
| G099 | shirube#77 | K2 | 1 | 2026-10-30T00:27:34Z | 2026-10-30T00:27:34Z | 済み | `e29b528e3b1c` | https://github.com/watchout/shirube/actions/runs/40979789004 |
| G100 | shirube#78 | K1 | 2 | 2026-10-30T00:50:02Z | 2026-10-30T01:11:19Z | 済み | `ee0e8aae3077` | https://github.com/watchout/shirube/actions/runs/40982131875 |
| G101 | shirube#78 | K2 | 1 | 2026-10-30T01:36:00Z | 2026-10-30T01:36:00Z | 済み | `37da2608b135` | https://github.com/watchout/shirube/actions/runs/40986782341 |
| G102 | shirube#79 | K1 | 1 | 2026-10-30T02:01:21Z | 2026-10-30T02:01:21Z | 済み | `b1b2161b2f71` | https://github.com/watchout/shirube/actions/runs/40989218519 |
| G103 | shirube#79 | K2 | 1 | 2026-10-30T03:43:16Z | 2026-10-30T03:43:16Z | 済み | `b1b2161b2f71` | https://github.com/watchout/shirube/actions/runs/40998923561 |
| G104 | shirube#80 | K1 | 1 | 2026-10-30T04:15:54Z | 2026-10-30T04:15:54Z | 済み | `f30f7a119b2b` | https://github.com/watchout/shirube/actions/runs/41001905024 |
| G105 | shirube#80 | K2 | 1 | 2026-10-30T04:40:05Z | 2026-10-30T04:40:05Z | 済み | `f30f7a119b2b` | https://github.com/watchout/shirube/actions/runs/41004147103 |
| G106 | shirube#82 | K1 | 1 | 2026-11-01T02:36:32Z | 2026-11-01T02:36:32Z | 済み | `cfb8f6120c81` | https://github.com/watchout/shirube/actions/runs/41265894746 |
| G107 | shirube#82 | K2 | 1 | 2026-11-01T07:54:20Z | 2026-11-01T07:54:20Z | 済み | `cfb8f6120c81` | https://github.com/watchout/shirube/actions/runs/41286611786 |
| G108 | shirube#83 | K1 | 2 | 2026-11-01T09:46:46Z | 2026-11-01T10:05:08Z | 済み | `5e16a18cbc1f` | https://github.com/watchout/shirube/actions/runs/41294576451 |
| G109 | shirube#83 | K2 | 1 | 2026-11-01T10:22:13Z | 2026-11-01T10:22:13Z | 済み | `dcf1dfc7a904` | https://github.com/watchout/shirube/actions/runs/41297177999 |
| G110 | shirube#84 | K1 | 1 | 2026-11-01T10:33:53Z | 2026-11-01T10:33:53Z | 済み | `5a5e849bc800` | https://github.com/watchout/shirube/actions/runs/41298031423 |
| G111 | shirube#84 | K2 | 1 | 2026-11-01T10:38:32Z | 2026-11-01T10:38:32Z | 済み | `5a5e849bc800` | https://github.com/watchout/shirube/actions/runs/41298372807 |
| G112 | shirube#85 | K1 | 1 | 2026-11-01T11:02:42Z | 2026-11-01T11:02:42Z | 済み | `0271d5444cf2` | https://github.com/watchout/shirube/actions/runs/41300100187 |
| G113 | shirube#85 | K2 | 1 | 2026-11-01T11:12:11Z | 2026-11-01T11:12:11Z | 済み | `0271d5444cf2` | https://github.com/watchout/shirube/actions/runs/41300824888 |
| G114 | shirube#86 | K1 | 1 | 2026-11-01T11:30:39Z | 2026-11-01T11:30:39Z | 済み | `042e772399c9` | https://github.com/watchout/shirube/actions/runs/41302177193 |
| G115 | shirube#86 | K2 | 1 | 2026-11-02T00:27:16Z | 2026-11-02T00:27:16Z | 済み | `042e772399c9` | https://github.com/watchout/shirube/actions/runs/41367209171 |
| G116 | shirube#91 | K1 | 1 | 2026-11-03T09:54:32Z | 2026-11-03T09:54:32Z | 閉じた | `493680e121a4` | https://github.com/watchout/shirube/actions/runs/41614804576 |
| G117 | shirube#92 | K1 | 2 | 2026-11-03T10:13:23Z | 2026-11-03T10:51:19Z | 済み | `50422c285ecd` | https://github.com/watchout/shirube/actions/runs/41617415696 |
| G118 | shirube#93 | K1 | 1 | 2026-11-03T11:40:11Z | 2026-11-03T11:40:11Z | 済み | `901a8bb52a60` | https://github.com/watchout/shirube/actions/runs/41629353939 |
| G119 | shirube#94 | K1 | 4 | 2026-11-03T12:45:42Z | 2026-11-04T03:46:35Z | 済み | `529bbc9bd978` | https://github.com/watchout/shirube/actions/runs/41638400542 |
| G120 | shirube#95 | K1 | 5 | 2026-11-04T03:09:27Z | 2026-11-04T08:45:43Z | 済み | `d91b49c6729e` | https://github.com/watchout/shirube/actions/runs/41765312421 |
| G121 | shirube#97 | K1 | 2 | 2026-11-04T08:45:47Z | 2026-11-04T09:58:24Z | 開いている | `496ed2910b03` | https://github.com/watchout/shirube/actions/runs/41801976289 |

## 4. 分類の決まり（devauditor が使う）

- 各行を「門の不備」「PR の不備」「観測できず」のどれか 1 つに分類し、根拠（status・門の実行の log・PR の本文と履歴の URL）を添える。
- 門の不備 = その時点の決まり（`docs/sds/distribution.md` §4 と PR の版）を PR が満たしていたのに、門が FAIL を出した物（門の code の誤り・門が GitHub を読めなかった・門の入力の取り違えを含む）。
- PR の不備 = その時点で PR が決まりを満たしていなかった物（label・changed_paths・監査の欄・必須の検査が無い・違う）。監査の前の版で判定 3 が FAIL なのは、決まりのとおりに止めた物なので PR の不備（直しが要らない途中の状態を含む）に入れ、その旨を書く。
- 観測できず = 根拠が読めず決められない物。未分類と同じく 0 には数えず、件数を出す。
- 1 行に門の不備と PR の不備が混ざる時は、FAIL の status ごとに分けて書く。

next_action: actor=devauditor; what=この台帳の 121 行を分類する; blocking=false
