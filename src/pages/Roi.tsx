import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { RoiContract } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL, authHeaders } from "../config/api";
import { cachedFetch } from "../utils/apiCache";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, Eye, TrendingUp, Calendar, Landmark, Percent } from "lucide-react";
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

export const Roi = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [contracts, setContracts] = useState<RoiContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState<RoiContract | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchRoiContracts = async () => {
    setLoading(true);
    try {
      const response = await cachedFetch(`${API_BASE_URL}/api/roi`, {
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch ROI contracts");
      const data = await response.json();
      setContracts(data);
    } catch (err) {
      console.warn("Failed to fetch ROI from API, using mock contracts", err);
      setContracts([
        { id: 1, investorId: 1, investorName: "John Doe", projectId: 1, projectTitle: "InvestPro Mobile App", roiAgreed: 5.0, monthlyPayment: 250, nextPaymentDate: "2026-08-01T00:00:00Z", status: "Active" },
        { id: 2, investorId: 2, investorName: "ABC Ventures Ltd.", projectId: 2, projectTitle: "Investor Dashboard Redesign", roiAgreed: 7.5, monthlyPayment: 937.5, nextPaymentDate: "2026-08-15T00:00:00Z", status: "Active" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoiContracts();
  }, []);

  const filteredContracts = contracts.filter(c => {
    return c.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.status.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">ROI Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Manage return interest rates, payout tiers, and calculation rules.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by investor, project, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={7} rows={3} />
      ) : filteredContracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-display font-bold text-slate-900">No ROI contracts found</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium max-w-sm">
            {searchTerm
              ? "Try adjusting your search or filter criteria."
              : "No active ROI contracts have been created yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Investor ID</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">ROI Agreed</th>
                  <th className="px-6 py-4">Monthly Payment</th>
                  <th className="px-6 py-4">Next Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                <AnimatePresence mode="popLayout">
                  {filteredContracts.map(c => (
                    <motion.tr
                      key={c.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">Inv#{c.investorId}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{c.projectTitle}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{c.roiAgreed}%</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">£{c.monthlyPayment.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(c.nextPaymentDate).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedContract(c);
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

      {/* Details Modal */}
      <BaseModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="ROI Schedule Details">
        {selectedContract && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Agreed ROI Yield</span>
                <h4 className="text-xl font-display font-extrabold text-slate-900">{selectedContract.roiAgreed}% Yield</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Monthly Yield</span>
                <span className="text-sm font-bold text-emerald-600">£{selectedContract.monthlyPayment.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Next Payout Date</span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {new Date(selectedContract.nextPaymentDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Investor Profile</span>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-slate-400" />
                  {selectedContract.investorName} (ID: {selectedContract.investorId})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Target Project</span>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-slate-400" />
                  {selectedContract.projectTitle}
                </span>
              </div>
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
