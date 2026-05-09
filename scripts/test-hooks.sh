#!/usr/bin/env bash
# Hook 動作確認スクリプト（CI では実行しない）
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"
PASS=0; FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected exit $expected, got $actual)"
    FAIL=$((FAIL+1))
  fi
}

run_hook() {
  local script="$1" input="$2"
  echo "$input" | bash "$script" 2>/dev/null; return $?
}

SECRET_SCAN="$ROOT/.claude/hooks/pre-tool-use-secret-scan.sh"
AUTO_APPROVE="$ROOT/.claude/hooks/auto-approve-gate.sh"
HOOKS_PROTECT="$ROOT/.claude/hooks/protect-hooks-config.sh"

echo "=== Phase 1-A: pre-tool-use-secret-scan.sh ==="

PAT="ghp_$(python3 -c "print('A'*36)")"
run_hook "$SECRET_SCAN" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo $PAT\"}}"
check "GitHub PAT をブロック" "2" "$?"

HF="hf_$(python3 -c "print('A'*34)")"
run_hook "$SECRET_SCAN" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo $HF\"}}"
check "HuggingFace Token をブロック" "2" "$?"

NPM="npm_$(python3 -c "print('A'*36)")"
run_hook "$SECRET_SCAN" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo $NPM\"}}"
check "npm Token をブロック" "2" "$?"

FGPAT="github_pat_$(python3 -c "print('A'*82)")"
run_hook "$SECRET_SCAN" "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo $FGPAT\"}}"
check "GitHub Fine-grained PAT をブロック" "2" "$?"

run_hook "$SECRET_SCAN" '{"tool_name":"Bash","tool_input":{"command":"echo hello world"}}'
check "通常コマンドは通過" "0" "$?"

echo ""
echo "=== Phase 1-C: auto-approve-gate.sh shell injection ==="

run_hook "$AUTO_APPROVE" '{"tool_name":"Bash","tool_input":{"command":"git push `echo origin` main"}}'
check "git push + バッククォートをブロック" "2" "$?"

run_hook "$AUTO_APPROVE" '{"tool_name":"Bash","tool_input":{"command":"git push origin feat/test-branch"}}'
check "feature ブランチへの push は通過" "0" "$?"

run_hook "$AUTO_APPROVE" '{"tool_name":"Bash","tool_input":{"command":"echo hello world"}}'
check "通常 echo コマンドは通過" "0" "$?"

echo ""
echo "=== Phase 3-B: protect-hooks-config.sh ==="

NEW_CONTENT='{"hooks":{},"permissions":{"allow":[]}}'
run_hook "$HOOKS_PROTECT" "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\".claude/settings.json\",\"new_content\":$(echo "$NEW_CONTENT" | jq -Rs .)}}"
check "hooks セクション変更をブロック" "2" "$?"

run_hook "$HOOKS_PROTECT" '{"tool_name":"Write","tool_input":{"file_path":"README.md","new_content":"hello"}}'
check "他ファイルへの Write は通過" "0" "$?"

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
