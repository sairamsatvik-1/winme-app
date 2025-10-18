import mongoose from "mongoose";

const ForgotOtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  ip: { type: String, required: true },
  count: { type: Number, default: 0 },
  lastSent: { type: Date, default: null },
  blockedUntil: { type: Date, default: null },
  expireAt: { type: Date, default: null },
}, { timestamps: true });

// optional: auto-delete after 10 minutes
ForgotOtpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const ForgotOtp = mongoose.model("ForgotOtp", ForgotOtpSchema);
export default ForgotOtp;
