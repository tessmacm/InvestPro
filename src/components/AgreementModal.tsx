import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ShieldCheck, PenTool, Lock, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { Investor } from "../types";
import { AgreementDocument } from "./AgreementDocument";

interface AgreementModalProps {
  isOpen: boolean;
  documentId: number;
  investorId?: number;
  investorName: string;
  investorEmail: string;
  amount?: number | string;
  projectName?: string;
  currentIndex?: number;
  totalCount?: number;
  onSignedSuccessfully: () => void;
  onSignLater?: () => void;
}

export const AgreementModal: React.FC<AgreementModalProps> = ({
  isOpen,
  documentId,
  investorId,
  investorName,
  investorEmail,
  amount = 10000,
  projectName = "Current Operations",
  currentIndex = 1,
  totalCount = 1,
  onSignedSuccessfully,
  onSignLater,
}) => {
  const [typedName, setTypedName]       = useState("");
  const [agreed, setAgreed]             = useState(false);
  const [isSigning, setIsSigning]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [investorData, setInvestorData] = useState<Investor | null>(null);

  // ── Fetch the real investor record from the API ─────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_BASE_URL}/api/admin/investors`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        const matched = data.find(i =>
          (investorId    && String(i.id) === String(investorId)) ||
          (investorEmail && i.email?.toLowerCase() === investorEmail.toLowerCase()) ||
          (investorName  && i.name?.toLowerCase()  === investorName.toLowerCase())
        );
        if (matched) {
          setInvestorData(matched);
        } else {
          // Fallback stub so the document renders with login-time info
          setInvestorData({ name: investorName, email: investorEmail, amount: Number(amount) } as Investor);
        }
      })
      .catch(() => {
        setInvestorData({ name: investorName, email: investorEmail, amount: Number(amount) } as Investor);
      });
  }, [isOpen, investorId, investorEmail, investorName, amount]);

  // ── Signature canvas ────────────────────────────────────────────────────────
  const canvasRef                   = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing]   = useState(false);
  const [hasDrawn, setHasDrawn]     = useState(false);

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect     = canvas.getBoundingClientRect();
    const clientX  = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY  = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth  = 2.5;
    ctx.lineCap    = "round";
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    draw(e);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // ── Submit digital signature ─────────────────────────────────────────────────
  const handleSignAgreement = async () => {
    if (!agreed) {
      setError("Please confirm your acknowledgment by checking the agreement box.");
      return;
    }
    if (!typedName.trim()) {
      setError("Please type your full legal name as digital signature confirmation.");
      return;
    }
    setIsSigning(true);
    setError(null);
    const canvasDataUrl = hasDrawn && canvasRef.current
      ? canvasRef.current.toDataURL("image/png")
      : "";
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/documents/${documentId}/sign`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          signatureName: typedName.trim(),
          signatureData: canvasDataUrl || typedName.trim(),
          signedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to record digital signature on server.");
      onSignedSuccessfully();
    } catch (err: any) {
      setError(err.message || "An error occurred while signing the agreement.");
    } finally {
      setIsSigning(false);
    }
  };

  // Reset signature inputs when documentId changes
  useEffect(() => {
    setTypedName("");
    setAgreed(false);
    setError(null);
    clearSignature();
  }, [documentId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 px-8 py-6 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                    Action Required
                  </span>
                  {totalCount > 1 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      Agreement {currentIndex} of {totalCount}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-display font-extrabold text-white mt-1">
                  Master Investment Agreement Digital Signature
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onSignLater && (
                <button
                  type="button"
                  onClick={onSignLater}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/20 active:scale-95"
                  title="Sign later and return to login page"
                >
                  <ArrowLeft className="w-4 h-4" /><span>Back to Login</span>
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /><span>256-Bit Encrypted Lock</span>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center gap-3 text-amber-900 text-xs font-semibold flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Feature access is restricted until you digitally review and sign your Investment Agreement below.</span>
          </div>

          {/* Scrollable body */}
          <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-slate-700 text-sm bg-slate-50/50">

            {/* ── Single-source agreement document ── */}
            <AgreementDocument
              investorData={investorData}
              isSigned={false}
              fullPageLayout={false}
            />

            {/* Error */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" /><span>{error}</span>
              </div>
            )}

            {/* Signature pad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-6 rounded-2xl border border-slate-200">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Type Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johnathan Doe"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-semibold text-sm"
                />
                <p className="text-[11px] text-slate-400 font-medium">Must match your account legal name.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-blue-600" /> Draw Digital Signature
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-[100px] cursor-crosshair touch-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Sign using mouse cursor or touch screen.</p>
              </div>
            </div>

            {/* Acknowledgment checkbox */}
            <label className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-xs text-slate-700 font-medium leading-relaxed">
                I hereby declare that I have read, understood, and accept all terms of this Master Investment Agreement. I confirm that my digital signature above is legally binding.
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="bg-slate-100 px-8 py-5 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Identity Verified &bull; IP &amp; Timestamp Logged</span>
            </div>
            <div className="flex items-center gap-3">
              {onSignLater && (
                <button
                  type="button"
                  onClick={onSignLater}
                  className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-200/60 text-slate-700 font-bold text-xs px-5 py-3 rounded-2xl cursor-pointer transition-all active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" /><span>Sign Later</span>
                </button>
              )}
              <button
                onClick={handleSignAgreement}
                disabled={isSigning || !agreed || !typedName.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm px-7 py-3 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {isSigning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Processing Signature...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" />Sign &amp; Accept Agreement</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
