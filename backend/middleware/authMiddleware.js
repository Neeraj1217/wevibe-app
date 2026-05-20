// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const isProd = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? "" : "dev_jwt_secret");

export const protect = async (req, res, next) => {
  try {
    let token;

    // Try cookie first (frontend can use cookie-based auth)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Fallback to Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    if (!JWT_SECRET) {
      return res.status(500).json({ error: "Server auth is not configured" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(401).json({ error: "Invalid token" });

    // attach user ID to request
    req.userId = decoded.id;

    // optionally fetch user object here if needed
    // req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (err) {
    console.error("protect middleware:", err);
    return res.status(401).json({ error: "Not authorized" });
  }
};
