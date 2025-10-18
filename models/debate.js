import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["system", "user", "assistant"], required: true },
  content: { type: String, required: true }
}, { _id: false });

const debateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  topic: { type: String, default: "" },
  stance: { type: String, default: "" },
  generalMessages: [messageSchema],
  debateMessages: [messageSchema],
  rounds: { type: Number, default: 10 },
  currentRound: { type: Number, default: 0 },
  debateStatus: { type: String, default: "inactive" },
  judgeResult: { type: Object, default: null }
}, { timestamps: true });

export default mongoose.model("Debate", debateSchema);
