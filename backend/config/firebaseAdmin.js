// config/firebaseAdmin.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always use file-based credentials for now
const serviceAccountPath = path.join(
  __dirname,
  "../firebase-adminsdk.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Firebase Admin key file not found:");
  console.error(serviceAccountPath);
} else {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin Initialized (file mode)");
  }
}

export default admin;
