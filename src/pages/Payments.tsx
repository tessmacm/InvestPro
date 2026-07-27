import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Payment } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL, authHeaders } from "../config/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, Filter, Eye, DollarSign, Calendar, Landmark, Clock, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "superadmin";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [investorFilter, setInvestorFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/payments`, {
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
  }, []);

  // Filter to include ONLY the next upcoming payment for each investor
  const upcomingPayments = React.useMemo(() => {
    const map = new Map<number | string, Payment>();
    
    // Sort payments by payment date ascending
    const sorted = [...payments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    for (const p of sorted) {
      const key = p.investorId || p.investorName;
      if (!map.has(key)) {
        if (!p.isReceived && p.status !== "Received") {
          map.set(key, p);
        }
      }
    }

    // Fallback: if an investor has no unreceived payment, keep their single latest entry
    for (const p of sorted) {
      const key = p.investorId || p.investorName;
      if (!map.has(key)) {
        map.set(key, p);
      }
    }

    return Array.from(map.values());
  }, [payments]);

  // Card Calculations
  const pendingPaymentsList = payments.filter(p => !p.isSent && !p.isReceived && p.status !== "Received");
  const sentPaymentsList = payments.filter(p => p.isSent && !p.isReceived && p.status !== "Received");
  const donePaymentsList = payments.filter(p => p.isReceived || p.status === "Received");

  const pendingCount = pendingPaymentsList.length;
  const pendingTotal = pendingPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const sentCount = sentPaymentsList.length;
  const sentTotal = sentPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const doneCount = donePaymentsList.length;
  const doneTotal = donePaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const uniqueInvestors = Array.from(new Set(upcomingPayments.map(p => p.investorName)));

  const filteredPayments = upcomingPayments.filter(p => {
    const matchesSearch = `PayId#${p.paymentId}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.amount.toString().includes(searchTerm);
    const matchesInvestor = investorFilter === "all" || p.investorName === investorFilter;
    return matchesSearch && matchesInvestor;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Track payout disbursements, payment schedules, and investor transactions.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Pending */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Pending Payouts
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{pendingTotal.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{pendingCount} payments awaiting dispatch</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Acknowledge Sent */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Acknowledge Sent
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{sentTotal.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{sentCount} payments acknowledged sent</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Done */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Done (Completed)
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 pt-2">
              £{doneTotal.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{doneCount} payments completed</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Payment ID, name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={investorFilter}
            onChange={(e) => setInvestorFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
          >
            <option value="all">All Investors</option>
            {uniqueInvestors.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
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
            {searchTerm || investorFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "No upcoming investor payment payouts have been scheduled yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Payment ID</th>
                  <th className="px-6 py-4">Investor</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Cycle</th>
                  <th className="px-6 py-4">Payment Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                <AnimatePresence mode="popLayout">
                  {filteredPayments.map(p => (
                    <motion.tr
                      key={p.paymentId}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">PayId#{p.paymentId}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{p.investorName}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">${p.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {p.paymentCycle || "Monthly"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.isReceived ? "bg-emerald-50 text-emerald-700" :
                          p.isSent ? "bg-blue-50 text-blue-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {p.isReceived ? "Done" : p.isSent ? (isAdmin ? "Sent" : "Received") : (isAdmin ? "Pending" : "Upcoming")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isAdmin && !p.isSent && (
                          <button
                            onClick={() => handleAcknowledgeSent(p.paymentId)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Acknowledge Sent
                          </button>
                        )}
                        {!isAdmin && p.isSent && !p.isReceived && (
                          <button
                            onClick={() => handleAcknowledgeReceived(p.paymentId)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setIsDetailsOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
        </div>
      )}

      <BaseModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Payment Transaction Details">
        {selectedPayment && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Payment Amount</span>
                <h4 className="text-xl font-display font-extrabold text-slate-900">${selectedPayment.amount.toLocaleString()}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Transaction ID</span>
                <span className="text-sm font-mono font-bold text-slate-700">PayId#{selectedPayment.paymentId}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Transaction Date</span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {new Date(selectedPayment.paymentDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Investor Profile</span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-slate-400" />
                {selectedPayment.investorName}
              </span>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Payment Status</span>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                selectedPayment.isReceived ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                selectedPayment.isSent ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" :
                "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}>
                {selectedPayment.isReceived ? "✓ Done" : selectedPayment.isSent ? "→ Sent" : "⏳ Pending"}
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
