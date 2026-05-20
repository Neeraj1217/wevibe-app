// WeVibe backend API server.

// Load backend/.env by absolute path before any other app imports.
import "./config/loadEnv.js";

// Core imports
import express from "express";
import cors from "cors";
import youtubedl from "yt-dlp-exec";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import querystring from "querystring";

// App imports
import { startDbConnection, isDbConnected } from "./config/db.js";
import Song from "./models/songModel.js";
import Playlist from "./models/playlistModel.js";
import authRoutes from "./routes/authRoutes.js";
import { verifyToken } from "./middleware/verifyToken.js";
import { requireDb } from "./middleware/requireDb.js";


const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";
const YT_API_KEY = process.env.YT_API_KEY || (isProd ? "" : "YOUR_YOUTUBE_API_KEY");
const NO_PERSIST = process.env.NO_PERSIST === "true";

if (!process.env.YT_API_KEY) {
  console.warn("[env] YT_API_KEY is not set — YouTube search/audio resolution will fail");
}

const audioCache = new Map();

// =====================================================
// 🌐 Middleware
// =====================================================
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map(o => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
}
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =====================================================
// 🩺 Health
// =====================================================
function healthPayload() {
  return {
    ok: true,
    dbConnected: isDbConnected(),
    timestamp: new Date().toISOString(),
  };
}

app.get("/health", (req, res) => res.json(healthPayload()));
app.get("/api/health", (req, res) => res.json(healthPayload()));

// =====================================================
// 🔐 Auth Routes
// =====================================================
app.use("/api/auth", requireDb, authRoutes);

// =====================================================
// 🔍 YouTube Search Helper
// =====================================================
async function searchYouTubeByTitle(title) {
  try {
    const query = encodeURIComponent(title);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${query}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.items?.length > 0) {
      const video = data.items[0];
      return {
        youtubeId: video.id.videoId,
        thumb: video.snippet.thumbnails?.medium?.url || null,
        ytTitle: video.snippet.title,
      };
    }
  } catch (err) {
    console.error("❌ YouTube search failed:", err?.message || err);
  }
  return { youtubeId: null, thumb: null, ytTitle: null };
}

// =====================================================
// 🔎 /search — YouTube direct search
// =====================================================
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing search query" });

    console.log(`🔎 Searching YouTube for: "${query}"`);
    const encoded = encodeURIComponent(query);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encoded}&key=${YT_API_KEY}`;
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    if (!data.items?.length) return res.status(404).json({ error: "No results found" });

    const results = data.items.map((i) => ({
      title: i.snippet.title,
      youtubeId: i.id.videoId,
      thumb: i.snippet.thumbnails?.medium?.url || "",
      coverArt: i.snippet.thumbnails?.high?.url || "",
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ /search error:", err?.message || err);
    res.status(500).json({ error: "Failed to search YouTube" });
  }
});

// =====================================================
// 🎧 /audio — Universal Resolver (FINAL FIXED VERSION)
// =====================================================
app.get("/audio", async (req, res) => {
  const id = req.query.id?.trim();
  const titleParam = req.query.title?.trim();

  if (!id && !titleParam) {
    return res.status(400).json({ error: "Missing id or title" });
  }

  try {
    let youtubeId = null;
    let song = null;
    let thumb = null;
    let ytTitle = null;
    let transient = false;
    const dbReady = isDbConnected();
    const canPersist = dbReady && !NO_PERSIST;

    const isMongoId = id && /^[0-9a-fA-F]{24}$/.test(id);
    const isYouTubeId = id && /^[A-Za-z0-9_-]{10,15}$/.test(id);

    // 1️⃣ Try from DB (only when connected)
    if (dbReady) {
      if (isMongoId) {
        song = await Song.findById(id).catch(() => null);
      } else if (isYouTubeId) {
        song = await Song.findOne({ youtubeId: id }).catch(() => null);
      } else if (id) {
        song = await Song.findOne({ title: new RegExp(escapeRegExp(id), "i") }).catch(() => null);
      }

      // 2️⃣ If not found, try by title
      if (!song && titleParam) {
        song = await Song.findOne({ title: new RegExp(escapeRegExp(titleParam), "i") }).catch(() => null);
      }
    }

    // 3️⃣ If found but missing youtubeId, fix it
    if (canPersist && song && !song.youtubeId && (song.title || titleParam)) {
      const titleToSearch = titleParam || song.title;
      const result = await searchYouTubeByTitle(titleToSearch);
      if (result.youtubeId) {
        song.youtubeId = result.youtubeId;
        song.thumb = song.thumb || result.thumb;
        song.coverArt = song.coverArt || result.thumb;
        await song.save().catch(() => null);
        console.log(`🔄 Fixed missing YouTube ID for "${song.title}"`);
      }
    }

    // 4️⃣ If still not found, resolve via YouTube (persist only when DB is up)
    if (!song) {
      const titleToSearch = titleParam || id;
      console.log(`🆕 Resolving YouTube ID for: "${titleToSearch}"`);

      const result = await searchYouTubeByTitle(titleToSearch);
      youtubeId = result.youtubeId;
      thumb = result.thumb;
      ytTitle = result.ytTitle;

      if (!youtubeId) {
        console.error("❌ Could not resolve a valid YouTube ID");
        return res.status(404).json({ error: "Could not resolve YouTube ID" });
      }

      if (canPersist) {
        try {
          song = await Song.create({
            title: ytTitle || titleToSearch,
            youtubeId,
            thumb: thumb || "",
            coverArt: thumb || "https://via.placeholder.com/300x300?text=WeVibe+Song",
            audioUrl: "",
            lastFetched: Date.now(),
          });
          console.log(`✳️ Created new song in DB: "${song.title}"`);
        } catch (err) {
          console.warn("⚠️ DB save skipped for new song:", err?.message || err);
          transient = true;
          song = buildTransientSong(ytTitle || titleToSearch, youtubeId, thumb);
        }
      } else {
        transient = true;
        song = buildTransientSong(ytTitle || titleToSearch, youtubeId, thumb);
        console.log(`✳️ Transient song (no DB): "${song.title}"`);
      }
    }

    youtubeId = youtubeId || song.youtubeId;

    if (!youtubeId) {
      console.error("❌ youtubeId missing even after fallback resolution");
      return res.status(404).json({ error: "youtubeId missing" });
    }

    // 5️⃣ Cache logic
    const now = Date.now();
    const maxAge = 1000 * 60 * 60 * 2;
    const needsRefresh =
      !song.audioUrl || !song.lastFetched || now - song.lastFetched > maxAge;

    if (canPersist && !needsRefresh && song.audioUrl) {
      console.log(`🎵 Using cached audio for "${song.title}"`);
      return res.json({ audioUrl: song.audioUrl });
    }

    if (audioCache.has(youtubeId)) {
      console.log(`🎵 Using memory cache for: ${youtubeId}`);
      return res.json({ audioUrl: audioCache.get(youtubeId) });
    }

    // 6️⃣ yt-dlp fetch
    console.log(`🎬 Fetching fresh audio stream for YouTube ID: ${youtubeId}`);
    const info = await youtubedl(`https://www.youtube.com/watch?v=${youtubeId}`, {
      dumpSingleJson: true,
      format: "bestaudio[ext=m4a]/bestaudio/best",
      quiet: true,
      noCheckCertificates: true,
      preferFreeFormats: false,
      addHeader: [
        "referer:youtube.com",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ],
    });

    const audioUrl =
      info?.url ||
      info?.requested_downloads?.[0]?.url ||
      info?.formats?.find(
        (f) => f.url && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none")
      )?.url;

    if (!audioUrl) {
      console.error("❌ No playable audio found from yt-dlp");
      return res.status(404).json({ error: "No playable audio found" });
    }

    if (canPersist && !transient && typeof song.save === "function") {
      song.audioUrl = audioUrl;
      song.lastFetched = now;
      await song.save().catch((err) => {
        console.warn("⚠️ DB cache save skipped:", err?.message || err);
      });
      console.log(`💾 Saved audio URL for "${song.title}"`);
    }

    audioCache.set(youtubeId, audioUrl);
    setTimeout(() => audioCache.delete(youtubeId), 1000 * 60 * 30);

    console.log(`✅ Audio ready for "${song.title}"`);
    res.json({ audioUrl });
  } catch (err) {
    console.error("❌ /audio error:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch audio" });
  }
});

// =====================================================
// 🏠 Home
// =====================================================
app.get("/api/home", requireDb, async (req, res) => {
  try {
    const playlists = await Playlist.find().populate("songs").limit(5);
    const songs = await Song.find().limit(8);
    res.json({ playlists, suggestions: songs, recent: songs.slice(0, 3) });
  } catch {
    res.status(500).json({ error: "Failed to load home data" });
  }
});

// =====================================================
// 🎵 Playlist Management
// =====================================================
app.get("/api/playlists", requireDb, async (req, res) => {
  try {
    const playlists = await Playlist.find().populate("songs");
    res.json(playlists);
  } catch {
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

app.post("/api/playlists", requireDb, verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Playlist name required" });
    const newPlaylist = await Playlist.create({
  name,
  coverArt: "https://via.placeholder.com/300x300?text=Playlist",
  songs: [],
  userId: req.user.uid,
});
    res.status(201).json(newPlaylist);
  } catch {
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

// =====================================================
// 🧩 Add Song to Playlist
// =====================================================
app.post("/api/playlists/:id/add", requireDb, async (req, res) => {
  try {
    const playlistId = req.params.id?.replace(/^p_/, "");
    const { song } = req.body;
    if (!playlistId || !song?.title)
      return res.status(400).json({ error: "Invalid playlist ID or song data" });

    let playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });

    let existingSong = await Song.findOne({ title: song.title });
    if (!existingSong) {
      const { youtubeId, thumb, ytTitle } = await searchYouTubeByTitle(song.title);
      if (!youtubeId) {
  return res.status(404).json({ error: "Song not found on YouTube" });
}
      existingSong = await Song.create({
        title: ytTitle || song.title,
        youtubeId,
        thumb: thumb || song.thumb || "",
        coverArt: thumb || song.thumb || "https://via.placeholder.com/300x300?text=WeVibe+Song",
      });
    }

    playlist.songs.addToSet(existingSong._id);

if (!playlist.coverArt || playlist.coverArt.includes("placeholder")) {
  playlist.coverArt = existingSong.coverArt;
}

await playlist.save();

    const updated = await Playlist.findById(playlistId).populate("songs");
    res.json(updated);
  } catch (err) {
    console.error("❌ Add song error:", err?.message || err);
    res.status(500).json({ error: "Failed to add song" });
  }
});

// =====================================================
// 🗑️ Delete Playlist
// =====================================================
app.delete("/api/playlists/:id", requireDb, verifyToken, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    if (playlist.userId !== req.user.uid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await playlist.deleteOne();
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    console.error("❌ Delete playlist error:", err);
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});


// =====================================================
// 🎶 Import Playlist from Spotify (YouTube Synced)
// =====================================================
app.get("/api/import/spotify", requireDb, async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ error: "Missing playlistId" });

  try {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({ grant_type: "client_credentials" }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token)
      return res.status(500).json({ error: "Failed to get Spotify token" });

    const playlistRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const data = await playlistRes.json();

    if (!data?.tracks?.items?.length)
      return res.status(404).json({ error: "Playlist empty" });

    const songs = [];
const MAX_IMPORT = 25; // protect YouTube API quota

for (const i of data.tracks.items.slice(0, MAX_IMPORT)) {
  if (!i.track?.name) continue;
  const title = `${i.track.name} - ${i.track.artists.map((a) => a.name).join(", ")}`;
  const result = await searchYouTubeByTitle(title);
  if (!result.youtubeId) continue;

      // Save song in Mongo immediately with YouTube ID
      let dbSong = await Song.findOne({ youtubeId: result.youtubeId });
      if (!dbSong) {
        dbSong = await Song.create({
          title: result.ytTitle || title,
          youtubeId: result.youtubeId,
          thumb: result.thumb || i.track.album?.images?.[0]?.url || "",
          coverArt: result.thumb || i.track.album?.images?.[0]?.url || "",
        });
      }

      songs.push({
        _id: dbSong._id,
        title: dbSong.title,
        youtubeId: dbSong.youtubeId,
        thumb: dbSong.thumb,
        coverArt: dbSong.coverArt,
      });
    }

    res.json({
  playlistName: data.name,
  totalTracks: songs.length,
  importedLimit: MAX_IMPORT,
  note: "Only first 25 songs imported to protect API limits",
  songs,
});
  } catch (err) {
    console.error("❌ Spotify import error:", err?.message || err);
    res.status(500).json({ error: "Spotify import failed" });
  }
});

// =====================================================
// 🚀 Server Start
// =====================================================
// =====================================================
// 🧩 REMOVE SONG FROM PLAYLIST (FIX — REQUIRED)
// =====================================================
app.post("/api/playlists/:id/remove", requireDb, async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ error: "songId required" });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    playlist.songs = playlist.songs.filter(
      (s) => s.toString() !== songId.toString()
    );

    await playlist.save();

    const updated = await Playlist.findById(req.params.id).populate("songs");
    res.json(updated);
  } catch (err) {
    console.error("Remove song error:", err);
    res.status(500).json({ error: "Failed to remove song" });
  }
});
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, _next) => {
  console.error(`[server] ${req.method} ${req.path}:`, err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} (${isProd ? "production" : "development"})`);
});

startDbConnection();

// =====================================================
// Utility
// =====================================================
function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTransientSong(title, youtubeId, thumb) {
  return {
    _id: null,
    title,
    youtubeId,
    thumb: thumb || "",
    coverArt: thumb || "https://via.placeholder.com/300x300?text=WeVibe+Song",
    audioUrl: "",
    lastFetched: null,
  };
}

