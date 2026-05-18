import { isDbConnected } from "../config/db.js";

export function requireDb(req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: "Database is temporarily unavailable",
    });
  }
  next();
}
