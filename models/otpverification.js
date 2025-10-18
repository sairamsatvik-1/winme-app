import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expireAt: { type: Date, required: true },
  otpexpired: { type: Date, default: null },
  data: {
    username: String,
    firstname: String,
    lastname: String,
    display: String,
    email: String,
    password: String,
  },
}, { timestamps: true });

// auto-delete after expireAt time
otpVerificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const OtpVerification = mongoose.model("OtpVerification", otpVerificationSchema);
export default OtpVerification;
