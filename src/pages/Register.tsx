import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess, loginFailure, loginStart } from "../store/authSlice";
import { RootState } from "../store";
import { ShieldCheck, Mail, Lock, User, ArrowRight, CheckCircle, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { API_BASE_URL } from "../config/api";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Verification state machine
  const [step, setStep] = useState<"form" | "otp">("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredFirstName, setRegisteredFirstName] = useState("");
  const [registeredLastName, setRegisteredLastName] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sandboxOtp, setSandboxOtp] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    dispatch(loginStart());
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (response.ok) {
        setRegisteredEmail(data.email);
        setRegisteredFirstName(data.firstName);
        setRegisteredLastName(data.lastName);
        if (result.otp) {
          setSandboxOtp(String(result.otp));
        }
        setStep("otp");
        dispatch(loginFailure("")); // clear state errors
      } else {
        dispatch(loginFailure(result.message || "Registration failed"));
      }
    } catch (err) {
      dispatch(loginFailure("Network error occurred"));
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue || otpValue.trim().length < 6) {
      setVerificationError("Please enter a valid 6-digit OTP code.");
      return;
    }
    setVerificationError("");
    setVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, otp: otpValue.trim() }),
      });

      const result = await response.json();
      if (response.ok) {
        dispatch(loginSuccess(result));
        navigate("/dashboard");
      } else {
        setVerificationError(result.message || "Verification failed");
      }
    } catch (err) {
      setVerificationError("Network error occurred during verification");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setVerificationError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registeredEmail,
          firstName: registeredFirstName,
          lastName: registeredLastName
        }),
      });
      const result = await response.json();
      if (response.ok) {
        if (result.otp) {
          setSandboxOtp(String(result.otp));
        }
        setVerificationError("A new 6-digit verification code has been sent to your email!");
      } else {
        setVerificationError(result.message || "Failed to resend code");
      }
    } catch (err) {
      setVerificationError("Network error. Unable to resend OTP code.");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-[460px] mx-auto">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="w-16 h-16 bg-blue-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-blue-500/30"
          >
            <ShieldCheck className="text-white w-9 h-9" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-center text-3xl font-display font-extrabold text-white drop-shadow-sm tracking-tight"
          >
            {step === "form" ? "Create Account" : "Verify Email"}
          </motion.h2>
          <p className="mt-1 text-center text-slate-100 text-xs drop-shadow-sm font-medium">
            {step === "form" ? "InvestPro Wealth Management" : `Verification code sent to ${registeredEmail}`}
          </p>
        </div>

        {/* Card Form */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.2 }} 
          className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl shadow-slate-950/20 rounded-[32px] border border-white/20"
        >
          {step === "form" ? (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">First Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    {...register("firstName")}
                    type="text" 
                    className="block w-full pl-12 pr-4 py-3.5 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900" 
                    placeholder="John" 
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Last Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    {...register("lastName")}
                    type="text" 
                    className="block w-full pl-12 pr-4 py-3.5 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900" 
                    placeholder="Doe" 
                  />
                </div>
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    {...register("email")}
                    type="email" 
                    className="block w-full pl-12 pr-4 py-3.5 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900" 
                    placeholder="john@example.com" 
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>



              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create My Account <ArrowRight className="ml-2 w-5 h-5" /></>}
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-400 px-4 pt-1 leading-relaxed">
                By creating an account, you agree to our <span className="underline cursor-pointer hover:text-slate-500 transition-colors">Terms of Service</span> and <span className="underline cursor-pointer hover:text-slate-500 transition-colors">Privacy Policy</span>.
              </p>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              {sandboxOtp && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-left text-blue-800 flex flex-col gap-2 shadow-sm animate-pulse">
                  <div className="flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="font-extrabold text-blue-900 leading-tight">Sandbox Tester Mode</p>
                      <p className="text-xs text-blue-700 mt-0.5">We bypassed the Resend mailer bottleneck for sandbox testing. Your verification code is <strong className="font-mono text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded">{sandboxOtp}</strong>.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpValue(sandboxOtp)}
                    className="mt-1 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    ⚡ Auto-fill Code
                  </button>
                </div>
              )}

              {verificationError && (
                <div className={`p-4 rounded-2xl text-sm text-left ${verificationError.includes("sent") ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-600"}`}>
                  {verificationError}
                </div>
              )}

              <div className="text-left">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Enter Verification Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456" 
                    className="block w-full pl-12 pr-4 py-3.5 border-0 rounded-2xl bg-[#edf2fd]/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-center text-lg font-bold tracking-[8px]" 
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Please enter the 6-digit confirmation key dispatched to your inbox.
                </p>
              </div>

              <div className="pt-1 flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={verifying}
                  className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Complete Registration <ArrowRight className="ml-2 w-5 h-5" /></>}
                </button>

                <div className="flex items-center justify-between mt-2 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setOtpValue("");
                      setVerificationError("");
                    }}
                    className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Edit details
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-blue-600 hover:text-blue-700 transition-colors font-bold"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
