import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv);
    } catch {
      console.error("[firebase] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
      return null;
    }
  }

  const keyPath =
    process.env.FIREBASE_ADMIN_KEY_PATH ||
    path.join(__dirname, "../firebase-adminsdk.json");

  if (!fs.existsSync(keyPath)) {
    console.error("[firebase] Admin key file not found:", keyPath);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(keyPath, "utf8"));
  } catch (err) {
    console.error("[firebase] Failed to read service account:", err.message);
    return null;
  }
}

const serviceAccount = loadServiceAccount();

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("[firebase] Admin initialized");
} else if (!serviceAccount) {
  console.warn(
    "[firebase] Admin not initialized — protected routes will return 401 until credentials are configured"
  );
}

export default admin;
