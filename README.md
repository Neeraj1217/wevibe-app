# WeVibe

Full-stack music web app: YouTube search/playback, playlists, Spotify import, and Firebase phone authentication.

## Tech Stack

- **Frontend:** React, Axios, Firebase Auth
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB (local dev) / MongoDB Atlas (production)
- **Media:** YouTube Data API, yt-dlp

## Project Structure

```text
wevibe/
├── backend/          # Express API
├── frontend/         # React app
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (dev) or MongoDB Atlas URI (production)
- Firebase project with Phone Auth enabled
- YouTube Data API key
- Firebase Admin service account JSON (backend only, never commit)

## Local Development

### 1. Environment files

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Edit `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/wevibe
YT_API_KEY=your_youtube_api_key
FRONTEND_URL=http://localhost:3000
FIREBASE_ADMIN_KEY_PATH=./firebase-adminsdk.json
```

Place your Firebase Admin SDK JSON at `backend/firebase-adminsdk.json` (gitignored).

Edit `frontend/.env` with Firebase client config from Firebase Console → Project settings.

### 2. Install and run

```powershell
cd backend
npm install
npm run dev

# new terminal
cd frontend
npm install
npm start
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health: http://localhost:5000/health

### 3. Verify

- `GET /health` → `{ "ok": true, "dbConnected": true }` when MongoDB is up
- Logged-in users can create playlists (`POST /api/playlists` requires Firebase Bearer token)
- If MongoDB is down, the server still starts; DB routes return `503`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default `5000` |
| `NODE_ENV` | No | `development` or `production` |
| `MONGODB_URI` | Yes | `mongodb://127.0.0.1:27017/wevibe` (local) or Atlas `mongodb+srv://...` |
| `YT_API_KEY` | Yes | YouTube Data API key |
| `FRONTEND_URL` | Yes | CORS origin(s), comma-separated |
| `FIREBASE_ADMIN_KEY_PATH` | Yes* | Path to service account JSON |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alt | Raw JSON string (cloud hosts) |
| `SPOTIFY_CLIENT_ID` | For import | Spotify API |
| `SPOTIFY_CLIENT_SECRET` | For import | Spotify API |

\* Or set `FIREBASE_SERVICE_ACCOUNT_JSON` instead of a file path.

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_BASE` | Yes | Backend URL, e.g. `http://localhost:5000` |
| `REACT_APP_FIREBASE_*` | Yes | Firebase web app config (6 keys) |

## Production Deployment

Set environment variables on your host (Render, Railway, Fly.io, VPS, etc.). **Do not commit `.env` or `firebase-adminsdk.json`.**

### Backend

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/wevibe?retryWrites=true&w=majority
YT_API_KEY=...
FRONTEND_URL=https://your-frontend-domain.com
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Or mount `firebase-adminsdk.json` and set `FIREBASE_ADMIN_KEY_PATH`.

### Frontend

Build with production API URL and Firebase config:

```powershell
cd frontend
# set REACT_APP_API_BASE=https://api.yourdomain.com and REACT_APP_FIREBASE_* in .env
npm run build
```

Serve the `frontend/build` folder with any static host (Netlify, Vercel, Nginx, etc.).

### Docker (backend)

```bash
docker build -t wevibe-backend ./backend
docker run -p 5000:5000 --env-file backend/.env wevibe-backend
```

## Auth Model

- **Login:** Firebase phone OTP (frontend)
- **Protected routes:** `Authorization: Bearer <Firebase ID token>`
- **Playlist create/delete:** require valid Firebase token
- **Playlist list/add/remove:** public (no token) — existing behavior

## Security Notes

- Never commit `.env`, `firebase-adminsdk.json`, or API keys
- Rotate any credentials that were ever exposed in git history
- Firebase client API keys are public by design; restrict with Firebase App Check / domain rules in production

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| backend | `npm run dev` | Dev server with nodemon |
| backend | `npm start` | Production server |
| frontend | `npm start` | Dev React app |
| frontend | `npm run build` | Production build |
