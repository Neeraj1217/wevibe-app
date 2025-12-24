// App.js — Full drop-in (menu portal memoized + deletePlaylist fix + small hardening)
// Replace your existing App.js with this file (matches your backend DELETE /api/playlists/:id)
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Volume2,
  MoreVertical,
  Trash2,
  PlusCircle,
  Music2,
  FolderPlus,
  FolderMinus,
  Home,
  Library,
  ArrowLeft,
  Globe2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import "./App.css";

// ✅ Firebase Auth imports (if you're using Firebase)
import { auth, initRecaptcha, signInWithPhoneNumber } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:5000";

function App() {
  // --- state ---
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [view, setView] = useState("splash");
  const [currentIndex, setCurrentIndex] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [repeatMode, setRepeatMode] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueVisible, setQueueVisible] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  // 🔐 Auth UI State
const [phoneNumber, setPhoneNumber] = useState("");
const [otp, setOtp] = useState("");
const [verificationId, setVerificationId] = useState(null);
const [authLoading, setAuthLoading] = useState(false);

  // ✅ Firebase user tracking
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // menu/focus states
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  // create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // 🎵 Spotify import
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [importingSpotify, setImportingSpotify] = useState(false);

  const audioRef = useRef(null);

  // loading states for audio fetch
  const [loadingSongId, setLoadingSongId] = useState(null);
  const [loadedSongId, setLoadedSongId] = useState(null);

  // time update throttle ref (prevents massive re-renders during playback)
  const timeThrottleRef = useRef(false);

  // persistent portal container (so we don't re-append/remove element on every render)
  const portalContainerRef = useRef(null);
  // one-time mounted marker for menu to avoid re-triggering CSS animation repeatedly
  const menuMountedRef = useRef(false);

  // ✅ Firebase auth listener (optional)
  useEffect(() => {
    if (!auth || !onAuthStateChanged) return setCheckingAuth(false);
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setCheckingAuth(false);
      if (firebaseUser) {
        console.log("✅ Logged in:", firebaseUser.phoneNumber);
      } else {
        console.log("❌ Logged out");
      }
    });
    return () => unsub();
  }, []);

  // create persistent portal container once
  useEffect(() => {
    const node = document.createElement("div");
    node.setAttribute("data-wevibe-portal", "true");
    portalContainerRef.current = node;
    document.body.appendChild(node);
    return () => {
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current);
      }
      portalContainerRef.current = null;
    };
  }, []);
  // 🔐 Handle Send OTP
  const handleSendOtp = async () => {
    if (!phoneNumber) return toast.error("Please enter a phone number");

    try {
      setAuthLoading(true);
      const appVerifier = initRecaptcha("recaptcha-container");
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      );
      setVerificationId(confirmationResult);
      toast.success("OTP Sent!");
    } catch (error) {
      console.error("Auth Error:", error);
      toast.error(error.message || "Failed to send OTP");
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔐 Handle Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp) return toast.error("Please enter the OTP");

    try {
      setAuthLoading(true);
      await verificationId.confirm(otp);
      toast.success("Login Successful!");
      setVerificationId(null);
    } catch (error) {
      console.error("Verify Error:", error);
      toast.error("Invalid OTP");
    } finally {
      setAuthLoading(false);
    }
  };
  // splash
  useEffect(() => {
    setView("splash");
    const t = setTimeout(() => setView("home"), 1200);
    return () => clearTimeout(t);
  }, []);

  // load playlists when ready
  useEffect(() => {
    if (view !== "splash") {
      loadPlaylists();
      axios.get(`${API_BASE}/api/home`).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // --- API calls / operations ---
  const loadPlaylists = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/playlists`);
      setPlaylists(res.data || []);
    } catch (err) {
      console.error("loadPlaylists", err?.response?.data || err);
      toast.error("Failed to load playlists");
    }
  };

  const searchSongs = async () => {
    if (!query.trim()) return;
    try {
      const res = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      setSongs(res.data || []);
      setCurrentPlaylist(null);
      setView("home");
    } catch (err) {
      console.error("searchSongs", err?.response?.data || err);
      toast.error("Search failed");
    }
  };

  // --- Playback ---
  const loadAudio = async (song, autoPlay = true) => {
    if (!song) return;

    const id = song.youtubeId || song.id || song._id;
    const uniqueId = id || `${song.title}-${song.title.length}`;

    if (loadingSongId === uniqueId) {
      toast("Already loading...");
      return;
    }

    try {
      setLoadingSongId(uniqueId);
      setAudioUrl("");
      setLoadedSongId(null);

      const isMongoId = id && /^[0-9a-fA-F]{24}$/.test(id);
      const endpoint = isMongoId
        ? `${API_BASE}/audio?title=${encodeURIComponent(song.title)}`
        : id
        ? `${API_BASE}/audio?id=${encodeURIComponent(id)}`
        : `${API_BASE}/audio?title=${encodeURIComponent(song.title)}`;

      console.log("🎧 Fetching audio from:", endpoint);
      const res = await axios.get(endpoint);

      if (res.data?.audioUrl) {
        setAudioUrl(res.data.audioUrl);
        setLoadedSongId(uniqueId);
        if (autoPlay) {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play().catch((e) => console.warn("Autoplay blocked:", e));
              setIsPlaying(true);
            }
          }, 200);
        }
        console.log(`✅ Track ready: "${song.title}"${autoPlay ? " (autoplaying)" : ""}`);
      } else {
        toast.error("Audio unavailable");
      }
    } catch (err) {
      console.error("loadAudio", err?.response?.data || err);
      toast.error("Unable to load audio");
    } finally {
      setLoadingSongId(null);
    }
  };

  const playLoaded = () => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((e) => {
        console.warn("Autoplay issue:", e);
        setIsPlaying(true);
      });
  };

  const playSong = async (index, list = songs) => {
    if (!list?.length || index == null || index < 0 || index >= list.length) return;
    const song = list[index];
    setCurrentIndex(index);
    setSongs(list);
    setCurrentSong(song);

    const id = song.youtubeId || song.id || song._id;
    const uniqueId = id || `${song.title}-${song.title.length}`;

    if (loadedSongId === uniqueId && audioUrl) {
      playLoaded();
      return;
    }

    await loadAudio(song, true);
  };

  const playSongFromObject = async (song, autoPlay = true) => {
    if (!song) return;
    setCurrentIndex(null);
    setCurrentSong(song);
    const id = song.youtubeId || song.id || song._id;
    const uniqueId = id || `${song.title}-${song.title.length}`;

    if (loadedSongId === uniqueId && audioUrl) {
      if (autoPlay) playLoaded();
      return;
    }

    await loadAudio(song, autoPlay);
  };

  const nextSong = () => {
    if (!audioRef.current) return;

    if (repeatMode && currentSong) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    if (queue.length > 0) {
      const nextQueued = queue[0];
      setQueue((prev) => prev.slice(1));
      playSongFromObject(nextQueued, true);
      return;
    }

    if (!songs.length) {
      toast("Queue empty");
      setIsPlaying(false);
      return;
    }

    const nextIndex = shuffleMode
      ? Math.floor(Math.random() * songs.length)
      : currentIndex == null
      ? 0
      : (currentIndex + 1) % songs.length;

    playSong(nextIndex);
  };

  const prevSong = () => {
    if (!songs.length) return;
    if (currentIndex == null) {
      toast("No previous in current context");
      return;
    }
    const prev = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    playSong(prev);
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      toast("No loaded audio — press Load first");
      return;
    }
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * duration;
    if (audioRef.current) audioRef.current.currentTime = newTime;
    setProgress(e.target.value);
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleLoaded = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  // Throttled time updates to avoid high-frequency React state updates while playing
  const handleTime = () => {
    if (timeThrottleRef.current) return;
    timeThrottleRef.current = true;

    const current = audioRef.current?.currentTime || 0;
    const newProgress = ((current / (duration || 1)) * 100) || 0;
    setProgress(newProgress);

    setTimeout(() => {
      timeThrottleRef.current = false;
    }, 150);
  };

  // --- Queue helpers ---
  const addToQueue = (song) => {
    if (!song) return;
    setQueue((prev) => [...prev, song]);
    toast.success(`Added "${song.title}" to queue`);
  };

  const playNextInQueue = (song) => {
    if (!song) return;
    setQueue((prev) => [song, ...prev]);
    toast.success(`"${song.title}" will play next`);
  };

  const dequeue = (songIdOrObj) => {
    setQueue((prev) => {
      const id =
        typeof songIdOrObj === "string" || typeof songIdOrObj === "number"
          ? songIdOrObj
          : songIdOrObj?._id || songIdOrObj?.id || songIdOrObj?.youtubeId;
      return prev.filter((s) => {
        const sid = s?._id || s?.id || s?.youtubeId;
        return id ? sid !== id : s.title !== songIdOrObj.title;
      });
    });
    toast.success("Removed from queue");
  };

  // --- Playlists ---
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/playlists`, { name: newPlaylistName });
      if (res?.data) {
        toast.success("Playlist created");
        setShowCreateModal(false);
        setNewPlaylistName("");
        loadPlaylists();
      } else {
        toast.error("Failed to create playlist");
      }
    } catch (err) {
      console.error("createPlaylist", err?.response?.data || err);
      toast.error("Failed to create playlist");
    }
  };

  const addToPlaylist = async (playlistId, song) => {
    try {
      const payloadSong = {
        id: song.id || song.youtubeId || song._id,
        title: song.title,
        thumb: song.thumb || song.coverArt || "",
      };
      const res = await axios.post(`${API_BASE}/api/playlists/${encodeURIComponent(playlistId)}/add`, {
        song: payloadSong,
      });
      if (res?.data) {
        toast.success("Added to playlist");
        loadPlaylists();
      } else {
        toast.error("Failed to add song");
      }
    } catch (err) {
      console.error("addToPlaylist", err?.response?.data || err);
      toast.error("Failed to add song");
    }
  };

  const removeFromPlaylist = async (playlistId, songId) => {
    try {
      const res = await axios.post(`${API_BASE}/api/playlists/${encodeURIComponent(playlistId)}/remove`, { songId });
      if (res?.data) {
        toast.success("Removed from playlist");
        loadPlaylists();
        setSongs((prev) =>
          prev.filter((s) => s._id !== songId && s.id !== songId && s.youtubeId !== songId)
        );
      } else {
        toast.error("Failed to remove song");
      }
    } catch (err) {
      console.error("removeFromPlaylist", err?.response?.data || err);
      toast.error("Failed to remove song");
    }
  };

  // Hardened deletePlaylist — confirms and validates id before request
  const deletePlaylist = async (id) => {
    if (!id) {
      console.warn("deletePlaylist called without id", id);
      toast.error("Unable to delete playlist (missing id)");
      return;
    }

    // confirmation to avoid accidental deletes
    if (!window.confirm("Delete this playlist? This cannot be undone.")) return;

    try {
      await axios.delete(`${API_BASE}/api/playlists/${encodeURIComponent(id)}`);
      toast.success("Playlist deleted");
      loadPlaylists();
      if (currentPlaylist?._id === id) {
        setCurrentPlaylist(null);
        setSongs([]);
        setView("library");
      }
    } catch (err) {
      console.error("deletePlaylist ▶ AxiosError", err?.response || err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Delete failed";
      toast.error(`Delete failed: ${msg}`);
    }
  };

  // --- Import Spotify Playlist (frontend trigger) ---
  const importSpotifyPlaylist = async () => {
    if (!spotifyUrl.trim()) {
      toast.error("Please paste a Spotify playlist URL");
      return;
    }

    const match = spotifyUrl.match(/playlist\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      toast.error("Invalid Spotify playlist link");
      return;
    }

    const playlistId = match[1];
    setImportingSpotify(true);

    try {
      const res = await axios.get(`${API_BASE}/api/import/spotify?playlistId=${encodeURIComponent(playlistId)}`);
      if (!res?.data?.songs?.length) {
        toast.error("No songs found in that playlist");
        setImportingSpotify(false);
        return;
      }

      const newPlaylist = await axios.post(`${API_BASE}/api/playlists`, {
        name: res.data.playlistName || "Imported Spotify Playlist",
      });

      for (const s of res.data.songs.slice(0, 30)) {
        await axios.post(`${API_BASE}/api/playlists/${newPlaylist.data._id}/add`, {
          song: {
            id: s.title,
            title: s.title,
            thumb: s.thumb,
          },
        });
      }

      toast.success(`Imported "${res.data.playlistName}" 🎧`);
      setSpotifyUrl("");
      loadPlaylists();
    } catch (err) {
      console.error("importSpotifyPlaylist", err?.response?.data || err);
      toast.error("Failed to import Spotify playlist");
    } finally {
      setImportingSpotify(false);
    }
  };

  const openPlaylist = (playlist) => {
    if (!playlist?.songs?.length) {
      toast("Playlist is empty");
      return;
    }
    setCurrentPlaylist(playlist);
    setSongs(playlist.songs);
    setView("playlist");
  };

  // helper to get a stable unique id for a song object (used for loading state)
  const getSongUniqueId = (song) => {
    const id = song?.youtubeId || song?.id || song?._id;
    return id || `${song?.title || "unknown"}-${String(song?.title || "").length}`;
  };

  // renderSongMenu: creates menu trigger button with data attribute anchor
  const renderSongMenu = (song, index) => {
    const toggleMenu = (e) => {
      e?.stopPropagation?.();
      const newIndex = openMenuIndex === index ? null : index;

      if (newIndex !== null) {
        const btn = e.currentTarget || e.target.closest(".songMenuBtn") || e.target.closest(".iconBtn");
        let rect = null;
        if (btn && btn.getBoundingClientRect) rect = btn.getBoundingClientRect();
        else rect = { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 36, height: 36 };

        setOpenMenuIndex(newIndex);
        setSubmenuVisible(false);
        setMenuPos({
          left: rect.left,
          top: rect.top + rect.height + window.scrollY,
          width: rect.width,
          anchorIndex: newIndex,
        });
        setTimeout(() => {
          menuMountedRef.current = true;
          setMenuOpen(true);
        }, 18);
      } else {
        setMenuOpen(false);
        setSubmenuVisible(false);
        setTimeout(() => {
          setOpenMenuIndex(null);
          setMenuPos(null);
          menuMountedRef.current = false;
        }, 160);
      }
    };

    return (
      <div style={{ position: "relative" }}>
        <button
          className={`iconBtn songMenuBtn ${openMenuIndex === index ? "active" : ""}`}
          data-menu-index={index}
          title="Options"
          onClick={toggleMenu}
        >
          <MoreVertical size={16} />
        </button>
      </div>
    );
  };

  /**
   * Menu portal - memoized to avoid re-creation every playback tick.
   * Only updates when relevant pieces change (openMenuIndex, menuPos coords, playlist/queue sizes, submenu visibility, loadedSongId/audioUrl)
   */
  const menuPortalElement = useMemo(() => {
    if (openMenuIndex == null) return null;
    if (!portalContainerRef.current) return null;

    const song = songs[openMenuIndex] || (currentPlaylist?.songs && currentPlaylist.songs[openMenuIndex]);
    if (!song) return null;

    const isQueued = queue.some(
      (q) => (q._id || q.id || q.youtubeId) === (song._id || song.id || song.youtubeId)
    );
    const isInPlaylist = !!currentPlaylist;

    const menuWidth = 230;
    const menuHeight = 190;

    let left = menuPos?.left ?? window.innerWidth / 2 - menuWidth / 2;
    let top = menuPos?.top ?? window.innerHeight / 2 - menuHeight / 2 + window.scrollY;

    const anchorBtn = document.querySelector(`.songMenuBtn[data-menu-index="${openMenuIndex}"]`);
    if (anchorBtn && anchorBtn.getBoundingClientRect) {
      const rect = anchorBtn.getBoundingClientRect();
      left = rect.left;
      top = rect.top + rect.height + window.scrollY;
    }

    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight + window.scrollY;

    if (left + menuWidth > vw - margin) left = Math.max(margin, vw - menuWidth - margin);
    if (left < margin) left = margin;

    if (top + menuHeight > vh - margin) {
      const anchorRect = anchorBtn && anchorBtn.getBoundingClientRect ? anchorBtn.getBoundingClientRect() : null;
      if (anchorRect) {
        const possibleTop = anchorRect.top + window.scrollY - menuHeight - 8;
        if (possibleTop > margin) top = possibleTop;
        else top = Math.max(margin, vh - menuHeight - margin);
      } else {
        top = Math.max(margin, vh - menuHeight - margin);
      }
    }
    if (top < margin) top = margin;

    const overlayStyle = {
      position: "fixed",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
    };

    const menuStyle = {
      position: "absolute",
      left,
      top,
      width: menuWidth,
      zIndex: 100000,
      backdropFilter: "blur(14px)",
      borderRadius: 14,
      background: "rgba(20,20,20,0.75)",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0px 8px 30px rgba(0,0,0,0.6)",
      padding: "6px 0",
    };

    const submenuStyle = {
      position: "absolute",
      left: "100%",
      top: 0,
      background: "rgba(20,20,20,0.92)",
      backdropFilter: "blur(14px)",
      padding: "6px 0",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.06)",
      width: 220,
      boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
      animation: "fadeInMenu 0.18s ease-out",
      zIndex: 100001,
    };

    const content = (
      <div
        className="menuOverlay"
        onClick={() => {
          setMenuOpen(false);
          setSubmenuVisible(false);
          setTimeout(() => {
            setOpenMenuIndex(null);
            setMenuPos(null);
            menuMountedRef.current = false;
          }, 120);
        }}
        style={overlayStyle}
      >
        <div
          className={`songMenu ${menuMountedRef.current ? "menu-mounted" : ""}`}
          onClick={(e) => e.stopPropagation()}
          style={menuStyle}
        >
          {/* Add to Queue */}
          {!isQueued && (
            <>
              <div
                className="menuItem"
                onClick={() => {
                  addToQueue(song);
                  setMenuOpen(false);
                  setTimeout(() => {
                    setOpenMenuIndex(null);
                    setMenuPos(null);
                    menuMountedRef.current = false;
                  }, 100);
                }}
              >
                <PlusCircle size={15} /> Add to Queue
              </div>

              <div
                className="menuItem"
                onClick={() => {
                  playNextInQueue(song);
                  setMenuOpen(false);
                  setTimeout(() => {
                    setOpenMenuIndex(null);
                    setMenuPos(null);
                    menuMountedRef.current = false;
                  }, 100);
                }}
              >
                <Music2 size={15} /> Play Next
              </div>
            </>
          )}

          {/* Remove from Queue */}
          {isQueued && (
            <div
              className="menuItem"
              onClick={() => {
                dequeue(song);
                setMenuOpen(false);
                setTimeout(() => {
                  setOpenMenuIndex(null);
                  setMenuPos(null);
                  menuMountedRef.current = false;
                }, 100);
              }}
            >
              <Trash2 size={15} /> Remove from Queue
            </div>
          )}

          {/* Add to Playlist (submenu) */}
          {!isInPlaylist && (
            <div
              className="menuItem"
              onMouseEnter={() => setSubmenuVisible(true)}
              onMouseLeave={() => setSubmenuVisible(false)}
              style={{ position: "relative" }}
            >
              <FolderPlus size={15} /> Add to Playlist ▸

              {submenuVisible && (
                <div className="playlistSubmenu" style={submenuStyle}>
                  {playlists.length > 0 ? (
                    playlists.map((p) => (
                      <div
                        key={p._id}
                        className="menuItem"
                        onClick={() => {
                          addToPlaylist(p._id, song);
                          setMenuOpen(false);
                          setTimeout(() => {
                            setOpenMenuIndex(null);
                            setMenuPos(null);
                            menuMountedRef.current = false;
                          }, 100);
                        }}
                      >
                        {p.name}
                      </div>
                    ))
                  ) : (
                    <div className="menuItem" style={{ opacity: 0.65 }}>
                      No playlists found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Remove from playlist */}
          {isInPlaylist && (
            <div
              className="menuItem"
              onClick={() => {
                const songId = song._id || song.id || song.youtubeId;
                removeFromPlaylist(currentPlaylist._id, songId);
                setMenuOpen(false);
                setTimeout(() => {
                  setOpenMenuIndex(null);
                  setMenuPos(null);
                  menuMountedRef.current = false;
                }, 100);
              }}
            >
              <FolderMinus size={15} /> Remove from Playlist
            </div>
          )}
        </div>
      </div>
    );

    return createPortal(content, portalContainerRef.current);
    // NOTE: dependencies intentionally limited to avoid re-creation on playback progress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openMenuIndex,
    menuPos?.left,
    menuPos?.top,
    playlists.length,
    queue.length,
    submenuVisible,
    currentPlaylist?._id,
    songs.length,
    loadedSongId,
    audioUrl,
  ]);

  // --- outside click close ---
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen && openMenuIndex == null) return;
      if (e.target.closest && (e.target.closest(".songMenu") || e.target.closest(".songMenuBtn") || e.target.closest(".iconBtn"))) return;
      setMenuOpen(false);
      setSubmenuVisible(false);
      setTimeout(() => {
        setOpenMenuIndex(null);
        setMenuPos(null);
        menuMountedRef.current = false;
      }, 160);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen, openMenuIndex]);

  // reposition portal menu on scroll/resize and when icons move
  useEffect(() => {
    if (openMenuIndex == null) return;

    let raf = null;
    const updatePosFromAnchor = () => {
      const anchor = document.querySelector(`.songMenuBtn[data-menu-index="${openMenuIndex}"]`);
      if (anchor && anchor.getBoundingClientRect) {
        const rect = anchor.getBoundingClientRect();
        setMenuPos({
          left: rect.left,
          top: rect.top + rect.height + window.scrollY,
          width: rect.width,
          anchorIndex: openMenuIndex,
        });
      }
    };

    const onScrollResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updatePosFromAnchor());
    };

    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    updatePosFromAnchor();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [openMenuIndex]);

  // splash view
  if (view === "splash") {
    return (
      <div
        style={{
          height: "100vh",
          background: "radial-gradient(circle at center, #0b0a10, #050507 70%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          color: "#fff",
          fontFamily: "Poppins, sans-serif",
          overflow: "hidden",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, #ff0077, #ff66c4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: 0,
            animation: "fadeInScale 1.2s ease forwards",
          }}
        >
          Welcome to WeVibe
        </h1>
      </div>
    );
  }

  // --- Logout handler ---
  const handleLogout = async () => {
    try {
      if (signOut && auth) await signOut(auth);
      localStorage.removeItem("username");
      localStorage.removeItem("userPhone");
      toast.success("Logged out successfully");
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Logout failed");
    }
  };

  return (
    <div className={`app ${menuOpen ? "focus-active" : ""}`}>
      <Toaster position="top-right" />
      <header className="header">
        <h1 className="logo" onClick={() => setView("home")}>
          🎧 <span className="gradient">WeVibe</span>
        </h1>
        <div className="searchBar">
          <input
            type="text"
            placeholder="Search songs or artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchSongs()}
          />
          <button onClick={searchSongs}>Search</button>
        </div>

        {user && (
          <div className="userInfo">
            <span className="userPhone">{localStorage.getItem("username") || user.displayName || user.phoneNumber}</span>
            <button className="logoutChip" onClick={handleLogout}>
              ⎋ Logout
            </button>
          </div>
        )}
      </header>

      <div className="main spotifyStyle">
        <aside className="sidebarNav">
          <div className={`navItem ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>
            <Home size={16} /> Home
          </div>
          <div className={`navItem ${view === "library" || view === "playlist" ? "active" : ""}`} onClick={() => setView("library")}>
            <Library size={16} /> Library
          </div>
        </aside>

        <section className={`contentArea ${menuOpen ? "menu-open" : ""}`}>
          {view === "home" && (
            <>
              <h2>Suggested Songs</h2>
              <div className="cardGrid">
                {songs.map((s, i) => {
                  const uid = getSongUniqueId(s);
                  const isLoading = loadingSongId === uid;
                  const isLoaded = loadedSongId === uid && audioUrl;
                  return (
                    <div key={i} className={`musicCard ${openMenuIndex === i ? "active" : ""}`}>
                      <div className="cardImageWrapper">
                        <img src={s.thumb || s.coverArt} alt={s.title} className="cardImage" />
                        <div className="playOverlay">
                          {!isLoaded && !isLoading && (
                            <button
                              className="overlayBtn loadBtn"
                              onClick={() => {
                                loadAudio(s, false);
                                setCurrentIndex(i);
                                setCurrentSong(s);
                              }}
                              title="Load (prepares stream so Play responds instantly)"
                            >
                              Load
                            </button>
                          )}
                          {isLoading && (
                            <div className="overlayBtn loadingIndicator" title="Loading...">
                              Loading...
                            </div>
                          )}
                          {isLoaded && (
                            <button
                              className="overlayBtn playBtn"
                              onClick={() => {
                                setCurrentIndex(i);
                                setCurrentSong(s);
                                playLoaded();
                              }}
                              title="Play"
                            >
                              <Play size={18} />
                            </button>
                          )}
                          <div
                            className="fullClickArea"
                            onClick={() => {
                              if (isLoaded) {
                                setCurrentIndex(i);
                                setCurrentSong(s);
                                playLoaded();
                              } else if (!isLoading) {
                                loadAudio(s, true);
                                setCurrentIndex(i);
                                setCurrentSong(s);
                              } else {
                                toast("Loading... please wait");
                              }
                            }}
                            aria-hidden
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <p className="cardTitle">{s.title}</p>
                        {renderSongMenu(s, i)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <h2 style={{ marginTop: "2rem" }}>Your Latest Playlists</h2>
              <div className="cardGrid">
                {playlists.map((p) => (
                  <div key={p._id} className="musicCard" onClick={() => openPlaylist(p)}>
                    <img src={p.songs?.[0]?.coverArt || "https://via.placeholder.com/200x200?text=Playlist"} alt={p.name} className="cardImage" />
                    <p className="cardTitle">{p.name}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "library" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Your Playlists</h2>
                <button onClick={() => setShowCreateModal(true)} className="createPlaylistBtn">
                  <FolderPlus size={14} /> Create
                </button>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  margin: "20px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Globe2 size={18} color="#1DB954" />
                <input
                  type="text"
                  placeholder="Paste Spotify playlist link..."
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "white",
                    outline: "none",
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={importSpotifyPlaylist}
                  disabled={importingSpotify}
                  className="createPlaylistBtn"
                  style={{
                    background: importingSpotify ? "#333" : "#1DB954",
                    color: "white",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: importingSpotify ? "not-allowed" : "pointer",
                    transition: "0.2s",
                  }}
                >
                  {importingSpotify ? "Importing..." : "Import"}
                </button>
              </div>

              <div className="cardGrid">
                {playlists.map((p) => (
                  <div key={p._id} className="musicCard">
                    <img src={p.songs?.[0]?.coverArt || "https://via.placeholder.com/200x200?text=Playlist"} alt={p.name} className="cardImage" onClick={() => openPlaylist(p)} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p className="cardTitle">{p.name}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // prevent opening playlist on trash click
                          deletePlaylist(p._id);
                        }}
                        className="createPlaylistBtn"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "playlist" && currentPlaylist && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ArrowLeft size={18} style={{ cursor: "pointer" }} onClick={() => setView("library")} />
                <h2 style={{ margin: 0 }}>{currentPlaylist.name}</h2>
              </div>
              <div className="cardGrid">
                {songs.map((s, i) => {
                  const uid = getSongUniqueId(s);
                  const isLoading = loadingSongId === uid;
                  const isLoaded = loadedSongId === uid && audioUrl;
                  return (
                    <div key={i} className={`musicCard ${openMenuIndex === i ? "active" : ""}`}>
                      <div className="cardImageWrapper">
                        <img src={s.thumb || s.coverArt} alt={s.title} className="cardImage" />
                        <div className="playOverlay">
                          {!isLoaded && !isLoading && (
                            <button
                              className="overlayBtn loadBtn"
                              onClick={() => {
                                loadAudio(s, false);
                                setCurrentIndex(i);
                                setCurrentSong(s);
                              }}
                              title="Load (prepares stream so Play responds instantly)"
                            >
                              Load
                            </button>
                          )}
                          {isLoading && (
                            <div className="overlayBtn loadingIndicator" title="Loading...">
                              Loading...
                            </div>
                          )}
                          {isLoaded && (
                            <button
                              className="overlayBtn playBtn"
                              onClick={() => {
                                setCurrentIndex(i);
                                setCurrentSong(s);
                                playLoaded();
                              }}
                              title="Play"
                            >
                              <Play size={18} />
                            </button>
                          )}
                          <div
                            className="fullClickArea"
                            onClick={() => {
                              if (isLoaded) {
                                setCurrentIndex(i);
                                setCurrentSong(s);
                                playLoaded();
                              } else if (!isLoading) {
                                loadAudio(s, true);
                                setCurrentIndex(i);
                                setCurrentSong(s);
                              } else {
                                toast("Loading... please wait");
                              }
                            }}
                            aria-hidden
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <p className="cardTitle">{s.title}</p>
                        {renderSongMenu(s, i)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {showCreateModal && (
        <div className="modalOverlay" onClick={() => setShowCreateModal(false)}>
          <div className="createModal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Playlist</h3>
            <input type="text" placeholder="Enter playlist name..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} />
            <div className="modalButtons">
              <button className="cancelBtn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="confirmBtn" onClick={createPlaylist}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
{/* 🔐 Authentication Overlay - Blocks app until logged in */}
{!user && !checkingAuth && view !== "splash" && (
  <div className="modalOverlay" style={{ zIndex: 20000 }}>
    <div className="createModal" onClick={(e) => e.stopPropagation()}>
      <h3>Welcome to WeVibe</h3>
      <p
        style={{
          margin: "0 0 15px 0",
          fontSize: "0.9rem",
          color: "#ccc",
          textAlign: "center",
        }}
      >
        Please login to save your playlists.
      </p>

      {!verificationId ? (
        <>
          <input
            type="tel"
            placeholder="Phone number (e.g. +15551234567)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <div id="recaptcha-container" style={{ margin: "10px auto" }} />

          <button
            className="confirmBtn"
            onClick={handleSendOtp}
            disabled={authLoading}
          >
            {authLoading ? "Sending..." : "Send OTP"}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter 6-digit Code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <div className="modalButtons">
            <button
              className="cancelBtn"
              onClick={() => {
                setVerificationId(null);
                setOtp("");
              }}
            >
              Back
            </button>
            <button
              className="confirmBtn"
              onClick={handleVerifyOtp}
              disabled={authLoading}
            >
              {authLoading ? "Verifying..." : "Verify Login"}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
      {/* Render memoized portal element */}
      {menuPortalElement}

      {currentSong && (
        <div className="bottomBar">
          <div className="barLeft">
            <img src={currentSong.thumb || currentSong.coverArt} alt={currentSong.title} className="barCover" />
            <div className="barInfo">
              <h4>{currentSong.title}</h4>
              <p>Now Playing</p>
            </div>
          </div>

          <div className="barCenter">
            <button className="iconBtn" onClick={() => setShuffleMode(!shuffleMode)} title="Shuffle">
              <Shuffle />
            </button>
            <button className="iconBtn" onClick={prevSong} title="Previous">
              <SkipBack />
            </button>
            {isPlaying ? (
              <button className="bigControl" onClick={togglePlay} title="Pause">
                <Pause />
              </button>
            ) : (
              <button
                className="bigControl"
                onClick={() => {
                  const uid = getSongUniqueId(currentSong);
                  if (loadedSongId === uid && audioUrl) {
                    playLoaded();
                    return;
                  }
                  if (loadingSongId === uid) {
                    toast("Loading... will be ready shortly");
                    return;
                  }
                  playSongFromObject(currentSong, true);
                }}
                title="Play"
              >
                <Play />
              </button>
            )}
            <button className="iconBtn" onClick={nextSong} title="Next">
              <SkipForward />
            </button>
            <button className="iconBtn" onClick={() => setRepeatMode(!repeatMode)} title="Repeat">
              <Repeat />
            </button>
          </div>

          <div className="barRight">
            <Volume2 />
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleVolume(e)} className="volumeSlider" />
            <input type="range" min="0" max="100" value={progress} onChange={(e) => handleSeek(e)} className="progressBar" />
            <button className="iconBtn" title="Queue" onClick={() => setQueueVisible((v) => !v)} style={{ marginLeft: 8 }}>
              <MoreVertical />
            </button>
          </div>

          {queueVisible && (
            <div className="queuePanel">
              <h4 style={{ margin: "0 0 8px 0" }}>Up Next ({queue.length})</h4>
              {queue.length === 0 && <p style={{ margin: 0 }}>Queue is empty</p>}
              {queue.map((q, idx) => (
                <div key={q._id || q.id || q.youtubeId || `${q.title}-${idx}`} className="queueItem">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <img src={q.thumb || q.coverArt} alt={q.title} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
                    <div>
                      <div style={{ fontSize: 13 }}>{q.title}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>Queued</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="iconBtn"
                      title="Play now"
                      onClick={() => {
                        dequeue(q);
                        playSongFromObject(q, true);
                      }}
                    >
                      <Play size={14} />
                    </button>
                    <button className="iconBtn" title="Remove" onClick={() => dequeue(q)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* single audio element managed by the app */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} autoPlay={false} onTimeUpdate={handleTime} onLoadedMetadata={handleLoaded} onEnded={nextSong} />
      )}
    </div>
  );
}

export default App;
