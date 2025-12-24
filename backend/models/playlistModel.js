import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema({
  // userId temporarily optional until authentication is added
  userId: { type: String, required: false },

  name: { type: String, required: true },

  coverArt: {
    type: String,
    default: "https://via.placeholder.com/300x300?text=Playlist",
  },

  songs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

const Playlist = mongoose.model("Playlist", playlistSchema);
export default Playlist;
