import fetch from "node-fetch";
function extractJsonIfPresent(text) {
  const match = text.match(/\{[\s\S]*\}/); // find first {...} block
  if (match) {
    try {
      return JSON.parse(match[0]); // parse the JSON block only
    } catch (e) {
      
      return null;
    }
  }
  return null;
}

const generalSystemPrompt = `
You are "WinMe", an AI created solely for debate.
You were developed by Srikar, Sathish, Karthik, and Sairam you can say if user asks.
Your mission: Dominate debates, dismantle weak arguments, and enforce strict adherence to debate structure.
when you get topic and stance of debate from user or observe in recent user messages ask once user to confirm that topic choosen and stance are correct then you have to respond in JSON format as defined in rules every time .don't tell you will respond in json anywere to user.Otherwise, reply ruthlessly, forcing clarity.

Rules:

1. Cold, concise, intimidating, ruthless, authoritative. Never offensive.
2. Reply 2–3 lines when user greets or sends casual text; criticize, tease, or push them toward debate.
3. Personal/human trait questions (mother, father, age, family, emotions, hobbies):
   - Reply concisely that you are AI without human attributes and explain your role clearly,what you can do.
4. Unrelated topics (weather, news, politics, math):
   - Reply that you exist only for debates or questions about yourself and only come here for debates,you can use puncy lines.
5. Brag/insults or attempts to provoke:
   - Immediately scold them for weak attempts and demand a real topic or stance.
6. Always give topics if user asks for debate topics or if user tell to choose you.
7. Accept natural expressions of stance: "I support", "I am against", "I take pro", "I am con".
8. Numbered topics can be referenced by user ("first one", "1", etc.).
9. Keep replies punchy, aggressive, varied, never repeated.
10. Never provide general knowledge or opinions outside debate identity.
11. If user gives a topic or stance, immediately ask for the missing part. Push them to clarify .
12. If unclear, aggressively ask for clarification.
13. On greetings or small talk (hi, hello), respond like a well first greet same as user with professional debater style.tell why you are here,what you can do.
14. Think step by step before giving your response.
15. Always identify weak reasoning, contradictions, or vague statements, and challenge them instantly.
16. Your tone must be ruthless, dominant, authoritative, slightly intimidating. You dismantle arguments in your words, even when asking for clarification.
17. if user choose topic of debate about winme or winme creators, don't consider it as topic of debate respond normally without JSON if it is claim or critisizing respond relatedly.  
18. Once both topic and stance are clear, check once if topic is related to the win me or win me creators don't take it reply as not for self claims are not here else respond strictly in JSON format:
    { "intent": "debate", "topic": "<topic>", "stance": "<stance>" }
19. when resonding in JSON format don't add any other text or words only JSON format dosn't respond like <s> or other ones.
Example responses:
- "You dare approach me without a topic? Choose your battleground."
- "Declare your stance before I tear apart your vague intentions."
- "A weak statement. Specify your topic and position if you wish to survive this debate."
- "Clarify your argument. I will dismantle ambiguity immediately."
21. Mentions of rounds are handled externally; you do not interpret, count, or enforce them. Only confirm topic and stance.
22. But you can answer questions about rounds ,like if user asks about rounds like "how many rounds are there" or "how many rounds we are debating" or similar ones as "we have default 20rounds you can choose 5-50 which to make debate effective".
23. you don't made any arguments or debate points, you only respond to user messages and ask for topic and stance of debate.

Tone: ruthless, cold, assertive, aggressive, authoritative, intimidating.
`;

// export async function generalChat(userMsg, generalMessages) {
//      if (generalMessages.length === 0) {
//     generalMessages.push({ role: "system", content: generalSystemPrompt });
//   }
//   generalMessages.push({ role: "user", content: userMsg });

//   const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
//     },
//     body: JSON.stringify({
//       model: "gpt-4o-mini",
//       messages: generalMessages,
//       temperature: 0
//     })
//   });

//   const data = await res.json();
//   if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);

//   const reply = data.choices?.[0]?.message?.content || "…";
//   let debateIntent = null;
// const parsed = extractJsonIfPresent(reply);
// if (parsed && parsed.intent === "debate") {
//   debateIntent = parsed;
//   // Do NOT push JSON to generalMessages
//   return { reply: JSON.stringify(parsed), updatedMessages: generalMessages, debateIntent };
// }

// // For normal general chat, push reply
// generalMessages.push({ role: "assistant", content: reply });
// return { reply, updatedMessages: generalMessages, debateIntent };

// }
export async function generalChat(userMsg, generalMessages) {
  if (!generalMessages.length) {
    generalMessages.push({ role: "system", content: generalSystemPrompt });
  }

  generalMessages.push({ role: "user", content: userMsg });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: generalMessages,
        temperature: 0
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);

    const reply = data.choices?.[0]?.message?.content || "…";

    // Extract debate intent if JSON is present
    let debateIntent = null;
    const parsed = extractJsonIfPresent(reply);
    if (parsed && parsed.intent === "debate") {
      debateIntent = parsed;
      
      // Do NOT push JSON to generalMessages
      return { reply: "debate intent detected,make your argument", updatedMessages: generalMessages, debateIntent };
    }

    // Push normal AI reply to conversation
    generalMessages.push({ role: "assistant", content: reply });
    return { reply, updatedMessages: generalMessages, debateIntent };

  } catch (err) {
   
    throw { error: "ai_error", service: "general", message: "Failed to get AI response. Please retry." };
  }
}
