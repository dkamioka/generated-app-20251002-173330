# 🎮 Matchmaking System - Day 1 Implementation Guide

**Time Required:** 6-8 hours (1 full weekend day)
**Goal:** Set up database schema, rating system, and API endpoints

---

## ✅ What You'll Build Today

- ✅ Database schema for ratings and match history
- ✅ ELO rating calculation system
- ✅ Matchmaking queue (Durable Object)
- ✅ API endpoints for joining/leaving queue
- ✅ Stats and leaderboard endpoints

---

## 📋 Step-by-Step Implementation

### Part 1: Database Setup (30 minutes)

#### 1.1 Run Matchmaking Schema

```bash
# Make sure you're logged into Cloudflare
npx wrangler login

# Run the matchmaking schema
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql

# Add columns to existing users table
npx wrangler d1 execute kido-go-users --remote --file=worker/db/add_matchmaking_columns.sql
```

#### 1.2 Verify Tables Were Created

```bash
# Check that tables exist
npx wrangler d1 execute kido-go-users --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%rating%' OR name LIKE '%ranked%' OR name LIKE '%queue%';"
```

**Expected output:**
```
player_ratings
ranked_games
queue_history
```

---

### Part 2: Test Rating System (1 hour)

#### 2.1 Create Test Script

Create `test-rating-system.ts`:

```typescript
// Test the rating service locally
import { RatingService } from './worker/services/ratingService';

async function testRatingCalculations() {
  console.log('🧪 Testing ELO Rating Calculations...\n');

  // Test 1: Equal ratings, winner gets +16
  const test1 = calculateNewRating(1200, 1200, 'win');
  console.log(`Test 1 - Equal ratings (1200 vs 1200), win:`);
  console.log(`  Expected: ~1216, Got: ${test1}`);
  console.log(`  ${test1 === 1216 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 2: Lower rated player beats higher rated (+24)
  const test2 = calculateNewRating(1200, 1400, 'win');
  console.log(`Test 2 - Underdog wins (1200 vs 1400):`);
  console.log(`  Expected: ~1227, Got: ${test2}`);
  console.log(`  ${Math.abs(test2 - 1227) <= 2 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 3: Higher rated player loses to lower rated (-24)
  const test3 = calculateNewRating(1400, 1200, 'loss');
  console.log(`Test 3 - Favorite loses (1400 vs 1200):`);
  console.log(`  Expected: ~1373, Got: ${test3}`);
  console.log(`  ${Math.abs(test3 - 1373) <= 2 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 4: Draw between equal players (+0)
  const test4 = calculateNewRating(1200, 1200, 'draw');
  console.log(`Test 4 - Draw between equals (1200 vs 1200):`);
  console.log(`  Expected: 1200, Got: ${test4}`);
  console.log(`  ${test4 === 1200 ? '✅ PASS' : '❌ FAIL'}\n`);
}

function calculateNewRating(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = result === 'win' ? 1 : result === 'loss' ? 0 : 0.5;
  return Math.round(playerRating + K * (actualScore - expectedScore));
}

testRatingCalculations();
```

Run the test:
```bash
bun run test-rating-system.ts
```

**Expected: All tests should PASS ✅**

---

### Part 3: Deploy and Test API (2 hours)

#### 3.1 Build and Deploy

```bash
# Build the project
bun run build

# Deploy to Cloudflare
npx wrangler deploy
```

#### 3.2 Test API Endpoints

Create `test-matchmaking-api.sh`:

```bash
#!/bin/bash

BASE_URL="https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev"

echo "🧪 Testing Matchmaking API Endpoints"
echo "======================================"
echo ""

# First, login and get token
echo "1. Login with Google OAuth..."
# (You'll need to do this manually in the browser)
# Save your JWT token here:
TOKEN="your-jwt-token-here"

echo ""
echo "2. Testing GET /api/stats/me"
curl -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/stats/me" | jq

echo ""
echo "3. Testing GET /api/stats/leaderboard"
curl "$BASE_URL/api/stats/leaderboard?limit=10" | jq

echo ""
echo "4. Testing POST /api/matchmaking/join"
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$BASE_URL/api/matchmaking/join" | jq

echo ""
echo "5. Testing GET /api/matchmaking/status"
curl -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/matchmaking/status" | jq

echo ""
echo "6. Testing POST /api/matchmaking/leave"
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/matchmaking/leave" | jq

echo ""
echo "✅ All API tests complete!"
```

Run:
```bash
chmod +x test-matchmaking-api.sh
./test-matchmaking-api.sh
```

---

### Part 4: Manual Testing Flow (1-2 hours)

#### 4.1 Create Test Users

1. **Open production URL in browser**
2. **Sign in with Google** (this becomes User 1)
3. **Open incognito window**, sign in with different account (User 2)

#### 4.2 Test Matchmaking Flow

**User 1 Browser:**
```javascript
// Open DevTools console
// Get your JWT token from localStorage
const token = localStorage.getItem('kido-auth-token');

// Join queue
fetch('/api/matchmaking/join', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  }
}).then(r => r.json()).then(console.log);

// Check status
fetch('/api/matchmaking/status', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
}).then(r => r.json()).then(console.log);
```

**User 2 Browser (Incognito):**
```javascript
// Same as above
const token = localStorage.getItem('kido-auth-token');

fetch('/api/matchmaking/join', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  }
}).then(r => r.json()).then(console.log);
```

**Expected Result:**
- Both users join queue
- Match should be found immediately (since ratings are similar)
- Response should include `match` object with opponent info

---

## 🐛 Troubleshooting

### Issue: "MatchmakingQueue is not defined"

**Solution:**
```bash
# Make sure you exported MatchmakingQueue in worker/index.ts
# If not, add this line:
# export { MatchmakingQueue } from './durableObjects/MatchmakingQueue';

# Redeploy
npx wrangler deploy
```

### Issue: "Table player_ratings doesn't exist"

**Solution:**
```bash
# Run migrations again
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql
```

### Issue: "401 Unauthorized"

**Solution:**
- Make sure you're logged in with Google
- JWT token should be in localStorage as 'kido-auth-token'
- Token might be expired (login again)

### Issue: "Daily limit reached" for free user

**Solution:**
- Reset counter manually:
```bash
npx wrangler d1 execute kido-go-users --remote --command "UPDATE users SET ranked_games_today = 0;"
```

---

## ✅ Day 1 Completion Checklist

Before ending Day 1, verify:

- [ ] All database tables created successfully
- [ ] Rating calculation tests pass
- [ ] API endpoints deployed and accessible
- [ ] Can join matchmaking queue
- [ ] Can see queue status
- [ ] Can leave queue
- [ ] Stats endpoint returns rating data
- [ ] Leaderboard endpoint works
- [ ] Free user daily limit works (10 games max)

---

## 📊 What We Built Today

**Files Created:**
- ✅ `worker/db/matchmaking_schema.sql` - Database schema
- ✅ `worker/services/ratingService.ts` - ELO rating system
- ✅ `worker/durableObjects/MatchmakingQueue.ts` - Queue management
- ✅ `worker/routes/matchmakingRoutes.ts` - API endpoints

**Files Modified:**
- ✅ `worker/core-utils.ts` - Added MatchmakingQueue to Env
- ✅ `worker/userRoutes.ts` - Imported matchmaking routes
- ✅ `wrangler.jsonc` - Added MatchmakingQueue binding

**API Endpoints Working:**
- ✅ `POST /api/matchmaking/join`
- ✅ `POST /api/matchmaking/leave`
- ✅ `GET /api/matchmaking/status`
- ✅ `GET /api/stats/me`
- ✅ `GET /api/stats/leaderboard`

---

## 🎯 Tomorrow (Day 2): Frontend UI

On Day 2, we'll build:
- Matchmaking page with "Find Match" button
- Queue status display with animations
- Match found dialog
- Leaderboard page
- Player stats cards

**Get some rest! Day 1 is complete! 🎉**

---

## 💡 Tips for Success

1. **Test frequently** - Don't wait until the end to test
2. **Use DevTools** - Browser console is your friend
3. **Check Cloudflare dashboard** - Monitor Durable Object metrics
4. **Read error messages** - They usually tell you exactly what's wrong
5. **Take breaks** - 6-8 hours is a long session, take breaks every hour

---

## 📞 Need Help?

Common commands:
```bash
# View logs
npx wrangler tail

# Check Durable Object status
npx wrangler d1 execute kido-go-users --remote --command "SELECT COUNT(*) FROM player_ratings;"

# Reset everything (if needed)
npx wrangler d1 execute kido-go-users --remote --command "DELETE FROM player_ratings;"
npx wrangler d1 execute kido-go-users --remote --command "DELETE FROM ranked_games;"
```

---

**Ready? Let's start Day 1! 🚀**

Save this file and reference it as you work through today's implementation.
