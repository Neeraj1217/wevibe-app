import React, { useState, useEffect } from "react";
import { auth, signInWithPhoneNumber, initRecaptcha } from "../../firebase";
import {
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const navigate = useNavigate();

  // ✅ Dynamic tab title
  useEffect(() => {
    document.title = "Login | WeVibe";
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("✅ Already logged in:", user.phoneNumber);
        navigate("/");
      }
    });
    return () => unsub();
  }, [navigate]);

  // Send OTP
  const sendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = null;
      }

      const appVerifier = initRecaptcha("recaptcha-container");
      await appVerifier.render();
      window.recaptchaVerifier = appVerifier;

      const phoneNumber = `+91${mobile}`;
      console.log("📱 Sending OTP to:", phoneNumber);

      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      );

      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast.success("OTP sent successfully!");
    } catch (err) {
      console.error("❌ sendOtp error:", err);
      toast.error(err.message || "Failed to send OTP. Check Firebase setup.");
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    if (!confirmationResult) return toast.error("No OTP request active");
    if (!otp) return toast.error("Enter OTP");

    try {
      const result = await confirmationResult.confirm(otp);
      console.log("✅ Logged in as:", result.user.phoneNumber);

      // ✅ Restore locally stored name if exists
      const existingName = localStorage.getItem("username") || "WeViber";
      localStorage.setItem("username", existingName);
      localStorage.setItem("userPhone", result.user.phoneNumber);

      toast.success("🎵 Logged in successfully!");
      navigate("/");
    } catch (err) {
      console.error("❌ verifyOtp error:", err);
      if (err.code === "auth/invalid-verification-code")
        toast.error("Invalid OTP — please try again.");
      else toast.error("OTP verification failed.");
    }
  };

  // Reset and resend OTP
  const resetOtp = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {}
      window.recaptchaVerifier = null;
    }
    setOtp("");
    setOtpSent(false);
    setConfirmationResult(null);
    toast("You can request a new OTP");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
        <p className="auth-subtitle">Welcome back to WeVibe 🎧</p>

        {!otpSent ? (
          <>
            <input
              className="auth-input"
              type="text"
              inputMode="numeric"
              placeholder="Mobile number (10 digits)"
              value={mobile}
              onChange={(e) =>
                setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
            />
            <button className="auth-btn" onClick={sendOtp}>
              Send OTP
            </button>
          </>
        ) : (
          <>
            <input
              className="auth-input"
              type="text"
              inputMode="numeric"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <button className="auth-btn" onClick={verifyOtp}>
              Verify OTP
            </button>

            <button
              style={{
                marginTop: 8,
                background: "transparent",
                color: "#ff55c7",
                border: "1px solid rgba(255,85,199,0.12)",
              }}
              onClick={resetOtp}
            >
              Resend / Change number
            </button>
          </>
        )}

        <p className="auth-footer">
          Don’t have an account?{" "}
          <Link to="/register" className="auth-link">
            Create one
          </Link>
        </p>
      </div>

      <div id="recaptcha-container" />
    </div>
  );
}
