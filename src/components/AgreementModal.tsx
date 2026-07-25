import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, CheckCircle2, ShieldCheck, PenTool, Lock, AlertCircle, RefreshCw } from "lucide-react";
import { API_BASE_URL, authHeaders } from "../config/api";

interface AgreementModalProps {
  isOpen: boolean;
  documentId: number;
  investorName: string;
  investorEmail: string;
  amount?: number | string;
  projectName?: string;
  onSignedSuccessfully: () => void;
}

export const AgreementModal: React.FC<AgreementModalProps> = ({
  isOpen,
  documentId,
  investorName,
  investorEmail,
  amount = 500000,
  projectName = "Current Operations",
  onSignedSuccessfully,
}) => {
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a8a";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

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

    let canvasDataUrl = "";
    if (hasDrawn && canvasRef.current) {
      canvasDataUrl = canvasRef.current.toDataURL("image/png");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/documents/${documentId}/sign`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          signatureName: typedName.trim(),
          signatureData: canvasDataUrl || typedName.trim(),
          signedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to record digital signature on server.");
      }

      onSignedSuccessfully();
    } catch (err: any) {
      setError(err.message || "An error occurred while signing the agreement.");
    } finally {
      setIsSigning(false);
    }
  };

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
          {/* Top Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 px-8 py-6 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                  Action Required
                </span>
                <h2 className="text-xl font-display font-extrabold text-white mt-1">
                  Master Investment Agreement Digital Signature
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit Encrypted Lock</span>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center gap-3 text-amber-900 text-xs font-semibold flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Feature access is restricted until you digitally review and sign your Investment Agreement below.
            </span>
          </div>

          {/* Contract Content Viewport */}
          <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-slate-700 text-sm">
            {/* Document Header */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">INVESTPRO PORTFOLIO INVESTMENT AGREEMENT</h3>
                  <p className="text-xs text-slate-500">Reference: INVESTPRO-AGR-{documentId || "2026"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">Date of Agreement</p>
                  <p className="text-sm font-extrabold text-slate-900">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase">Investor / Principal</span>
                  <span className="font-extrabold text-slate-900 text-sm">{investorName}</span>
                  <span className="block text-slate-500">{investorEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase">Target Project</span>
                  <span className="font-extrabold text-slate-900 text-sm">{projectName}</span>
                  <span className="block text-slate-500">Managed Asset Fund</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase">Committed Capital</span>
                  <span className="font-extrabold text-emerald-600 text-base">£{Number(amount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Terms Articles */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-600 bg-white border border-slate-200 rounded-2xl p-6 shadow-inner max-h-60 overflow-y-auto custom-scrollbar">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">1. General Engagement & Capital Commitment</h4>
              <p>
                This Investment Agreement ("Agreement") is executed between InvestPro Platform Management ("Manager") and {investorName} ("Investor"). The Investor hereby commits the agreed capital amount of £{Number(amount).toLocaleString()} into the designated portfolio operations project ({projectName}).
              </p>

              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">2. Return on Investment & Disbursements</h4>
              <p>
                The Manager agrees to disburse ROI earnings in accordance with the selected distribution frequency (Monthly/Quarterly). All payout calculations shall adhere to established portfolio performance metrics and undergo verified audit checks prior to account transfer.
              </p>

              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">3. Representation & Governing Law</h4>
              <p>
                The Investor confirms that all provided registration information, tax identification, and banking details are true and accurate. This Agreement shall be governed by and construed in accordance with the applicable commercial laws.
              </p>

              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">4. Digital Signature & Legal Validity</h4>
              <p>
                By affixing a digital signature below, the Investor agrees to be bound by all terms, conditions, and covenant obligations specified herein. Electronic signatures executed on this platform carry the full legal equivalent of handwritten signatures.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Signature Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-6 rounded-2xl border border-slate-200">
              {/* Type Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Type Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johnathan Doe"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-semibold text-sm"
                />
                <p className="text-[11px] text-slate-400 font-medium">Must match your account legal name.</p>
              </div>

              {/* Draw Signature Pad */}
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

            {/* Checkbox Acknowledgment */}
            <label className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl cursor-pointer hover:bg-blue-50 transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-xs text-slate-700 font-medium leading-relaxed">
                I hereby declare that I have read, understood, and accept all terms of this Master Investment Agreement. I confirm that my digital signature above is legally binding.
              </span>
            </label>
          </div>

          {/* Action Footer */}
          <div className="bg-slate-100 px-8 py-5 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Identity Verified • IP & Timestamp Logged</span>
            </div>

            <button
              onClick={handleSignAgreement}
              disabled={isSigning || !agreed || !typedName.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm px-7 py-3 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSigning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Signature...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Sign & Accept Agreement
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
