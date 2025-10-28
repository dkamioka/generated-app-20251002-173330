# 🎮 Sistema de Matchmaking - Plano Mestre (2 Weekends)

**Timeline:** 2 weekends (4 dias de trabalho efetivo)
**Escopo:** MVP completo e funcional de matchmaking ranqueado
**Disponibilidade:** Weekends only
**Beta Testers:** Não disponíveis (autoteste)

---

## 🎯 Objetivo Final

**Sistema de Matchmaking MVP** que permite:
- ✅ Jogadores entrarem em fila ranqueada
- ✅ Sistema automático encontrar oponentes de nível similar
- ✅ Rating ELO atualizado após cada partida
- ✅ Leaderboard com top 100 jogadores
- ✅ Stats pessoais (win/loss, rating, histórico)
- ✅ Integração com tier system (free = 10 jogos/dia)

---

## 📅 Cronograma Detalhado

### **Weekend 1: Backend Foundation**

#### **Dia 1 (Sábado) - Database & Rating System** ⏱️ 6-8h

**Manhã (3-4h):**
- ✅ Database schema (player_ratings, ranked_games, queue_history)
- ✅ Run migrations no Cloudflare D1
- ✅ Rating Service (ELO calculations)
- ✅ Unit tests para rating calculations

**Tarde (3-4h):**
- ✅ MatchmakingQueue Durable Object
- ✅ Matchmaking algorithm (find compatible opponent)
- ✅ API endpoints (join/leave/status/accept/reject)
- ✅ Deploy e teste inicial

**Entrega do Dia:**
- ✅ Backend funcionando com queue
- ✅ Dois jogadores conseguem dar match via console
- ✅ Rating atualiza corretamente após jogo

**Guia Detalhado:** `MATCHMAKING_DAY1_GUIDE.md`

---

#### **Dia 2 (Domingo) - Frontend UI Basics** ⏱️ 6-8h

**Manhã (3-4h):**
- ✅ Matchmaking page component
- ✅ "Find Match" button
- ✅ Queue status display (tempo de espera, posição)
- ✅ useMatchmaking hook (polling)

**Tarde (3-4h):**
- ✅ Match found dialog (accept/reject)
- ✅ Leaderboard page
- ✅ Player stats card
- ✅ Integration testing

**Entrega do Dia:**
- ✅ UI completa para matchmaking
- ✅ Jogador consegue entrar na fila via UI
- ✅ Match found modal funciona
- ✅ Leaderboard mostra top players

**Guia Detalhado:** `MATCHMAKING_DAY2_GUIDE.md`

---

### **Weekend 2: Game Integration & Polish**

#### **Dia 3 (Sábado) - PvP Game Logic** ⏱️ 6-8h

**Manhã (3-4h):**
- ✅ Update GameSession for PvP support
- ✅ Turn management (alternate between players)
- ✅ Rating update after game ends
- ✅ Match history saving

**Tarde (3-4h):**
- ✅ Game end flow with rating changes
- ✅ "Rematch" functionality
- ✅ Reconnection logic
- ✅ Integration with matchmaking queue

**Entrega do Dia:**
- ✅ PvP games funcionam end-to-end
- ✅ Rating atualiza automaticamente
- ✅ Histórico salvo no banco
- ✅ Flow completo: queue → match → play → rating update

**Guia Detalhado:** `MATCHMAKING_DAY3_GUIDE.md`

---

#### **Dia 4 (Domingo) - Polish & Launch** ⏱️ 6-8h

**Manhã (3-4h):**
- ✅ Bug fixes & edge cases
- ✅ Error handling & loading states
- ✅ Tier integration (daily limits)
- ✅ UI polish & animations

**Tarde (3-4h):**
- ✅ End-to-end testing
- ✅ Performance optimization
- ✅ Documentation for users
- ✅ Deploy & announce

**Entrega do Dia:**
- ✅ Sistema completo e testado
- ✅ Pronto para uso real
- ✅ Documentação para usuários
- ✅ Deployed em produção

**Guia Detalhado:** `MATCHMAKING_DAY4_GUIDE.md`

---

## 📊 Arquitetura do Sistema

### Database Tables

```sql
player_ratings
├── user_id (PK)
├── rating (1200-3000+)
├── ranked_wins
├── ranked_losses
├── peak_rating
├── current_streak
└── total_games

ranked_games
├── id (PK)
├── player1_id, player2_id
├── ratings_before/after
├── winner_id
└── game_id

queue_history
├── user_id
├── joined_at
├── matched_at
└── wait_time_seconds
```

### Backend Components

```
worker/
├── services/
│   └── ratingService.ts         ✅ ELO calculations
├── durableObjects/
│   ├── MatchmakingQueue.ts      ✅ Queue management
│   └── GameSession.ts           🔜 PvP support (Day 3)
└── routes/
    └── matchmakingRoutes.ts     ✅ API endpoints
```

### Frontend Components

```
src/
├── pages/
│   ├── MatchmakingPage.tsx      🔜 Day 2
│   └── LeaderboardPage.tsx      🔜 Day 2
├── components/
│   ├── MatchmakingButton.tsx    🔜 Day 2
│   ├── QueueStatus.tsx          🔜 Day 2
│   ├── MatchFoundDialog.tsx     🔜 Day 2
│   └── LeaderboardTable.tsx     🔜 Day 2
└── hooks/
    └── useMatchmaking.ts        🔜 Day 2
```

---

## 🎯 Features por Dia

| Feature | Day 1 | Day 2 | Day 3 | Day 4 |
|---------|-------|-------|-------|-------|
| Database Schema | ✅ | | | |
| Rating System | ✅ | | | |
| Queue Management | ✅ | | | |
| API Endpoints | ✅ | | | |
| Matchmaking UI | | ✅ | | |
| Leaderboard | | ✅ | | |
| PvP Game Logic | | | ✅ | |
| Rating Updates | | | ✅ | |
| Tier Integration | | | | ✅ |
| Polish & Testing | | | | ✅ |

---

## 🚀 Simplificações Estratégicas

Para caber em 4 dias, fizemos estes trade-offs:

### ✅ Incluído (MVP Essencial)
- ✅ Ranked matchmaking com ELO
- ✅ Queue automática
- ✅ PvP games
- ✅ Leaderboard
- ✅ Stats básicas
- ✅ Tier limits (10/dia free)

### ❌ Cortado (Post-MVP)
- ❌ WebSockets (usar polling)
- ❌ Casual mode (só ranked)
- ❌ Chat in-game
- ❌ Friend system
- ❌ Advanced animations
- ❌ Tournaments

**Razão:** Foco no core flow funcional. Features extras podem ser adicionadas depois.

---

## 📈 Success Metrics

Como saber se deu certo:

### Technical Metrics
- [ ] Average queue time < 2 minutes
- [ ] Match success rate > 90%
- [ ] Rating calculation accuracy 100%
- [ ] API response time < 500ms
- [ ] No crashes during testing

### User Experience
- [ ] Claro quando está na fila
- [ ] Match found é óbvio
- [ ] Rating changes são visíveis
- [ ] Leaderboard loading < 1s
- [ ] Tier limits respeitados

---

## 🐛 Known Limitations (MVP)

Estas limitações são aceitáveis no MVP:

1. **Polling instead of WebSockets**
   - Status atualiza a cada 3 segundos
   - Não é real-time perfeito
   - Aceitável para MVP

2. **Basic matchmaking algorithm**
   - Rating range simples (±100, expande para ±300)
   - Não considera win streaks ou outros fatores
   - Suficiente para começar

3. **No reconnection to queue**
   - Se refresh página, sai da fila
   - Precisa entrar novamente
   - Edge case raro

4. **Manual testing only**
   - Sem automated E2E tests
   - Confiar em manual testing
   - OK para MVP rápido

5. **Simple UI**
   - Funcional mas não bonito
   - Animações mínimas
   - Pode polir depois

---

## 🎓 Conceitos Técnicos

### ELO Rating System

```
Expected Score = 1 / (1 + 10^((opponent_rating - your_rating) / 400))
New Rating = Old Rating + K * (Actual Score - Expected Score)

Where:
- K = 32 (K-factor, how much rating changes)
- Actual Score = 1 (win), 0.5 (draw), 0 (loss)
```

**Example:**
- You: 1200, Opponent: 1200
- Expected: 0.5 (50% chance)
- You win: Actual = 1
- Change: 32 * (1 - 0.5) = +16
- New Rating: 1216

### Matchmaking Algorithm

```
1. Player joins queue with rating R
2. Initial range: R ± 100
3. Search queue for opponent in range
4. If found: create match
5. If not found: wait 30s, expand range by 50
6. Repeat until match found or 5 min timeout
```

### Durable Objects

```
MatchmakingQueue = Global singleton DO
- Stores all players in queue (Map)
- Manages match creation
- Handles accept/reject
- Persists state across requests
```

---

## 🔐 Security Considerations

### Rate Limiting
```typescript
// Prevent queue spam
maxQueueJoins: 10 per minute per user
maxMatchRejects: 3 per 5 minutes per user
```

### Authentication
```typescript
// All endpoints require JWT
authMiddleware() verifies token
User can only act on own behalf
```

### Tier Enforcement
```typescript
// Free users: 10 ranked/day
// Checked before joining queue
// Counter resets at midnight UTC
```

---

## 💰 Monetization Integration

### Tier Features

| Feature | Free | Paid |
|---------|------|------|
| Ranked Games/Day | 10 | Unlimited |
| Queue Priority | Normal | Fast |
| Stats | Basic | Advanced |
| Ads | Yes | No |

### Upgrade Prompts

```typescript
// Show upgrade modal when hitting limit
if (user.tier === 'free' && ranked_games_today >= 10) {
  showUpgradeModal({
    title: 'Daily Limit Reached',
    message: 'Upgrade for unlimited ranked games!',
    price: '$2/month',
  });
}
```

---

## 📞 Support & Resources

### Daily Guides
- **Day 1:** `MATCHMAKING_DAY1_GUIDE.md` ✅ Created
- **Day 2:** `MATCHMAKING_DAY2_GUIDE.md` 🔜 Next
- **Day 3:** `MATCHMAKING_DAY3_GUIDE.md` 🔜 Later
- **Day 4:** `MATCHMAKING_DAY4_GUIDE.md` 🔜 Later

### Testing Commands
```bash
# Deploy
npx wrangler deploy

# View logs
npx wrangler tail

# Run migrations
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql

# Check queue status
curl -H "Authorization: Bearer $TOKEN" \
     "$BASE_URL/api/matchmaking/status"
```

### Troubleshooting
See individual day guides for specific issues.

---

## 🎉 What's Next After MVP?

### Immediate Post-MVP (Week 3)
1. **WebSockets** - Real-time updates
2. **Casual Mode** - Non-ranked games
3. **Rematch Button** - Quick rematch
4. **Better animations** - Polish UI

### Medium-term (Month 1)
1. **Friend System** - Add/challenge friends
2. **Chat** - In-game messaging
3. **Achievements** - Badges & unlocks
4. **Advanced stats** - Charts, heatmaps

### Long-term (Quarter 1)
1. **Tournaments** - Weekly competitions
2. **Seasons** - Ranked seasons
3. **Guilds/Clans** - Team play
4. **Mobile App** - Native apps

---

## ✅ Final Checklist

Before declaring MVP complete:

### Functionality
- [ ] Queue works for 2+ players
- [ ] Matches are found within 2 min
- [ ] Games complete end-to-end
- [ ] Ratings update correctly
- [ ] Leaderboard displays
- [ ] Stats page shows data
- [ ] Tier limits enforced

### Quality
- [ ] No critical bugs
- [ ] Error messages are clear
- [ ] Loading states everywhere
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Performance acceptable

### Documentation
- [ ] User guide written
- [ ] API documented
- [ ] Known issues listed
- [ ] FAQ created

---

## 🚀 Let's Build!

**You're ready to start Day 1!**

Open `MATCHMAKING_DAY1_GUIDE.md` and let's build the backend foundation.

**Remember:**
- Take breaks every hour
- Test as you go
- Don't try to perfect everything
- MVP = Minimum Viable Product
- You can always improve later

**Good luck! 🎮**
