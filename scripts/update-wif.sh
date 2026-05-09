#!/usr/bin/env bash
# update-wif.sh: terraform apply 後に WIF 出力値を 1Password に保存し .env を再生成する
# 使い方: bash scripts/update-wif.sh [config-item]
set -euo pipefail

CONFIG_ITEM="${1:-harness-engineering-test-config}"
DEV_DIR="infra/environments/dev"

echo "▸ terraform output から WIF 値を取得..."
WIF_PROVIDER="$(terraform -chdir="$DEV_DIR" output -raw wif_provider)"
WIF_SA_PLAN="$(terraform -chdir="$DEV_DIR" output -raw wif_sa_plan)"
WIF_SA_DEPLOY="$(terraform -chdir="$DEV_DIR" output -raw wif_sa_deploy)"

echo "  WIF_PROVIDER  = $WIF_PROVIDER"
echo "  WIF_SA_PLAN   = $WIF_SA_PLAN"
echo "  WIF_SA_DEPLOY = $WIF_SA_DEPLOY"

echo ""
echo "▸ 1Password アイテムを更新: $CONFIG_ITEM"
op item edit "$CONFIG_ITEM" \
  "WIF_PROVIDER=$WIF_PROVIDER" \
  "WIF_SA_PLAN=$WIF_SA_PLAN" \
  "WIF_SA_DEPLOY=$WIF_SA_DEPLOY"

echo ""
echo "▸ .env を再生成..."
bash scripts/setup-env.sh "$CONFIG_ITEM"

echo ""
echo "✅ 完了。次のコマンドを実行してください:"
echo "   source .env"
echo "   gh secret set WIF_PROVIDER  --body \"\$WIF_PROVIDER\""
echo "   gh secret set WIF_SA_PLAN   --body \"\$WIF_SA_PLAN\""
echo "   gh secret set WIF_SA_DEPLOY --body \"\$WIF_SA_DEPLOY\""
