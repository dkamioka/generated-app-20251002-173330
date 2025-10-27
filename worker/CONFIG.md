# Worker Configuration Guide

## D1 Database Setup

The user management system requires a Cloudflare D1 database. Follow these steps to set it up:

### 1. Create D1 Database

```bash
# Create the database
npx wrangler d1 create kido-go-users

# This will output something like:
# [[d1_databases]]
# binding = "DB"
# database_name = "kido-go-users"
# database_id = "xxxx-xxxx-xxxx-xxxx"
```

### 2. Update wrangler.jsonc

Add the following to your `wrangler.jsonc` file (after the `migrations` section):

```jsonc
{
  // ... existing config ...

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "kido-go-users",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ],

  "vars": {
    "JWT_SECRET": "your-jwt-secret-key-here-change-in-production"
  }
}
```

**Important:** Replace `YOUR_DATABASE_ID_HERE` with the actual database ID from step 1.

### 3. Run Database Migrations

```bash
# Apply the initial migration
npx wrangler d1 execute kido-go-users --file=worker/db/migrations/001_initial_users.sql

# Or use the full schema
npx wrangler d1 execute kido-go-users --file=worker/db/schema.sql
```

### 4. Set Environment Variables

For local development, create a `.dev.vars` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

For production, set secrets using Wrangler:

```bash
echo "your-super-secret-jwt-key" | npx wrangler secret put JWT_SECRET
echo "your-google-client-id" | npx wrangler secret put GOOGLE_CLIENT_ID
echo "your-google-client-secret" | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:5173/auth/callback` (dev)
6. Add production redirect URI: `https://yourdomain.com/auth/callback`
7. Copy Client ID and Client Secret to `.dev.vars`

## Verification

To verify your setup is working:

1. Start the dev server: `npm run dev`
2. Test the health endpoint: `curl http://localhost:8787/api/health`
3. The database tables should be created automatically when you run migrations

## Database Schema

The following tables are created:
- `users` - User accounts with roles and subscription info
- `subscription_events` - Audit trail for subscription events
- `admin_actions` - Audit log for admin actions
- `sessions` - User session tracking
- `game_stats_cache` - Aggregated game statistics

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### User Profile
- `PATCH /api/users/me` - Update profile

### Admin - User Management
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user
- `PATCH /api/admin/users/:id/role` - Change role
- `POST /api/admin/users/:id/ban` - Ban user
- `POST /api/admin/users/:id/unban` - Unban user
- `DELETE /api/admin/users/:id` - Delete user

### Admin - Analytics
- `GET /api/admin/analytics/overview` - Analytics overview
- `GET /api/admin/audit-log` - Audit log

## First User Setup

The first user to sign up will automatically become an admin. This is implemented in the `UserService.createUser()` method.

## Security Notes

1. Always use strong JWT secrets in production
2. Enable HTTPS in production
3. Keep Google OAuth secrets secure
4. Review audit logs regularly
5. Implement rate limiting for authentication endpoints (TODO)
