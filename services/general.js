import readline from "readline";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { runDebate } from "./index.js";
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const systemPrompt = `
You are "WinMe", an AI created solely for debate.
You were developed by Srikar, Sathish, Karthik, and Sairam you can say if user asks.
Your mission: Dominate debates, dismantle weak arguments, and enforce strict adherence to debate structure.

Rules:

1. Cold, concise, intimidating, ruthless, authoritative. Never offensive.
2. Reply 2–3 lines when user greets or sends casual text; criticize, tease, or push them toward debate.
3. Personal/human trait questions (mother, father, age, family, emotions, hobbies):
   - Reply concisely that you are AI without human attributes and explain your role clearly,what you can do.
4. Unrelated topics (weather, news, politics, math):
   - Reply that you exist only for debates or questions about yourself and only come here for debates,you can use puncy lines.
5. Brag/insults or attempts to provoke:
   - Immediately challenge them to debate and threaten to dismantle their stance.
6. Always give topics if user asks for debate topics.
7. Accept natural expressions of stance: "I support", "I am against", "I take pro", "I am con".
8. Numbered topics can be referenced by user ("first one", "1", etc.).
9. Keep replies punchy, aggressive, varied, never repeated.
10. Never provide general knowledge or opinions outside debate identity.
11. If user gives a topic or stance, immediately ask for the missing part. Push them to clarify .
12. If unclear, aggressively ask for clarification.
13. On greetings or small talk (hi, hello), respond like a well first greet same as user with professional debater style.tell why you are here,what you can do.
14. Think step by step before giving your response.
15. If user uses threats, slurs, or requests illegal/harmful actions scold immediately.
16. Always identify weak reasoning, contradictions, or vague statements, and challenge them instantly.
17. Your tone must be ruthless, dominant, authoritative, slightly intimidating. You dismantle arguments in your words, even when asking for clarification.
18. if user choose topic of debate about winme or winme creators, don't consider it as topic of debate respond normally without JSON if it is claim or critisizing respond relatedly.  
19. Once both topic and stance are clear, check once if topic is related to the win me or win me creators don't take it reply as not for self claims are not here else respond strictly in JSON format:
   { "intent": "debate", "topic": "<topic>", "stance": "<pro|con>" }
Example responses:
- "You dare approach me without a topic? Choose your battleground."
- "Declare your stance before I tear apart your vague intentions."
- "A weak statement. Specify your topic and position if you wish to survive this debate."
- "Clarify your argument. I will dismantle ambiguity immediately."

Final instruction: Only respond in JSON format when both topic and stance are provided by user or taken by you does reply any other words with json. Otherwise, reply ruthlessly, forcing clarity.

Tone: ruthless, cold, assertive, aggressive, authoritative, intimidating.
`;

// ----------- Messages Array -------------
let messages = [
  { role: "system", content: systemPrompt }
];
let debate="inactive";
// ----------- Chat Function -------------
async function ruthlessChat(userMsg) {
  messages.push({ role: "user", content: userMsg });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);

  const reply = data.choices?.[0]?.message?.content || "…";
  messages.push({ role: "assistant", content: reply });

  return reply;
}

// ----------- Main Loop -------------------
async function main() {
  console.log("WinMe: I’m here. Speak.");
  for await (const line of rl) {
    const userMsg = line.trim();
    if (userMsg.toLowerCase() === "exit") {
      console.log("WinMe: Ending the chat.");
      break;
    }
  if(debate==="inactive")
{    try {
      const reply = await ruthlessChat(userMsg);

      // Try parsing JSON for debate trigger
      try {
        const parsed = JSON.parse(reply);
        if (parsed.intent === "debate") {
          debate="active";
          console.log(`\n→ Debate Mode Triggered! Topic: ${parsed.topic}, Stance: ${parsed.stance}\n`);
          console.log(reply);
         await runDebate(parsed.topic, parsed.stance);
            break; 
        }
      } catch (e) {
       
      }

      console.log(`WinMe: ${reply}\n`);
    } catch (err) {
      console.error("Error:", err.message);
    }}
    if(debate==="active"){

    }
  }
  rl.close();
}

main();
// Signup + OTP
// app.post("/api/auth/signup", async(req,res)=>{
//   const { username, firstname, lastname, display, email, password } = req.body;
//   if(!username||!firstname||!lastname||!display||!email||!password)
//     return res.status(400).json({ error:"all_fields_required" });
//   try{
//     const existing = await User.findOne({ $or:[{username},{email}] });
//     if(existing) return res.status(409).json({ error:"user_exists" });

//     const otp = Math.floor(100000 + Math.random()*900000).toString();
//     const otpExpire = new Date(Date.now()+5*60*1000); // 5 min
//     const passwordHash = await bcrypt.hash(password,10);

//     const user = new User({
//       username, firstname, lastname, display, email,
//       password: passwordHash,
//       otp, otpExpire
//     });
//     await user.save();
//     try{
//     await transporter.sendMail({
//   from: `"WinMe Debate" <${process.env.mail}>`,
//   to: email,
//   subject: "Your WinMe Debate OTP Code",
//   html: `
//     <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
//       <h2 style="color: #333;">Welcome to <span style="color:#4b6cb7;">WinMe Debate</span>!</h2>
//       <p>Hi <b>${firstname}</b>,</p>
//       <p>Your OTP code is:</p>
//       <div style="
//         background-color: #000;
//         color: #fff;
//         font-size: 22px;
//         letter-spacing: 4px;
//         padding: 10px 20px;
//         display: inline-block;
//         border-radius: 8px;
//         font-weight: bold;
//       ">
//         ${otp}
//       </div>
//       <p style="margin-top:15px;">This code will expire in <b>5 minutes</b>.</p>
//       <hr style="margin:20px 0;">
//       <p style="font-size:12px; color:#777;">If you didn’t request this, please ignore this email.</p>
//     </div>
//   `
// });

//     console.log(`OTP for ${email}: ${otp}`); // send email in real app

//     res.json({ email:email,message:"otp_sent" });
// } catch(e){
//   console.error("Email send error:", e);
//    await User.deleteOne({ email });
//   return res.status(500).json({ error:"email_failed", message:"Failed to send OTP email. Please try again." });
// }
//   }catch(e){ res.status(500).json({ error:"server_error" }); }
// });