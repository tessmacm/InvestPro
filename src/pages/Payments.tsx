import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Payment } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL } from "../config/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, Filter, Eye, DollarSign, Calendar, Landmark } from "lucide-react";
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [investorFilter, setInvestorFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (err) {
      console.warn("Failed to fetch from real API, utilizing mock data", err);
      // Fallback Mock Data
      setPayments([
        { paymentId: 1, investorId: 1, investorName: "John Doe", amount: 5000, paymentDate: "2026-07-25T10:00:00Z", status: "Completed" },
        { paymentId: 2, investorId: 2, investorName: "ABC Ventures Ltd.", amount: 15000, paymentDate: "2026-07-26T14:30:00Z", status: "Completed" },
        { paymentId: 3, investorId: 3, investorName: "Michael Smith", amount: 7500, paymentDate: "2026-07-27T09:15:00Z", status: "Pending" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const uniqueInvestors = Array.from(new Set(payments.map(p => p.investorName)));

  const filteredPayments = payments.filter(p => {
    const matchesSearch = `PayId#${p.paymentId}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.amount.toString().includes(searchTerm);
    const matchesInvestor = investorFilter === "all" || p.investorName === investorFilter;
    return matchesSearch && matchesInvestor;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Investor Payments</h2>
          <p className="text-sm text-slate-500">Track and manage financial deposits and transaction payments.</p>
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
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Payment ID</th>
                  <th className="px-6 py-4">Investor</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Date</th>
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
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setIsDetailsOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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

      {/* Payment Details Modal */}
      <BaseModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Payment Transaction Details">
        {selectedPayment && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Payment Amount</span>
                <h4 className="text-xl font-display font-extrabold text-slate-900">${selectedPayment.amount.toLocaleString()}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
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
