# 🚀 Deploy Matchmaking System NOW - Quick Guide

Siga estes passos na ordem para fazer deploy e testar em produção.

---

## ⚡ Método 1: Script Automatizado (RECOMENDADO)

### Passo 1: Run o Script de Deploy

```bash
./deploy-and-test-matchmaking.sh
```

**O que este script faz:**
1. ✅ Roda migrations do database
2. ✅ Verifica que tabelas foram criadas
3. ✅ Builda a aplicação
4. ✅ Faz deploy no Cloudflare
5. ✅ Testa API health
6. ✅ Cria 3 usuários de teste
7. ✅ Cria ratings de teste
8. ✅ Gera guia de testes

**Tempo:** ~3-5 minutos

### Passo 2: Teste a API

```bash
./quick-test.sh
```

Este script vai pedir seu JWT token e testar todos os endpoints.

---

## 🔧 Método 2: Comandos Manuais (Passo a Passo)

Se preferir rodar comando por comando:

### 1️⃣ Database Migrations

```bash
# Criar tabelas de matchmaking
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql

# Adicionar colunas à tabela users
npx wrangler d1 execute kido-go-users --remote --file=worker/db/add_matchmaking_columns.sql

# Verificar que funcionou
npx wrangler d1 execute kido-go-users --remote --command "
SELECT name FROM sqlite_master
WHERE type='table'
AND (name LIKE '%rating%' OR name LIKE '%ranked%' OR name LIKE '%queue%');
"
```

**Expected output:**
```
player_ratings
ranked_games
queue_history
```

### 2️⃣ Build & Deploy

```bash
# Build
bun run build

# Deploy
npx wrangler deploy
```

### 3️⃣ Verificar Deploy

```bash
# Test API
curl https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev/api/health
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-..."
  }
}
```

### 4️⃣ Criar Usuários de Teste (Opcional)

```bash
# User 1 (Free tier)
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO users (id, email, name, picture, google_id, role, tier, created_at, updated_at)
VALUES (
  'test-user-1', 'test1@kido.com', 'TestPlayer1',
  'https://i.pravatar.cc/150?img=1', 'google-test-1',
  'user', 'free', datetime('now'), datetime('now')
);
"

# User 2 (Paid tier)
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO users (id, email, name, picture, google_id, role, tier, created_at, updated_at)
VALUES (
  'test-user-2', 'test2@kido.com', 'TestPlayer2',
  'https://i.pravatar.cc/150?img=2', 'google-test-2',
  'user', 'paid', datetime('now'), datetime('now')
);
"

# Criar ratings
npx wrangler d1 execute kido-go-users --remote --command "
INSERT OR IGNORE INTO player_ratings (user_id, rating, ranked_wins, ranked_losses, peak_rating, total_games, created_at, updated_at)
VALUES
  ('test-user-1', 1200, 5, 3, 1250, 8, datetime('now'), datetime('now')),
  ('test-user-2', 1180, 3, 2, 1200, 5, datetime('now'), datetime('now'));
"
```

---

## 🧪 Testando em Produção (Browser Console)

### Passo 1: Login

1. Abra: https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev
2. Login com Google
3. Abra DevTools (F12) → Console

### Passo 2: Get Token

```javascript
const token = localStorage.getItem('kido-auth-token');
console.log('Token:', token);
```

### Passo 3: Testar API

Cole este código completo no console:

```javascript
// ==================================================
// 🎮 MATCHMAKING API TESTER
// ==================================================

const BASE = '';  // Same origin
const token = localStorage.getItem('kido-auth-token');

// Helper function
async function api(endpoint, options = {}) {
  console.log(`📡 ${options.method || 'GET'} ${endpoint}`);
  const res = await fetch(BASE + endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  console.log('✅ Response:', data);
  return data;
}

console.log('🎮 Matchmaking API Tester Ready!');
console.log('');
console.log('Available commands:');
console.log('  await api("/api/stats/me")');
console.log('  await api("/api/stats/leaderboard?limit=10")');
console.log('  await api("/api/matchmaking/join", { method: "POST" })');
console.log('  await api("/api/matchmaking/status")');
console.log('  await api("/api/matchmaking/leave", { method: "POST" })');
console.log('');

// Auto-run tests
(async () => {
  console.log('🧪 Running automatic tests...');
  console.log('');

  // Test 1: Get my stats
  console.log('Test 1: Get My Stats');
  await api('/api/stats/me');
  console.log('');

  // Test 2: Leaderboard
  console.log('Test 2: Get Leaderboard');
  await api('/api/stats/leaderboard?limit=5');
  console.log('');

  // Test 3: Join queue
  console.log('Test 3: Join Queue');
  await api('/api/matchmaking/join', { method: 'POST' });
  console.log('');

  // Test 4: Check status
  console.log('Test 4: Check Status');
  await new Promise(r => setTimeout(r, 2000)); // Wait 2s
  await api('/api/matchmaking/status');
  console.log('');

  // Test 5: Leave queue
  console.log('Test 5: Leave Queue');
  await api('/api/matchmaking/leave', { method: 'POST' });
  console.log('');

  console.log('✅ All automatic tests complete!');
  console.log('');
  console.log('🎮 To test matchmaking with 2 players:');
  console.log('   1. Keep this browser open');
  console.log('   2. Open INCOGNITO window');
  console.log('   3. Login with DIFFERENT Google account');
  console.log('   4. In both browsers, run: await api("/api/matchmaking/join", { method: "POST" })');
  console.log('   5. Should match immediately!');
})();
```

### Passo 4: Testar Match com 2 Jogadores

**Browser 1 (Normal):**
```javascript
await api('/api/matchmaking/join', { method: 'POST' });
```

**Browser 2 (Incognito - outra conta Google):**
```javascript
await api('/api/matchmaking/join', { method: 'POST' });
```

**Expected:** Ambos recebem match object!

```json
{
  "success": true,
  "match": {
    "id": "abc-123",
    "opponent": {
      "userId": "...",
      "userName": "...",
      "rating": 1200
    }
  }
}
```

### Passo 5: Polling Status (Opcional)

Se quiser ver status em tempo real:

```javascript
const pollStatus = setInterval(async () => {
  const status = await api('/api/matchmaking/status');

  if (status.data?.matchFound) {
    console.log('🎉 MATCH FOUND!', status.data.match);
    clearInterval(pollStatus);
  }
}, 3000);

// Para parar: clearInterval(pollStatus);
```

---

## 📊 Verificar Database (Admin)

Verificar o que está no banco:

```bash
# Ver players com rating
npx wrangler d1 execute kido-go-users --remote --command "
SELECT u.name, r.rating, r.ranked_wins, r.ranked_losses
FROM player_ratings r
JOIN users u ON r.user_id = u.id
ORDER BY r.rating DESC
LIMIT 10;
"

# Ver jogos recentes
npx wrangler d1 execute kido-go-users --remote --command "
SELECT * FROM ranked_games
ORDER BY created_at DESC
LIMIT 5;
"
```

---

## ✅ Checklist de Sucesso

Depois de testar, confirme:

- [ ] ✅ API `/api/health` retorna healthy
- [ ] ✅ `/api/stats/me` retorna seus stats
- [ ] ✅ `/api/stats/leaderboard` retorna lista
- [ ] ✅ Consegue entrar na fila (`/api/matchmaking/join`)
- [ ] ✅ Status da fila atualiza (`/api/matchmaking/status`)
- [ ] ✅ Consegue sair da fila (`/api/matchmaking/leave`)
- [ ] ✅ Dois jogadores conseguem dar match
- [ ] ✅ Match object tem opponent info
- [ ] ✅ Free user tem limite de 10 jogos/dia

---

## 🐛 Troubleshooting

### Erro: "MatchmakingQueue is not defined"

**Solução:**
```bash
# Verificar que wrangler.jsonc tem o binding
cat wrangler.jsonc | grep -A5 "MatchmakingQueue"

# Se não tiver, adicionar manualmente e redeploy
npx wrangler deploy
```

### Erro: "Table player_ratings doesn't exist"

**Solução:**
```bash
# Rodar migrations novamente
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql
```

### Erro: "401 Unauthorized"

**Solução:**
```javascript
// Token pode ter expirado, logout e login novamente
localStorage.clear();
// Refresh página e login novamente
```

### Erro: "Daily limit reached"

**Solução:**
```bash
# Reset o contador (como admin)
npx wrangler d1 execute kido-go-users --remote --command "
UPDATE users SET ranked_games_today = 0;
"
```

---

## 🎯 Próximos Passos

Depois de confirmar que tudo funciona:

1. **Frontend UI (Day 2)**
   - Criar página de matchmaking
   - UI para queue status
   - Match found dialog
   - Leaderboard page

2. **PvP Game Logic (Day 3)**
   - Integrar matchmaking com games
   - Rating updates após jogo
   - Game history

3. **Polish (Day 4)**
   - Bug fixes
   - Animations
   - Error handling
   - Launch!

---

## 📚 Documentos de Referência

- **MATCHMAKING_MASTER_PLAN.md** - Plano completo de 4 dias
- **MATCHMAKING_DAY1_GUIDE.md** - Guia detalhado Dia 1
- **MATCHMAKING_TEST_GUIDE.md** - Guia completo de testes (gerado pelo script)

---

## 🎮 Comandos Rápidos de Referência

```bash
# Deploy tudo
./deploy-and-test-matchmaking.sh

# Teste rápido (pede JWT token)
./quick-test.sh

# Apenas migrations
npx wrangler d1 execute kido-go-users --remote --file=worker/db/matchmaking_schema.sql

# Apenas deploy
bun run build && npx wrangler deploy

# Ver logs em tempo real
npx wrangler tail

# Reset daily limit
npx wrangler d1 execute kido-go-users --remote --command "UPDATE users SET ranked_games_today = 0;"
```

---

**🚀 Pronto! Agora é só rodar `./deploy-and-test-matchmaking.sh` e testar!**
