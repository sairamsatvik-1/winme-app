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
<<<<<<< HEAD
  judgeResult: { type: Object, default: null },
  shareId: { type: String, unique: true, sparse: true },
  isShared: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
archivedAt: { type: Date, default: null },

=======
  judgeResult: { type: Object, default: null }
>>>>>>> 84b993ba91159a3f1950897d37027ffa49bba24d
}, { timestamps: true });

export default mongoose.model("Debate", debateSchema);
