# WeVibe App

WeVibe is a full-stack music web application for searching songs, streaming YouTube audio, creating playlists, and importing Spotify playlists into a playable queue.

This repository is structured and documented for portfolio use and CS50 final project submission.

## Features

- Search songs via YouTube Data API
- Stream audio from YouTube sources using `yt-dlp`
- Create, view, and manage playlists
- Import Spotify playlists and map tracks to playable YouTube results
- Firebase phone authentication in the frontend
- Protected playlist create/delete routes on the backend

## Tech Stack

- Frontend: React, Axios, Firebase Auth
- Backend: Node.js, Express, Mongoose
- Database: MongoDB (local or Atlas)
- External APIs: YouTube Data API, Spotify API, Firebase Admin

## Architecture Overview

- `frontend`: Single-page React client for search, playback UI, queue handling, and Firebase phone auth.
- `backend`: Express REST API for search/audio resolution, playlist CRUD, Spotify import, and auth-protected actions.
- `database`: MongoDB stores users, playlists, and song metadata/cache references.
- `auth model`: Frontend signs users in with Firebase OTP and sends Bearer tokens to backend-protected routes.

## Installation

### 1) Clone and install dependencies

```powershell
git clone https://github.com/Neeraj1217/wevibe-app.git
cd wevibe-app

cd backend
npm install

cd ..\frontend
npm install
```

### 2) Configure environment variables

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Then update values in both `.env` files.

### 3) Add Firebase Admin credentials (backend)

Place your Firebase service account JSON at:

- `backend/firebase-adminsdk.json`

Or set `FIREBASE_SERVICE_ACCOUNT_JSON` in `backend/.env`.

## Environment Variables

### Backend (`backend/.env`)

- `PORT` (optional, default: `5000`)
- `NODE_ENV` (optional, default: `development`)
- `MONGODB_URI` (required)
- `YT_API_KEY` (required for search/audio resolution)
- `FRONTEND_URL` (required for CORS; comma-separated allowed origins)
- `FIREBASE_ADMIN_KEY_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON` (required for Firebase token verification)
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (required for Spotify import)
- `JWT_SECRET` (required in production for backend auth routes under `/api/auth`)

### Frontend (`frontend/.env`)

- `REACT_APP_API_BASE`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

## Run Locally

Start backend:

```powershell
cd backend
npm run dev
```

Start frontend in a second terminal:

```powershell
cd frontend
npm start
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Build and Deploy

### Frontend production build

```powershell
cd frontend
npm run build
```

Deploy the generated `frontend/build` folder to your static host.

### Backend production run

```powershell
cd backend
npm start
```

### Backend Docker (optional)

```bash
docker build -t wevibe-backend ./backend
docker run -p 5000:5000 --env-file backend/.env wevibe-backend
```

## Folder Structure

```text
wevibe-app/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── frontend/
│   ├── public/
│   └── src/
└── README.md
```

## Screenshots

Add screenshots here before final submission:

- Home/Search view
- Playlist library view
- Now playing / queue UI
- Auth flow (phone OTP)

## Future Improvements

- Add automated tests for backend routes and critical frontend flows
- Add stricter role-based authorization checks for playlist updates
- Improve import progress feedback for large Spotify playlists
- Add CI checks (lint/test/build) on pull requests

## AI Usage Note

AI-assisted tooling was used during project cleanup/refactoring and documentation polishing. All generated changes were reviewed and aligned with existing app behavior.

## Author

- Neeraj
- GitHub: [@Neeraj1217](https://github.com/Neeraj1217)
