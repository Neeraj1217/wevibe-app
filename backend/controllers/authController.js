// backend/controllers/authController.js
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import User from "../models/user.js"; // adjust path if your model path differs
import { sendSms } from "../utils/sms.js"; // small helper we create below

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || "5", 10);

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function setTokenCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ error: "mobile and password required" });
    }

    // basic validation: Indian mobile number format is enforced by model; also extra check
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ error: "Invalid mobile number" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // if existing user, we may want to re-send OTP for verification or reject based on use-case
    let user = await User.findOne({ mobile });
    if (user) {
      // If user already exists and is verified, reject register
      if (user.isVerified) {
        return res.status(409).json({ error: "User already exists. Please login." });
      }
      // otherwise we'll regenerate OTP and update password if provided
      user.password = password;
    } else {
      user = new User({ mobile, password });
    }

    // generate OTP (6-digit)
    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpPlain, 10);
    user.otp = otpHash;
    user.otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.isVerified = false;

    await user.save();

    // send OTP via SMS (Twilio or console fallback)
    try {
      await sendSms(mobile, `Your WeVibe OTP is: ${otpPlain}. It expires in ${OTP_TTL_MINUTES} minutes.`);
    } catch (smsErr) {
      console.error("SMS send error:", smsErr);
      // don't fail register for SMS failure; in production you may want to rollback or alert
    }

    return res.status(201).json({ message: "OTP sent to mobile. Verify to complete registration." });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ error: "mobile and otp required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP expired or invalid. Request a new OTP." });
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) return res.status(401).json({ error: "Invalid OTP" });

    // mark verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // create JWT and set cookie
    const token = signToken(user._id);
    setTokenCookie(res, token);

    const safeUser = {
      id: user._id,
      mobile: user.mobile,
      subscription: user.subscription || { plan: "free" },
      isVerified: user.isVerified,
    };

    return res.json({ message: "Verified", user: safeUser });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: "mobile and password required" });

    const user = await User.findOne({ mobile });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const passOk = await user.matchPassword(password);
    if (!passOk) return res.status(401).json({ error: "Invalid credentials" });

    if (!user.isVerified) {
      // Optionally request OTP re-send
      return res.status(401).json({ error: "Account not verified. Please verify OTP." });
    }

    const token = signToken(user._id);
    setTokenCookie(res, token);

    const safeUser = {
      id: user._id,
      mobile: user.mobile,
      subscription: user.subscription || { plan: "free" },
      isVerified: user.isVerified,
    };

    return res.json({ message: "Logged in", user: safeUser });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ error: "Logout failed" });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const userId = req.userId; // set by middleware
    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};
