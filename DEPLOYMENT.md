# Deployment Guide

## GitHub Status
✅ **Pushed to GitHub**
- Repository: https://github.com/oggigachad/fake-artist
- Branch: `main`
- Files: 73 commits, 58 files

---

## Render Backend Deployment

### Step 1: Prepare Your GitHub Repo
1. Go to https://github.com/oggigachad/fake-artist
2. Make sure the `render.yaml` and `Procfile` are in the root directory ✅ (already added)

### Step 2: Deploy on Render

#### Option A: Using render.yaml (Recommended)
1. Go to https://render.com
2. Sign up / Login with GitHub
3. Click **"New Web Service"**
4. Select your **fake-artist** repository
5. Connect your GitHub account if prompted
6. Render will auto-detect `render.yaml` - **Do NOT override it**
7. Fill in:
   - **Name**: `fake-artist-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && cd server && npm install`
   - **Start Command**: `cd server && npm run dev`
8. Under **Environment Variables**, add:
   ```
   NODE_ENV = production
   PORT = 3001
   JWT_SECRET = <generate-a-random-32-char-string>
   FRONTEND_URL = https://your-frontend-domain.com
   ```
9. Click **"Create Web Service"**

#### Option B: Manual Setup (Alternative)
1. Go to https://render.com → New Web Service
2. Select **GitHub** → Choose **fake-artist**
3. Configure:
   - **Name**: `fake-artist-backend`
   - **Runtime**: Node
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev`
4. Add Environment Variables (as above)
5. Deploy

### Step 3: Environment Variables on Render

Go to your Render service → **Environment**

**Required Variables:**
| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | - |
| `PORT` | `3001` | Auto-set by Render |
| `JWT_SECRET` | Random 32+ chars | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL` | Your frontend URL | e.g., `https://yourdomain.com` |
| `DB_PATH` | `./server/game.db` | SQLite database path |

**Generate JWT_SECRET:**
```bash
# Run on your local machine:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and paste into Render
```

### Step 4: Verify Deployment

Once deployed:
1. Render gives you a URL like: `https://fake-artist-backend.onrender.com`
2. Test the server:
   ```bash
   curl https://fake-artist-backend.onrender.com
   ```
3. Update your frontend `.env` with the new backend URL:
   ```
   NEXT_PUBLIC_API_URL=https://fake-artist-backend.onrender.com
   ```

### Step 5: Important Notes

⚠️ **Free Tier Limitations:**
- Your service **spins down after 15 minutes of inactivity**
- First request takes 30~ seconds to wake up
- Limited to **500GB/month** bandwidth
- No persistent file storage (database resets on redeploy)

✅ **Upgrade to Paid When:**
- You need persistent database storage
- You want 24/7 uptime
- You expect high traffic

### Step 6: Keep Database Between Deploys

Since Render doesn't have persistent storage on free tier:

**Option 1:** Use PostgreSQL (Render offer)
- Add PostgreSQL database from Render dashboard
- Update `server/db.ts` to use Postgres instead of SQLite

**Option 2:** Upload/Backup Database
- Periodically backup `server/game.db`
- Use Render's file access to restore after deploys

**Option 3:** Use External Database
- MongoDB Atlas (free tier)
- Firebase Realtime DB
- Supabase (Postgres)

### Step 7: Auto-Deploy Setup

1. Go to your Render service → **Settings**
2. Set **Auto-deploy** to **Yes**
3. It will redeploy every time you `git push` to `main`

---

## Frontend Deployment (Next.js on Vercel - Recommended)

### Deploy Frontend:
1. Go to https://vercel.com
2. Import **fake-artist** GitHub repo
3. Root Directory: `client`
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://fake-artist-backend.onrender.com
   NEXT_PUBLIC_API_URL=https://fake-artist-backend.onrender.com
   ```
5. Deploy

---

## Monitoring & Logs

**View Render Logs:**
1. Log in to https://render.com → Your Service
2. Click **"Logs"** tab
3. See real-time logs (helpful for debugging)

**Common Issues:**

| Issue | Solution |
|-------|----------|
| 500 Error on startup | Check logs, ensure JWT_SECRET is set |
| CORS errors | Update FRONTEND_URL env variable |
| Database not persisting | Use external DB service (see above) |
| Port already in use | Change PORT env var or restart service |

---

## Git Push Workflow (Future Updates)

After making changes locally:

```bash
cd "c:\Users\aakas\Downloads\fake artist"

# Make your changes...
git add .
git commit -m "Your commit message"
git push origin main

# Render will auto-deploy! 🚀
```

---

## Useful Commands

```bash
# Update render.yaml when changing deployment config:
git add render.yaml
git commit -m "Update Render configuration"
git push origin main

# Check local backend:
cd server
npm run dev
# Visit: http://localhost:3001

# Check frontend:
cd client
npm run dev
# Visit: http://localhost:3000
```

---

## Summary

✅ **Completed:**
- [x] GitHub push
- [x] Render config files added (render.yaml, Procfile)
- [x] Environment variables template

**Next Steps:**
1. Generate JWT_SECRET
2. Go to render.com and connect GitHub
3. Deploy backend service
4. Deploy frontend to Vercel
5. Update CORS URL in Render env

Good luck! 🚀
