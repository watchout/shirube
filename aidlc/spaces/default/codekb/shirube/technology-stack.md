# 使っている技術（Technology Stack）: shirube

## 言語と実行環境

| 技術 | 版 | 用途 | 出典 |
|------|----|------|------|
| JavaScript（ESM、`.mjs`） | — | すべての script | package.json `"type": "module"` |
| Node.js | ≥ 22 | 実行環境、試験（`node:test`） | package.json `engines`、workflow の `node-version: "22"` |
| YAML（ruby の `YAML.safe_load`） | runner の ruby | 道筋と作業指示の block の読取り | `scripts/sds/yaml.mjs` |
| Bash | runner | workflow の step | `.github/workflows/*.yml` |

## 開発時の依存（npm、版は固定）

| package | 版 | 用途 |
|---------|----|------|
| eslint | 10.11.0 | 構造の上限と例外の見張り |
| eslint-plugin-unicorn | 76.0.0 | 期限つき TODO |
| @eslint-community/eslint-plugin-eslint-comments | 4.8.1 | disable コメントの見張り |
| jscpd | 5.3.2 | 重複の検査 |
| knip | 6.38.0 | 使われないコード |
| dependency-cruiser | 18.4.0 | 依存の向きと循環 |

実行時の npm 依存は無い。

## 外部の道具

| 道具 | 版 | 用途 | 固定の仕方 |
|------|----|------|------------|
| gh CLI | runner | GitHub API の読取り | — |
| git | runner | 差分・追跡 file・固定 commit の読取り | — |
| gitleaks | 8.30.1 | 秘密の検査 | sha256 で固定（hygiene.yml） |
| ruff | 0.16.9 | Python の複雑さ（任意） | 版で固定 |
| vulture | 2.16 | Python の使われないコード（任意） | 版で固定 |

## CI と GitHub Actions

| 部品 | 版 | 用途 |
|------|----|------|
| actions/checkout | v4（sds-gate.yml は commit SHA で固定） | checkout |
| actions/setup-node | v4（sds-gate.yml は commit SHA で固定） | Node |
| oven-sh/setup-bun | v2 | 配布先が bun の時 |
| GitHub Actions の再利用 workflow | — | hygiene と sds-gate を配布先から呼ぶ |
