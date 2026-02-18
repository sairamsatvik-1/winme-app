import mongoose from "mongoose";

async function connectDB() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/debateDB", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected (local)");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

connectDB();
