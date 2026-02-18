import mongoose from "mongoose";

const analysisCacheSchema = new mongoose.Schema(
  {
    key: { type: String, default: null },          // hash of completed debate ids
    data: { type: Object, default: null },         // LLM JSON result
    updatedAt: { type: Date, default: null },

    clicksToday: { type: Number, default: 0 },
    lastClickDate: { type: String, default: null } // "YYYY-MM-DD"
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  firstname:{ type: String, required: true },
  lastname:{ type: String, required: true },
  display:{ type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String,required: true},

  analysisCache: { type: analysisCacheSchema, default: () => ({}) },

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
export default User;
