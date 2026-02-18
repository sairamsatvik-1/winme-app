import mongoose from "mongoose";

const otpActivitySchema = new mongoose.Schema({
  email: { type: String, required: true },
  ip: { type: String, required: true },
  count: { type: Number, default: 0 },
  otp: { type: String, default: null },
  lastSent: { type: Date, default: null },
  blockedUntil: { type: Date, default: null },
  expireAt: { type: Date, default: null },
}, { timestamps: true });

// optional: auto-delete after 10 minutes
otpActivitySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const OtpActivity = mongoose.model("OtpActivity", otpActivitySchema);
export default OtpActivity;
