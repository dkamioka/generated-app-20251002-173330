#!/bin/bash

# 🧪 Quick Matchmaking Test Script
# Run this AFTER deploy-and-test-matchmaking.sh

PROD_URL="https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev"

echo "🧪 Quick Matchmaking API Tests"
echo "==============================="
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq is not installed. Output won't be formatted."
    echo "   Install with: sudo apt install jq (Ubuntu) or brew install jq (Mac)"
    echo ""
    JQ_CMD="cat"
else
    JQ_CMD="jq"
fi

echo "Note: You need to login with Google first to get a JWT token"
echo ""
echo "1. Go to: $PROD_URL"
echo "2. Login with Google"
echo "3. Open DevTools Console (F12)"
echo "4. Run: localStorage.getItem('kido-auth-token')"
echo "5. Copy the token and paste it when asked below"
echo ""

read -p "Enter your JWT token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

echo ""
echo "✅ Token received. Running tests..."
echo ""

# Test 1: Health Check
echo "Test 1: API Health Check"
echo "-------------------------"
curl -s "$PROD_URL/api/health" | $JQ_CMD
echo ""

# Test 2: Get My Stats
echo "Test 2: Get My Stats"
echo "--------------------"
curl -s -H "Authorization: Bearer $TOKEN" \
     "$PROD_URL/api/stats/me" | $JQ_CMD
echo ""

# Test 3: Get Leaderboard
echo "Test 3: Get Leaderboard (Top 10)"
echo "---------------------------------"
curl -s "$PROD_URL/api/stats/leaderboard?limit=10" | $JQ_CMD
echo ""

# Test 4: Join Queue
echo "Test 4: Join Matchmaking Queue"
echo "-------------------------------"
QUEUE_RESULT=$(curl -s -X POST \
     -H "Authorization: Bearer $TOKEN" \
     "$PROD_URL/api/matchmaking/join")
echo "$QUEUE_RESULT" | $JQ_CMD
echo ""

# Test 5: Check Status
echo "Test 5: Check Queue Status"
echo "--------------------------"
sleep 2
curl -s -H "Authorization: Bearer $TOKEN" \
     "$PROD_URL/api/matchmaking/status" | $JQ_CMD
echo ""

# Test 6: Leave Queue
echo "Test 6: Leave Queue"
echo "-------------------"
curl -s -X POST \
     -H "Authorization: Bearer $TOKEN" \
     "$PROD_URL/api/matchmaking/leave" | $JQ_CMD
echo ""

echo "✅ All tests complete!"
echo ""
echo "📝 Next Steps:"
echo "   - Open $PROD_URL in TWO browsers"
echo "   - Login with different Google accounts in each"
echo "   - Join queue in both → Should match!"
echo ""
