import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import App from "./App";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

export default function RootApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          background: "radial-gradient(circle at center, #0b0a10, #050507 70%)",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            background: "linear-gradient(90deg, #ff0077, #ff66c4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Loading WeVibe...
        </h1>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <App /> : <Navigate to="/login" />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
}
