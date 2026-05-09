#!/usr/bin/env bash
# 1Password から .env を生成するスクリプト
# 使い方: bash scripts/setup-env.sh [config-item] [vault]
set -euo pipefail

CONFIG_ITEM="${1:-harness-engineering-test-config}"
APIKEY_ITEM="${2:-api-keys}"

echo "🔑 1Password から設定を取得しています..."

if ! op account list >/dev/null 2>&1; then
  echo "1Password にサインインしてください: eval \$(op signin)"
  exit 1
fi

# ── プロジェクト設定 ──────────────────────────────────
PROJECT_ID="$(op item get "$CONFIG_ITEM" --field PROJECT_ID --reveal)"
GITHUB_REPO="$(op item get "$CONFIG_ITEM" --field GITHUB_REPO --reveal)"
APP_NAME="$(op item get "$CONFIG_ITEM" --field APP_NAME --reveal)"
REGION="$(op item get "$CONFIG_ITEM" --field REGION --reveal 2>/dev/null || echo 'asia-northeast1')"
BILLING_ACCOUNT_ID="$(op item get "$CONFIG_ITEM" --field BILLING_ACCOUNT_ID --reveal)"

# WIF 関連（terraform apply 後に追記される。なければ空）
WIF_PROVIDER="$(op item get "$CONFIG_ITEM" --field WIF_PROVIDER --reveal 2>/dev/null || echo '')"
WIF_SA_PLAN="$(op item get "$CONFIG_ITEM" --field WIF_SA_PLAN --reveal 2>/dev/null || echo '')"
WIF_SA_DEPLOY="$(op item get "$CONFIG_ITEM" --field WIF_SA_DEPLOY --reveal 2>/dev/null || echo '')"
ALERT_EMAIL="$(op item get "$CONFIG_ITEM" --field ALERT_EMAIL --reveal 2>/dev/null || echo '')"

# ── API キー ──────────────────────────────────────────
OPENAI_API_KEY="$(op item get "$APIKEY_ITEM" --field OPENAI_API_KEY --reveal 2>/dev/null || echo '')"
GOOGLE_API_KEY="$(op item get "$APIKEY_ITEM" --field GOOGLE_API_KEY --reveal 2>/dev/null || echo '')"
GOOGLE_CSE_ID="$(op item get "$APIKEY_ITEM" --field GOOGLE_CSE_ID --reveal 2>/dev/null || echo '')"
OPENWEATHERMAP_API_KEY="$(op item get "$APIKEY_ITEM" --field OPENWEATHERMAP_API_KEY --reveal 2>/dev/null || echo '')"
GEMINI_API_KEY="$(op item get "$APIKEY_ITEM" --field GEMINI_API_KEY --reveal 2>/dev/null || echo '')"
HUGGINGFACEHUB_API_TOKEN="$(op item get "$APIKEY_ITEM" --field HUGGINGFACEHUB_API_TOKEN --reveal 2>/dev/null || echo '')"
WANDB_API_KEY="$(op item get "$APIKEY_ITEM" --field WANDB_API_KEY --reveal 2>/dev/null || echo '')"
NOTION_API_KEY="$(op item get "$APIKEY_ITEM" --field NOTION_API_KEY --reveal 2>/dev/null || echo '')"
TAVILY_API_KEY="$(op item get "$APIKEY_ITEM" --field TAVILY_API_KEY --reveal 2>/dev/null || echo '')"
SERP_API_KEY="$(op item get "$APIKEY_ITEM" --field SERP_API_KEY --reveal 2>/dev/null || echo '')"
LANGCHAIN_API_KEY="$(op item get "$APIKEY_ITEM" --field LANGCHAIN_API_KEY --reveal 2>/dev/null || echo '')"
NGROK_AUTHTOKEN="$(op item get "$APIKEY_ITEM" --field NGROK_AUTHTOKEN --reveal 2>/dev/null || echo '')"
LINE_CHANNEL_SECRET="$(op item get "$APIKEY_ITEM" --field LINE_CHANNEL_SECRET --reveal 2>/dev/null || echo '')"
LINE_CHANNEL_ACCESS_TOKEN="$(op item get "$APIKEY_ITEM" --field LINE_CHANNEL_ACCESS_TOKEN --reveal 2>/dev/null || echo '')"
OPEN_ROUTER_API_KEY="$(op item get "$APIKEY_ITEM" --field OPEN_ROUTER_API_KEY --reveal 2>/dev/null || echo '')"
X_API_KEY="$(op item get "$APIKEY_ITEM" --field X_API_KEY --reveal 2>/dev/null || echo '')"

# ── Claude Code 通知 ──────────────────────────────────
CLAUDE_DISCORD_WEBHOOK_URL="$(op read "op://harness-engineering-test-config/discord_webhook_url" 2>/dev/null || echo '')"

# ── .env を生成 ───────────────────────────────────────
cat > .env << ENVEOF
# 自動生成ファイル（1Password から生成）
# 手動編集しないこと。変更は 1Password アイテムを更新してから再生成する。
# 再生成: bash scripts/setup-env.sh

# ── プロジェクト設定 ──
PROJECT_ID="${PROJECT_ID}"
GITHUB_REPO="${GITHUB_REPO}"
APP_NAME="${APP_NAME}"
REGION="${REGION}"
BILLING_ACCOUNT_ID="${BILLING_ACCOUNT_ID}"

# ── Workload Identity（terraform apply 後に設定） ──
WIF_PROVIDER="${WIF_PROVIDER}"
WIF_SA_PLAN="${WIF_SA_PLAN}"
WIF_SA_DEPLOY="${WIF_SA_DEPLOY}"
ALERT_EMAIL="${ALERT_EMAIL}"

# ── Terraform 変数（source 後に terraform コマンドを実行すれば自動で読まれる） ──
TF_VAR_project_id="${PROJECT_ID}"
TF_VAR_github_repo="${GITHUB_REPO}"
TF_VAR_billing_account_id="${BILLING_ACCOUNT_ID}"
TF_VAR_app_name="${APP_NAME}"
TF_VAR_region="${REGION}"
TF_VAR_billing_account_id="${BILLING_ACCOUNT_ID}"
TF_VAR_alert_email="${ALERT_EMAIL}"

# ── API キー ──
OPENAI_API_KEY="${OPENAI_API_KEY}"
GOOGLE_API_KEY="${GOOGLE_API_KEY}"
GOOGLE_CSE_ID="${GOOGLE_CSE_ID}"
OPENWEATHERMAP_API_KEY="${OPENWEATHERMAP_API_KEY}"
GEMINI_API_KEY="${GEMINI_API_KEY}"
HUGGINGFACEHUB_API_TOKEN="${HUGGINGFACEHUB_API_TOKEN}"
WANDB_API_KEY="${WANDB_API_KEY}"
NOTION_API_KEY="${NOTION_API_KEY}"
TAVILY_API_KEY="${TAVILY_API_KEY}"
SERP_API_KEY="${SERP_API_KEY}"
LANGCHAIN_API_KEY="${LANGCHAIN_API_KEY}"
NGROK_AUTHTOKEN="${NGROK_AUTHTOKEN}"
LINE_CHANNEL_SECRET="${LINE_CHANNEL_SECRET}"
LINE_CHANNEL_ACCESS_TOKEN="${LINE_CHANNEL_ACCESS_TOKEN}"
OPEN_ROUTER_API_KEY="${OPEN_ROUTER_API_KEY}"
X_API_KEY="${X_API_KEY}"

# ── Claude Code 通知 ──
CLAUDE_DISCORD_WEBHOOK_URL="${CLAUDE_DISCORD_WEBHOOK_URL}"
ENVEOF

echo "✅ .env を生成しました"
echo "   次のコマンドで有効化: source .env"
