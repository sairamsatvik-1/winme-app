// backend/routes/debate.js
import express from "express";
import Debate from "../models/debate.js";
import { generalChat } from "../services/normal.js";
import { debateChat, createDebateSeed } from "../services/debate.js";
import { judgeChat } from "../services/judge.js";


const router = express.Router();

// middleware
function ensureAuth(req,res,next){
  if(!req.session.user) return res.status(401).json({ error:"not_authenticated" });
  next();
}
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

    return { reply: "none" };
  }

  // Fallback: simple regex-based detection if LLM failed or returned unexpected
  // Only accept if user mentions "round" or "rounds"
  const lower = userMsg.toLowerCase();
  const hasRoundWord = /\brounds?\b/.test(lower);
  const numMatch = lower.match(/\b(\d{1,2})\b/);
  if (hasRoundWord && numMatch) return { reply: numMatch[1] };

  return { reply: "none" };
}
// ---- debate chat route (full logic from CLI) ----
router.post("/chat", ensureAuth,async (req, res) => {
  const userId = req.session.user.id; // req.session.user.id;
  const { debateId, message } = req.body;
  if(!message) return res.status(400).json({ error:"message_required" });
  
  try {
    const debate = await Debate.findOne({ _id: debateId, userId });
    if(!debate) return res.status(404).json({ error:"debate_not_found" });
    if(debate.currentRound >= debate.rounds){
      return res.status(502).json({
        error: "rounds_exceeded",
        message: `The debate has reached its maximum number of rounds (${debate.rounds}). Please start a new debate if you wish to continue.`,
      })
    }
let roundsReply="none";
    // 1️⃣ Detect rounds change
    try {
    const rr = await roundsLLM(message);
   roundsReply = (rr?.reply || "none").trim().toLowerCase();
  } catch (e) {
    roundsReply = "none";
  } 
  if (roundsReply !== "none") {
      const r = parseInt(roundsReply,10);
      if(!isNaN(r) && r>=5 && r<=50) 
        debate.rounds = r;
    }
 
    if(debate.debateStatus === "inactive"){
      try{
      const { reply, updatedMessages, debateIntent } = await generalChat(message, debate.generalMessages);
      debate.generalMessages = updatedMessages;

      if(debateIntent){
        debate.topic = debateIntent.topic || debate.topic;
        debate.stance = debateIntent.stance || debate.stance;
        debate.debateStatus = "active";
        debate.debateMessages = createDebateSeed(debate.topic, debate.stance);

        // opening AI message
        try{
          const { reply: opening ,updatedMessages} = await debateChat("none", debate.debateMessages);
          debate.debateMessages=updatedMessages;
          await debate.save();
      return res.json({
  reply: opening, // ✅ Use the debate’s opening message, not general reply
  debateMessages: debate.debateMessages,
  generalMessages: debate.generalMessages,
  debateStatus: debate.debateStatus,currentRound: debate.currentRound,
rounds: debate.rounds,
roundsChanged: (roundsReply !== "none")
});

        } catch(err){
           
  return res.status(502).json({ 
    error: "ai_error",
    service: "debate",
    message: "Failed to get AI response.Please retry."
  });
        }
      }

      await debate.save();
      return res.json({
        reply,
        debateMessages: debate.debateMessages,
        generalMessages: debate.generalMessages,
        debateStatus: debate.debateStatus,currentRound: debate.currentRound,
rounds: debate.rounds,
roundsChanged: (roundsReply !== "none")
      });}
      catch(err){
        return res.status(500).json({ error:"general_chat_error" });
      }
    }

    // 3️⃣ Active debate
    if(debate.debateStatus === "active"){
      debate.currentRound = (debate.currentRound||0)+1;
      const { reply, updatedMessages } = await debateChat(message, debate.debateMessages);
      debate.debateMessages = updatedMessages;

      if(debate.currentRound >= debate.rounds || reply.includes("Debate ends")){
        debate.debateStatus = "end";
        try{
          const { verdict } = await judgeChat(debate.debateMessages);
          debate.judgeResult = verdict;
        }catch(err){
    
  return res.status(502).json({ 
    error: "judge_ai_error",
    service: "debate",
    message: "Failed to get AI response. Please retry."
  });
        }
      }

      await debate.save();
      return res.json({
        reply,
        debateMessages: debate.debateMessages,
        debateStatus: debate.debateStatus,
        generalMessages: debate.generalMessages,
        judgeResult: debate.judgeResult,currentRound: debate.currentRound,
rounds: debate.rounds,
roundsChanged: (roundsReply !== "none")
      });
    }

    // 4️⃣ Ended debate
    return res.json({
      reply:"Debate ended",
      debateMessages: debate.debateMessages,
      debateStatus: debate.debateStatus,
      generalMessages: debate.generalMessages,
      judgeResult: debate.judgeResult,currentRound: debate.currentRound,
rounds: debate.rounds,
roundsChanged: (roundsReply !== "none")
    });

  } catch(err){
   
    res.status(500).json({ error:"server_error" });
  }
});

// export router
export default router;
