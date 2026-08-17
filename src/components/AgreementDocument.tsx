/**
 * AgreementDocument.tsx
 * ─────────────────────
 * Single-source-of-truth for the Tessma Group Master Investment Agreement.
 *
 * Embedded by:
 *   • AgreementViewerModal  – admin / investor Documents page (full 2-page layout)
 *   • AgreementModal        – investor first-login digital signature (compact layout)
 *
 * Do NOT duplicate agreement HTML in any other file.
 */

import React from "react";
import { Crown, Phone, Globe, Mail, MapPin, CheckCircle2 } from "lucide-react";
import { Investor } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reject backend sentinel placeholder strings that should be treated as absent. */
export const isRealValue = (v?: string | null): boolean =>
  !!v && v.trim() !== "" && v !== "—" && v !== "Accredited" && v !== "Accredited Witness";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daySuffix(d: number): string {
  if (d > 3 && d < 21) return `${d}th`;
  switch (d % 10) {
    case 1: return `${d}st`;
    case 2: return `${d}nd`;
    case 3: return `${d}rd`;
    default: return `${d}th`;
  }
}

export function formatDateStr(dateStr?: string): string {
  if (!dateStr) return "30th of December 2025";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${daySuffix(d.getDate())} of ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function computeReturnPeriod(dateStr?: string): string {
  let base = new Date();
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) base = parsed;
  }
  const start = new Date(base.getTime() + 45 * 86400000);
  const end   = new Date(base.getTime() + 52 * 86400000);
  return (
    `First payment \u2013 ${MONTHS[start.getMonth()]} ${daySuffix(start.getDate())} ` +
    `to ${daySuffix(end.getDate())} of ${MONTHS[end.getMonth()]} ${end.getFullYear()} ` +
    `then after recurring payments will follow.`
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AgreementDocumentProps {
  /** Resolved investor record from the API. */
  investorData: Investor | null;
  /** Base64 PNG or typed-name string for the investor's digital signature. */
  signatureData?: string | null;
  /** Shows the "Digitally Signed" badge and renders the signature. */
  isSigned?: boolean;
  /**
   * true  → 2-page A4 layout used by AgreementViewerModal (print/download)
   * false → compact single-page used by AgreementModal (sign-now view)
   */
  fullPageLayout?: boolean;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

const DocHeader: React.FC = () => (
  <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-8">
    <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">TESSMA GROUP</span>
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
);

const DocFooter: React.FC = () => (
  <div className="pt-4 mt-auto">
    <div className="bg-[#0b1120] text-slate-300 rounded-xl p-3.5 text-[9px] flex flex-col md:flex-row items-center justify-between gap-2.5 border-t-2 border-[#c49a45] shadow-md">
      <span className="font-semibold text-slate-300">
        Company Registered in England &amp; Wales as Tessma Group Limited - 15718058
      </span>
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-slate-300 font-medium">
        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#c49a45]" /> +44 0161 883 7191</span>
        <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-[#c49a45]" /> www.tessma.co.uk</span>
        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#c49a45]" /> info@tessma.co.uk</span>
        <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-[#c49a45]" /> 82 James Carter Road, England, IP28 7DE</span>
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const AgreementDocument: React.FC<AgreementDocumentProps> = ({
  investorData,
  signatureData,
  isSigned = false,
  fullPageLayout = false,
}) => {
  const investorName    = investorData?.name || "Investor";
  const investorAddress = isRealValue(investorData?.address)
    ? investorData!.address!
    : (isRealValue((investorData as any)?.Address) ? (investorData as any).Address : "Registered Address on File");
  const amountNumber    = Number(investorData?.amount ?? (investorData as any)?.CapitalAmount ?? 10000);
  const amountFormatted = amountNumber.toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const dateVal        = investorData?.date_of_onboarding || (investorData as any)?.DateOfBoarding || (investorData as any)?.CreatedAt;
  const agreementDate  = formatDateStr(dateVal);
  const investmentDate = formatDateStr(dateVal);
  const firstPayment   = computeReturnPeriod(dateVal);
  const witnessName    = isRealValue(investorData?.witness) ? investorData!.witness! : (isRealValue((investorData as any)?.Witness) ? (investorData as any).Witness : "Accredited Witness");

  const minRoiVal = Number(investorData?.min_roi_id || investorData?.min_RoiRangeId || 1);
  const maxRoiVal = Number(investorData?.max_roi_id || investorData?.max_RoiRangeId || 5);
  const minRoi    = Math.round(amountNumber * ((minRoiVal > 0 && minRoiVal <= 20 ? minRoiVal : 1) / 100));
  const maxRoi    = Math.round(amountNumber * ((maxRoiVal > 0 && maxRoiVal <= 20 ? maxRoiVal : 5) / 100));

  // ── Section blocks ────────────────────────────────────────────────────────

  const S1 = (
    <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">1. INVESTMENT AGREEMENT</h3>
      <p>This Investment Agreement (&quot;Agreement&quot;) is made and entered into on the <strong>{agreementDate}</strong>, by and between:</p>
      <p className="pl-4 border-l-2 border-amber-500/80">
        <strong>Tessma Group</strong>, represented by <strong>Mushtaq A Mohammed</strong>, with its office address at <strong>701 Chester Road, M32 0RW</strong>, hereinafter referred to as the &quot;Investee&quot;; and
      </p>
      <p className="pl-4 border-l-2 border-blue-500/80">
        <strong>{investorName}</strong>, residing at <strong>{investorAddress}</strong>, hereinafter referred to as the &quot;Investor&quot;.
      </p>
      <p>The Investee and the Investor are collectively referred to as the &quot;Parties&quot; and individually as a &quot;Party&quot;.</p>
    </div>
  );

  const S2 = (
    <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">2. BUSINESS OF THE GROUP&apos;S</h3>
      <p>The Investee shall utilize the investment amount for the growth and expansion of its operations in the following industries:</p>
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-bold text-slate-800 text-[11px] text-center">
        Information Technology (IT), Hospitality, Facilities Management, Retail, Health Services, Training and Development, Properties, Professional Services
      </div>
      <p>The Investee shall ensure that the funds are used in a manner that maximizes returns for the Investor.</p>
      <p>The purpose of this Agreement is to outline the terms and conditions under which the Investor has invested a sum of <strong>&pound;{amountFormatted} GBP</strong> into the Investee&apos;s business operations.</p>
    </div>
  );

  const S3 = (
    <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">3. INVESTMENT DETAILS</h3>
      <p><strong>Investment Amount:</strong> The Investor invested a total sum of <strong>&pound;{amountFormatted} GBP</strong> (Pounds Sterling).</p>
      <p><strong>Date of Investment:</strong> <strong>{investmentDate}</strong></p>
      <p><strong>Duration of Investment:</strong> The investment shall remain active for the period of minimum 6 months, unless otherwise terminated or extended by mutual agreement in writing.</p>
    </div>
  );

  const S4 = (
    <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">4. RETURN ON INVESTMENT</h3>
      <p><strong>Monthly Return:</strong> The Investee agrees to provide the Investor with a monthly return ranging between <strong>&pound;{minRoi.toLocaleString()} GBP</strong> and <strong>&pound;{maxRoi.toLocaleString()} GBP</strong>.</p>
      <p><strong>Date of Profit Payment:</strong> The monthly profit shall be paid to the Investor with-in 30 days of completion of the previous investment month. Any Delays will be notified in advance.</p>
      <p className="italic text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">{firstPayment}</p>
    </div>
  );

  const S5 = (
    <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">5. TERMINATION OF AGREEMENT</h3>
      <p>The Agreement may be terminated by either Party upon providing <strong>60 (sixty) days&apos; written notice</strong> to the other Party. In the event of termination, the Investee shall return the remaining principal amount (if any) to the Investor within <strong>14 (fourteen) days of completion of Notice period</strong>.</p>
    </div>
  );

  const S67 = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-800 leading-relaxed">
      <div className="space-y-2">
        <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">6. ENTIRE AGREEMENT</h3>
        <p>This Agreement constitutes the entire understanding between the Parties and supersedes all prior agreements, representations, or understandings, whether written or oral, relating to the subject matter herein.</p>
      </div>
      <div className="space-y-2">
        <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">7. AMENDMENTS</h3>
        <p>Any amendments or modifications to this Agreement shall be made in writing and signed by both Parties.</p>
      </div>
    </div>
  );

  const S8 = (
    <div className="space-y-6 text-xs text-slate-800">
      <h3 className="font-extrabold text-slate-900 text-sm tracking-wide">8. SIGNATURES</h3>
      <p className="italic text-slate-600">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Investee */}
        <div className="space-y-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
          <p className="font-extrabold text-slate-900 text-sm">For Tessma Group (Investee):</p>
          <p className="text-slate-700 font-semibold">Name: Mushtaq A Mohammed</p>
          <div className="pt-2">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Signature:</span>
            <span className="font-serif italic font-bold text-lg text-blue-950 block mt-1 underline decoration-amber-500">Mushtaq A. Mohammed</span>
          </div>
        </div>
        {/* Investor */}
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
              <span className="font-serif italic font-bold text-lg text-blue-900 block mt-1 underline decoration-emerald-500">{signatureData || investorName}</span>
            ) : (
              <span className="text-slate-400 italic block mt-1">Pending Digital Signature</span>
            )}
          </div>
        </div>
        {/* Witness */}
        <div className="space-y-1 border border-slate-200 p-4 rounded-xl bg-slate-50/50 md:col-span-2">
          <p className="font-extrabold text-slate-900 text-sm">For Witness:</p>
          <p className="text-slate-700 font-semibold">Name: {witnessName}</p>
        </div>
      </div>
    </div>
  );

  // ── Full 2-page layout (AgreementViewerModal) ─────────────────────────────

  if (fullPageLayout) {
    return (
      <div className="space-y-8 w-full max-w-[210mm]">
        {/* Page 1 */}
        <div className="page bg-white shadow-xl rounded-2xl border border-slate-200 p-10 relative flex flex-col justify-between min-h-[1050px]">
          <div>
            <DocHeader />
            {S1}
            <hr className="my-6 border-slate-200" />
            {S2}
            <hr className="my-6 border-slate-200" />
            {S3}
          </div>
          <DocFooter />
        </div>
        {/* Page 2 */}
        <div className="page bg-white shadow-xl rounded-2xl border border-slate-200 p-10 relative flex flex-col justify-between min-h-[1050px]">
          <div>
            <DocHeader />
            {S4}
            <hr className="my-6 border-slate-200" />
            {S5}
            <hr className="my-6 border-slate-200" />
            {S67}
            <hr className="my-6 border-slate-200" />
            {S8}
          </div>
          <DocFooter />
        </div>
      </div>
    );
  }

  // ── Compact layout (AgreementModal sign-now view) ─────────────────────────

  return (
    <div className="bg-white shadow-md rounded-2xl border border-slate-200 p-8 space-y-6 text-xs text-slate-800 leading-relaxed">
      <DocHeader />
      {S1}
      <hr className="border-slate-200" />
      {S2}
      <hr className="border-slate-200" />
      {S3}
      <hr className="border-slate-200" />
      {S4}
      <hr className="border-slate-200" />
      {S5}
      <hr className="border-slate-200" />
      {S67}
      <hr className="border-slate-200" />
      {S8}
    </div>
  );
};
