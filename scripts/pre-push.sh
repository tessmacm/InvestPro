#!/bin/sh
# InvestPro Git Pre-Push Hook
# Runs automated end-to-end real-user tests before allowing git push

echo ""
echo "========================================================================"
echo "      🚀 InvestPro Pre-Push Hook: Executing Automated E2E Suite        "
echo "========================================================================"
echo ""

# Execute E2E real-user tests via npm
npm run test:e2e

STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "❌ [PRE-PUSH ERROR] Automated E2E tests failed! Push rejected."
  echo "Please fix the failing tests before pushing your branch to remote."
  echo ""
  exit 1
fi

echo ""
echo "✅ [PRE-PUSH SUCCESS] All E2E tests passed cleanly. Proceeding with push."
echo ""
exit 0
