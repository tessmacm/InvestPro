import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Printer, Crown } from "lucide-react";
import { Document, Investor } from "../types";
import { AgreementDocument } from "./AgreementDocument";

interface AgreementViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  investorData?: Investor | null;
}

export const AgreementViewerModal: React.FC<AgreementViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  investorData,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !document) return null;

  const isSigned      = document.status === "Signed";
  const signatureData = (document as any).signature || investorData?.name;
  const investorName  = investorData?.name || (document as any)?.investor_name || "Investor";

  const handlePrintOrDownload = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Tessma Group Investment Agreement - ${investorName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body{font-family:'Inter',sans-serif;color:#0f172a;margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
        .page{width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box;position:relative;page-break-after:always;background:white;}
        .page:last-child{page-break-after:auto;}
        @page{size:A4;margin:0;}
        h1,h2,h3,h4{font-family:'Inter',sans-serif;margin:0;}
      </style>
      <script src="https://cdn.tailwindcss.com"></script>
    </head><body onload="window.print();">${content.innerHTML}</body></html>`);
    win.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col h-[94vh]"
        >
          {/* Toolbar */}
          <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-snug">{document.title}</h3>
                <span className="text-xs text-slate-400 font-medium">Tessma Group Official Legal Contract</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintOrDownload}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / Download PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Viewport – uses the single-source AgreementDocument */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100/80 custom-scrollbar flex justify-center">
            <div ref={printRef}>
              <AgreementDocument
                investorData={investorData ?? null}
                signatureData={signatureData}
                isSigned={isSigned}
                fullPageLayout={true}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
