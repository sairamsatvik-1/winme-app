import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcrypt";
import User from "./models/user.js";
import OtpActivity from "./models/otpactivity.js";
import Debate from "./models/debate.js";
import debateRoutes from "./routes/debate.js";
import authRoutes from "./routes/auth.js";
import OtpVerification from "./models/otpverification.js";
import ForgotOtp from "./models/forgototp.js";
import Forgotverification from "./models/forgotverify.js";
import cors from "cors";
import csurf from "csurf";
import cookieParser from "cookie-parser";

dotenv.config()
const app = express();

import helmet from "helmet";
app.use(helmet());

// ✅ allow JSON body parsing
app.use(express.json());
app.use(cookieParser());
// ✅ allow urlencoded form (optional)
app.use(express.urlencoded({ extended: true }));

// ✅ enable CORS (required for frontend)
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? true // allow same-origin in production
        : "http://localhost:5173",
    credentials: true,
  })
);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(()=>console.log("✅ MongoDB connected"))
.catch(err=>console.error("❌ MongoDB error:", err));

// ----- Session -----
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
// trust first proxy (Heroku, Render, etc.)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === "production",
      httpOnly:true,
      sameSite: "lax",
    },
  })
);
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);
//session check route
app.get("/api/auth/session", (req, res) => {
  if (req.session && req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});
app.get("/api/csrf-token", (req, res) => {
   try{ req.session.touch(); 
  res.json({ csrfToken: req.csrfToken() });}
  catch(err){
    console.log(err)
  }
});
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  next(err);
});
// ----- Middleware -----
function ensureAuth(req,res,next){
  if(!req.session.user) return res.status(401).json({ error:"not_authenticated" });
  next();
}
const pendingOtps = new Map();
app.use("/api/auth", authRoutes);
// ----- Debate Routes -----

// Get all user's debates
app.get("/api/debate/list",ensureAuth, async(req,res)=>{
  const debates = await Debate.find({ userId:req.session.user.id}).sort({ createdAt:-1 });
  res.json(debates);
});

// Delete debate
app.delete("/api/debate/:debateId", ensureAuth, async(req,res)=>{
  const { debateId } = req.params;
  const debate = await Debate.findOne({ _id:debateId, userId:req.session.user.id });
  if(!debate) return res.status(404).json({ error:"not_found" });
  await debate.deleteOne();
  res.json({ status:"deleted" });
});
// Get full debate (with messages)
app.get("/api/debate/:debateId", ensureAuth,async (req, res) => {
  const { debateId } = req.params;
  try {
    const debate = await Debate.findOne({
      _id: debateId,
      userId: req.session.user.id,
    });

    if (!debate) return res.status(404).json({ error: "not_found" });

    res.json(debate); // contains topic, stance, generalMessages, debateMessages, etc.
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});
// Use debate routes
app.use("/api/debate", debateRoutes);
// Create new debate (New Chat)
app.post("/api/debate/new",  async (req, res) => {
  const { topic = "", stance = "" } = req.body; // optional
  try {
    const debate = new Debate({
      userId: req.session?.user?.id || null,
      topic,
      stance,
      generalMessages: [],
      debateMessages: [],
      rounds: 10,
      currentRound: 0,
      debateStatus: "inactive",
      judgeResult: null
    });
    await debate.save();
    res.json(debate); // return the full debate object with _id
  } catch (e) {
   
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/debate/rename", async (req, res) => {
  const { debateId, name } = req.body;

  try {
    if (!req.session.user) return res.status(401).json({ error: "unauthorized" });

    const debate = await Debate.findOne({
      _id: debateId,
      userId: req.session.user.id,
    });

    if (!debate) return res.status(404).json({ error: "not_found" });

    debate.topic = name;
    await debate.save();

    res.json({ message: "debate_renamed", topic: debate.topic });
  } catch (err) {
 
    res.status(500).json({ error: "server_error" });
  }
});
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve frontend build
const buildPath = path.join(__dirname, "winme-frontend-clean", "dist");

app.use(express.static(buildPath));

// ✅ Catch-all route to serve React index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});
// ----- Start server -----
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`🚀 Server running on port ${PORT}`));
