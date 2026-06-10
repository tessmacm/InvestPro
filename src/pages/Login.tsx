import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginStart, loginSuccess, loginFailure } from "../store/authSlice";
import { RootState } from "../store";
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { API_BASE_URL } from "../config/api";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const handleMagicLogin = async () => {
      const token = searchParams.get("token");
      if (!token) return;

      setMagicLoading(true);
      dispatch(loginStart());
      try {
        const response = await fetch(`${API_BASE_URL}/api/magic-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();
        if (response.ok) {
          dispatch(loginSuccess({ 
            user: result.user, 
            token: result.token, 
            rememberMe: true 
          }));
          navigate("/dashboard");
        } else {
          setMagicError(result.message || "Invalid or expired magic link");
          dispatch(loginFailure(result.message || "Magic login failed"));
        }
      } catch (err) {
        setMagicError("Network error occurred during magic login");
        dispatch(loginFailure("Network error occurred"));
      } finally {
        setMagicLoading(false);
      }
    };

    handleMagicLogin();
  }, [searchParams, navigate, dispatch]);

  const onSubmit = async (data: LoginFormValues) => {
    dispatch(loginStart());
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();
      if (response.ok) {
        dispatch(loginSuccess({ 
          user: result.user, 
          token: result.token, 
          rememberMe: !!data.rememberMe 
        }));
        navigate("/dashboard");
      } else {
        dispatch(loginFailure(result.message || "Login failed"));
      }
    } catch (err) {
      dispatch(loginFailure("Network error occurred"));
    }
  };

  if (magicLoading) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full max-w-[460px] mx-auto text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md py-12 px-10 shadow-2xl rounded-[32px] border border-white/20 flex flex-col items-center space-y-6"
          >
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-800">Verifying Magic Link...</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed font-sans">
                Please wait while we establish your secure passwordless session.
              </p>
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
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
                  placeholder="manager@investpro.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  {...register("password")}
                  type="password"
                  className="block w-full pl-12 pr-4 py-4 border-0 rounded-2xl bg-[#edf2fd]/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-slate-900"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  {...register("rememberMe")}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-semibold text-slate-500 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
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
                    Sign In <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <Link 
                to="/register" 
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Create a new account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
