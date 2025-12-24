// backend/routes/authRoutes.js
import express from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  verifyOtp,
  login,
  logout,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rate limiting for auth endpoints to prevent abuse
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: "Too many auth requests, please slow down." },
});

// Attach limiter to relevant routes
router.post("/register", authLimiter, register);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

// protected
router.get("/me", protect, getMe);

export default router;
