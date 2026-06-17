#!/usr/bin/env bash
# One-shot script to add GitHub secrets and push deploy workflow
# Requires: gh CLI authenticated with a token that has:
#   - Contents: Read and write
#   - Actions: Read and write
#   - (or a classic PAT with 'repo' + 'workflow' scopes)
set -euo pipefail

REPO="zonder/agents-snake-arena"
export PATH="/opt/data/home/.local/bin:$PATH"

echo "=== Checking gh auth ==="
gh auth status

echo ""
echo "=== Adding GitHub Secrets ==="

SSH_KEY=$(cat /opt/data/home/.ssh/id_ed25519)
echo "$SSH_KEY" | gh secret set DEPLOY_SSH_KEY --repo "$REPO"
echo "  ✓ DEPLOY_SSH_KEY"

echo "139.59.148.236" | gh secret set DEPLOY_HOST --repo "$REPO"
echo "  ✓ DEPLOY_HOST"

echo "root" | gh secret set DEPLOY_USER --repo "$REPO"
echo "  ✓ DEPLOY_USER"

echo "http://139.59.148.236" | gh secret set E2E_BASE_URL --repo "$REPO"
echo "  ✓ E2E_BASE_URL"

echo ""
echo "=== Verifying secrets ==="
gh secret list --repo "$REPO"

echo ""
echo "=== Pushing deploy workflow ==="
cd "$(dirname "$0")/.."
git push origin feature/playwright-smoke-e2e

echo ""
echo "=== Done! ==="
echo "Check https://github.com/$REPO/actions for the workflow."
