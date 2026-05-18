import mongoose from "mongoose";

let dbConnected = false;

const MONGO_OPTIONS = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
};

export function isDbConnected() {
  return dbConnected;
}

mongoose.connection.on("connected", () => {
  dbConnected = true;
});

mongoose.connection.on("disconnected", () => {
  dbConnected = false;
});

mongoose.connection.on("error", () => {
  dbConnected = false;
});

/**
 * Validates MONGODB_URI for the active environment.
 * @returns {string} trimmed URI
 * @throws {Error} readable config error when missing or invalid
 */
export function validateMongoConfig() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to backend/.env — e.g. mongodb://127.0.0.1:27017/wevibe for local dev, or your Atlas mongodb+srv:// URI for production."
    );
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      "MONGODB_URI must start with mongodb:// (local) or mongodb+srv:// (Atlas)."
    );
  }

  if (process.env.NODE_ENV === "production") {
    const pointsToLocal =
      /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(uri) ||
      /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(uri);

    if (pointsToLocal) {
      throw new Error(
        "MONGODB_URI points to localhost while NODE_ENV=production. Set your Atlas URI in the deployment environment."
      );
    }
  }

  return uri;
}

/**
 * Describes the MongoDB target for logging (no credentials).
 */
export function describeMongoTarget(uri) {
  const isSrv = uri.startsWith("mongodb+srv://");
  const isLocal =
    /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(uri);
  const hostType = isSrv
    ? "Atlas (mongodb+srv)"
    : isLocal
      ? "local/direct (mongodb://127.0.0.1)"
      : "remote (mongodb)";

  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const atIndex = withoutScheme.indexOf("@");
  const hostAndPath =
    atIndex >= 0 ? withoutScheme.slice(atIndex + 1) : withoutScheme;

  const host = hostAndPath.split("/")[0].split("?")[0] || "unknown";
  const pathSegment = hostAndPath.includes("/")
    ? hostAndPath.split("/")[1]?.split("?")[0]
    : null;
  const database = pathSegment || "(default)";

  return { hostType, host, database };
}

function logMongoTarget(phase) {
  try {
    const uri = validateMongoConfig();
    const { hostType, host, database } = describeMongoTarget(uri);
    const configPath = process.env.MONGODB_ENV_FILE || "environment";
    console.log(
      `[MongoDB] ${phase} — type: ${hostType}, host: ${host}, database: ${database}, config: ${configPath}`
    );
  } catch {
    // validateMongoConfig already logged by caller
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    dbConnected = true;
    return true;
  }

  let uri;
  try {
    uri = validateMongoConfig();
  } catch (err) {
    console.error(`[MongoDB] Configuration error: ${err.message}`);
    dbConnected = false;
    return false;
  }

  const { hostType, host, database } = describeMongoTarget(uri);

  try {
    await mongoose.connect(uri, MONGO_OPTIONS);
    dbConnected = true;
    console.log(
      `[MongoDB] Connected — type: ${hostType}, host: ${host}, database: ${database}`
    );
    return true;
  } catch (err) {
    dbConnected = false;
    console.error(
      `[MongoDB] Connection failed — type: ${hostType}, host: ${host}, database: ${database}`
    );
    console.error(`[MongoDB] Reason: ${err.message}`);
    return false;
  }
}

export function startDbConnection({
  maxRetries = 3,
  initialDelayMs = 1000,
  backgroundRetryMs = 30000,
} = {}) {
  try {
    validateMongoConfig();
    logMongoTarget("Startup target");
  } catch (err) {
    console.error(`[MongoDB] Configuration error: ${err.message}`);
    console.warn(
      "[MongoDB] Skipping connection attempts until MONGODB_URI is configured."
    );
    return;
  }

  let backgroundTimer = null;
  let connecting = false;

  const scheduleBackgroundRetry = () => {
    if (backgroundTimer) return;
    backgroundTimer = setInterval(async () => {
      if (dbConnected || connecting) return;
      console.log("[MongoDB] Background reconnect attempt...");
      connecting = true;
      const ok = await connectDB();
      connecting = false;
      if (ok) {
        clearInterval(backgroundTimer);
        backgroundTimer = null;
        console.log("[MongoDB] Reconnected");
      }
    }, backgroundRetryMs);
  };

  const runAttempt = async (attempt) => {
    if (connecting) return;
    connecting = true;
    const ok = await connectDB();
    connecting = false;

    if (ok) {
      if (backgroundTimer) {
        clearInterval(backgroundTimer);
        backgroundTimer = null;
      }
      return;
    }

    if (attempt < maxRetries) {
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `[MongoDB] Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`
      );
      setTimeout(() => runAttempt(attempt + 1), delay);
    } else {
      console.warn(
        "[MongoDB] Unavailable after retries — server running without database"
      );
      scheduleBackgroundRetry();
    }
  };

  runAttempt(1).catch((err) => {
    console.error(`[MongoDB] Unexpected startup error: ${err.message}`);
    scheduleBackgroundRetry();
  });
}

export default connectDB;
