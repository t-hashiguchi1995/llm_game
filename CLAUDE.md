# CLAUDE.md
@.claude/sessions/latest-summary.md

## セッション開始時（毎回実行）

```bash
cat .claude/state.json && git log --oneline -10
```

> 環境変数は dotenvx で管理。コマンド実行時は `dotenvx run -- <command>` でラップする。
> 値の変更: `.env` を `dotenvx set KEY value` で更新（平文ファイルを直接編集しない）。

## コマンド早見表

| 操作 | コマンド |
|------|---------|
| Python テスト | `cd backend && uv run pytest` |
| TS テスト | `cd frontend && npm test` |
| E2E API | `hurl --test --variable base_url=http://localhost:8000 tests/api/` |
| 健全性チェック | `bash scripts/harness-health.sh` |
| `/start-issue N` | Issue からブランチ作成・作業開始 |
| `/finish-issue N` | テスト確認 → push → PR 作成 |

## アーキテクチャ

- 意思決定の根拠: `docs/adr/` を必ず参照してから変更する
- Terraform: `infra/modules/` の既存モジュールを優先利用
- シークレット: dotenvx（暗号化 `.env`）/ GitHub Secrets / Secret Manager（`ADR-002`）

## 禁止事項（Hook で強制済み）

- 設定ファイル直接編集（`pyproject.toml` / `biome.json` / `lefthook.yml` 等）
- `git commit --no-verify` / `git push --force` / `git push origin main`
- GCP リソースの手動変更（Terraform 経由のみ、`ADR-001`）
- `.env` の直接編集（`dotenvx set` を使うこと）
- `.env.keys` のコミット・共有（DOTENV_PRIVATE_KEY は秘密鍵）
- `DOTENV_PRIVATE_KEY` のハードコード

## Cursor使用時

このCLAUDE.mdはClaude CodeとCursorの共通の真実のソースです。
`.cursor/rules/` のルールと競合する場合は、このCLAUDE.mdを優先してください。
Cursorツール固有の操作（`apply_patch`等）は `.cursor/rules/v5.mdc` を参照してください。

## 参照

- インフラセットアップ: `docs/setup-steps.md`
- トラブルシューティング: `docs/troubleshooting.md`
- ADR 一覧: `docs/adr/`
- ブランチ命名: `feat/<kebab-case>`

## PR_DESCRIPTION.md（Ralphループ必須）

`/finish-issue` を呼び出す前に、リポジトリルートに `PR_DESCRIPTION.md` を作成すること。
`pre-finish-gate.sh` がこのファイルの存在と内容を検証する。

必須セクション（10行以上）：

```markdown
## 変更内容
<!-- 何を変更したか、3〜5行で説明 -->

## 変更理由
<!-- なぜこの変更が必要か、Issue との関連 -->

## テスト方法
<!-- 動作確認手順、または自動テストのみで十分な理由 -->

## セキュリティ考慮
<!-- 影響がない場合は「なし」と明記 -->

## 関連 ADR / ドキュメント
<!-- 関連するADR番号や docs/ へのリンク -->
```

## 完了条件

```
pytest ✓  +  vitest ✓  +  terraform plan（差分なし）✓  +  PR_DESCRIPTION.md ✓
```