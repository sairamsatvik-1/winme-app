import express from "express";
import User from "../models/user.js";
import Debate from "../models/debate.js";
import crypto from "crypto";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const router = express.Router();

function ensureAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  next();
}

router.get("/analysis", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id; // ✅ FIXED

    // 1) Load user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2) Get completed debates
    const endedDebates = await Debate.find({
      userId,
      debateStatus: "end",
      judgeResult: { $ne: null },
    })
      .select("_id topic judgeResult updatedAt")
      .sort({ updatedAt: -1 });

    if (!endedDebates || endedDebates.length === 0) {
      return res.json({
        cached: false,
        performanceScore: 0,
        userWins: 0,
        aiWins: 0,
        winRate: 0,
        strengths: [],
        weaknesses: [],
        improvements: [],
        summary: "No completed debates yet. Finish debates to generate analysis.",
      });
    }

    // 3) Reset clicksToday if date changed
    const today = new Date().toISOString().slice(0, 10);
    if (!user.analysisCache) user.analysisCache = {};

    if (user.analysisCache.lastClickDate !== today) {
      user.analysisCache.lastClickDate = today;
      user.analysisCache.clicksToday = 0;
    }

    // 4) Build key
    const ids = endedDebates.map((d) => String(d._id)).sort();
    const rawKey = ids.join("|");
    const key = crypto.createHash("sha256").update(rawKey).digest("hex");

    // 5) If key same → cached
    if (user.analysisCache.key === key && user.analysisCache.data) {
      return res.json({
        cached: true,
        ...user.analysisCache.data,
      });
    }

    // 6) Rate limit
    if (user.analysisCache.clicksToday >= 3 && user.analysisCache.data) {
      return res.json({
        cached: true,
        ...user.analysisCache.data,
        rateLimited: true,
      });
    }

    // 7) Build payload
    const payload = endedDebates.map((d) => ({
      id: String(d._id),
      topic: d.topic || "",
      judgeResult: d.judgeResult,
      updatedAt: d.updatedAt,
    }));

    // 8) Call GROQ LLM
    const llmResult = await callGroqJSON(payload);

    // 9) Normalize
    const safe = normalizeAnalysis(llmResult);

    // 10) Save cache
    user.analysisCache.key = key;
    user.analysisCache.data = safe;
    user.analysisCache.updatedAt = new Date();
    user.analysisCache.clicksToday = (user.analysisCache.clicksToday || 0) + 1;

    await user.save();

    return res.json({
      cached: false,
      ...safe,
    });
  } catch (err) {
    console.log("analysis error:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;

// --------------------
// GROQ JSON CALL
// --------------------
async function callGroqJSON(payload) {
  const systemPrompt = `
You are an expert debate coach and evaluator.

You will receive a list of debates.
Each debate contains:
- topic
- judgeResult (structured object)

You must analyze overall user performance across all debates.

Return ONLY valid JSON.
No markdown.
No explanation outside JSON.

JSON format MUST be:

{
  "performanceScore": 0-100,
  "userWins": number,
  "aiWins": number,
  "winRate": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvements": ["..."],
  "summary": "short summary",
  "notes": "optional extra notes"
}

Rules:
- performanceScore reflects logic, evidence, clarity, persuasion.
- userWins vs aiWins must be inferred from judgeResult.
- If unclear winner, treat as draw and do not count.
`;

  const userPrompt = `
Here are the debates:

${JSON.stringify(payload, null, 2)}
`;

  const chat = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = chat?.choices?.[0]?.message?.content || "";

  // Parse JSON safely
  try {
    const extracted = extractFirstJSONObject(text);
  return JSON.parse(extracted);
  } catch (err) {
    console.log("GROQ returned invalid JSON:", text);
    throw new Error("Invalid JSON returned by GROQ");
  }
}

// --------------------
// Normalize output
// --------------------
function extractFirstJSONObject(str = "") {
  // remove markdown fences
  str = str.replace(/```json/gi, "").replace(/```/g, "").trim();

  const firstBrace = str.indexOf("{");
  if (firstBrace === -1) throw new Error("No JSON object found");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    // when depth becomes 0 → JSON object ended
    if (depth === 0) {
      return str.slice(firstBrace, i + 1);
    }
  }

  throw new Error("Unclosed JSON object");
}

function normalizeAnalysis(data) {
  const obj = data || {};

  const performanceScore = Number(obj.performanceScore ?? 0);
  const userWins = Number(obj.userWins ?? 0);
  const aiWins = Number(obj.aiWins ?? 0);
  const winRate = Number(obj.winRate ?? 0);

  return {
    performanceScore: isNaN(performanceScore) ? 0 : performanceScore,
    userWins: isNaN(userWins) ? 0 : userWins,
    aiWins: isNaN(aiWins) ? 0 : aiWins,
    winRate: isNaN(winRate) ? 0 : winRate,

    strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
    weaknesses: Array.isArray(obj.weaknesses) ? obj.weaknesses : [],
    improvements: Array.isArray(obj.improvements) ? obj.improvements : [],

    summary: typeof obj.summary === "string" ? obj.summary : "",
    notes: typeof obj.notes === "string" ? obj.notes : "",
  };
}
