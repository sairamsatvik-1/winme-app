import mongoose from "mongoose";

const ForgotverificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expireAt: { type: Date, required: true },
  otpexpired: { type: Date, default: null },
}, { timestamps: true });

// auto-delete after expireAt time
ForgotverificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Forgotverification = mongoose.model("Forgotverification", ForgotverificationSchema);
export default Forgotverification;
