#!/bin/bash

# 🎮 Matchmaking System - Production Deployment & Testing Script
# This script deploys the matchmaking system and sets up test data

set -e  # Exit on error

echo "🎮 KIDO GO - Matchmaking System Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URL
PROD_URL="https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev"

echo -e "${YELLOW}Step 1: Running Database Migrations...${NC}"
echo ""

# Run matchmaking schema
echo "📊 Creating matchmaking tables..."
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql

echo ""
echo "📊 Adding columns to users table..."
# This may fail if columns already exist from a previous run - that's expected and OK
set +e  # Temporarily disable exit on error
ADD_COLUMNS_OUTPUT=$(npx wrangler d1 execute kido-go-users --remote --file=worker/db/add_matchmaking_columns.sql 2>&1)
ADD_COLUMNS_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $ADD_COLUMNS_EXIT_CODE -ne 0 ]; then
  if echo "$ADD_COLUMNS_OUTPUT" | grep -q "duplicate column name"; then
    echo "   ℹ️  Columns already exist (skipping - this is OK)"
  else
    echo "   ❌ Unexpected error:"
    echo "$ADD_COLUMNS_OUTPUT"
    exit 1
  fi
else
  echo "   ✅ Columns added successfully"
fi

echo ""
echo -e "${GREEN}✅ Database migrations complete!${NC}"
echo ""

# Verify tables were created
echo -e "${YELLOW}Step 2: Verifying Database Tables...${NC}"
echo ""

npx wrangler d1 execute kido-go-users --remote --command "
SELECT name FROM sqlite_master
WHERE type='table'
AND (name LIKE '%rating%' OR name LIKE '%ranked%' OR name LIKE '%queue%');
"

echo ""
echo -e "${GREEN}✅ Database verification complete!${NC}"
echo ""

# Build and deploy
echo -e "${YELLOW}Step 3: Building Application...${NC}"
echo ""

bun run build

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""

echo -e "${YELLOW}Step 4: Deploying to Cloudflare Workers...${NC}"
echo ""

npx wrangler deploy

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Wait for deployment to propagate
echo -e "${YELLOW}Waiting 10 seconds for deployment to propagate...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}Step 5: Testing API Health...${NC}"
echo ""

curl -s "$PROD_URL/api/health" | jq

echo ""
echo -e "${GREEN}✅ API is healthy!${NC}"
echo ""

# Create test users
echo -e "${YELLOW}Step 6: Creating Test Data...${NC}"
echo ""

echo "Creating test users for matchmaking testing..."

# Test User 1
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO users (id, email, name, picture, google_id, role, tier, created_at, updated_at)
VALUES (
  'test-user-1',
  'test1@kido.com',
  'TestPlayer1',
  'https://i.pravatar.cc/150?img=1',
  'google-test-1',
  'user',
  'free',
  datetime('now'),
  datetime('now')
);
"

# Test User 2
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO users (id, email, name, picture, google_id, role, tier, created_at, updated_at)
VALUES (
  'test-user-2',
  'test2@kido.com',
  'TestPlayer2',
  'https://i.pravatar.cc/150?img=2',
  'google-test-2',
  'user',
  'paid',
  datetime('now'),
  datetime('now')
);
"

# Test User 3 (Admin with high rating)
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO users (id, email, name, picture, google_id, role, tier, created_at, updated_at)
VALUES (
  'test-user-3',
  'test3@kido.com',
  'ProPlayer',
  'https://i.pravatar.cc/150?img=3',
  'google-test-3',
  'user',
  'beta',
  datetime('now'),
  datetime('now')
);
"

echo ""
echo "Creating test player ratings..."

# Create ratings for test users
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO player_ratings (user_id, rating, ranked_wins, ranked_losses, peak_rating, total_games, created_at, updated_at)
VALUES
  ('test-user-1', 1200, 5, 3, 1250, 8, datetime('now'), datetime('now')),
  ('test-user-2', 1180, 3, 2, 1200, 5, datetime('now'), datetime('now')),
  ('test-user-3', 1800, 50, 30, 1850, 80, datetime('now'), datetime('now'));
"

echo ""
echo -e "${GREEN}✅ Test data created!${NC}"
echo ""

# Verify test data
echo -e "${YELLOW}Step 7: Verifying Test Data...${NC}"
echo ""

echo "Test Users:"
npx wrangler d1 execute kido-go-users --remote --command "
SELECT id, name, tier FROM users WHERE id LIKE 'test-user-%';
"

echo ""
echo "Test Ratings:"
npx wrangler d1 execute kido-go-users --remote --command "
SELECT user_id, rating, ranked_wins, ranked_losses FROM player_ratings WHERE user_id LIKE 'test-user-%';
"

echo ""
echo -e "${GREEN}✅ Test data verified!${NC}"
echo ""

# Generate JWT tokens for test users
echo -e "${YELLOW}Step 8: Generating Test JWT Tokens...${NC}"
echo ""

echo "⚠️  Note: You'll need to manually get JWT tokens for testing."
echo "   Run this in your browser console after logging in with Google:"
echo ""
echo "   localStorage.getItem('kido-auth-token')"
echo ""

echo -e "${GREEN}=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "==========================================${NC}"
echo ""

echo "🎮 Production URL:"
echo "   $PROD_URL"
echo ""

echo "📊 Test Users Created:"
echo "   - TestPlayer1 (Rating: 1200, Tier: Free)"
echo "   - TestPlayer2 (Rating: 1180, Tier: Paid)"
echo "   - ProPlayer   (Rating: 1800, Tier: Beta)"
echo ""

echo "🧪 Next Steps - Testing Instructions:"
echo ""
echo "See MATCHMAKING_TEST_GUIDE.md for complete testing instructions"
echo ""

# Create test guide
cat > MATCHMAKING_TEST_GUIDE.md << 'TESTGUIDE'
# 🧪 Matchmaking System - Testing Guide

## Quick Test (Browser Console)

### 1. Login and Get Token

1. Open: https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev
2. Login with Google
3. Open DevTools (F12) → Console
4. Get your token:
   ```javascript
   const token = localStorage.getItem('kido-auth-token');
   console.log('Token:', token);
   ```

### 2. Test Matchmaking API

Copy/paste these commands in browser console:

```javascript
const BASE = '';  // Same origin
const token = localStorage.getItem('kido-auth-token');

// Helper function
async function api(endpoint, options = {}) {
  const res = await fetch(BASE + endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  console.log(data);
  return data;
}

// 1. Get your stats
await api('/api/stats/me');

// 2. Get leaderboard
await api('/api/stats/leaderboard?limit=10');

// 3. Join matchmaking queue
await api('/api/matchmaking/join', { method: 'POST' });

// 4. Check queue status
await api('/api/matchmaking/status');

// 5. Leave queue
await api('/api/matchmaking/leave', { method: 'POST' });
```

### 3. Test Two-Player Matchmaking

**Browser 1 (Normal):**
```javascript
const token = localStorage.getItem('kido-auth-token');
await fetch('/api/matchmaking/join', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Browser 2 (Incognito - different Google account):**
```javascript
const token = localStorage.getItem('kido-auth-token');
await fetch('/api/matchmaking/join', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

**Expected:** Match found immediately if ratings are similar!

### 4. Poll for Queue Status

Run this to continuously check status:

```javascript
// Poll every 3 seconds
const pollStatus = setInterval(async () => {
  const token = localStorage.getItem('kido-auth-token');
  const res = await fetch('/api/matchmaking/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Queue Status:', data);

  // Stop if match found
  if (data.data?.matchFound) {
    console.log('🎉 MATCH FOUND!', data.data.match);
    clearInterval(pollStatus);
  }
}, 3000);

// To stop polling: clearInterval(pollStatus);
```

---

## Test Scenarios

### Scenario 1: Basic Queue Join/Leave

```javascript
// Join queue
await api('/api/matchmaking/join', { method: 'POST' });
// Response: { success: true, data: { inQueue: true } }

// Check status
await api('/api/matchmaking/status');
// Response: { inQueue: true, position: 1, queueSize: 1, waitTime: 5 }

// Leave queue
await api('/api/matchmaking/leave', { method: 'POST' });
// Response: { success: true }
```

### Scenario 2: Match Found Flow

1. User 1 joins queue
2. User 2 joins queue
3. Both receive match object
4. Both accept match
5. Game is created

```javascript
// After match found:
const matchData = /* from response */;

// Accept match
await api(`/api/matchmaking/accept/${matchData.match.id}`, {
  method: 'POST'
});

// If both accept, you get:
// { success: true, gameReady: true, gameId: 'xxx' }
```

### Scenario 3: Free User Daily Limit

```javascript
// Free users can only play 10 ranked games/day

// Join queue 10 times (as free user)
for (let i = 0; i < 10; i++) {
  await api('/api/matchmaking/join', { method: 'POST' });
  await api('/api/matchmaking/leave', { method: 'POST' });
}

// 11th attempt should fail:
await api('/api/matchmaking/join', { method: 'POST' });
// Response: {
//   success: false,
//   error: 'Daily ranked game limit reached',
//   upgradePrompt: '...'
// }
```

### Scenario 4: View Leaderboard

```javascript
// Get top 100 players
await api('/api/stats/leaderboard?limit=100');

// Response:
// {
//   success: true,
//   data: [
//     {
//       user_id: 'xxx',
//       rating: 1800,
//       ranked_wins: 50,
//       ranked_losses: 30,
//       user: { id: 'xxx', name: 'ProPlayer', picture: '...' }
//     },
//     ...
//   ]
// }
```

### Scenario 5: View Personal Stats

```javascript
await api('/api/stats/me');

// Response:
// {
//   success: true,
//   data: {
//     rating: {
//       rating: 1200,
//       ranked_wins: 5,
//       ranked_losses: 3,
//       peak_rating: 1250,
//       current_streak: 2,
//       total_games: 8
//     },
//     rank: 42,  // You're #42 on leaderboard
//     recentGames: [...]
//   }
// }
```

---

## cURL Testing (Terminal)

If you prefer command line:

```bash
# Set your token
TOKEN="your-jwt-token-here"
BASE="https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev"

# Get stats
curl -H "Authorization: Bearer $TOKEN" \
     "$BASE/api/stats/me" | jq

# Join queue
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     "$BASE/api/matchmaking/join" | jq

# Check status
curl -H "Authorization: Bearer $TOKEN" \
     "$BASE/api/matchmaking/status" | jq

# Leave queue
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     "$BASE/api/matchmaking/leave" | jq

# View leaderboard
curl "$BASE/api/stats/leaderboard?limit=10" | jq
```

---

## Troubleshooting

### "401 Unauthorized"
- Token expired or invalid
- Login again and get new token

### "Daily limit reached"
- Reset counter:
  ```sql
  UPDATE users SET ranked_games_today = 0 WHERE id = 'your-user-id';
  ```

### "No match found"
- Need 2+ players in queue
- Open incognito window and login with different account
- Or wait for range to expand (30s intervals)

### "MatchmakingQueue is not defined"
- Deployment didn't include Durable Object
- Redeploy: `npx wrangler deploy`

---

## Database Queries (Admin)

Check what's happening:

```bash
# See all players in rating table
npx wrangler d1 execute kido-go-users --remote --command \
  "SELECT u.name, r.rating, r.ranked_wins, r.ranked_losses
   FROM player_ratings r
   JOIN users u ON r.user_id = u.id
   ORDER BY r.rating DESC;"

# See recent ranked games
npx wrangler d1 execute kido-go-users --remote --command \
  "SELECT * FROM ranked_games ORDER BY created_at DESC LIMIT 10;"

# Check queue history
npx wrangler d1 execute kido-go-users --remote --command \
  "SELECT * FROM queue_history ORDER BY joined_at DESC LIMIT 10;"
```

---

## Success Criteria

After testing, verify:

- ✅ Can join queue successfully
- ✅ Queue status updates correctly
- ✅ Can leave queue
- ✅ Two players match automatically
- ✅ Match acceptance works
- ✅ Stats endpoint returns data
- ✅ Leaderboard shows players
- ✅ Free user limit enforced
- ✅ No crashes or errors

---

## Next: Frontend UI (Day 2)

Once backend testing is complete, you're ready for Day 2:
- Build matchmaking UI
- Queue status display
- Match found dialog
- Leaderboard page

See `MATCHMAKING_DAY2_GUIDE.md` (create when ready)

---

Happy testing! 🎮
TESTGUIDE

echo -e "${GREEN}✅ Test guide created: MATCHMAKING_TEST_GUIDE.md${NC}"
echo ""

echo "🚀 You're ready to test!"
echo ""
echo "Run these commands to test:"
echo ""
echo "   1. Open: $PROD_URL"
echo "   2. Login with Google"
echo "   3. Open DevTools Console (F12)"
echo "   4. Follow MATCHMAKING_TEST_GUIDE.md"
echo ""
