import admin from "../config/firebaseAdmin.js";

export const verifyToken = async (req, res, next) => {
  const route = `${req.method} ${req.originalUrl || req.path}`;
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader) {
      console.warn(`[auth] 401 ${route} — no Authorization header sent`);
      return res.status(401).json({ error: "Authorization token missing" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.warn(
        `[auth] 401 ${route} — Authorization header present but not Bearer (expects Firebase ID token)`
      );
      return res.status(401).json({ error: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.warn(`[auth] 401 ${route} — Bearer token empty`);
      return res.status(401).json({ error: "Authorization token missing" });
    }

    if (!admin.apps?.length) {
      console.warn(`[auth] 503 ${route} — Firebase Admin not configured`);
      return res.status(503).json({ error: "Authentication service unavailable" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      phone: decoded.phone_number || null,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(`[auth] ${route} — authenticated uid=${decoded.uid}`);
    }
    next();
  } catch (err) {
    console.warn(`[auth] 401 ${route} — Firebase verifyIdToken failed: ${err.message}`);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
