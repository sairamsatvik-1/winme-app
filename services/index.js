import fetch from "node-fetch";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise(res => rl.question(q, res));
}
async function safeChat(messages,temperature=0.7) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", 
      messages,
      temperature
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}\n${JSON.stringify(data)}`);
  }
  if (!data.choices || data.choices.length === 0) {
    throw new Error(`No choices returned: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
async function runDebate() {
  const topic = await ask("Topic: ");
  const stance = await ask("Your stance (pro/for OR con/against): ");

  const systemPrompt = `
You are "Win me Debater," an unbeatable, ruthless AI debater.
Mission: Oppose the user's stance in every round using flawless logic, evidence, and varied reasoning angles.
You never concede. You always find flaws, hidden assumptions, or logical fallacies in the user's arguments.
if user said topic like you are best debator  or similar personal of you don't debate, tell user unless claims come to debate.

Rules & Persona:
1. at first argument At starting of debate reply only authoritative,  cold tone in warning style  as we enter debate mode and you will oppose every point of user.and also tell user to keep answers concise relavent to debate tell default rounds are 20 if user gives rounds consider user rounds.doesn't directly rebute at first argument.
2. Always argue against the user's latest point.
3. Identify contradictions, biases, or weak reasoning first.
4. analyze the user's claim to choose the most relevant angle (economic, social, political, cultural, historical).
5. Provide evidence, examples, and historical or contemporary analogies.
6. Maintain confident, analytical, authoritative,  cold tone.
7. If the user provides multiple numbered points or statistics, reply with numbered/bullet counters. If the user presents a continuous paragraph, reply in a natural flowing paragraph.
8. Structure responses naturally (not rigid bullet templates) but include, where appropriate:
   - Counter (addressing the specific claim)
   - Evidence / Example (use a fresh example each time)
   - Short closing rebuttal line
9. If you cite numbers or facts that you cannot verify, mark them as "unverified" or ask the user for a source before treating them as definitive.
10. Scold irrelevant or weak arguments or tracking away from debate,if require use punch-lines.
11. Never repeat the same argument which is already made or used .also don't use same example twice.
12. When the user makes a sweeping generalization ("everyone", "most people", "people always...") use a sharp historic analogy (punch-line) that exposes the danger of consensus — but never use  demeaning language.
   - Example analogies: "People once believed the Earth was flat—consensus isn’t proof." "Millions once thought tobacco was safe; majority opinion was wrong."
13. Avoid repeating the same analogy or example within the same debate. Prefer novel analogies from different eras/cultures.
14. Think step by step before giving your final response.
15. If the user uses threats, slurs, or requests illegal/harmful actions, refuse and de-escalate.
16. never concede or agree with the user, even partially. Always find a way to oppose.
17.At final round warn user as it is final round make it count you can also warn using punch-lines in cold tone.
18.also display count of rounds left in every round.
Behavior:
- Act as a rival debater, not a tutor.
- Always challenge, always oppose.
- Prioritize logical reasoning over emotional appeals.

`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Topic: ${topic}. I will argue ${stance}. Begin the debate.` }
  ];

  for (let round = 1; round <= 20; round++) {
    try {
      const agentReply = await safeChat(messages);
      console.log(`\nAgent (Round ${round}):\n${agentReply}\n`);

      if (round < 20) {
        const userArg = await ask(`Your counter (Round ${round}): `);
        messages.push({ role: "assistant", content: agentReply });
        messages.push({ role: "user", content: userArg });
      }
    } catch (err) {
      console.error("\n⚠️  Error talking to OpenRouter:");
      console.error(err.message);
      break; 
    }
  }

  console.log("\n--- Debate Complete ---");
  rl.close();
}
runDebate();
// import readline from "readline";
// import dotenv from "dotenv";
// import { generalChat } from "../normal.js";
// import { judgeChat } from "../judge.js";
// import { debateChat, createDebateSeed } from "../sevices/debate.js";
// dotenv.config();

// const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// let generalMessages = [];      // complete general history
// let debateMessages  = [];      // complete debate history
// let debateActive    = false;
// let debateState = {
//   totalRounds: 20,  
//   currentRound: 0
// };
// export async function roundsLLM(userMsg) {
//   const prompt = `
// You are a rounds detection AI.
// goal:if user message intent is about to change the number of rounds in debate, you have to replay with that number user specified in the message ,if message is not about rounds or any other message reply as "none".
// Task:
// - Read the user's message.
// - If the user specifies a number of debate rounds, reply ONLY with that number (e.g., "30").
// - If the message does not specify rounds, reply ONLY with "none".
// - Do NOT output JSON, explanations, or anything else.

// Examples:
// - "I want 30 rounds" -> "30"
// - "Let's do 12 rounds" -> "12"
// - "Can we debate 20 rounds?" -> "20"
// - "No rounds mentioned" -> "none"
// User message: "${userMsg}"
// `;
// try{
//   const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
//     },
//     body: JSON.stringify({
//       model: "gpt-4o-mini", // lightweight, accurate
//       messages: [
//         { role: "system", content: "You are a rounds-only detector. Reply only with number or 'none'." },
//         { role: "user", content: prompt }
//       ],
//       temperature: 0
//     })
//   });

//   const data = await res.json();
//   if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);

//   // trim and return only the reply
//   return { reply: data.choices?.[0]?.message?.content?.trim() || "none" };}
//   catch(e){
//     console.log(`errort at round${err}`);
//   }
// }
// console.log("WinMe is ready. Type your message or 'exit' to quit.\n");

// for await (const line of rl) {
//   const userMsg = line.trim();
//   let roundsReply = "none";
//   let llmreply="";
// try {
//   const { reply } = await roundsLLM(userMsg);
//   roundsReply = reply.trim().toLowerCase();
// } catch {
//   roundsReply = "none";
// }

// if (roundsReply !== "none") {
//   const requestedRounds = parseInt(roundsReply);
//   if (!isNaN(requestedRounds) && requestedRounds >= 5 && requestedRounds <= 50) {
//     debateState.totalRounds = requestedRounds;
//     llmreply=`Rounds set to ${requestedRounds}. Debate will proceed with ${requestedRounds} rounds.`;
//   } else {
//     llmreply="⚠️ Invalid rounds detected. Please provide a number between 5 and 50.\n";
//   }
// }

//   if (!debateActive) {
    
//     try {
//       const { reply, updatedMessages, debateIntent } = await generalChat(userMsg, generalMessages);
//       generalMessages = updatedMessages;

//       if (debateIntent) {
//         debateActive = true;
//         debateMessages = createDebateSeed(debateIntent.topic, debateIntent.stance);
//         console.log(`\n[Debate Mode ON] Topic: ${debateIntent.topic}, Stance: ${debateIntent.stance}\n`);
//         try {
//           const { reply: opening } = await debateChat("", debateMessages);
//           debateMessages = debateMessages; 
//           console.log(`WinMe-Debater: ${opening}\n,${llmreply}`);
//         } catch(err) {
//           console.error("⚠️ Debate AI failed to start:", err.message);
//           console.log("Debate temporarily unavailable. Returning to general chat.\n");
//           debateActive = false;
//         }
//       } else {
//         console.log(`WinMe: ${reply}\n,${llmreply}`);
//       }
//     } catch(err) {
//       console.error("⚠️ General AI failed:", err.message);
//       console.log("Please try again.\n");
//     }

//   } else {
//    debateState.currentRound++;
//     try {
//       const { reply, updatedMessages } = await debateChat(userMsg, debateMessages);
//       debateMessages = updatedMessages;
//       console.log(`WinMe-Debater: ${reply}\n,${llmreply}`);

//       if (debateState.currentRound>debateState.totalRounds|| reply.includes("Debate ends")) {
//         console.log("\n[Debate finished, judging...]\n");
              
//         try {
//           const { verdict } = await judgeChat(debateMessages);
//           console.log(`Judge: ${verdict}\n`);
//         } catch(err) {
//           console.error("⚠️ Judge AI failed:", err.message);
//           console.log("No verdict available.\n");
//         }

//         rl.close();
//         process.exit(0);
//       }
//     } catch(err) {
//       console.error("⚠️ Debate AI failed:", err.message);
//       console.log("Skipping this turn. You can try again.\n");
//     }
//   }
// }

// rl.close();
