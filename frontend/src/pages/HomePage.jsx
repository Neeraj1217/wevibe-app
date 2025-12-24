import React, { useEffect, useState } from "react";
import axios from "axios";
import "./HomePage.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function HomePage() {
  const [playlists, setPlaylists] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await axios.get(`${API}/api/home`);
        setPlaylists(res.data.playlists);
        setSuggestions(res.data.suggestions);
        setRecent(res.data.recent);
      } catch (err) {
        console.error("Error fetching home data:", err);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <div className="homePage">
      <section className="section">
        <h2>Your Playlists</h2>
        <div className="grid">
          {playlists.map((pl) => (
            <div key={pl._id} className="card">
              <img src={pl.coverArt} alt={pl.name} />
              <p>{pl.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Suggested For You</h2>
        <div className="grid">
          {suggestions.map((song) => (
            <div key={song._id} className="card">
              <img src={song.coverArt} alt={song.title} />
              <p>{song.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Recently Played</h2>
        <div className="grid">
          {recent.map((song) => (
            <div key={song._id} className="card">
              <img src={song.coverArt} alt={song.title} />
              <p>{song.title}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
