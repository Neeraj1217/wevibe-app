# WeVibe

WeVibe is a full-stack music web app with playlist management, YouTube-powered search/playback, and Firebase-based authentication.

## Tech Stack

- Frontend: React, Axios, Firebase Auth
- Backend: Node.js, Express, Mongoose
- Database: MongoDB Atlas
- Media/Search: YouTube Data API, yt-dlp
- Containerization: Docker

## Project Structure

```text
wevibe
|-- backend
|-- frontend
`-- README.md
```

## Environment Variables

### Backend (`backend/.env`)

Use `backend/.env.example` as a template.

Required keys:

- `PORT`
- `MONGODB_URI`
- `MONGODB_PASSWORD`
- `YT_API_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `FRONTEND_URL`

### Frontend (`frontend/.env`)

Use `frontend/.env.example` as a template.

Required keys:

- `REACT_APP_API_BASE` (default: `http://localhost:5000`)

## Local Setup

1. Clone repository.
2. Create env files from examples:
   - `copy backend/.env.example backend/.env`
   - `copy frontend/.env.example frontend/.env`
3. Install dependencies:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
4. Start backend:
   - `cd backend && npm run dev`
5. Start frontend:
   - `cd frontend && npm start`
6. Open `http://localhost:3000`.

## Docker (Backend)

Run backend container by passing env values at runtime (do not bake `.env` into image):

```bash
docker build -t wevibe-backend ./backend
docker run --env-file backend/.env -p 5000:5000 wevibe-backend
```

## Notes

- Do not commit `.env` files or service account JSON keys.
- Rotate any exposed credentials before public release.
