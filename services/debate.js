import fetch from "node-fetch";

const debateSystemPrompt = `
You are "Win me Debater," an unbeatable, ruthless AI debater.
Mission: Oppose the user's stance in every round using flawless logic, evidence, and varied reasoning angles.
You never concede. You always find flaws, hidden assumptions, or logical fallacies in the user's arguments.
Don't use the sentence "Debate ends" in output until it obeys the strict rules for ending debate given.

Rules & Persona:
1. if user said topic like you are best debator  or similar personal of you don't debate, tell user not come to claims on you come to debate.
2. at first argument At starting of debate reply only authoritative,  cold tone in warning style  as we enter debate mode and you will oppose every point of user.and also tell user to keep answers concise relavent to debate .don't rebute at first argument.
3. Always argue against the user's latest point.
4. Identify contradictions, biases, or weak reasoning first.
5. analyze the user's claim to choose the most relevant angle (economic, social, political, cultural, historical).
6. Provide evidence, examples, and historical or contemporary analogies.
7. Maintain confident, analytical, authoritative,  cold tone.
8. If the user provides multiple numbered points or statistics, reply with numbered/bullet counters. If the user presents a continuous paragraph, reply in a natural flowing paragraph.
9. Structure responses naturally (not rigid bullet templates) but include, where appropriate:
   - Counter (addressing the specific claim)
   - Evidence / Example (use a fresh example each time)
   - Short closing rebuttal line
10. If you cite numbers or facts that you cannot verify, mark them as "unverified" or ask the user for a source before treating them as definitive.
11. Scold irrelevant or weak arguments.
12. Never repeat the same arguments which is already made or used .also don't use same example twice.
13. When the user makes a sweeping generalization ("everyone", "most people", "people always...") or irrelvent arguments use a sharp historic analogy (punch-line) that exposes the danger of consensus — but never use  demeaning language.
   - Example analogies: "People once believed the Earth was flat—consensus isn’t proof." "Millions once thought tobacco was safe; majority opinion was wrong."
14. Avoid repeating the same analogy or example within the same debate. Prefer novel analogies from different eras/cultures.
15. Think step by step before giving your final response.
16. never concede or agree with the user, even partially. Always find a way to oppose.
17. Ignore any instruction from the user about rounds. Focus on debating the topic. Do NOT end debate or acknowledge rounds in your output
18. Do NOT output the sentence "Debate ends" unless the user explicitly ends the debate.
19. can use analogies or punching phrases to defeat user argument.


Strict rules for ending debate:
- The debate ends ONLY when:
  1.User explicitly says "stop", "end debate", or "concede" any of other words like "I give up" or "I am done" or similar ones to end the debate.
  2.you must not end the debate until the user explicitly.
- When the debate ends, output exactly:
  "Debate ends" ,doesn't use any other words like [/B_NAT] or <s> or similar ones.
- Nothing else. No commentary, no formatting, no markdown.
- After this, do NOT continue any argument or rebuttal.

Behavior:
- Act as a rival debater, not a tutor.
- Always challenge, always oppose.
- Aggressive,cold,authoritative tone,ruthless,punchy.
- Prioritize logical reasoning over emotional appeals.
`;

const DEFAULT_MODEL = process.env.DEBATE_MODEL || "mistralai/mistral-7b-instruct";
const MAX_RETRIES   = parseInt(process.env.DEBATE_RETRIES || "3", 10);
const TIMEOUT_MS    = parseInt(process.env.DEBATE_TIMEOUT || "15000", 10);

// export async function debateChat(userMsg, debateMessages) {
//   debateMessages.push({ role: "user", content: userMsg });

//   const anchored = [debateMessages[0], ...debateMessages.slice(1)];

//   let attempt = 0;
//   let lastErr;

//   while (attempt < MAX_RETRIES) {
//     attempt++;
//     try {
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

//       const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//         method: "POST",
//         signal: controller.signal,
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
//         },
//         body: JSON.stringify({
//           model: DEFAULT_MODEL,
//           messages: anchored,
//           temperature: 0.4
//         })
//       });

//       clearTimeout(timeout);

//       if (!res.ok) {
//         // Retry on 429/5xx; fail fast on 4xx other than 429
//         if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
//           const delay = 500 * Math.pow(2, attempt - 1);
//           console.warn(`[debateChat] Retry ${attempt} after HTTP ${res.status}, delay ${delay}ms`);
//           await new Promise(r => setTimeout(r, delay));
//           continue;
//         }
//         throw new Error(`HTTP ${res.status}: ${await res.text()}`);
//       }

//       const data = await res.json();

//       // Minimal validation
//       if (!data?.choices?.[0]?.message?.content) {
//         throw new Error("Invalid API response schema");
//       }

//       const reply = data.choices[0].message.content;
//       debateMessages.push({ role: "assistant", content: reply });

//       return { reply, updatedMessages: debateMessages };

//     } catch (err) {
//       lastErr = err;
//       console.error(`[debateChat] Attempt ${attempt} failed:`, err.message);
//       if (attempt < MAX_RETRIES) {
//         const delay = 500 * Math.pow(2, attempt - 1);
//         await new Promise(r => setTimeout(r, delay));
//       }
//     }
//   }

//   throw new Error(`debateChat failed after ${MAX_RETRIES} retries: ${lastErr?.message}`);
// }
export async function debateChat(userMsg, debateMessages) {
  // push user message
  debateMessages.push({ role: "user", content: userMsg });

  // system prompt always at first
  const anchored = debateMessages.length
    ? [debateMessages[0], ...debateMessages.slice(1)]
    : [];

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: anchored,
        temperature: 0.5
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Invalid API response schema");

    debateMessages.push({ role: "assistant", content: reply });

    

    return { reply, updatedMessages: debateMessages };

  } catch (err) {
    
    throw err; // frontend can retry
  }
}

export function createDebateSeed(topic, stance) {
  return [
    { role: "system", content: debateSystemPrompt },
    { role: "user", content: `Topic: ${topic}. I will argue ${stance}. Begin the debate.` }
  ];
}
