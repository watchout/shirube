<!-- Shirube owner decision template. Posted by an allowed approver on the control_source; W3 verifies URL + sha256 + login. -->
```yaml
schema_version: shirube-owner-decision/v2
decision_id: OD-<REPO>-<TOPIC>-<YYYYMMDD>-<NNN>
verbatim: "<the owner's words, unchanged>"
verdict: APPROVED | REJECTED
scope:
  repository: watchout/<repo>
  operation: <merge | deploy | secret placement | workflow change | schema migration | ...>
  environment: <dev | staging | production | n/a>
  exact_head: <40-hex sha, when the decision binds a head>
single_use: true | false
expires: <YYYY-MM-DD or none>
posted_by: <login; must be in allowed approvers>
```
