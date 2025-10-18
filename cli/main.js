// cli/main.js
import readline from "readline";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fetch from "node-fetch";

import { generalChat } from "../services/normal.js";
import { debateChat, createDebateSeed } from "../services/debate.js";
import { judgeChat } from "../services/judge.js";
import Debate from "../models/debate.js";
import User from "../models/user.js";

dotenv.config();

// ----- MongoDB connection -----
mongoose.connect("mongodb://127.0.0.1:27017/debateDB")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let currentUser = null;
let currentDebate = null;

// -------- ask helper ----------
function ask(q) {
  return new Promise(res => rl.question(q, ans => res(ans.trim())));
}
async function chooseDebate() {
  const debates = await Debate.find({ userId: currentUser._id });

  console.log("\n📚 Your debates:");
  if (debates.length === 0) {
    console.log(" (none yet)");
  } else {
    debates.forEach((d, i) => {
      const preview = d.topic || "(no topic yet)";
      console.log(` ${i}: ${preview} [${d.debateStatus}]`);
    });
  }
  console.log(` ${debates.length}: ➕ New Debate`);

  const choice = await ask("Enter a number: ");
  const idx = parseInt(choice, 10);

  if (!isNaN(idx) && idx >= 0 && idx < debates.length) {
    currentDebate = debates[idx];
    console.log(`✅ Switched to debate #${idx}: ${currentDebate.topic || "(no topic)"}`);
  } else if (idx === debates.length) {
    // Instead of creating directly, ask for first message
    const firstMsg = await ask("Enter your starting message: ");
    console.log("🆕 Starting new debate...");
    // Pass to handler – this will lazily create a new Debate
    await handleMessage(firstMsg);
  } else {
    console.log("⚠️ Invalid choice. Try again.");
    await chooseDebate(); // re-ask until valid
  }
}

async function initUser() {
  return new Promise(resolve => {
    rl.question("Enter your username: ", async (username) => {
      let user = await User.findOne({ username });

      if (!user) {
        user = await User.create({ username });
        console.log(`✅ New user created: ${username}`);
      } else {
        console.log(`👋 Welcome back, ${username}`);
      }

      currentUser = user;
      resolve();
    });
  });
}

// -------- rounds detector (LLM + fallback regex) ----------
async function roundsLLM(userMsg) {
  // LLM prompt: reply only with number or "none"
   const prompt = `
 You are a rounds detection AI.
 goal:if user message intent is about to change the number of rounds in debate, you have to replay with that number user specified in the message ,if message is not about rounds or any other message reply as "none".
 Task:
 - Read the user's message.
 - If the user specifies a number of debate rounds, reply ONLY with that number (e.g., "30").
 - If the message does not specify rounds, reply ONLY with "none".
 - Do NOT output JSON, explanations, or anything else.

Examples:
 - "I want 30 rounds" -> "30"
 - "Let's do 12 rounds" -> "12"
 - "Can we debate 20 rounds?" -> "20"
 - "No rounds mentioned" -> "none"
User message: "${userMsg}"
`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a rounds-only detector. Reply only with number or 'none'." },
          { role: "user", content: prompt }
        ],
        temperature: 0
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);

    const raw = data.choices?.[0]?.message?.content?.trim() || "none";
    const normalized = raw.toLowerCase();
    // Basic sanitization: return only digits or "none"
    const digitsMatch = normalized.match(/\b(\d{1,2})\b/);
    if (normalized === "none") return { reply: "none" };
    if (digitsMatch) return { reply: digitsMatch[1] };
    // if LLM returned something unexpected, fall through to fallback
  } catch (err) {
    console.warn("roundsLLM LLM failed:", err.message);
    
  }

  // Fallback: simple regex-based detection if LLM failed or returned unexpected
  // Only accept if user mentions "round" or "rounds"
  const lower = userMsg.toLowerCase();
  const hasRoundWord = /\brounds?\b/.test(lower);
  const numMatch = lower.match(/\b(\d{1,2})\b/);
  if (hasRoundWord && numMatch) return { reply: numMatch[1] };

  return { reply: "none" };
}

// -------- message handler ----------
async function handleMessage(userMsg) {
  // 0) rounds detection and possible update before routing
  let roundsReply = "none";
  let llmreply = "";

  try {
    const rr = await roundsLLM(userMsg);
    roundsReply = (rr?.reply || "none").trim().toLowerCase();
  } catch (e) {
    roundsReply = "none";
  }

  if (roundsReply !== "none") {
    const requestedRounds = parseInt(roundsReply, 10);
    if (!isNaN(requestedRounds) && requestedRounds >= 5 && requestedRounds <= 50) {
      // If there's no currentDebate yet, create it now with requested rounds
      if (!currentDebate) {
        currentDebate = new Debate({
          userId: currentUser._id,
          topic: "",
          stance: "",
          generalMessages: [],
          debateMessages: [],
          rounds: requestedRounds,
          currentRound: 0,
          debateStatus: "inactive"
        });
        await currentDebate.save();
      } else {
        currentDebate.rounds = requestedRounds;
      }
      llmreply = `Rounds set to ${requestedRounds}. Debate will proceed with ${requestedRounds} rounds.`;
    } else {
      llmreply = "⚠️ Invalid rounds detected. Please provide a number between 5 and 50.";
    }
  }

  // 1) If no session yet, create new inactive debate (lazy creation)
  if (!currentDebate) {
    currentDebate = new Debate({
      userId: currentUser._id,
      topic: "",
      stance: "",
      generalMessages: [],
      debateMessages: [],
      rounds: 20,
      currentRound: 0,
      debateStatus: "inactive"
    });
    await currentDebate.save();
  }

  // 2) Route depending on debate status
  if (currentDebate.debateStatus === "inactive") {
    // general chat
    
    let result;
    try {
      result = await generalChat(userMsg, currentDebate.generalMessages);
    } catch (err) {
      console.error("⚠️ General AI failed:", err.message);
      console.log("Please try again.\n");
      await currentDebate.save();
      return;
    }
    const { reply, updatedMessages, debateIntent } = result;
    currentDebate.generalMessages = updatedMessages;

    console.log(`WinMe: ${reply}${llmreply ? "  — " + llmreply : ""}`);

    // If LLM indicated debate intent -> activate debate
    if (debateIntent) {
      // ensure topic/stance set
      currentDebate.topic = debateIntent.topic || currentDebate.topic;
      currentDebate.stance = debateIntent.stance || currentDebate.stance;
      currentDebate.debateStatus = "active";
      // if rounds not set yet keep existing value
      currentDebate.debateMessages = createDebateSeed(currentDebate.topic, currentDebate.stance);
      await currentDebate.save();

      console.log(`\n[🔥 Debate Mode ON] Topic: ${currentDebate.topic}, Stance: ${currentDebate.stance}\n`);
      try {
        const { reply: opening } = await debateChat("", currentDebate.debateMessages);
        console.log(`WinMe-Debater: ${opening}`);
      } catch (err) {
        console.error("⚠️ Debate AI failed to start:", err.message);
        console.log("Debate temporarily unavailable. Returning to general chat.\n");
        currentDebate.debateStatus = "inactive";
        await currentDebate.save();
      }
    } else {
      
      await currentDebate.save();
    }
  } else if (currentDebate.debateStatus === "active") {
   
    currentDebate.currentRound = (currentDebate.currentRound || 0) + 1;
    

    let data;
    try {
      data = await debateChat(userMsg, currentDebate.debateMessages);
    } catch (err) {
      console.error("⚠️ Debate AI failed:", err.message);
      console.log("Skipping this turn. You can try again.\n");
      await currentDebate.save();
      return;
    }
    const { reply, updatedMessages } = data;
    currentDebate.debateMessages = updatedMessages;

    console.log(`WinMe-Debater: ${reply}${llmreply ? "  — " + llmreply : ""}`);

    // End condition: rounds exhausted OR assistant outputs "Debate ends"
    if (currentDebate.currentRound >= currentDebate.rounds || (reply && reply.includes("Debate ends"))) {
      currentDebate.debateStatus = "end";

      try {
        console.log("\n[Debate finished, judging...]\n");
        const { verdict } = await judgeChat(currentDebate.debateMessages);
        currentDebate.judgeResult = verdict;
        console.log(`Judge: ${verdict}\n`);
      } catch (err) {
        console.error("⚠️ Judge AI failed:", err.message);
        console.log("No verdict available.\n");
      }

      await currentDebate.save();
      // you previously exited here — keep same behaviour:
      rl.close();
      process.exit(0);
    } else {
      await currentDebate.save();
    }
  } 
  else if (currentDebate.debateStatus === "end"){
    rl.close();
      process.exit(0);
  }
}

// -------- App start ----------
(async function start() {
  await initUser();
await chooseDebate(); 
  console.log("\n✅ WinMe CLI ready. Type your message or 'exit' to quit.\n");

  for await (const line of rl) {
    const userMsg = line.trim();
    if (userMsg.toLowerCase() === "exit") {
      rl.close();
      process.exit(0);
    }

    await handleMessage(userMsg);
  }
})();
