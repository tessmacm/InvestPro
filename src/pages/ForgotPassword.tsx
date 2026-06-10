import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Mail, ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { API_BASE_URL } from "../config/api";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setMagicLink(data.magicLink || "");
        setResetLink(data.resetLink || "");
        setNewPassword(data.newPassword || "");
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

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
            className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl shadow-slate-950/20 rounded-[32px] border border-white/20 text-center space-y-6 animate-fade-in"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Password Dispatched!</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                A new temporary password was sent directly to <span className="font-bold text-slate-900">{email}</span>.
              </p>
            </div>

            {/* Sandbox Helper Password */}
            {newPassword && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">🔑 Temporary Password (Sandbox Mode)</span>
                <strong className="text-2xl text-slate-900 font-mono tracking-wider">{newPassword}</strong>
                <p className="text-[11px] text-slate-500">
                  Use this password to log in directly.
                </p>
              </div>
            )}

            {/* Sandbox Helper Links */}
            {magicLink && (
              <div className="bg-slate-100/80 border border-slate-200/50 p-4 rounded-2xl text-left space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">📬 Mock Email Inbox (Dev Mode)</p>
                <div className="flex flex-col gap-2 pt-1">
                  <a 
                    href={magicLink}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    ⚡ Passwordless Magic Login Link
                  </a>
                </div>
              </div>
            )}

            <Link 
              to="/login" 
              className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg text-sm"
            >
              Return to Login
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
            Reset Password
          </motion.h2>
          <p className="mt-2 text-center text-xs text-white/80 drop-shadow-sm px-6">
            Enter your email address and we'll send you a link to reset your password.
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
            <div className="text-left">
              <label className="block text-sm font-semibold text-slate-600 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com" 
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Link <Send className="ml-2 w-4 h-4" /></>}
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
