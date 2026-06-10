import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Lock, ArrowLeft, Key, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { API_BASE_URL } from "../config/api";

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [targetEmail, setTargetEmail] = useState(emailParam);
  const [verifyingToken, setVerifyingToken] = useState(!!token);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/verify-token?token=${token}`);
        const data = await response.json();
        if (response.ok && data.valid) {
          setTargetEmail(data.email);
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError(data.message || "This password reset link is invalid or has expired.");
        }
      } catch (err) {
        setTokenValid(false);
        setError("Unable to verify the password reset link with the server.");
      } finally {
        setVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const payload = token ? { token, newPassword: password } : { email: targetEmail, newPassword: password };
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full max-w-[460px] mx-auto text-center font-sans">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md py-12 px-10 shadow-2xl rounded-[32px] border border-white/20 flex flex-col items-center space-y-6"
          >
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-800">Verifying Link...</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Securing your session and checking link expiry status...
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (token && !tokenValid) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full max-w-[460px] mx-auto text-center font-sans">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md py-10 px-8 shadow-2xl rounded-[32px] border border-white/20 space-y-6"
          >
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Link Invalid or Expired</h2>
              <p className="text-slate-500 mt-2 text-xs leading-relaxed">
                {error || "The password reset token is invalid, has expired, or has already been used."}
              </p>
            </div>
            <Link 
              to="/forgot-password" 
              className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm cursor-pointer"
            >
              Request New Link
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>

        <div className="relative z-10 w-full max-w-[460px] mx-auto">
          {/* Logo and Brand Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShieldCheck className="text-white w-9 h-9" />
            </div>
            <h2 className="mt-4 text-center text-3xl font-display font-extrabold text-white drop-shadow-sm tracking-tight">
              InvestPro
            </h2>
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl shadow-slate-950/20 rounded-[32px] border border-white/20 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Password Reset!</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Your password has been successfully updated. Redirecting to login...
              </p>
            </div>
            <Link 
              to="/login" 
              className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg text-sm"
            >
              Login Now
            </Link>
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
            New Password
          </motion.h2>
          <p className="mt-2 text-center text-xs text-white/80 drop-shadow-sm px-6">
            Create a new strong password for your account.
          </p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.2 }} 
          className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl shadow-slate-950/20 rounded-[32px] border border-white/20 text-center"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 text-left">
                {error}
              </div>
            )}

            {targetEmail && (
              <div className="p-3.5 bg-blue-50/50 border border-blue-100/50 rounded-2xl text-left text-xs text-slate-600 flex items-center justify-between">
                <span>Account: <strong className="text-slate-900">{targetEmail}</strong></span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Verified</span>
              </div>
            )}
            
            <div className="text-left">
              <label className="block text-sm font-semibold text-slate-600 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="block w-full pl-12 pr-4 py-4 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900" 
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-sm font-semibold text-slate-600 mb-2">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  required
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="block w-full pl-12 pr-4 py-4 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900" 
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password</>}
              </button>
            </div>
            
            <div className="pt-2">
              <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
