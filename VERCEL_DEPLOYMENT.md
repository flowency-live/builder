# Vercel Deployment Guide - Flowency Build

This guide explains how to deploy the Flowency Build application to Vercel with Postgres.

## Prerequisites

- GitHub repository: https://github.com/flowency-live/builder
- Vercel account with access to the flowency-live team
- OpenAI API key
- Anthropic API key

## Deployment Steps

### 1. Create New Vercel Project

1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Choose the `flowency-live/builder` repository
4. Select the `main` branch
5. Framework Preset: **Next.js**
6. Root Directory: Leave as default (or set to `spec-wizard` if deploying from monorepo)
7. Click "Deploy" (don't configure environment variables yet)

### 2. Add Vercel Postgres Storage

1. Go to your project in Vercel Dashboard
2. Navigate to **Storage** tab
3. Click "Create Database"
4. Select **Postgres**
5. Choose region: **Washington, D.C., USA (iad1)** or closest to your users
6. Database name: `flowency-build-db`
7. Click "Create & Continue"

Vercel will automatically set these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 3. Initialize Database Schema

After Postgres is created, you need to run the schema creation:

#### Option A: Via Vercel Postgres Dashboard

1. Go to **Storage** → **Postgres** → **Data** tab
2. Click "Query" button
3. Copy and paste the entire contents of `lib/db/schema.sql`
4. Click "Run Query"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Run SQL file
vercel env pull .env.local
psql $POSTGRES_URL < lib/db/schema.sql
```

### 4. Configure Environment Variables

Go to **Settings** → **Environment Variables** and add:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `OPENAI_API_KEY` | `sk-proj-...` | Get from OpenAI dashboard |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Get from Anthropic dashboard |

The Postgres variables are already set by Vercel Storage.

### 5. Deploy

Once environment variables are configured:

1. Go to **Deployments** tab
2. Click "Redeploy" on the latest deployment
3. Select "Redeploy with existing Build Cache"
4. Wait for deployment to complete

Your application will be live at: `https://your-project.vercel.app`

### 6. Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add custom domain: `my.flowency.build`
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

## Post-Deployment Verification

1. Visit your deployment URL
2. Click "Start here" to create a new session
3. Verify conversation works with AI
4. Check that sessions are persisting in Postgres:
   ```sql
   SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5;
   ```

## Monitoring

- **Logs**: View real-time logs in Vercel Dashboard → **Logs** tab
- **Database**: Monitor Postgres usage in **Storage** tab
- **Analytics**: View performance in **Analytics** tab

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify environment variables are set correctly
2. Check database is in the same region as deployment
3. Ensure schema.sql has been run successfully
4. Review logs for specific error messages

### Build Failures

If build fails:

1. Check build logs for specific errors
2. Verify all dependencies are in `package.json`
3. Ensure TypeScript compiles locally: `npm run type-check`
4. Check Node.js version compatibility (requires >= 20.9.0)

### API Errors

If API routes fail:

1. Verify API keys are valid and have sufficient credits
2. Check rate limits haven't been exceeded
3. Review application logs for detailed error messages

## Cost Estimates

- **Vercel Pro**: $20/month (includes team features)
- **Postgres**: ~$20/month for 256MB (scales with usage)
- **OpenAI API**: Pay-per-use (estimate $10-50/month for 1-5 users/week)
- **Anthropic API**: Pay-per-use (estimate $5-20/month for 1-5 users/week)

**Total**: ~$55-110/month for low traffic (1-5 users/week)

## Backup and Maintenance

### Database Backups

Vercel Postgres automatically backs up your database. To manually export:

```bash
vercel env pull .env.local
pg_dump $POSTGRES_URL > backup.sql
```

### Cleaning Expired Sessions

Run periodically (can be set up as a cron job):

```sql
SELECT cleanup_expired_sessions();
```

## Support

For issues:
- Vercel Support: https://vercel.com/support
- GitHub Issues: https://github.com/flowency-live/builder/issues
