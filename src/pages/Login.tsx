import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginStart, loginSuccess, loginFailure } from "../store/authSlice";
import { RootState } from "../store";
import { ShieldCheck, Mail, Loader2, ArrowRight, KeyRound, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { API_BASE_URL } from "../config/api";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [hasUsers, setHasUsers] = useState<boolean | null>(() => {
    const cached = sessionStorage.getItem("cached_has_users");
    return cached === "true" ? true : null;
  });
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [sandboxOtp, setSandboxOtp] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  // Check if DB is empty on load
  useEffect(() => {
    const checkUsersExist = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/check-users`);
        if (response.ok) {
          const data = await response.json();
          setHasUsers(data.hasUsers);
          if (data.hasUsers) {
            sessionStorage.setItem("cached_has_users", "true");
          } else {
            navigate("/register");
          }
        }
      } catch (err) {
        console.error("Failed to check users exist status:", err);
      }
    };
    checkUsersExist();
  }, [navigate]);

  const onSendOtp = async (data: EmailFormValues) => {
    dispatch(loginStart());
    setVerificationError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();
      if (response.ok) {
        setLoginEmail(data.email);
        const code = result.otp || result.debugOtp || result.DebugOtp;
        if (code) {
          setSandboxOtp(String(code));
        }
        setStep("otp");
        dispatch(loginFailure("")); // clear state errors
      } else {
        dispatch(loginFailure(result.message || "Failed to send verification code"));
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
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, otp: otpValue.trim() }),
      });

      const result = await response.json();
      if (response.ok) {
        dispatch(loginSuccess(result));
        navigate("/dashboard");
      } else {
        setVerificationError(result.message || "Invalid or expired OTP");
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
      const response = await fetch(`${API_BASE_URL}/api/auth/send-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      const result = await response.json();
      if (response.ok) {
        const code = result.otp || result.debugOtp || result.DebugOtp;
        if (code) {
          setSandboxOtp(String(code));
        }
        setVerificationError("A new 6-digit login code has been sent to your email!");
      } else {
        setVerificationError(result.message || "Failed to resend code");
      }
    } catch (err) {
      setVerificationError("Network error. Unable to resend OTP code.");
    }
  };

  if (hasUsers === null) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full max-w-[460px] mx-auto text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md py-12 px-10 shadow-2xl rounded-[32px] border border-white/20 flex flex-col items-center space-y-6"
          >
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-800">Getting things ready…</h2>
              <p className="text-sm text-slate-500 mt-1">Please wait while we set up your experience.</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-[460px] mx-auto">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8">
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
            InvestPro
          </motion.h2>
        </div>

        {/* Card Form */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl shadow-slate-950/20 rounded-[32px] border border-white/20"
        >
          {step === "email" ? (
            <form className="space-y-6" onSubmit={handleSubmit(onSendOtp)}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    {...register("email")}
                    type="email"
                    className="block w-full pl-12 pr-4 py-4 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900"
                    placeholder="name@investpro.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Login Code <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              {sandboxOtp && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-left text-blue-800 flex flex-col gap-2 shadow-sm animate-pulse">
                  <div className="flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="font-extrabold text-blue-900 leading-tight">Sandbox Tester Mode</p>
                      <p className="text-xs text-blue-700 mt-0.5">Verification code is <strong className="font-mono text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded">{sandboxOtp}</strong>.</p>
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
                  Please enter the 6-digit verification code sent to your email.
                </p>
              </div>

              <div className="pt-1 flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={verifying}
                  className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Login <ArrowRight className="ml-2 w-5 h-5" /></>}
                </button>

                <div className="flex items-center justify-between mt-2 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtpValue("");
                      setVerificationError("");
                    }}
                    className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
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

        </motion.div>
      </div>
    </div>
  );
};
