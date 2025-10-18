import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import winmeImage from "../assets/image.png";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
const AuthPage = ({ setLoggedIn,setUser }) => {
   const [csrfToken, setCsrfToken] = useState(sessionStorage.getItem("csrfToken") || null);
  
  const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    try {
      const res = await fetch("http://localhost:5000/api/csrf-token", { credentials: "include" });
      const data = await res.json();
      setCsrfToken(data.csrfToken);
      sessionStorage.setItem("csrfToken", data.csrfToken);
      return data.csrfToken;
    } catch (err) {
      toast.error("CSRF token fetch failed");
    }
  };
  const [isLogin, setIsLogin] = useState(true);
  const [otpMode, setOtpMode] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const[issubmitting,setIsSubmitting]=useState(false);
  const[isforgot,setIsForgot]=useState(false);
  const emptyForm = {
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    newPassword: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setOtpMode(false);
    setForgotMode(false);
    setFormData(emptyForm);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePassword = (password) => {
    const upper = /[A-Z]/;
    const number = /\d/;
    const symbol = /[!@#$%^&*(),.?":{}|<>]/;
    return upper.test(password) && number.test(password) && symbol.test(password) && password.length >= 8;
  };

  // ============== LOGIN / SIGNUP ==============
  // ... all imports and states remain same

// ============== LOGIN / SIGNUP ==============
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!isLogin && !forgotMode) {
    if (!/^[A-Za-z]+$/.test(formData.firstname) || !/^[A-Za-z]+$/.test(formData.lastname)) {
      return toast.error("First and Last name must contain only letters."); // return added
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match."); // return added
    }
    if (!validatePassword(formData.password)) {
      return toast.error("Password must contain 1 capital, 1 number, 1 symbol, and 8+ chars."); // return added
    }
  }

  try {
    const token=await getCsrfToken();
    if(!token) return toast.error("csrf token error")
    if (isLogin && !forgotMode) {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json","csrf-token": token, },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(emptyForm);
        toast.success("Welcome back!");
        sessionStorage.setItem('csrfToken', data.csrfToken);
        setUser(data.user); // set user data
        
        setLoggedIn(true);
        return  // return added
      } else return toast.error(data.error || "Login failed"); // return added
    } else if (!isLogin && !forgotMode) {
      setIsSubmitting(true);
        const token=await getCsrfToken();

    if(!token) return toast.error("csrf token error")
      const display = formData.firstname[0] + formData.lastname[0];
      const res = await fetch("http://localhost:5000/api/auth/send-otp", {
        method: "POST",credentials: "include",
        headers: { "Content-Type": "application/json" ,"csrf-token": token, },
        body: JSON.stringify({ ...formData, display }),  
      });
      const data = await res.json();
      if (res.ok) {
        setIsSubmitting(false);
        setFormData(emptyForm);
        setOtpMode(true);
        setOtpEmail(formData.email);
        return toast.success("OTP sent!"); // return added
      } else if(data.error==="too_many_requests"){
        setIsSubmitting(false);

         return toast.error(`Too many requests for ${formData.email}. Please try again later ${data.waitTime} minutes.`); // return added
      } 
      // return added
      else  
       { setIsSubmitting(false);
       return toast.error(data.error || "Signup failed");
           }    }
  } catch {
    return toast.error("Server error"); // return added
  }
};

// ============== VERIFY OTP ==============
const handleVerifyOtp = async () => {
  try {
    const token=await getCsrfToken();
    if(!token) return toast.error("csrf token error")
    const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" ,"csrf-token": token, },
      body: JSON.stringify({ email: otpEmail, otp }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setOtpMode(false);
      setIsLogin(true);
      setOtp("");
      setFormData(emptyForm);
      return toast.success("Signup verified! Please login."); // return added
    } else return toast.error(data.error || "OTP verification failed"); // return added
  } catch {
    return toast.error("Server error"); // return added
  }
};

// ============== RESEND OTP ==============
const handleResendOtp = async () => {
  const token=await getCsrfToken();
    if(!token) return toast.error("csrf token error")
  try {
    const res = await fetch("http://localhost:5000/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json","csrf-token": token, },
      body: JSON.stringify({ email: otpEmail }), credentials: "include",
    });
    const data = await res.json();
    if (res.ok) return toast.success("OTP resent!"); // return added
    else if (data.error === "wait_before_resend")
      return toast.error(`Please wait ${data.waitTime}s before resending OTP.`);
    else if(data.error==="too_many_requests"){
      return toast.error(`Too many requests. Please try again later ${data.waitTime} minutes.`);
    }
    else return toast.error(data.error || "Failed to resend"); // return added
  } catch {
    return toast.error("Server error"); // return added
  }
};
// ============== FORGOT PASSWORD FUNCTIONS ==============
const handleForgotSubmit = async () => {
  if (!formData.email) return toast.error("Enter your email");
  try {
    const token=await getCsrfToken();
    console.log(token)
    if(!token) return toast.error("csrf token error")
    setIsForgot(true);
    const res = await fetch("http://localhost:5000/api/auth/forget-password", {
      method: "POST",
      headers: { "Content-Type": "application/json","csrf-token": token, },
      body: JSON.stringify({ email: formData.email }),
        credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setOtpEmail(formData.email);
      setOtp("");
      setOtpMode(true);
      setIsForgot(false)
      return toast.success("OTP sent for password reset!");
    } 
    else if(data.error==="wait_before_resend"){
setIsForgot(false)
      return toast.error(`Please wait ${data.waitTime}s.. to send Otp`);
    }
     else if(data.error==="otp_not_found"){
        return toast.error(`session expired go back`);
    }
    else if(data.error==="too_many_requests"){
        setIsForgot(false)
      return toast.error(`Too many requests.Please wait ${data.waitTime}minutes..`);
    }
    else{ setIsForgot(false)
      return toast.error(`${data.error} error from forgor password` || "Failed to send OTP");}
  } catch {
    return toast.error("Server error");
  }
};

const handleResendForgetOtp = async () => {
  try {
    const token=await getCsrfToken();
    if(!token) return toast.error("csrf token error")
    const res = await fetch("http://localhost:5000/api/auth/resend-forget-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json","csrf-token": token,  },
      body: JSON.stringify({ email: otpEmail }),  credentials: "include",
    });
    const data = await res.json();
    if (res.ok) return toast.success("OTP resent!");
    else if (data.error === "wait_before_resend")
      return toast.error(`Please wait ${data.waitTime}s before resending OTP.`);
    else if(data.error==="too_many_requests"){
      return toast.error(`Too many requests.Please wait ${data.waitTime}minutes..`);
    }
    else if(data.error==="otp_not_found"){
        return toast.error(`session expired go back`);
    }
    else return toast.error(data.error || "Failed to resend OTP");
  } catch {
    return toast.error("Server error");
  }
};
const handleResetPassword = async () => {
  if (!otp) return toast.error("Enter OTP");
  if (!formData.newPassword) return toast.error("Enter new password");
  if (!validatePassword(formData.newPassword)) {
    return toast.error("Password must contain 1 capital, 1 number, 1 symbol, and 8+ chars.");
  }
  try {
        const token=await getCsrfToken();
    if(!token) return toast.error("csrf token error")
    const res = await fetch("http://localhost:5000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" ,"csrf-token": token, },
      body: JSON.stringify({ email: otpEmail, otp, newPassword: formData.newPassword }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setOtpMode(false);
      setForgotMode(false);
      setIsLogin(true);
      setOtp("");
      setFormData(emptyForm);
      return toast.success("Password reset! Please login.");
    } else return toast.error(data.error || "Failed to reset password");
  } catch {
    return toast.error("Server error");
  } 
};

  // =======================================
  return (
   <>
  <Toaster
    position="top-center"
    
  />
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <motion.div className="flex w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl bg-gray-800">
 <AnimatePresence mode="wait">
          {isLogin ? (
            <>
              {/* IMAGE LEFT */}
              <motion.div
                key="image-login"
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="relative w-1/2 bg-gray-700 flex flex-col items-center justify-center p-4"
              >
                <h2 className="text-white text-2xl font-bold mb-4">WinMe Debater</h2>
                <img src={winmeImage} alt="WinMe" className="max-h-[400px] object-contain mb-6" />
                <h2 className="text-white text-xl font-bold">Welcome Back!</h2>
              </motion.div>

            {/* RIGHT FORM (Login + Forgot + Reset) */}
<motion.div
  key="form-login"
  initial={{ x: 300, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -300, opacity: 0 }}
  className="w-1/2 p-8 flex items-center justify-center"
>
  {!forgotMode ? (
    // LOGIN FORM
    <motion.form key="loginForm" onSubmit={handleSubmit} className="w-full space-y-4">
      <h1 className="text-3xl text-indigo-400 font-bold mb-4">Login</h1>

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
        required
      />
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
          required
        />
        <span
          className="absolute right-2 top-2 cursor-pointer text-indigo-400 select-none"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "Hide" : "Show"}
        </span>
      </div>

      <p
        className="text-indigo-400 text-sm cursor-pointer hover:underline"
        onClick={() => {
          setForgotMode(true);
          setOtp("");
          setFormData({ ...emptyForm });
        }}
      >
        Forgot Password?
      </p>

      <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
        Login
      </button>
      <p className="text-gray-400 text-sm text-center cursor-pointer">
        Don't have an account?{" "}
        <span className="text-indigo-400 font-semibold" onClick={toggleMode}>
          Sign Up
        </span>
      </p>
    </motion.form>
  ) : (
    // FORGOT PASSWORD FORM
<motion.div key="forgotPanel" className="w-full space-y-4 text-center">
  <h1 className="text-3xl text-indigo-400 font-bold mb-4">Forgot Password</h1>

  {!otpMode ? (
    <>
      <input
        type="email"
        name="email"
        placeholder="Enter your email"
        value={formData.email}
        onChange={handleChange}
        className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
        required
      />
      <button
        type="button"
        onClick={() => handleForgotSubmit()} // call function
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        disabled={isforgot}
      >
        Send OTP
      </button>
      <p
        className="text-sm text-indigo-400 hover:underline cursor-pointer"
        onClick={() => setForgotMode(false)}
      >
        Back to Login
      </p>
    </>
  ) : (
    <>
      <p className="text-white">Enter OTP sent to <b>{otpEmail}</b></p>
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white text-center"
        required
      />
      <div className="relative">
        <input
          type={showForgotPassword ? "text" : "password"} // show/hide toggle
          placeholder="New Password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
          required
        />
        <span
          className="absolute right-2 top-2 cursor-pointer text-indigo-400 select-none"
          onClick={() => setShowForgotPassword(!showForgotPassword)}
        >
          {showForgotPassword ? "Hide" : "Show"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => handleResetPassword()} // call function
        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded"
      >
        Reset Password
      </button>

      <button
        type="button"
        onClick={() => handleResendForgetOtp()} // new separate function for resend OTP
        className="text-sm text-indigo-400 hover:underline cursor-pointer"
      >
        Resend OTP
      </button>

      <p
        className="text-sm text-indigo-400 hover:underline cursor-pointer"
        onClick={() => {
          setOtpMode(false);
          setForgotMode(false);
          setOtp("");
          setFormData({ ...emptyForm });
        }}
      >
        Back
      </p>
    </>
  )}
</motion.div>

  )}
</motion.div>

            </>
          ) : (
            <>
              {/* SIGNUP SIDE (includes OTP verify + resend) */}
              <motion.div
                key="form-signup"
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-1/2 p-8 flex items-center justify-center"
              >
                {!otpMode ? (
                  <motion.form key="signupForm" onSubmit={handleSubmit} className="w-full space-y-4">
                    <h1 className="text-3xl text-indigo-400 font-bold mb-4">Sign Up</h1>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="firstname"
                        placeholder="First Name"
                        value={formData.firstname}
                        onChange={handleChange}
                        className="w-1/2 p-2 rounded border border-gray-600 bg-gray-900 text-white"
                        required
                      />
                      <input
                        type="text"
                        name="lastname"
                        placeholder="Last Name"
                        value={formData.lastname}
                        onChange={handleChange}
                        className="w-1/2 p-2 rounded border border-gray-600 bg-gray-900 text-white"
                        required
                      />
                    </div>
                    <input
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
                      required
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
                        required
                      />
                      <span
                        className="absolute right-2 top-2 cursor-pointer text-indigo-400 select-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white"
                        required
                      />
                      <span
                        className="absolute right-2 top-2 cursor-pointer text-indigo-400 select-none"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </span>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition cursor-pointer"
                      disabled={issubmitting}
                    >
                      Sign Up
                    </button>
                    <p className="text-gray-400 text-sm text-center cursor-pointer">
                      Already have an account?{" "}
                      <span className="text-indigo-400 font-semibold" onClick={toggleMode}>
                        Login
                      </span>
                    </p>
                  </motion.form>
                ) : (
                  <motion.div className="w-full space-y-4 flex flex-col items-center">
                    <p className="text-white text-center">
                      Enter OTP sent to <b>{otpEmail}</b>
                    </p>
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full p-2 rounded border border-gray-600 bg-gray-900 text-white text-center"
                    />
                    <button
                      onClick={handleVerifyOtp}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded transition cursor-pointer"
                    >
                      Verify OTP
                    </button>
                    <button
                      onClick={handleResendOtp}
                      className="text-sm text-indigo-400 hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                    <button
                      onClick={() => setOtpMode(false)}
                      className="text-sm text-indigo-400 hover:underline cursor-pointer"
                    >
                      Back
                    </button>
                  </motion.div>
                )}
              </motion.div>

              {/* IMAGE RIGHT */}
              <motion.div
                key="image-signup"
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                className="relative w-1/2 bg-gray-700 flex flex-col items-center justify-center p-4"
              >
                <h2 className="text-white text-2xl font-bold mb-4 cursor-default">WinMe Debater</h2>
                <img src={winmeImage} alt="WinMe" className="max-h-[400px] object-contain mb-6" />
                <h2 className="text-white text-xl font-bold cursor-default">Hello New Challenger!</h2>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </>
  );
};

export default AuthPage;
