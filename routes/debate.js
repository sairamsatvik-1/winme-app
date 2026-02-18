// backend/routes/debate.js
import express from "express";
import Debate from "../models/debate.js";
import { generalChat } from "../services/normal.js";
import { debateChat, debateChatStream, createDebateSeed } from "../services/debate.js";
import { nanoid } from "nanoid";

import { judgeChat } from "../services/judge.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const router = express.Router();
console.log("✅ debate.js loaded");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// middleware
function ensureAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "not_authenticated" });
  next();
}

async function roundsLLM(userMsg) {
  const prompt = `
You are a rounds detection AI.
Goal: if user message intent is about to change the number of rounds in debate,
reply ONLY with that number.
If message is not about rounds, reply ONLY with "none".

Rules:
- Reply ONLY with digits OR "none"
- No explanations, no JSON, no extra words.

Examples:
"I want 30 rounds" -> 30
"Let's do 12 rounds" -> 12
"Can we debate 20 rounds?" -> 20
"No rounds mentioned" -> none

User message: "${userMsg}"
`;

  // ---------------------------
  // 1) LLM detection (Groq)
  // ---------------------------
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Reply ONLY with digits or 'none'." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const raw =
      completion.choices?.[0]?.message?.content?.trim()?.toLowerCase() || "none";

    if (raw === "none") return { reply: "none" };

    const digitsMatch = raw.match(/\b(\d{1,3})\b/);
    if (digitsMatch) return { reply: digitsMatch[1] };

  } catch (err) {
    // ignore → fallback below
  }

  // ---------------------------
  // 2) Fallback regex (safe)
  // ---------------------------
  const lower = userMsg.toLowerCase();

  // ONLY trigger if rounds keyword exists
  const hasRoundWord = /\b(round|rounds)\b/.test(lower);

  // extract number only if round word exists
  const numMatch = lower.match(/\b(\d{1,3})\b/);

  if (hasRoundWord && numMatch) return { reply: numMatch[1] };

  return { reply: "none" };
}
async function handleRoundsChange({ debate, message }) {
  const rr = await roundsLLM(message);
  const roundsReply = (rr?.reply || "none").trim().toLowerCase();

  if (roundsReply === "none") {
    return { action: "none" };
  }

  const r = parseInt(roundsReply, 10);
  if (isNaN(r)) return { action: "none" };
 if (r < 5 || r > 50) {
    return {
      action: "invalid",
      text: "❌ Rounds must be between 5 and 50.",
    };
  }
  if (r <= (debate.currentRound)) {
    return {
      action: "too_late",
      text: `⚠️ Current round is already ${debate.currentRound}. Your request (${r}) is already crossed. Debate is ending.`,
      requested: r,
    };
  }
  // invalid range
  

  // too late
 

  // valid change
  const oldRounds = debate.rounds;
  debate.rounds = r;

  return {
    action: "changed",
    text: `✅ Rounds changed from ${oldRounds} to ${r}.`,
    oldRounds,
    newRounds: r,
  };
}
// ---- debate chat route (full logic from CLI) ----
router.post("/chat", ensureAuth, async (req, res) => {
  const userId = req.session.user.id; // req.session.user.id;
  const { debateId, message } = req.body;
  if (!message) return res.status(400).json({ error: "message_required" });

  try {
    const debate = await Debate.findOne({ _id: debateId, userId });
    if (!debate) return res.status(404).json({ error: "debate_not_found" });
    if (debate.currentRound >= debate.rounds) {
      return res.status(502).json({
        error: "rounds_exceeded",
        message: `The debate has reached its maximum number of rounds (${debate.rounds}). Please start a new debate if you wish to continue.`,
      })
    }
    let roundsReply = "none";
    // 1️⃣ Detect rounds change
    try {
      const rr = await roundsLLM(message);
      roundsReply = (rr?.reply || "none").trim().toLowerCase();
    } catch (e) {
      roundsReply = "none";
    }
    if (roundsReply !== "none") {
      const r = parseInt(roundsReply, 10);
      if (!isNaN(r) && r >= 5 && r <= 50)
        debate.rounds = r;
    }

    if (debate.debateStatus === "inactive") {
      try {
        const { reply, updatedMessages, debateIntent } = await generalChat(message, debate.generalMessages);
        debate.generalMessages = updatedMessages;

        if (debateIntent) {
          debate.topic = debateIntent.topic || debate.topic;
          debate.stance = debateIntent.stance || debate.stance;
          debate.debateStatus = "active";
          debate.debateMessages = createDebateSeed(debate.topic, debate.stance);

          // opening AI message
          try {
            const { reply: opening, updatedMessages } = await debateChat("none", debate.debateMessages);
            debate.debateMessages = updatedMessages;
            await debate.save();
            return res.json({
              reply: opening, // ✅ Use the debate’s opening message, not general reply
              debateMessages: debate.debateMessages,
              generalMessages: debate.generalMessages,
              debateStatus: debate.debateStatus, currentRound: debate.currentRound,
              rounds: debate.rounds,
              roundsChanged: (roundsReply !== "none")
            });

          } catch (err) {

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
          debateStatus: debate.debateStatus, currentRound: debate.currentRound,
          rounds: debate.rounds,
          roundsChanged: (roundsReply !== "none")
        });
      }
      catch (err) {
        return res.status(500).json({ error: "general_chat_error" });
      }
    }

    // 3️⃣ Active debate
    if (debate.debateStatus === "active") {
      debate.currentRound = (debate.currentRound || 0) + 1;
      const { reply, updatedMessages } = await debateChat(message, debate.debateMessages);
      debate.debateMessages = updatedMessages;

      if (debate.currentRound >= debate.rounds || reply.includes("Debate ends")) {
        debate.debateStatus = "end";
        try {
          const { verdict } = await judgeChat(debate.debateMessages);
          debate.judgeResult = verdict;
        } catch (err) {

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
        judgeResult: debate.judgeResult, currentRound: debate.currentRound,
        rounds: debate.rounds,
        roundsChanged: (roundsReply !== "none")
      });
    }

    // 4️⃣ Ended debate
    return res.json({
      reply: "Debate ended",
      debateMessages: debate.debateMessages,
      debateStatus: debate.debateStatus,
      generalMessages: debate.generalMessages,
      judgeResult: debate.judgeResult, currentRound: debate.currentRound,
      rounds: debate.rounds,
      roundsChanged: (roundsReply !== "none")
    });

  } catch (err) {

    res.status(500).json({ error: "server_error" });
  }
});
router.post("/chat-stream", ensureAuth, async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const userId = req.session.user.id;
    const { debateId, message } = req.body;

    if (!message) {
      res.write(`event: done\ndata: ${JSON.stringify({ error: "message_required" })}\n\n`);
      return res.end();
    }

    const debate = await Debate.findOne({ _id: debateId, userId });
    if (!debate) {
      res.write(`event: done\ndata: ${JSON.stringify({ error: "debate_not_found" })}\n\n`);
      return res.end();
    }
    if (debate.currentRound >= debate.rounds) {
      res.write(`event: done\ndata: ${JSON.stringify({
        error: "rounds_exceeded",
        message: `The debate has reached its maximum number of rounds (${debate.rounds}).`
      })}\n\n`);
      return res.end();
    }

    // ⚠️ If rounds exceeded
    const roundsResult = await handleRoundsChange({ debate, message });

if (roundsResult.action !== "none") {
  // save the user message too (so history is correct)
  if (debate.debateStatus === "active") {
    debate.debateMessages.push({ role: "user", content: message });
  } else {
    debate.generalMessages.push({ role: "user", content: message });
  }

  let finalText = roundsResult.text;

  // if too late -> end debate + judge
  if (roundsResult.action === "too_late") {
    debate.debateStatus = "end";
    finalText += "\n\nDebate ends";

    // IMPORTANT: save Debate ends inside messages too
    // (but as same assistant message, not separate)

    try {
      const { verdict } = await judgeChat(debate.debateMessages);
      debate.judgeResult = verdict;
    } catch (err) {
      debate.judgeResult = "Judge failed.";
    }
  }

  // save ONE assistant message
  if (debate.debateStatus === "active") {
    debate.debateMessages.push({ role: "assistant", content: finalText });
  } else {
    debate.generalMessages.push({ role: "assistant", content: finalText });
  }

  await debate.save();

  // stream finalText
  for (const ch of finalText) {
    res.write(`event: token\ndata: ${JSON.stringify(ch)}\n\n`);
    await sleep(10);
  }

  res.write(
    `event: done\ndata: ${JSON.stringify({
      debateStatus: debate.debateStatus,
      currentRound: debate.currentRound,
      rounds: debate.rounds,
      roundsChanged: roundsResult.action === "changed",
      judgeResult: debate.judgeResult || null,
      isArchived: debate.isArchived,
    })}\n\n`
  );

  return res.end();
}
    // ---------------------------------------------------
    // 2️⃣ If inactive → do normal logic (NO STREAM yet)
    // ---------------------------------------------------
    if (debate.debateStatus === "inactive") {
      const { reply, updatedMessages, debateIntent } = await generalChat(
        message,
        debate.generalMessages
      );
      debate.generalMessages = updatedMessages;

      // If it becomes debate mode
      if (debateIntent) {
        debate.topic = debateIntent.topic || debate.topic;
        debate.stance = debateIntent.stance || debate.stance;
        debate.debateStatus = "active";
        debate.debateMessages = createDebateSeed(debate.topic, debate.stance);

        // opening AI message (still normal, no streaming)
        const { reply: opening, updatedMessages: updatedDebateMsgs } = await debateChat(
          "none",
          debate.debateMessages
        );

        debate.debateMessages = updatedDebateMsgs;
        await debate.save();

        // stream opening text as tokens
        for (const ch of opening) {
          res.write(`event: token\ndata: ${JSON.stringify(ch)}\n\n`);
          await sleep(20);
        }


        res.write(
          `event: done\ndata: ${JSON.stringify({
            debateStatus: debate.debateStatus,
            currentRound: debate.currentRound,
            rounds: debate.rounds,
            roundsChanged: roundsResult.action === "changed",
            judgeResult: null,
          })}\n\n`
        );

        return res.end();
      }

      // still general chat reply
      await debate.save();

      for (const ch of reply) {
        res.write(`event: token\ndata: ${JSON.stringify(ch)}\n\n`);
        await sleep(20); // 👈 10ms delay (adjust 5–25)
      }


      res.write(
        `event: done\ndata: ${JSON.stringify({
          debateStatus: debate.debateStatus,
          currentRound: debate.currentRound,
          rounds: debate.rounds,
          roundsChanged: roundsResult.action === "changed",
          judgeResult: null,
        })}\n\n`
      );

      return res.end();
    }

    // ---------------------------------------------------
    // 3️⃣ Active debate → (for now still NOT true stream)
    // ---------------------------------------------------
    if (debate.debateStatus === "active") {
      debate.currentRound = (debate.currentRound || 0) + 1;

      const { reply, updatedMessages } = await debateChatStream({
        userMsg: message,
        debateMessages: debate.debateMessages,
        onToken: (t) => {
          res.write(`event: token\ndata: ${JSON.stringify(t)}\n\n`);
        },
      });

      debate.debateMessages = updatedMessages;

      // check end
      if (debate.currentRound >= debate.rounds || reply.includes("Debate ends")) {
        debate.debateStatus = "end";
        try {
          const { verdict } = await judgeChat(debate.debateMessages);
          debate.judgeResult = verdict;
        } catch (err) {
          debate.judgeResult = "Judge failed.";
        }
      }

      await debate.save();

      // stream reply as tokens (fake streaming)



      res.write(
        `event: done\ndata: ${JSON.stringify({
          debateStatus: debate.debateStatus,
          currentRound: debate.currentRound,
          rounds: debate.rounds,
          roundsChanged: roundsResult.action === "changed",
          judgeResult: debate.judgeResult,
        })}\n\n`
      );

      return res.end();
    }

    // ended debate
    res.write(`event: token\ndata: ${JSON.stringify("Debate ended")}\n\n`);
    res.write(
      `event: done\ndata: ${JSON.stringify({
        debateStatus: debate.debateStatus,
        currentRound: debate.currentRound,
        rounds: debate.rounds,
        roundsChanged: roundsResult.action === "changed",
        judgeResult: debate.judgeResult,
        isArchived: debate.isArchived,
      })}\n\n`
    );
    return res.end();
  } catch (err) {
    console.log("chat-stream error:", err);
    res.write(`event: done\ndata: ${JSON.stringify({ error: "server_error" })}\n\n`);
    return res.end();
  }
});


// Get all user's debates
// ✅ Share debate (create share link)
router.post("/:debateId/share", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { debateId } = req.params;

    const debate = await Debate.findOne({ _id: debateId, userId });
    if (!debate) return res.status(404).json({ error: "debate_not_found" });

    // generate shareId if not exists
    if (!debate.shareId) {
      debate.shareId = nanoid(10); // small unique id
    }

    debate.isShared = true;
    await debate.save();

    return res.json({
      shareId: debate.shareId,
      shareUrl: `${process.env.FRONTEND_URL}/share/${debate.shareId}`,
    });
  } catch (err) {
    console.log("share error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});
// ✅ Public view shared debate (no auth)
router.get("/shared/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;

    const debate = await Debate.findOne({ shareId, isShared: true }).select(
      "topic stance generalMessages debateMessages rounds currentRound debateStatus judgeResult createdAt updatedAt"
    );

    if (!debate) return res.status(404).json({ error: "not_found" });

    return res.json({ debate });
  } catch (err) {
    console.log("shared fetch error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// export router
export default router;
