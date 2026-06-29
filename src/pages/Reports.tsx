import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { API_BASE_URL } from "../config/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, FileText, Download, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface ReportRow {
  investorId: number;
  investorName: string;
  projectId: number;
  projectTitle: string;
}

export const Reports = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setRows(data);
    } catch (err) {
      console.warn("Failed to fetch reports, using mock fallback rows", err);
      setRows([
        { investorId: 1, investorName: "John Doe", projectId: 1, projectTitle: "InvestPro Mobile App" },
        { investorId: 2, investorName: "ABC Ventures Ltd.", projectId: 2, projectTitle: "Investor Dashboard Redesign" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = (reportNum: number, format: "PDF" | "Excel", row: ReportRow) => {
    // Mock download generator
    const content = `InvestPro Report ${reportNum} - ${format} Export\n==========================================\nInvestor: ${row.investorName} (ID: ${row.investorId})\nProject: ${row.projectTitle} (ID: ${row.projectId})\nFormat: ${format}\nDate: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Report_${reportNum}_${row.investorName.replace(/\s+/g, "_")}.${format === "PDF" ? "pdf" : "xlsx"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = rows.filter(r => {
    return r.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `Inv#${r.investorId}`.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">System Reports</h2>
          <p className="text-sm text-slate-500">Generate and export performance, compliance, and ROI summaries.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by investor or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={4} rows={3} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Investor ID</th>
                  <th className="px-6 py-4">Project ID</th>
                  <th className="px-6 py-4">Project Title</th>
                  <th className="px-6 py-4 text-right">Reports Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-500">Inv#{row.investorId}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-500">Proj#{row.projectId}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.projectTitle}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 items-center">
                        {/* Report 1 */}
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
                          <span className="text-xs font-bold px-1.5 text-slate-400">R1</span>
                          <button
                            onClick={() => handleDownload(1, "PDF", row)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded cursor-pointer"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownload(1, "Excel", row)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded cursor-pointer"
                          >
                            XLS
                          </button>
                        </div>
                        {/* Report 2 */}
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
                          <span className="text-xs font-bold px-1.5 text-slate-400">R2</span>
                          <button
                            onClick={() => handleDownload(2, "PDF", row)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded cursor-pointer"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownload(2, "Excel", row)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded cursor-pointer"
                          >
                            XLS
                          </button>
                        </div>
                        {/* Report 3 */}
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
                          <span className="text-xs font-bold px-1.5 text-slate-400">R3</span>
                          <button
                            onClick={() => handleDownload(3, "PDF", row)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded cursor-pointer"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownload(3, "Excel", row)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded cursor-pointer"
                          >
                            XLS
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};
