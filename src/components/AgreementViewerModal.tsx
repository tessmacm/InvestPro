import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Printer, ShieldCheck, CheckCircle2, Crown, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Document, Investor } from "../types";

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

  // Helper to strip sentinel placeholder values
  const isRealValue = (v?: string | null) =>
    !!v && v.trim() !== "" && v !== "—" && v !== "Accredited" && v !== "Accredited Witness";

  const investorName = investorData?.name || (document as any)?.investor_name || "Investor";
  const investorAddress = isRealValue(investorData?.address)
    ? investorData!.address!
    : "71B Ayres Road, Old Trafford, Manchester – M16 7GS";
  const amountNumber = Number(investorData?.amount) || 10000;
  const amountFormatted = amountNumber.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return "30th of December 2025";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${day}th of ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const computeReturnPeriod = (dateStr?: string) => {
    let invDate = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) invDate = parsed;
    }

    // First payment – [Investment date + 30 days + 15 days = 45 days] to [Investment date + 30 days + 15 days + 7 days = 52 days]
    const startDate = new Date(invDate.getTime() + 45 * 24 * 60 * 60 * 1000);
    const endDate = new Date(invDate.getTime() + 52 * 24 * 60 * 60 * 1000);

    const getDaySuffix = (d: number) => {
      if (d > 3 && d < 21) return `${d}th`;
      switch (d % 10) {
        case 1:  return `${d}st`;
        case 2:  return `${d}nd`;
        case 3:  return `${d}rd`;
        default: return `${d}th`;
      }
    };

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const startMonth = months[startDate.getMonth()];
    const startDayStr = getDaySuffix(startDate.getDate());
    
    const endMonth = months[endDate.getMonth()];
    const endDayStr = getDaySuffix(endDate.getDate());
    const yearStr = endDate.getFullYear();

    return `First payment – ${startMonth} ${startDayStr} to ${endDayStr} of ${endMonth} ${yearStr} then after recurring payments will follow.`;
  };

  const agreementDate = formatDateStr(investorData?.date_of_onboarding);
  const investmentDate = formatDateStr(investorData?.date_of_onboarding);
  const witnessName = isRealValue(investorData?.witness) ? investorData!.witness! : "Accredited Witness";
  const firstPaymentPeriodText = computeReturnPeriod(investorData?.date_of_onboarding);

  const minRoiVal = Number(investorData?.min_roi_id || investorData?.min_RoiRangeId || 1);
  const maxRoiVal = Number(investorData?.max_roi_id || investorData?.max_RoiRangeId || 5);

  const minRoiPct = (minRoiVal > 0 && minRoiVal <= 20 ? minRoiVal : 1) / 100;
  const maxRoiPct = (maxRoiVal > 0 && maxRoiVal <= 20 ? maxRoiVal : 5) / 100;

  const minRoi = Math.round(amountNumber * minRoiPct);
  const maxRoi = Math.round(amountNumber * maxRoiPct);

  const isSigned = document.status === "Signed";
  const signatureData = (document as any).signature || investorData?.name;

  const handlePrintOrDownload = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tessma Group Investment Agreement - ${investorName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;600;700;800&family=Great+Vibes&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page {
              width: 210mm;
              min-h: 297mm;
              padding: 20mm 20mm 25mm 20mm;
              box-sizing: border-box;
              position: relative;
              page-break-after: always;
              background: white;
            }
            .page:last-child {
              page-break-after: auto;
            }
            @page {
              size: A4;
              margin: 0;
            }
            h1, h2, h3, h4 { font-family: 'Inter', sans-serif; margin: 0; }
            .gold-accent { color: #d97706; }
            .signature-font { font-family: 'Great Vibes', cursive; font-size: 28px; color: #1e3a8a; }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body onload="window.print();">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
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
          {/* Action Toolbar Header */}
          <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
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

          {/* Document Scroll Viewport */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100/80 custom-scrollbar flex justify-center">
            <div ref={printRef} className="space-y-8 w-full max-w-[210mm]">
              
              {/* ================= PAGE 1 ================= */}
              <div className="page bg-white shadow-xl rounded-2xl border border-slate-200 p-10 relative flex flex-col justify-between min-h-[1050px]">
                <div>
                  {/* Top Logo Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">TESSMA GROUP</span>
                    </div>
                    {/* Official Tessma Group Logo */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[#c49a45] font-extrabold text-2xl tracking-tight font-serif">
                        <Crown className="w-6 h-6 text-[#c49a45] fill-[#c49a45]" />
                        <span>tessm<span className="text-slate-900 font-sans font-bold">A</span></span>
                      </div>
                      <p className="text-[8px] tracking-[0.25em] text-slate-500 font-bold uppercase mt-0.5">
                        PRECISION | PASSION | PERFORMANCE
                      </p>
                    </div>
                  </div>

                  {/* Section 1 */}
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">1. INVESTMENT AGREEMENT</h3>
                    <p>
                      This Investment Agreement ("Agreement") is made and entered into on the <strong>{agreementDate}</strong>, by and between:
                    </p>
                    <p className="pl-4 border-l-2 border-amber-500/80">
                      <strong>Tessma Group</strong>, represented by <strong>Mushtaq A Mohammed</strong>, with its office address at <strong>701 Chester Road, M32 0RW</strong>, hereinafter referred to as the "Investee"; and
                    </p>
                    <p className="pl-4 border-l-2 border-blue-500/80">
                      <strong>{investorName}</strong>, residing at <strong>{investorAddress}</strong>, hereinafter referred to as the "Investor".
                    </p>
                    <p>
                      The Investee and the Investor are collectively referred to as the "Parties" and individually as a "Party".
                    </p>
                  </div>

                  <hr className="my-6 border-slate-200" />

                  {/* Section 2 */}
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">2. BUSINESS OF THE GROUP’S</h3>
                    <p>
                      The Investee shall utilize the investment amount for the growth and expansion of its operations in the following industries:
                    </p>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-bold text-slate-800 text-[11px] text-center">
                      Information Technology (IT), Hospitality, Facilities Management, Retail, Health Services, Training and Development, Properties, Professional Services
                    </div>
                    <p>
                      The Investee shall ensure that the funds are used in a manner that maximizes returns for the Investor.
                    </p>
                    <p>
                      The purpose of this Agreement is to outline the terms and conditions under which the Investor has invested a sum of <strong>£{amountFormatted} GBP</strong> into the Investee's business operations.
                    </p>
                  </div>

                  <hr className="my-6 border-slate-200" />

                  {/* Section 3 */}
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">3. INVESTMENT DETAILS</h3>
                    <p>
                      <strong>Investment Amount:</strong> The Investor invested a total sum of <strong>£{amountFormatted} GBP</strong> (Pounds Sterling).
                    </p>
                    <p>
                      <strong>Date of Investment:</strong> <strong>{investmentDate}</strong>
                    </p>
                    <p>
                      <strong>Duration of Investment:</strong> The investment shall remain active for the period of minimum 6 months, unless otherwise terminated or extended by mutual agreement in writing.
                    </p>
                  </div>
                </div>

                {/* Footer Page 1 - Fixed at Bottom */}
                <div className="pt-4 mt-auto">
                  <div className="bg-[#0b1120] text-slate-300 rounded-xl p-3.5 text-[9px] flex flex-col md:flex-row items-center justify-between gap-2.5 border-t-2 border-[#c49a45] shadow-md">
                    <span className="font-semibold text-slate-300">
                      Company Registered in England & Wales as Tessma Group Limited - 15718058
                    </span>
                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#c49a45]" /> +44 0161 883 7191</span>
                      <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-[#c49a45]" /> www.tessma.co.uk</span>
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#c49a45]" /> info@tessma.co.uk</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#c49a45]" /> 82 James Carter Road, England, IP28 7DE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= PAGE 2 ================= */}
              <div className="page bg-white shadow-xl rounded-2xl border border-slate-200 p-10 relative flex flex-col justify-between min-h-[1050px]">
                <div>
                  {/* Top Logo Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">TESSMA GROUP</span>
                    </div>
                    {/* Official Tessma Group Logo */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[#c49a45] font-extrabold text-2xl tracking-tight font-serif">
                        <Crown className="w-6 h-6 text-[#c49a45] fill-[#c49a45]" />
                        <span>tessm<span className="text-slate-900 font-sans font-bold">A</span></span>
                      </div>
                      <p className="text-[8px] tracking-[0.25em] text-slate-500 font-bold uppercase mt-0.5">
                        PRECISION | PASSION | PERFORMANCE
                      </p>
                    </div>
                  </div>

                  {/* Section 4 */}
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">4. RETURN ON INVESTMENT</h3>
                    <p>
                      <strong>Monthly Return:</strong> The Investee agrees to provide the Investor with a monthly return ranging between <strong>£{minRoi.toLocaleString()} GBP</strong> and <strong>£{maxRoi.toLocaleString()} GBP</strong>.
                    </p>
                    <p>
                      <strong>Date of Profit Payment:</strong> The monthly profit shall be paid to the Investor with-in 30 days of completion of the previous investment month. Any Delays will be notified in advance.
                    </p>
                    <p className="italic text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      {firstPaymentPeriodText}
                    </p>
                  </div>

                  <hr className="my-6 border-slate-200" />

                  {/* Section 5 */}
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">5. TERMINATION OF AGREEMENT</h3>
                    <p>
                      The Agreement may be terminated by either Party upon providing <strong>60 (sixty) days' written notice</strong> to the other Party. In the event of termination, the Investee shall return the remaining principal amount (if any) to the Investor within <strong>14 (fourteen) days of completion of Notice period</strong>.
                    </p>
                  </div>

                  <hr className="my-6 border-slate-200" />

                  {/* Section 6 & 7 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-800 leading-relaxed">
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">6. ENTIRE AGREEMENT</h3>
                      <p>
                        This Agreement constitutes the entire understanding between the Parties and supersedes all prior agreements, representations, or understandings, whether written or oral, relating to the subject matter herein.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">7. AMENDMENTS</h3>
                      <p>
                        Any amendments or modifications to this Agreement shall be made in writing and signed by both Parties.
                      </p>
                    </div>
                  </div>

                  <hr className="my-6 border-slate-200" />

                  {/* Section 8: Signatures */}
                  <div className="space-y-6 text-xs text-slate-800">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">8. SIGNATURES</h3>
                    <p className="italic text-slate-600">
                      IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* Investee Signature */}
                      <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                        <p className="font-extrabold text-slate-900 text-sm">For Tessma Group (Investee):</p>
                        <p className="text-slate-700 font-semibold">Name: Mushtaq A Mohammed</p>
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Signature:</span>
                          <span className="font-serif italic font-bold text-lg text-blue-950 block mt-1 underline decoration-amber-500">
                            Mushtaq A. Mohammed
                          </span>
                        </div>
                      </div>

                      {/* Investor Signature */}
                      <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-slate-900 text-sm">For Investor:</p>
                          {isSigned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Digitally Signed
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 font-semibold">Name: Mr. {investorName}</p>
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Signature:</span>
                          {signatureData && signatureData.startsWith("data:image") ? (
                            <img src={signatureData} alt="Investor Digital Signature" className="h-12 object-contain mt-1" />
                          ) : isSigned ? (
                            <span className="font-serif italic font-bold text-lg text-blue-900 block mt-1 underline decoration-emerald-500">
                              {signatureData || investorName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic block mt-1">Pending Digital Signature</span>
                          )}
                        </div>
                      </div>

                      {/* Witness Details (Name only) */}
                      <div className="space-y-1 border border-slate-200 p-4 rounded-xl bg-slate-50/50 md:col-span-2">
                        <p className="font-extrabold text-slate-900 text-sm">For Witness:</p>
                        <p className="text-slate-700 font-semibold">Name: {witnessName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Page 2 - Fixed at Bottom */}
                <div className="pt-4 mt-auto">
                  <div className="bg-[#0b1120] text-slate-300 rounded-xl p-3.5 text-[9px] flex flex-col md:flex-row items-center justify-between gap-2.5 border-t-2 border-[#c49a45] shadow-md">
                    <span className="font-semibold text-slate-300">
                      Company Registered in England & Wales as Tessma Group Limited - 15718058
                    </span>
                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#c49a45]" /> +44 0161 883 7191</span>
                      <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-[#c49a45]" /> www.tessma.co.uk</span>
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#c49a45]" /> info@tessma.co.uk</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#c49a45]" /> 82 James Carter Road, England, IP28 7DE</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
