import mongoose from "mongoose";

function resolveMongoUri() {
  const rawUri = process.env.MONGODB_URI;
  const rawPassword = process.env.MONGODB_PASSWORD;

  if (!rawUri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (
    rawUri.includes("DB_PASSWORD_HERE") ||
    rawUri.includes("${MONGODB_PASSWORD}")
  ) {
    if (!rawPassword) {
      throw new Error(
        "MONGODB_PASSWORD is required when MONGODB_URI contains a password placeholder"
      );
    }

    const encodedPassword = encodeURIComponent(rawPassword);
    return rawUri
      .replaceAll("DB_PASSWORD_HERE", encodedPassword)
      .replaceAll("${MONGODB_PASSWORD}", encodedPassword);
  }

  return rawUri;
}

const connectDB = async () => {
  try {
    const mongoUri = resolveMongoUri();
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed");
    console.error(`Reason: ${err.message}`);
    throw err;
  }
};

export default connectDB;
