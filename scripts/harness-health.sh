#!/usr/bin/env bash
# harness-health.sh: ハーネスの月次健全性チェック
# 【設計方針】認証不要なチェックのみ実施。terraform init / plan は CI 側で担保。
# 【保護対象外】月次で内容を更新することがあるため protect-config.sh の対象外。
# 実行方法: bash scripts/harness-health.sh
set -euo pipefail

ok()   { echo "  ✔ $1"; }
warn() { echo "  ⚠ $1"; WARNINGS=$((WARNINGS+1)); }
fail() { echo "  ✘ $1" >&2; ERRORS=$((ERRORS+1)); }

ERRORS=0
WARNINGS=0
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "=== harness-health check ($(date '+%Y-%m-%d')) ==="

# ────────────────────────────────────────────────────────────────
# 1. 必須ツール確認（認証不要）
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ ツール確認"
for tool in git uv node npm terraform tflint hadolint gitleaks hurl lefthook jq dotenvx; do
  if command -v "$tool" >/dev/null 2>&1; then
    ok "$tool"
  else
    fail "$tool がインストールされていません"
  fi
done

# ────────────────────────────────────────────────────────────────
# 2. 必須ファイル確認
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ 必須ファイル確認"
required_files=(
  # ハーネスコア
  ".aiignore"
  ".env.template"
  "CLAUDE.md"
  "GEMINI.md"
  ".cursorrules"
  "lefthook.yml"
  # スクリプト
  "scripts/update-wif.sh"
  "scripts/harness-health.sh"
  # CI/CD
  ".github/workflows/ci.yml"
  # Terraform モジュール
  "infra/environments/dev/main.tf"
  "infra/environments/dev/variables.tf"
  "infra/environments/dev/versions.tf"
  "infra/modules/github_wif/main.tf"
  "infra/modules/github_wif/outputs.tf"
  "infra/modules/github_wif/variables.tf"
  "infra/modules/artifact_registry/main.tf"
  "infra/modules/artifact_registry/variables.tf"
  "infra/modules/billing/main.tf"
  "infra/modules/billing/variables.tf"
  # Docker
  "backend/Dockerfile"
  # ADR
  "docs/adr/ADR-001-prevent-destroy.md"
  "docs/adr/ADR-002-secret-manager.md"
  "docs/adr/ADR-003-lefthook-dockerfile-lint.md"
)
for f in "${required_files[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "$f が存在しません"
done

# ────────────────────────────────────────────────────────────────
# 3. セキュリティ確認（認証不要）
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ セキュリティ確認"

# .env が gitignore されているか（dotenvx 暗号化済みのため commit 可だが念のため確認）
if git check-ignore -q .env 2>/dev/null; then
  ok ".env は gitignore 済み"
else
  # dotenvx 暗号化済みの場合はコミット可のため警告に留める
  if grep -q "DOTENV_PUBLIC_KEY" .env 2>/dev/null; then
    warn ".env は gitignore されていませんが dotenvx 暗号化済みのため許容（.env.keys は必ず gitignore すること）"
  else
    fail ".env が gitignore されていません（重大なセキュリティリスク）"
  fi
fi

# .env.keys が gitignore されているか（秘密鍵なので絶対に commit 禁止）
if git check-ignore -q .env.keys 2>/dev/null; then
  ok ".env.keys は gitignore 済み"
else
  fail ".env.keys が gitignore されていません（DOTENV_PRIVATE_KEY が漏洩するリスク）"
fi

# .env が aiignore されているか
if grep -q "^\.env$" .aiignore 2>/dev/null; then
  ok ".env は aiignore 済み"
else
  fail ".aiignore に .env が含まれていません"
fi

# .aiignore が空でないか
if [ -s .aiignore ]; then
  ok ".aiignore に内容あり"
else
  fail ".aiignore が空ファイルです"
fi

# フックスクリプトの実行権限確認
echo ""
echo "▸ Hook スクリプト確認"
for hook in .claude/hooks/*.sh; do
  if [ -x "$hook" ]; then
    ok "$hook: 実行権限 OK"
  else
    fail "$hook: 実行権限がありません（chmod +x $hook を実行してください）"
  fi
  # bash 構文チェック（認証不要）
  if bash -n "$hook" 2>/dev/null; then
    ok "$hook: 構文 OK"
  else
    fail "$hook: bash 構文エラー"
  fi
done

# ────────────────────────────────────────────────────────────────
# 4. Terraform フォーマットチェック（認証不要・init 不要）
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ Terraform フォーマット確認（認証不要）"
tf_files=$(find infra/ -name "*.tf" 2>/dev/null | wc -l)
if [ "$tf_files" -eq 0 ]; then
  warn "infra/ に .tf ファイルが存在しません"
else
  if terraform fmt -check -recursive infra/ >/dev/null 2>&1; then
    ok "terraform fmt: フォーマット OK（${tf_files} ファイル）"
  else
    # どのファイルがずれているか表示
    unformatted=$(terraform fmt -check -recursive infra/ 2>&1 || true)
    fail "terraform fmt: フォーマット崩れあり → $unformatted"
  fi
fi

# ────────────────────────────────────────────────────────────────
# 5. ci.yml のプレースホルダー確認
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ ci.yml プレースホルダー確認"
placeholders=$(grep -E 'your-gcp-project-id|my-app' .github/workflows/ci.yml 2>/dev/null | grep -v '#' | wc -l || true)
if [ "$placeholders" -eq 0 ]; then
  ok "ci.yml: アクティブなプレースホルダーなし"
else
  fail "ci.yml に未更新のプレースホルダーが ${placeholders} 行あります（CI が通りません）"
fi

# FRONTEND_BUCKET は未作成の場合があるため警告扱い
if grep -q 'your-frontend-bucket' .github/workflows/ci.yml 2>/dev/null; then
  warn "ci.yml: FRONTEND_BUCKET が未更新です（GCS バケット作成後に更新してください）"
fi

# ────────────────────────────────────────────────────────────────
# 6-a. カスタムコマンドの存在確認
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ カスタムコマンド確認"
for cmd in start-issue finish-issue suggest-claude-md; do
  if [ -f ".claude/commands/${cmd}.md" ]; then
    ok ".claude/commands/${cmd}.md"
  else
    fail ".claude/commands/${cmd}.md が存在しません"
  fi
done

# ────────────────────────────────────────────────────────────────
# 6. CLAUDE.md の内部リンク確認
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ CLAUDE.md 内部リンク確認"
# バッククォートで囲まれたパスのうち / を含むものを抽出して存在確認
broken=0
while IFS= read -r path; do
  if [[ "$path" == /* ]] || [[ "$path" == ./* ]]; then
    continue  # 絶対パスはスキップ
  fi
  if [ -n "$path" ] && ! [ -e "$path" ]; then
    warn "CLAUDE.md: 壊れたパス参照 → $path"
    broken=$((broken+1))
  fi
done < <(grep -oE '\`[^`]+\`' CLAUDE.md 2>/dev/null | tr -d '`' | grep '/' || true)
[ "$broken" -eq 0 ] && ok "CLAUDE.md: パス参照 OK"

# ────────────────────────────────────────────────────────────────
# 7. ADR 確認
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ ADR 確認"
accepted=$(grep -rl "Status: Accepted\|## ステータス" docs/adr/*.md 2>/dev/null | wc -l || true)
total=$(find docs/adr -name "ADR-*.md" 2>/dev/null | wc -l)
if [ "$total" -ge 1 ]; then
  ok "ADR: ${total} 件（Accepted: ${accepted} 件）"
else
  warn "docs/adr/ に ADR が存在しません"
fi

# ────────────────────────────────────────────────────────────────
# 8. ADR ポインタ確認（CLAUDE.md の参照と実ファイルの整合）
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ ADR ポインタ確認（CLAUDE.md の参照と実ファイルの整合）"
while IFS= read -r adr_id; do
  matched=$(find "$ROOT/docs/adr" -name "*${adr_id}*" 2>/dev/null | head -1)
  if [ -n "$matched" ]; then
    ok "${adr_id} → $(basename "$matched")"
  else
    warn "${adr_id} が docs/adr/ に見つかりません（リネームまたは削除された可能性）"
  fi
done < <(grep -oP 'ADR-\d+' "$ROOT/CLAUDE.md" | sort -u)

# ────────────────────────────────────────────────────────────────
# 9. CLAUDE.md サイズ確認（記事推奨: 理想50行以下、上限200行）
# ────────────────────────────────────────────────────────────────
echo ""
echo "▸ CLAUDE.md サイズ確認（記事推奨: 理想50行以下、上限200行）"
line_count=$(wc -l < "$ROOT/CLAUDE.md")
if [ "$line_count" -le 50 ]; then
  ok "CLAUDE.md: ${line_count}行（記事推奨の理想50行以内）"
elif [ "$line_count" -le 80 ]; then
  warn "CLAUDE.md: ${line_count}行（記事推奨の理想50行を超過。不要な記述を docs/ に移動を検討）"
else
  fail "CLAUDE.md: ${line_count}行（肥大化リスク。指示の遵守率が低下する恐れあり）"
fi

# ────────────────────────────────────────────────────────────────
# 結果サマリー
# ────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "✅ すべてのチェックが通りました"
  echo "   terraform init / validate / plan は CI（GitHub Actions）で確認してください"
  exit 0
elif [ "$ERRORS" -eq 0 ]; then
  echo "⚠️  警告 ${WARNINGS} 件（エラーなし）"
  echo "   terraform init / validate / plan は CI（GitHub Actions）で確認してください"
  exit 0
else
  echo "❌ エラー ${ERRORS} 件 / 警告 ${WARNINGS} 件"
  echo "   上記のエラーを修正してから再実行してください"
  exit 1
fi