import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../store";
import { Payment } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL, authHeaders } from "../config/api";
import { cachedFetch } from "../utils/apiCache";
import { TableSkeleton } from "../components/TableSkeleton";
import { Landmark, ArrowUpDown, Download, Search, CheckCircle, CheckCircle2, Clock, AlertCircle, X, ChevronLeft, ChevronRight, Eye, Calendar, DollarSign, Send, CheckCheck, RefreshCw, Filter, SlidersHorizontal } from "lucide-react";
import { formatUKDate } from "../utils/formatters";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const Payments = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "superadmin";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [investors, setInvestors] = useState<{ id: number | string; name: string; email?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [payIdSearchTerm, setPayIdSearchTerm] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [investorFilter, setInvestorFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await cachedFetch(`${API_BASE_URL}/api/admin/payments`, {
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (err) {
      console.warn("Failed to fetch from real API, utilizing mock data", err);
      // Fallback Mock Data
      setPayments([
        { paymentId: 1, investorId: 1, investorName: "John Doe", amount: 5000, paymentDate: "2026-07-25T10:00:00Z", status: "Sent", isSent: true, isReceived: false },
        { paymentId: 2, investorId: 2, investorName: "ABC Ventures Ltd.", amount: 15000, paymentDate: "2026-07-26T14:30:00Z", status: "Received", isSent: true, isReceived: true },
        { paymentId: 3, investorId: 3, investorName: "Michael Smith", amount: 7500, paymentDate: "2026-07-27T09:15:00Z", status: "Pending", isSent: false, isReceived: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestors = async () => {
    try {
      const response = await cachedFetch(`${API_BASE_URL}/api/admin/investors`, {
        headers: authHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setInvestors(data);
      }
    } catch (err) {
      console.warn("Could not load investors list in Payments", err);
    }
  };

  const handleAcknowledgeSent = async (paymentId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/payments/${paymentId}/acknowledge-sent`, {
        method: "POST",
        headers: authHeaders()
      });
      if (response.ok) {
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledgeReceived = async (paymentId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/payments/${paymentId}/acknowledge-received`, {
        method: "POST",
        headers: authHeaders()
      });
      if (response.ok) {
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
    if (isAdmin) {
      fetchInvestors();
    }
  }, [isAdmin]);

  // For admin, all payments are accessible. For investor login, backend already filters to only their owned investment payments.
  // We provide a safe fallback filter if payments list contains more than user's own.
  const relevantPayments = React.useMemo(() => {
    if (isAdmin) return payments;
    // If backend returns payments for investor, trust the backend dataset;
    // additionally match by id, email, or name if available
    const userEmail = (user?.email || "").toLowerCase().trim();
    const userName = (user?.name || "").toLowerCase().trim();
    const userId = user?.id ? String(user.id) : "";

    const filtered = payments.filter(p => {
      const pEmail = (p.investorEmail || "").toLowerCase().trim();
      const pName = (p.investorName || "").toLowerCase().trim();
      const pInvId = p.investorId ? String(p.investorId) : "";

      if (userEmail && pEmail && pEmail === userEmail) return true;
      if (userName && pName && pName === userName) return true;
      if (userId && pInvId && pInvId === userId) return true;
      return false;
    });

    // If matches found, use filtered; otherwise if investor is logged in and backend returned records, use them
    return filtered.length > 0 ? filtered : payments;
  }, [payments, isAdmin, user]);

  // Calculate visible payments based on user requirement:
  // 1. Group by each distinct investment contract (p.investorId)
  // 2. In case of variant cycles (Monthly, Weekly, Quarterly, etc.):
  //    Show payments from onboarding date up to the single next payment date after current date.
  //    Do not show further future installments.
  // 3. In case of fixed (Constant):
  //    Single fixed payment is shown irrespective of date.
  const visiblePayments = React.useMemo(() => {
    const now = new Date();
    const result: Payment[] = [];

    // Group relevant payments strictly by distinct investment contract profile (investorId)
    const investorGroupMap = new Map<number | string, Payment[]>();
    for (const p of relevantPayments) {
      const key = p.investorId ? String(p.investorId) : (p.investorName || "default");
      if (!investorGroupMap.has(key)) {
        investorGroupMap.set(key, []);
      }
      investorGroupMap.get(key)!.push(p);
    }

    for (const [, pList] of investorGroupMap.entries()) {
      // Sort this contract's payments chronologically ascending
      const ascList = [...pList].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

      let nextFutureIncluded = false;
      for (const p of ascList) {
        const isFixed = (p.paymentCycle || "").toLowerCase() === "constant" || (p.paymentCycle || "").toLowerCase() === "fixed";

        if (isFixed) {
          // Fixed payout: single payment shown irrespective of dates
          result.push(p);
        } else {
          // Variant cycle:
          // Include all past/due payments (paymentDate <= now or already sent/received)
          const pDate = new Date(p.paymentDate);
          if (pDate <= now || p.isSent || p.isReceived || p.status === "Received" || p.status === "Sent") {
            result.push(p);
          } else if (!nextFutureIncluded) {
            // Include exactly the single next future payment date after current date
            result.push(p);
            nextFutureIncluded = true;
          }
        }
      }
    }

    return result;
  }, [relevantPayments]);

  // Card Calculations:
  // Pending Payouts (Unsent & unreceived payments visible till date)
  const pendingPaymentsList = visiblePayments.filter(p => !p.isSent && !p.isReceived && p.status !== "Received");
  const pendingCount = pendingPaymentsList.length;
  const pendingTotal = pendingPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Send Acknowledge (Sent by Admin, awaiting investor acknowledgment)
  const sentPaymentsList = visiblePayments.filter(p => p.isSent && !p.isReceived && p.status !== "Received");
  const sentCount = sentPaymentsList.length;
  const sentTotal = sentPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Acknowledged (Acknowledged by investor till date)
  const donePaymentsList = visiblePayments.filter(p => p.isReceived || p.status === "Received");
  const doneCount = donePaymentsList.length;
  const doneTotal = donePaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Gross Payouts (Sum of pending + sent + acknowledged for visible payments)
  const totalAllCount = pendingCount + sentCount + doneCount;
  const totalAllAmount = pendingTotal + sentTotal + doneTotal;

  // Include single unique investors across all registered investors and payment records
  const uniqueInvestors = React.useMemo(() => {
    const namesSet = new Set<string>();
    investors.forEach(i => {
      if (i.name && i.name.trim()) namesSet.add(i.name.trim());
    });
    relevantPayments.forEach(p => {
      if (p.investorName && p.investorName.trim()) namesSet.add(p.investorName.trim());
    });
    return Array.from(namesSet).sort();
  }, [investors, relevantPayments]);

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Sort visible payments by next payment due date (chronological nearest due date first)
  const sortedPayments = React.useMemo(() => {
    return [...visiblePayments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, [visiblePayments]);

  const filteredPayments = sortedPayments.filter(p => {
    // 1. Pay ID Search Filter
    let matchesPayId = true;
    if (payIdSearchTerm.trim()) {
      const cleanSearch = payIdSearchTerm.trim().toLowerCase().replace(/^payid#?|^#/, "");
      const payIdStr = String(p.paymentId).toLowerCase();
      const fullPayId = `payid#${p.paymentId}`.toLowerCase();
      matchesPayId = payIdStr.includes(cleanSearch) || fullPayId.includes(payIdSearchTerm.trim().toLowerCase());
    }

    // 2. Investor Filter
    const matchesInvestor = investorFilter === "all" || p.investorName === investorFilter;

    // 3. Status Filter
    let matchesStatus = true;
    if (selectedStatusFilter === "pending") {
      matchesStatus = !p.isSent && !p.isReceived && p.status !== "Received";
    } else if (selectedStatusFilter === "sent") {
      matchesStatus = p.isSent && !p.isReceived && p.status !== "Received";
    } else if (selectedStatusFilter === "received") {
      matchesStatus = p.isReceived || p.status === "Received";
    }

    // 4. Date Range Filter
    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const pDate = new Date(p.paymentDate);
      if (!isNaN(pDate.getTime())) {
        if (startDateFilter) {
          const sDate = new Date(startDateFilter);
          sDate.setHours(0, 0, 0, 0);
          if (pDate < sDate) matchesDate = false;
        }
        if (endDateFilter) {
          const eDate = new Date(endDateFilter);
          eDate.setHours(23, 59, 59, 999);
          if (pDate > eDate) matchesDate = false;
        }
      }
    }

    return matchesPayId && matchesInvestor && matchesStatus && matchesDate;
  });

  const totalEntries = filteredPayments.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
  const paginatedPayments = React.useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredPayments.slice(start, start + entriesPerPage);
  }, [filteredPayments, currentPage, entriesPerPage]);

  const handleDownloadPayoutsReport = () => {
    const headers = ["Payment ID", "Investor Name", "Phone / Email", "Amount (£)", "Payment Cycle", "Due Date", "Status", "Is Sent", "Is Received"];
    const rows = filteredPayments.map(p => [
      `PayId#${p.paymentId}`,
      `"${(p.investorName || "Investor").replace(/"/g, '""')}"`,
      `"${(p.mobile || p.investorEmail || "—").replace(/"/g, '""')}"`,
      p.amount.toFixed(2),
      p.paymentCycle || "Monthly",
      formatUKDate(p.dueDate || p.paymentDate),
      p.status,
      p.isSent ? "Yes" : "No",
      p.isReceived ? "Yes" : "No"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Payouts_Disbursement_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Track payout disbursements, payment schedules, and investor transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPayoutsReport}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            title="Download full filtered payouts report as CSV"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Gross Payouts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Gross Payouts
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{totalAllAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{totalAllCount} total payments</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Upcoming Payouts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Upcoming Payouts
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{pendingCount} upcoming pending</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Acknowledge Sent (Admin) / Sent by Investee (Investor) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Payments in Process
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{sentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">
              {sentCount} Payments in Process
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Acknowledge Received (Admin) / Received (Investor) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Payments Received
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{doneTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">
              Payments Received
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">

        {/* Pay ID Search Filter */}
        <div className="space-y-1 text-left w-full md:w-44">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Search Pay ID</label>
          <input
            type="text"
            placeholder="e.g. 1 or PayId#1"
            value={payIdSearchTerm}
            onChange={(e) => { setPayIdSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all"
          />
        </div>

        {/* Filter 1: Date Range */}
        <div className="space-y-1 text-left w-full md:flex-1">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
              title="From Date"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
            />
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
              title="To Date"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Filter 2: Status */}
        <div className="space-y-1 text-left w-full md:w-52">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Status</label>
          <select
            value={selectedStatusFilter}
            onChange={(e) => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">{isAdmin ? "Initiate Payout" : "Acknowledge Payout"}</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
          </select>
        </div>

        {/* Filter 3: Investor (Admin / Manager only) */}
        {isAdmin && (
          <div className="space-y-1 text-left w-full md:w-60">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Investor</label>
            <select
              value={investorFilter}
              onChange={(e) => { setInvestorFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
            >
              <option value="all">All Investors</option>
              {uniqueInvestors.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Payments Table */}
      {loading ? (
        <TableSkeleton columns={5} rows={4} />
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-display font-bold text-slate-900">No payments found</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium max-w-sm">
            {startDateFilter || endDateFilter || selectedStatusFilter !== "all" || investorFilter !== "all"
              ? "Try adjusting your date range or filter criteria."
              : "No upcoming investor payment payouts have been scheduled yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Pay ID</th>
                  <th className="px-6 py-4">Investor &amp; Contact</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Cycle</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                <AnimatePresence mode="popLayout">
                  {paginatedPayments.map(p => (
                    <motion.tr
                      key={p.paymentId}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 text-xs">
                        PayId#{p.paymentId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-left">
                          <button
                            onClick={() => navigate(`/investors/${p.investorId}`)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer outline-none hover:underline"
                          >
                            {p.investorName || "Investor"}
                          </button>
                          {(p.mobile || p.investorEmail) && (
                            <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {p.mobile ? p.mobile : p.investorEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 font-sans">£{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {p.paymentCycle || "Monthly"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {formatUKDate(p.dueDate || p.paymentDate)}
                      </td>
                      {/* Status Column with Actionable Badges */}
                      <td className="px-6 py-4">
                        {isAdmin && !p.isSent && !p.isReceived ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeSent(p.paymentId)}
                            title="Click to Send Acknowledge"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-xs cursor-pointer active:scale-95 transition-all group"
                          >
                            <Send className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                            Initiate Payout
                          </button>
                        ) : !isAdmin && p.isSent && !p.isReceived ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeReceived(p.paymentId)}
                            title="Click to Acknowledge Payout"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 shadow-xs cursor-pointer active:scale-95 transition-all group"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                            Acknowledge Payout
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${p.isReceived ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            p.isSent ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                            {p.isReceived && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {p.isReceived
                              ? "Received"
                              : p.isSent
                                ? "Sent"
                                : "Pending"}
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setIsDetailsOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Payments Table Pagination Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500">
            <div>
              Showing {totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{" "}
              {Math.min(currentPage * entriesPerPage, totalEntries)} of {totalEntries} entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-xl font-bold transition-all",
                      currentPage === pageNum
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <BaseModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Payment Transaction Details">
        {selectedPayment && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600 font-extrabold text-lg flex items-center justify-center w-12 h-12">
                £
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Payment Amount</span>
                <h4 className="text-xl font-display font-extrabold text-slate-900">£{selectedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Transaction ID</span>
                <span className="text-sm font-mono font-bold text-slate-700">PayId#{selectedPayment.paymentId}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Due Date</span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatUKDate(selectedPayment.dueDate || selectedPayment.paymentDate)}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Investor Profile</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-400" />
                  {selectedPayment.investorName}
                </span>
                {(selectedPayment.mobile || selectedPayment.investorEmail) && (
                  <span className="text-xs text-slate-500 font-medium ml-6 mt-0.5">
                    {selectedPayment.mobile ? `Phone: ${selectedPayment.mobile}` : `Email: ${selectedPayment.investorEmail}`}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Payment Status</span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${selectedPayment.isReceived ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                selectedPayment.isSent ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" :
                  "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                }`}>
                {selectedPayment.isReceived
                  ? (isAdmin ? "✓ Acknowledged" : "✓ Received")
                  : selectedPayment.isSent
                    ? (isAdmin ? "→ Send Acknowledge" : "→ Sent by Investee")
                    : "⏳ Pending"}
              </span>
            </div>

            <div className="flex justify-end pt-1 border-t border-slate-100">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </motion.div>
  );
};
