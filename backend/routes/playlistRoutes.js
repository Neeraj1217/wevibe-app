import express from "express";
import Playlist from "../models/playlistModel.js";
import Song from "../models/songModel.js";

const router = express.Router();

// 📂 Get all playlists
router.get("/", async (req, res) => {
  try {
    const playlists = await Playlist.find().populate("songs");
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

// ➕ Create a new playlist
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const newPlaylist = await Playlist.create({ name, songs: [] });
    res.json(newPlaylist);
  } catch (err) {
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

// 🎶 Add song to a playlist
router.post("/:id/add", async (req, res) => {
  try {
    const { songId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    const song = await Song.findById(songId);

    if (!playlist || !song)
      return res.status(404).json({ error: "Playlist or song not found" });

    if (!playlist.songs.includes(song._id)) playlist.songs.push(song._id);
    await playlist.save();

    res.json(await playlist.populate("songs"));
  } catch (err) {
    res.status(500).json({ error: "Failed to add song to playlist" });
  }
});

// ❌ Remove song from playlist
router.post("/:id/remove", async (req, res) => {
  try {
    const { songId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });

    playlist.songs = playlist.songs.filter(
      (s) => s.toString() !== songId.toString()
    );
    await playlist.save();

    res.json(await playlist.populate("songs"));
  } catch (err) {
    res.status(500).json({ error: "Failed to remove song" });
  }
});

// 🗑️ Delete a playlist
router.delete("/:id", async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete playlist" });
  }
});

export default router;
