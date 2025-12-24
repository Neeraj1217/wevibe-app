import mongoose from "mongoose";
import dotenv from "dotenv";
import Song from "./models/songModel.js";
import Playlist from "./models/playlistModel.js";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const seedData = async () => {
  try {
    await Song.deleteMany();
    await Playlist.deleteMany();

    // Add demo songs
    const songs = await Song.insertMany([
      {
        title: "Sunset Vibes",
        artist: "LoFi Nights",
        album: "Dreamscapes",
        coverArt: "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2",
        duration: "3:25",
        audioUrl: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3"
      },
      {
        title: "Ocean Flow",
        artist: "WaveRider",
        album: "Chill Horizons",
        coverArt: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc",
        duration: "4:12",
        audioUrl: "https://samplelib.com/lib/preview/mp3/sample-6s.mp3"
      },
      {
        title: "Dream On",
        artist: "Aurora Sky",
        album: "Dreamland",
        coverArt: "https://images.unsplash.com/photo-1511376777868-611b54f68947",
        duration: "2:58",
        audioUrl: "https://samplelib.com/lib/preview/mp3/sample-9s.mp3"
      },
      {
        title: "Midnight Cruise",
        artist: "Neon Rider",
        album: "Night City",
        coverArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
        duration: "3:40",
        audioUrl: "https://samplelib.com/lib/preview/mp3/sample-12s.mp3"
      }
    ]);

    // Create a sample playlist
    await Playlist.create({
      userId: "demoUser",
      name: "Chill Nights 🌙",
      coverArt: songs[0].coverArt,
      songs: [songs[0]._id, songs[1]._id, songs[2]._id]
    });

    console.log("✅ Dummy data seeded!");
    process.exit();
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

seedData();
