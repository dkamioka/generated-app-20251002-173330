# CI/CD Setup Guide - GitHub Actions

This guide explains how to set up automated deployments to Cloudflare Workers using GitHub Actions.

## Overview

We have two workflows:

1. **`deploy.yml`** - Deploys to production when you push to `main` branch
2. **`preview.yml`** - Creates preview deployments for pull requests
3. **`test.yml`** - Runs tests on every push/PR

## Quick Setup (5 minutes)

### Step 1: Get Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"**
4. Click **"Continue to summary"** → **"Create Token"**
5. **Copy the token** (you won't see it again!)

### Step 2: Get Cloudflare Account ID

1. Go to: https://dash.cloudflare.com
2. Click on **"Workers & Pages"** in the left sidebar
3. Your **Account ID** is shown in the right sidebar
4. Copy it

### Step 3: Get Google OAuth Client ID

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth Client ID
3. Copy the Client ID (format: `xxxxx.apps.googleusercontent.com`)

### Step 4: Add Secrets to GitHub

1. Go to your GitHub repository settings:
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
   ```

2. Click **"New repository secret"** and add **THREE secrets**:

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: `[paste the API token from Step 1]`

   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: `[paste the Account ID from Step 2]`

   **Secret 3:**
   - Name: `VITE_GOOGLE_CLIENT_ID`
   - Value: `[paste the Client ID from Step 3]`

### Step 5: Push to Main Branch

Once you merge your PR to `main`, GitHub Actions will automatically:
1. ✅ Build your app with the Google Client ID
2. ✅ Deploy to Cloudflare Workers
3. ✅ Show deployment status in the Actions tab

---

## How It Works

### Production Deployment (deploy.yml)

**Triggers:**
- ✅ Push to `main` branch
- ✅ Manual trigger from GitHub UI (Actions tab → Deploy to Cloudflare Workers → Run workflow)

**Steps:**
1. Checkout code
2. Install dependencies
3. Build app with `VITE_GOOGLE_CLIENT_ID` environment variable
4. Deploy to Cloudflare Workers using Wrangler

**Environment Variables:**
- `VITE_GOOGLE_CLIENT_ID` is embedded into the JavaScript bundle at build time
- Cloudflare secrets (JWT_SECRET) are set separately via `wrangler secret put`

### Preview Deployment (preview.yml)

**Triggers:**
- ✅ Pull request opened/updated to `main` branch

**Features:**
- Creates a preview deployment for testing
- Comments on the PR with deployment info
- Uses the same Google Client ID (or you can create a dev one)

**Note:** Preview URLs need to be added to Google Cloud Console authorized origins for OAuth to work.

### Test Workflow (test.yml)

**Triggers:**
- ✅ Every push to `main` or `develop`
- ✅ Every pull request

**Runs:**
- Linting
- Unit tests
- Integration tests
- Component tests
- E2E tests
- Coverage reports

---

## Manual Deployment (Without GitHub Actions)

If you prefer to deploy manually:

```bash
# Local development
npm run dev

# Build with environment variable
VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" npm run build

# Deploy to Cloudflare
npx wrangler deploy
```

---

## Environment Variables Explained

### Frontend Variables (Build Time)

These are embedded into your JavaScript bundle **during build**:

- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID (public, safe to expose)
- `VITE_API_BASE_URL` - API base URL (optional, defaults to `/api`)

**How to use:**
- In code: `import.meta.env.VITE_GOOGLE_CLIENT_ID`
- Set in `.env.local` for local dev
- Set in GitHub Secrets for CI/CD
- Set as environment variable when running `npm run build`

### Backend Variables (Runtime)

These are used by your Cloudflare Worker at runtime:

- `JWT_SECRET` - Secret key for signing JWT tokens (use `wrangler secret put`)
- `GOOGLE_CLIENT_SECRET` - OAuth client secret (optional, for backend OAuth flow)

**How to set:**
```bash
# Production
echo "your-secret-here" | npx wrangler secret put JWT_SECRET

# Development (.dev.vars file)
JWT_SECRET=your-dev-secret
```

---

## Troubleshooting

### Deployment Fails - "API Token authentication error"

**Solution:** Check that `CLOUDFLARE_API_TOKEN` secret is set correctly
- Go to GitHub Secrets and verify the token is there
- Token should start with something like `Cxxx...`
- Create a new token if needed

### Deployment Fails - "Account ID not found"

**Solution:** Check that `CLOUDFLARE_ACCOUNT_ID` secret is correct
- Should be a hex string like `a1b2c3d4e5f6...`
- Found in Cloudflare dashboard sidebar

### Google OAuth Doesn't Work After Deployment

**Solution:** Add your production URL to Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth Client
3. Add to "Authorized JavaScript origins":
   ```
   https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev
   ```

### Build Error - "VITE_GOOGLE_CLIENT_ID is not defined"

**Solution:** Secret is missing or named incorrectly
- Check GitHub Secrets: exactly `VITE_GOOGLE_CLIENT_ID` (case-sensitive)
- Value should be your Client ID ending in `.apps.googleusercontent.com`

### How to View Deployment Logs

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. Click on the latest workflow run
4. Click on the job name (e.g., "Deploy to Production")
5. Expand each step to see logs

---

## Security Best Practices

✅ **DO:**
- Store API tokens in GitHub Secrets (never commit them)
- Use separate OAuth clients for dev/staging/production
- Rotate API tokens periodically
- Use branch protection rules on `main`

❌ **DON'T:**
- Commit `.dev.vars` or `.env.local` files
- Share API tokens in public channels
- Use production credentials in development

---

## Advanced: Multiple Environments

To set up separate dev/staging/production environments:

1. Create separate wrangler environments in `wrangler.jsonc`:
```json
{
  "env": {
    "staging": {
      "name": "my-app-staging",
      "vars": {}
    },
    "production": {
      "name": "my-app-production",
      "vars": {}
    }
  }
}
```

2. Add environment-specific secrets to GitHub:
   - `VITE_GOOGLE_CLIENT_ID_STAGING`
   - `VITE_GOOGLE_CLIENT_ID_PRODUCTION`

3. Update workflow to deploy to specific environment:
```yaml
- name: Deploy to Staging
  run: npx wrangler deploy --env staging
```

---

## Viewing Your Deployments

**Cloudflare Dashboard:**
- https://dash.cloudflare.com → Workers & Pages
- See deployment history, logs, and analytics

**GitHub Actions:**
- https://github.com/YOUR_USERNAME/YOUR_REPO/actions
- See all workflow runs and their status

**Production URL:**
- https://v1-kido-go-game-90976a1a-44ff-4a66-aa8b-a67ff329f54a.farofitus.workers.dev

---

## Next Steps

Once CI/CD is set up:
1. ✅ Create a branch for your changes
2. ✅ Open a pull request → Tests run automatically
3. ✅ Merge to `main` → Deploys automatically
4. ✅ Check the Actions tab for deployment status

Happy deploying! 🚀
