import express from "express";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import OtpActivity from "../models/otpactivity.js";
import OtpVerification from "../models/otpverification.js";
import ForgotOtp from "../models/forgototp.js";
import Forgotverification from "../models/forgotverify.js";
import nodemailer from "nodemailer"; 
const router=express.Router();
import dotenv from "dotenv";

dotenv.config();
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --- Create reusable transporter ---
console.log("emai",process.env.mail)
console.log("pass",process.env.mail_pass)
// ----- Session -----


// 🧩 SESSION CHECK
router.get("/session", (req, res) => {
  if (req.session && req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// ----- Middleware -----
function ensureAuth(req,res,next){
  if(!req.session.user) return res.status(401).json({ error:"not_authenticated" });
  next();
}


// Signup - Send OTP
router.post("/send-otp", async (req, res) => {
  const { username, firstname, lastname, display, email, password } = req.body;
  if (!username || !firstname || !lastname || !display || !email || !password)
    return res.status(400).json({ error: "all_fields_required" });

  try {
    const existing = await User.findOne({ email });
    const userexisting=await User.findOne({ username });
    if (existing) return res.status(409).json({ error: "Email_exists" });
    if(userexisting) return res.status(409).json({ error: "username_exists" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ip=req.ip;
    const now = new Date();
  
    let activity = await OtpActivity.findOne({
  $or: [{ email }, { email, ip }]
});
    if (!activity) {
      activity = new OtpActivity({ email, ip, count: 0 });
    }
    if (activity.blockedUntil && activity.blockedUntil > now) {
      const waitTime = Math.ceil((activity.blockedUntil - now) / 60000);
      return res.status(429).json({ error: "too_many_requests", waitTime });
    } 
    
    if(activity.count >=5){
      activity.blockedUntil = new Date(now.getTime() + 10*60*1000);
      activity.count = 0; // reset count after blocking
      await activity.save();
      return res.status(429).json({ error: "too_many_requests", waitTime:10 });
    }
    const otpExpire = Date.now() + 5 * 60 * 1000; 
const expireAt =  Date.now()+5*60*60*1000;
    let otpverification = await OtpVerification .findOne({ email });
    if (otpverification) {
      otpverification.otp = otp;
      otpverification.otpexpired = new Date(otpExpire);
      otpverification.expireAt = new Date(expireAt);
      otpverification.data = { username, firstname, lastname, display, email, password };
      await otpverification.save();
    } else {
      otpverification = new OtpVerification ({
        email,
        otp,
        otpexpired: new Date(otpExpire),
        expireAt: new Date(expireAt),
        data: { username, firstname, lastname, display, email, password }
      });
      await otpverification.save();
    }
   
const pending =otpverification;
    const msg={
      from: {
        name: "WinMe Debate",
        email: process.env.SENDER_EMAIL, // must be verified in SendGrid
      },
      to: email,
      subject: "Your WinMe Debate OTP Code",
      html: `   <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
       <h2 style="color: #333;">Welcome to <span style="color:#4b6cb7;">WinMe Debate</span>!</h2>
       <p>Hi <b>${pending.data.firstname}</b>,</p>
       <p>Your OTP code is:</p>
      <div style="
         background-color: #000;
         color: #fff;
         font-size: 22px;
         letter-spacing: 4px;
         padding: 10px 20px;
         display: inline-block;
         border-radius: 8px;
        font-weight: bold;
      ">
         ${otp}
       </div>
       <p style="margin-top:15px;">This code will expire in <b>5 minutes</b>.</p>
       <hr style="margin:20px 0;">
       <p style="font-size:12px; color:#777;">If you didn’t request this, please ignore this email.</p>
     </div>
   `,
    };
     await sgMail.send(msg);
    console.log("✅ OTP Email sent to", email);
    activity.count += 1;
    activity.lastSent = now;
    activity.expireAt = new Date(now.getTime() + 10*60*1000); // set expireAt for auto-deletion
    await activity.save();
    res.json({ message: "otp_sent", email });
  } catch (err) {
    
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  let pending = await OtpVerification .findOne({ email });
  if (!pending) return res.status(404).json({ error:"session_not_found" });
    const now = Date.now();
   const ip=req.ip;
   let activity = await OtpActivity.findOne({
  $or: [{ email }, { email, ip }]
});
  if (!activity) {
      activity = new OtpActivity({ email, ip:req.ip, count: 0 });
    }
  if (activity.blockedUntil && activity.blockedUntil > new Date()) {
    const waitTime = Math.ceil((activity.blockedUntil - new Date()) / 60000);
    return res.status(429).json({ error: "too_many_requests", waitTime });
  }
  if(activity.lastSent && Date.now() - activity.lastSent < 2*60*1000){
    const wait = 120 - Math.floor((Date.now() - activity.lastSent) / 1000);
    return res.status(429).json({error: "wait_before_resend", waitTime: wait });
  }
  if(activity.count >=5){
    activity.blockedUntil = new Date(Date.now() + 10*60*1000);
    activity.count = 0; // reset count after blocking
    await activity.save();
    return res.status(429).json({ error: "too_many_requests", waitTime:10 });
  }

  
     const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpire = Date.now() + 5 * 60 * 1000;
  const expireAt = Date.now()+5*60*60*1000;
  pending.otp = otp;
  pending.otpexpired = new Date(otpExpire);
  pending.expireAt = new Date(expireAt);
  await pending.save();

  try {
   const msg={
      from: {
        name: "WinMe Debate",
        email: process.env.SENDER_EMAIL, // must be verified in SendGrid
      },
      to: email,
      subject: "Your WinMe Debate OTP Code (Resent)",
      html:  `   <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
       <h2 style="color: #333;">Welcome to <span style="color:#4b6cb7;">WinMe Debate</span>!</h2>
       <p>Hi <b>${pending.data.firstname}</b>,</p>
       <p>Your OTP code is:</p>
      <div style="
         background-color: #000;
         color: #fff;
         font-size: 22px;
         letter-spacing: 4px;
         padding: 10px 20px;
         display: inline-block;
         border-radius: 8px;
        font-weight: bold;
      ">
         ${otp}
       </div>
       <p style="margin-top:15px;">This code will expire in <b>5 minutes</b>.</p>
       <hr style="margin:20px 0;">
       <p style="font-size:12px; color:#777;">If you didn’t request this, please ignore this email.</p>
     </div>
   `,
    };
     await sgMail.send(msg);
    console.log("✅ OTP Email sent to", email);
    activity.count += 1;
    activity.lastSent = new Date();
    activity.expireAt = new Date(Date.now() + 10*60*1000); // set expireAt for auto-deletion
    await activity.save();
    
    res.json({ message: "otp_resent" });
  } catch (err) {
    
    res.status(500).json({ error: "server_error" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: "email_otp_required" });

  const pending = await OtpVerification .findOne({ email });
  if (!pending) return res.status(400).json({ error: "session_not_found" });
  if (pending.otpexpired < new Date())
    return res.status(400).json({ error: "otp_expired" });
  if (pending.otp !== otp)
    return res.status(400).json({ error: "invalid_otp" });

  try {
    const hashed = await bcrypt.hash(pending.data.password, 10);
    const newUser = new User({ ...pending.data, password: hashed });
    await newUser.save();
    await OtpVerification .deleteOne({ email });
    res.json({ message: "verified_and_created"});
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/forget-password", async(req,res)=>{
  const { email } = req.body;
  if(!email) return res.status(400).json({ error:"email_required" });
  try{
    const ip=req.ip;
    const user = await User.findOne({ email });
    if(!user) return res.status(404).json({ error:"user_not_found" });
     const now=new Date()
    const lastSent = Date.now();
   let Factivity = await ForgotOtp.findOne({
  $or: [{ email }, { email, ip }]
});
      if (!Factivity) {
      Factivity = new ForgotOtp({ email, ip, count: 0, expireAt: new Date(now.getTime() + 10 * 60 * 1000) });
    }
    if (Factivity.blockedUntil && Factivity.blockedUntil > now) {
      const waitTime = Math.ceil((Factivity.blockedUntil - now) / 60000);
      return res.status(429).json({ error: "too_many_requests", waitTime });
    } 
    if(Factivity.lastSent && Date.now() - Factivity.lastSent < 2*60*1000){
    const wait = 120 - Math.floor((Date.now() - Factivity.lastSent) / 1000);
    return res.status(429).json({error: "wait_before_resend", waitTime: wait });
  }
    if(Factivity.count >=5){
      Factivity.blockedUntil = new Date(now.getTime() + 10*60*1000);
      Factivity.count = 0; // reset count after blocking
      Factivity.expireAt=new Date(now.getTime() + 20*60*1000);
      await Factivity.save();
      return res.status(429).json({ error: "too_many_requests", waitTime:10 });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpexpired = new Date(now.getTime() + 5 * 60 * 1000);
const expireAt = new Date(now.getTime() + 60 * 60 * 1000);
    const msg={
      from: {
        name: "WinMe Debate",
        email: process.env.SENDER_EMAIL, // must be verified in SendGrid
      },
      to: email,
      subject: "Your WinMe Debate Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi <b>${user.firstname}</b>,</p>
          <p>Your OTP code to reset your password is:</p>
          <div style="
            background-color: #000;
            color: #fff;
            font-size: 22px;
            letter-spacing: 4px;
            padding: 10px 20px;
            display: inline-block;
            border-radius: 8px;
            font-weight: bold;
          ">
            ${otp}
          </div>
          <p style="margin-top:15px;">This code will expire in <b>5 minutes</b>.</p>
          <hr style="margin:20px 0;"> 
          <p style="font-size:12px; color:#777;">If you didn’t request this, please ignore this email.</p>
        </div>
      `
    };
     await sgMail.send(msg);
    console.log("✅ OTP Email sent to", email);
    await Forgotverification.findOneAndUpdate(
      { email },
      { otp,otpexpired,expireAt },
      { upsert: true, new: true }
    );

    // Update activity
    Factivity.lastSent = now;
    Factivity.count += 1;
    await Factivity.save();
    res.json({ message:"otp_sent" });
  }catch(err){  console.error("SendGrid Error:", err.response ? err.response.body : err);res.status(500).json({ error:"server_error" }); }
});
// Verify OTP and reset password
router.post("/reset-password", async(req,res)=>{
  const { email, otp, newPassword } = req.body;   
  if(!email||!otp||!newPassword) return res.status(400).json({ error:"all_fields_required" });
  const record = await Forgotverification.findOne({ email });
  if(!record) return res.status(400).json({ error:"otp_not_found" });
  if(record.otp !== otp) return res.status(400).json({ error:"invalid_otp" });
  if(record.otpexpired < new Date()) return res.status(400).json({ error:"otp_expired" });
  try{
    const hashed = await bcrypt.hash(newPassword,10);
    await User.updateOne({ email }, { password:hashed });
    await Forgotverification.deleteOne({ email });
    res.json({ message:"password_reset" });
  }catch(e){ res.status(500).json({ error:"server_error" }); }
});
router.post("/resend-forget-otp", async(req,res)=>{
  const { email } = req.body;
  const ip=req.ip;
  if(!email) return res.status(400).json({ error:"email_required" });
  try{
    const user = await User
.findOne({ email });
    if(!user) return res.status(404).json({ error:"user_not_found" });
    const now = new Date();
    let Factivity = await ForgotOtp.findOne({ email });
    if (!Factivity) {
      Factivity = new ForgotOtp({ email, ip, count: 0, expireAt: new Date(now.getTime() + 10 * 60 * 1000) });
    }
      if (Factivity.blockedUntil && Factivity.blockedUntil > now) {
      const waitTime = Math.ceil((Factivity.blockedUntil - now) / 60000);
      return res.status(429).json({ error: "too_many_requests", waitTime });
    } 
   if(Factivity.lastSent && Date.now() - Factivity.lastSent < 2*60*1000){
    const wait = 120 - Math.floor((Date.now() - Factivity.lastSent) / 1000);
    return res.status(429).json({error: "wait_before_resend", waitTime: wait });
  }
      if(Factivity.count >=5){
      Factivity.blockedUntil = new Date(now.getTime() + 10*60*1000);
      Factivity.count = 0; // reset count after blocking
      Factivity.expireAt=new Date(now.getTime() + 20*60*1000);
      await Factivity.save();
      return res.status(429).json({ error: "too_many_requests", waitTime:10 });
    }
    const otp = Math.floor(100000 + Math.random()*900000).toString(); 
    const otpexpired =  new Date(now.getTime() + 5*60*1000);
    const expireAt=new Date(now.getTime() + 60*60*1000)
    const lastSent = Date.now();

    const msg={
      from: {
        name: "WinMe Debate",
        email: process.env.SENDER_EMAIL, // must be verified in SendGrid
      },
      to: email,
      subject: "Your WinMe Debate Password Reset OTP (Resent)",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Request</h2>

          <p>Hi <b>${user.firstname}</b>,</p>
          <p>Your OTP code to reset your password is:</p>
          <div style="
            background-color: #000;
            color: #fff;
            font-size: 22px;
            letter-spacing: 4px;
            padding: 10px 20px;
            display: inline-block;
            border-radius: 8px;
            font-weight: bold;
          ">  
            ${otp}
          </div>
          <p style="margin-top:15px;">This code will expire in <b>5 minutes</b>.</p>
          <hr style="margin:20px 0;">
          <p style="font-size:12px; color:#777;">If you didn’t request this, please ignore this email.</p>
        </div>
      `
    };
     await sgMail.send(msg);
    console.log("✅ OTP Email sent to", email);
     await Forgotverification.findOneAndUpdate(
      { email },
      { otp,otpexpired,expireAt },
      { upsert: true, new: true }
    );
     Factivity.lastSent = now;
    Factivity.count += 1;
    await Factivity.save();
    res.json({ message:"otp_resent" });
  }catch(e){ res.status(500).json({ error:"server_error" }); }
});
// Login
router.post("/login", async(req,res)=>{
  const { email, password } = req.body;
  if(!email||!password) return res.status(400).json({ error:"email_password_required" });
  try{
    const user = await User.findOne({ email });
    if(!user) return res.status(401).json({ error:"invalid_credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({ error:"invalid_credentials" });
const newuser= {
  id: user._id,
  firstname: user.firstname,
  lastname: user.lastname,
  username: user.username,
  display: user.display,
  email: user.email
};
   
  // Generate a new CSRF token tied to the new session
  const newCsrfToken = req.csrfToken();
  
  res.json({ message: 'logged_in', user, csrfToken: newCsrfToken });



  }catch(e){ res.status(500).json({ error:"server_error" }); }
});

// Logout
router.get("/logout", (req,res)=>{
   try{req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Failed to logout" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });}
  catch(err){
    console.log(err);
  }
});
export default router;