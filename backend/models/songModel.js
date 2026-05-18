import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: String,
  album: String,
  coverArt: String,
  duration: String,
  audioUrl: String
});

// ✅ Important: Export as default
const Song = mongoose.model("Song", songSchema);
export default Song;
