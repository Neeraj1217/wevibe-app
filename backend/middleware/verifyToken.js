import admin from "../config/firebaseAdmin.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      phone: decoded.phone_number || null,
    };

    next();
  } catch (err) {
    console.error("❌ Auth verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
