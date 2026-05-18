import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");

const priorMongoUri = process.env.MONGODB_URI;

if (!fs.existsSync(envPath)) {
  console.warn(`[env] backend/.env not found at ${envPath}`);
} else {
  const result = dotenv.config({ path: envPath, override: true, quiet: true });

  if (result.error) {
    console.warn(`[env] Failed to load ${envPath}: ${result.error.message}`);
  } else {
    process.env.MONGODB_ENV_FILE = envPath;

    if (priorMongoUri && priorMongoUri !== process.env.MONGODB_URI) {
      console.log(
        "[env] MONGODB_URI was set in the process environment; backend/.env took precedence."
      );
    }
  }
}

function describeActiveMongoTarget() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;

  if (uri.startsWith("mongodb+srv://")) {
    return "Atlas (mongodb+srv)";
  }
  if (/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(uri)) {
    return "local/direct (mongodb://127.0.0.1)";
  }
  return "remote (mongodb)";
}

const activeType = describeActiveMongoTarget();
if (activeType) {
  console.log(
    `[env] Active MongoDB target: ${activeType} — config: ${envPath}`
  );
} else {
  console.warn(
    `[env] MONGODB_URI is not set after loading ${envPath}. Add MONGODB_URI to backend/.env`
  );
}
